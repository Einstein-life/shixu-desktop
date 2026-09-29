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
  dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  dockWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dock.html'));
  // 周期性再次置顶，避免被其他全屏/置顶窗口盖住
  dockWindow._topmostTimer = setInterval(() => {
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 2000);
  dockWindow.on('closed', () => {
    if (dockWindow && dockWindow._topmostTimer) clearInterval(dockWindow._topmostTimer);
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

/** 多显示器 / DPI：贴边/展开优先用鼠标所在屏（碰到球时），否则窗口所在屏 */
function layoutDisplay(preferCursor) {
  try {
    if (preferCursor) {
      return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    }
    if (dockWindow && !dockWindow.isDestroyed()) {
      return screen.getDisplayMatching(dockWindow.getBounds());
    }
  } catch (_) {}
  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  } catch (_) {}
  return screen.getPrimaryDisplay();
}

function clampToWorkArea(width, height, x, y, display) {
  const wa = display.workArea;
  const w = Math.max(40, Math.min(Math.round(width), wa.width));
  const h = Math.max(40, Math.min(Math.round(height), wa.height));
  const maxX = wa.x + wa.width - w;
  const maxY = wa.y + wa.height - h;
  return {
    x: Math.max(wa.x, Math.min(Math.round(x), maxX)),
    y: Math.max(wa.y, Math.min(Math.round(y), maxY)),
    width: w,
    height: h
  };
}

function applyDockBounds(width, height, x, y, preferCursor) {
  if (!dockWindow || dockWindow.isDestroyed()) return null;
  const display = layoutDisplay(!!preferCursor);
  const bounds = clampToWorkArea(width, height, x, y, display);
  dockWindow.setBounds(bounds);
  // 二次校正：防止 DPI/跨屏导致 setBounds 后仍越界
  const now = dockWindow.getBounds();
  const wa = display.workArea;
  if (now.x < wa.x || now.y < wa.y || now.x + now.width > wa.x + wa.width + 2 || now.y + now.height > wa.y + wa.height + 2) {
    const fixed = clampToWorkArea(width, height, wa.x + wa.width - bounds.width - 12, bounds.y, display);
    dockWindow.setBounds(fixed);
  }
  dockWindow.setAlwaysOnTop(true, 'screen-saver');
  return dockWindow.getBounds();
}

/** 面板（非球）固定靠当前屏右侧、完整可见 */
function placePanel(width, height, preferCursor) {
  const display = layoutDisplay(!!preferCursor);
  const wa = display.workArea;
  const y = dockCurrentY(height, preferCursor);
  const x = wa.x + wa.width - width - 12;
  return applyDockBounds(width, height, x, y, preferCursor);
}

function placeBall(preferCursor) {
  const display = layoutDisplay(!!preferCursor);
  const wa = display.workArea;
  const size = 56;
  return applyDockBounds(size, size, wa.x + wa.width - size - 4, dockCurrentY(size, preferCursor), preferCursor);
}

function dockCurrentY(height, preferCursor) {
  const display = layoutDisplay(!!preferCursor);
  const wa = display.workArea;
  const b = dockWindow && !dockWindow.isDestroyed() ? dockWindow.getBounds() : null;
  if (b && b.height <= height + 8) {
    return b.y;
  }
  return wa.y + Math.floor(Math.max(0, (wa.height - height) * 0.22));
}

ipcMain.handle('shixu:dock-set-size', (_e, expanded) => {
  if (!dockWindow) return false;
  if (expanded) placePanel(420, 660, true);
  else placePanel(340, 200, true);
  return true;
});

ipcMain.handle('shixu:dock-display-mode', (_e, mode) => {
  const m = mode === 'edge' ? 'edge' : 'always';
  saveSettings({ dockDisplayMode: m });
  return { displayMode: m };
});

ipcMain.handle('shixu:dock-get-display-mode', () => {
  return { displayMode: loadSettings().dockDisplayMode === 'edge' ? 'edge' : 'always' };
});

ipcMain.handle('shixu:dock-set-ball', (_e, on) => {
  if (!dockWindow) return false;
  if (on) placeBall(false);
  // 从球恢复：用鼠标所在屏，面板完整靠右贴回屏内
  else placePanel(340, 200, true);
  return true;
});

ipcMain.handle('shixu:dock-slide', (_e, payload) => {
  if (!dockWindow) return false;
  const mode = (payload && payload.mode) || 'show';
  if (mode === 'hide-edge') {
    placeBall(true);
  } else if (mode === 'show') {
    // 碰到球时鼠标在屏幕上：用 cursor 屏，并强制完整可见（不用球的 x）
    placePanel(340, 200, true);
  }
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
