const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let dockWindow = null;
let tray = null;
let store = null;
let autoStartEnabled = false;

function dataFile() {
  return path.join(app.getPath('userData'), 'shixu-data.json');
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'shixu-settings.json');
}

function defaultData() {
  return {
    version: 3,
    slot: '60',
    capacity_hours: 6,
    projects: [],
    tasks: [],
    summaries: [],
    dock: { collapsed: true }
  };
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultData(), ...parsed };
  } catch (_) {
    return defaultData();
  }
}

function saveData(payload) {
  const data = { ...defaultData(), ...payload };
  fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
  fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2), 'utf8');
  store = data;
  return data;
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function broadcast(channel, data) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, data);
  }
}

function iconPath() {
  return path.join(__dirname, '..', 'assets', 'icon.png');
}

function applyAutoStart(enabled) {
  autoStartEnabled = !!enabled;
  try {
    // macOS / Windows 通用登录项；打包后使用当前可执行文件
    app.setLoginItemSettings({
      openAtLogin: autoStartEnabled,
      path: process.execPath,
      name: '时序调度',
      enabled: autoStartEnabled
    });
  } catch (err) {
    console.error('setLoginItemSettings failed', err);
  }
  saveSettings({ openAtLogin: autoStartEnabled });
  return getAutoStart();
}

function getAutoStart() {
  try {
    const info = app.getLoginItemSettings();
    autoStartEnabled = !!info.openAtLogin;
  } catch (_) {
    const s = loadSettings();
    autoStartEnabled = !!s.openAtLogin;
  }
  return { openAtLogin: autoStartEnabled };
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: '时序 · 生信调度',
    icon: iconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createDockWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const w = 340;
  const h = 200;
  dockWindow = new BrowserWindow({
    width: w,
    height: h,
    x: Math.max(8, sw - w - 12),
    y: Math.max(8, Math.floor(sh * 0.22)),
    frame: false,
    transparent: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: '时序悬浮窗',
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  dockWindow.setAlwaysOnTop(true, 'screen-saver');
  dockWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dock.html'));
  dockWindow.on('closed', () => {
    dockWindow = null;
  });
}

function createTray() {
  try {
    const img = nativeImage.createFromPath(iconPath());
    const trayIcon = img.isEmpty()
      ? nativeImage.createEmpty()
      : img.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    const menu = Menu.buildFromTemplate([
      {
        label: '打开主界面',
        click: () => {
          if (!mainWindow) createMainWindow();
          else mainWindow.show();
        }
      },
      {
        label: '显示/隐藏悬浮窗',
        click: () => {
          if (!dockWindow) createDockWindow();
          else if (dockWindow.isVisible()) dockWindow.hide();
          else dockWindow.show();
        }
      },
      {
        label: '导出数据…',
        click: () => {
          if (!mainWindow) createMainWindow();
          mainWindow.webContents.send('shixu:menu-export');
        }
      },
      {
        label: '导入数据…',
        click: () => {
          if (!mainWindow) createMainWindow();
          mainWindow.webContents.send('shixu:menu-import');
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    tray.setToolTip('时序调度');
    tray.setContextMenu(menu);
    // Windows：单击托盘切换悬浮窗；macOS：以菜单为准，避免与右键冲突
    tray.on('click', () => {
      if (process.platform === 'darwin') {
        if (!mainWindow) createMainWindow();
        else mainWindow.show();
        return;
      }
      if (!dockWindow) createDockWindow();
      else if (dockWindow.isVisible()) dockWindow.hide();
      else dockWindow.show();
    });
  } catch (err) {
    console.error('tray failed', err);
  }
}

function validateImportPayload(raw) {
  let data = raw;
  if (typeof raw === 'string') data = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('不是有效的 JSON');
  if (!Array.isArray(data.tasks)) {
    if (Array.isArray(data)) data = { version: 3, tasks: data, projects: [], summaries: [] };
    else throw new Error('缺少 tasks 数组');
  }
  if (!Array.isArray(data.projects)) data.projects = [];
  if (!Array.isArray(data.summaries)) data.summaries = [];
  return {
    version: 3,
    slot: data.slot || '60',
    capacity_hours: data.capacity_hours || 6,
    projects: data.projects,
    tasks: data.tasks,
    summaries: data.summaries
  };
}

ipcMain.handle('shixu:load', () => {
  if (!store) store = loadData();
  return store;
});

ipcMain.handle('shixu:save', (_e, payload) => {
  const data = saveData(payload || {});
  broadcast('shixu:updated', data);
  return data;
});

ipcMain.handle('shixu:get-autostart', () => getAutoStart());

ipcMain.handle('shixu:set-autostart', (_e, enabled) => applyAutoStart(!!enabled));

ipcMain.handle('shixu:export-data', async (_e, payload) => {
  const data = payload && Array.isArray(payload.tasks) ? payload : store || loadData();
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const win = mainWindow || BrowserWindow.getAllWindows()[0];
  const opts = {
    title: '导出时序数据',
    defaultPath: path.join(app.getPath('documents'), `时序数据-${stamp}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  };
  const ret = win
    ? await dialog.showSaveDialog(win, opts)
    : await dialog.showSaveDialog(opts);
  if (ret.canceled || !ret.filePath) return { ok: false, canceled: true };
  fs.mkdirSync(path.dirname(ret.filePath), { recursive: true });
  fs.writeFileSync(ret.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, filePath: ret.filePath };
});

ipcMain.handle('shixu:import-data', async () => {
  const win = mainWindow || BrowserWindow.getAllWindows()[0];
  const opts = {
    title: '导入时序数据',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  };
  const ret = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
  if (ret.canceled || !ret.filePaths || !ret.filePaths[0]) {
    return { ok: false, canceled: true };
  }
  const filePath = ret.filePaths[0];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = validateImportPayload(raw);
    const saved = saveData(data);
    broadcast('shixu:updated', saved);
    return { ok: true, filePath, data: saved, taskCount: saved.tasks.length };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('shixu:reveal-data', () => {
  const p = dataFile();
  if (fs.existsSync(p)) {
    const { shell } = require('electron');
    shell.showItemInFolder(p);
  }
  return { path: p };
});

ipcMain.handle('shixu:dock-set-size', (_e, expanded) => {
  if (!dockWindow) return false;
  const [x, y] = dockWindow.getPosition();
  if (expanded) dockWindow.setContentSize(420, 660);
  else dockWindow.setContentSize(340, 200);
  const display = screen.getDisplayMatching(dockWindow.getBounds());
  const wa = display.workArea;
  const b = dockWindow.getBounds();
  let nx = x;
  let ny = y;
  if (nx + b.width > wa.x + wa.width) nx = wa.x + wa.width - b.width - 8;
  if (ny + b.height > wa.y + wa.height) ny = wa.y + wa.height - b.height - 8;
  dockWindow.setPosition(Math.max(8, nx), Math.max(8, ny));
  return true;
});

ipcMain.handle('shixu:open-main', () => {
  if (!mainWindow) createMainWindow();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});

ipcMain.handle('shixu:hide-dock', () => {
  if (dockWindow) dockWindow.hide();
  return true;
});

ipcMain.handle('shixu:close-app', () => {
  app.isQuiting = true;
  app.quit();
  return true;
});

app.whenReady().then(() => {
  store = loadData();
  const s = loadSettings();
  if (s.openAtLogin) applyAutoStart(true);

  // macOS 程序坞菜单
  if (process.platform === 'darwin') {
    const dockMenu = Menu.buildFromTemplate([
      {
        label: '打开主界面',
        click: () => {
          if (!mainWindow) createMainWindow();
          else mainWindow.show();
        }
      },
      {
        label: '显示/隐藏悬浮窗',
        click: () => {
          if (!dockWindow) createDockWindow();
          else if (dockWindow.isVisible()) dockWindow.hide();
          else dockWindow.show();
        }
      }
    ]);
    app.dock.setMenu(dockMenu);
  }

  createMainWindow();
  createDockWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createDockWindow();
    } else {
      if (mainWindow) mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // 托盘常驻；macOS 习惯保留 Dock 图标
  if (process.platform === 'darwin') return;
  if (!tray) app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
});
