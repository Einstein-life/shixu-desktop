const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, dialog, Notification, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const LabCore = require('../renderer/lab-core.js');
const ResearchCore = require('../renderer/research-core.js');
const PlantExamples = require('../renderer/plant-examples.js');
const {createAutoStart}=require('./autostart.js');
app.setName('Shixu Desktop');
const userDataPath = process.env.SHIXU_DATA_DIR || path.join(app.getPath('appData'), 'Shixu Desktop 2 Beta');
fs.mkdirSync(userDataPath, { recursive: true });
app.setPath('userData', userDataPath);
let locale = 'zh-CN';
const tr = (zh, en) => locale === 'en' ? en : zh;
let labRequested = false;
const liveNotifications = new Set();

let mainWindow = null;
let dockWindow = null;
let dockExpanded = false;
let tray = null;
let store = null;
const autoStart=createAutoStart({app,saveSettings});
let mainWindowReady = false;
const pendingMainEvents = [];

function sendMain(channel) {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindowReady) {
    pendingMainEvents.push(channel);
    return;
  }
  mainWindow.webContents.send(channel);
}

function dataFile() {
  return path.join(app.getPath('userData'), 'shixu-data.json');
}

function legacyDataFile() {
  return path.join(app.getPath('appData'), '时序调度', 'shixu-data.json');
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'shixu-settings.json');
}

function isAbsoluteReference(value) {
  return path.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\[^\\]+[\\]+/.test(value);
}

function defaultData() { return LabCore.empty(); }

function loadData() {
  if (!fs.existsSync(dataFile())) {
    if (process.env.SHIXU_DATA_DIR) return saveData(PlantExamples.create(locale));
    const legacy = legacyDataFile();
    if (!fs.existsSync(legacy)) return saveData(PlantExamples.create(locale));
    try {
      const migrated = LabCore.migrate(JSON.parse(fs.readFileSync(legacy, 'utf8')));
      fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
      fs.copyFileSync(legacy, dataFile() + '.v1-backup');
      fs.writeFileSync(dataFile(), JSON.stringify(migrated, null, 2), 'utf8');
      return migrated;
    } catch (err) {
      const backup = legacy + '.corrupt-' + Date.now();
      fs.copyFileSync(legacy, backup);
      dialog.showErrorBox(tr('数据恢复', 'Data recovery'), tr('旧版数据无法读取。原文件已保留。', 'Legacy data could not be read. The original file was preserved.') + '\n' + backup);
      return defaultData();
    }
  }
  try {
    const raw=JSON.parse(fs.readFileSync(dataFile(),'utf8'));
    const migrated=LabCore.migrate(raw);
    if(raw.version!==4 || !Array.isArray(raw.experiments) || (raw.tasks||[]).some(t=>!t.id) || (raw.projects||[]).some(p=>!p.id)) {
      fs.copyFileSync(dataFile(),dataFile()+'.v1-backup');
      saveData(migrated);
    }
    return migrated;
  }
  catch (err) {
    const recovery = dataFile() + '.corrupt-' + Date.now();
    fs.copyFileSync(dataFile(), recovery);
    let recovered = defaultData();
    try { recovered = LabCore.migrate(JSON.parse(fs.readFileSync(dataFile() + '.bak', 'utf8'))); } catch (_) {}
    dialog.showErrorBox(tr('数据恢复', 'Data recovery'), tr('数据文件无法读取。已保留原文件，尝试恢复最近备份。', 'The data file could not be read. The original was preserved and the latest backup was recovered if available.') + '\n' + recovery);
    return recovered;
  }
}

function saveData(payload) {
  const data = LabCore.migrate(payload);
  fs.mkdirSync(path.dirname(dataFile()), {recursive:true});
  const temp=dataFile()+'.tmp';
  fs.writeFileSync(temp, JSON.stringify(data,null,2), 'utf8');
  if(fs.existsSync(dataFile())) fs.copyFileSync(dataFile(),dataFile()+'.bak');
  try { fs.renameSync(temp,dataFile()); }
  catch (_) { fs.copyFileSync(temp,dataFile()); fs.unlinkSync(temp); }
  store=data;
  return data;
}

function pagePath(name) { return path.join(__dirname,'..','renderer', name + (locale === 'en' ? '.en' : '') + '.html'); }
function openLab() {
  if (!mainWindow) { labRequested=true;createMainWindow(); }
  else { mainWindow.show(); mainWindow.focus(); sendMain('shixu:open-lab'); }
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
  return autoStart.set(enabled);
}

function getAutoStart() {
  return autoStart.get();
}

function createMainWindow() {
  mainWindowReady = false;
  mainWindow = new BrowserWindow({
    width: 1060,
    height: 850,
    minWidth: 420,
    minHeight: 600,
    title: tr('时序 · 科研调度与实验执行', 'Shixu · Research & Lab Workflows'),
    icon: iconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(pagePath('index'), {query:labRequested?{tab:'lab'}:{}});
  mainWindow.webContents.on('did-start-loading', () => { mainWindowReady=false; });
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindowReady = true;
    for (const channel of pendingMainEvents.splice(0)) mainWindow.webContents.send(channel);
    if (labRequested) { mainWindow.webContents.send('shixu:open-lab'); labRequested = false; }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    mainWindowReady = false;
  });
}

function createDockWindow() {
  dockExpanded = false;
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
    title: tr('时序悬浮窗', 'Shixu floating panel'),
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
  dockWindow.loadFile(pagePath('dock'));
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
  if (tray) { tray.destroy(); tray=null; }
  try {
    const img = nativeImage.createFromPath(iconPath());
    const trayIcon = img.isEmpty()
      ? nativeImage.createEmpty()
      : img.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    const menu = Menu.buildFromTemplate([
      {
        label: tr('打开主界面', 'Open main window'),
        click: () => {
          if (!mainWindow) createMainWindow();
          else mainWindow.show();
        }
      },
      {
        label: tr('显示/隐藏悬浮窗', 'Show / hide floating panel'),
        click: () => {
          if (!dockWindow) createDockWindow();
          else if (dockWindow.isVisible()) dockWindow.hide();
          else dockWindow.show();
        }
      },
      {
        label: tr('导出数据…', 'Export data…'),
        click: () => {
          if (!mainWindow) createMainWindow();
          sendMain('shixu:menu-export');
        }
      },
      {
        label: tr('导入数据…', 'Import data…'),
        click: () => {
          if (!mainWindow) createMainWindow();
          sendMain('shixu:menu-import');
        }
      },
      { type: 'separator' },
      {
        label: tr('退出', 'Quit'),
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    tray.setToolTip('Shixu Desktop');
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

function validateImportPayload(raw) { return LabCore.migrate(typeof raw === 'string' ? JSON.parse(raw) : raw); }

ipcMain.handle('shixu:load', () => { if(!store)store=loadData(); return store; });
ipcMain.handle('shixu:save', (_e, payload, base) => {
  const data=saveData(base ? LabCore.mergeSnapshot(store || loadData(),base,payload) : payload);
  broadcast('shixu:updated',data);
  return data;
});
ipcMain.handle('shixu:get-locale', () => locale);
ipcMain.handle('shixu:set-locale', (_e,value) => {
  locale=value==='en'?'en':'zh-CN'; saveSettings({locale});
  createTray(); updateMacMenu();
  for(const win of BrowserWindow.getAllWindows()) {
    if(win===mainWindow)win.setTitle(tr('时序 · 科研调度与实验执行','Shixu · Research & Lab Workflows'));
    win.webContents.send('shixu:locale',locale);
  }
  return locale;
});
ipcMain.handle('shixu:open-lab', () => {openLab();return true;});

ipcMain.handle('shixu:get-autostart', () => getAutoStart());

ipcMain.handle('shixu:set-autostart', (_e, enabled) => applyAutoStart(!!enabled));

ipcMain.handle('shixu:export-data', async (_e, payload) => {
  const data = payload && Array.isArray(payload.tasks) ? payload : store || loadData();
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const win = mainWindow || BrowserWindow.getAllWindows()[0];
  const opts = {
    title: tr('导出时序数据', 'Export Shixu data'),
    defaultPath: path.join(app.getPath('documents'), `shixu-data-${stamp}.json`),
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
    title: tr('导入时序数据', 'Import Shixu data'),
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
    const confirm = await dialog.showMessageBox(win || undefined, {
      type:'question', buttons:[tr('取消','Cancel'),tr('导入并替换','Import and replace')], defaultId:0, cancelId:0,
      message:tr('导入将替换当前数据。继续？','Import will replace the current data. Continue?'),
      detail:tr('当前数据将自动备份至用户数据目录。','The current data will be backed up in the user data folder.')
    });
    if(confirm.response!==1)return {ok:false,canceled:true};
    if(fs.existsSync(dataFile()))fs.copyFileSync(dataFile(),dataFile()+'.before-import-'+Date.now()+'.json');
    const saved = saveData(data);
    broadcast('shixu:updated', saved);
    return { ok: true, filePath, data: saved, taskCount: saved.tasks.length };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('shixu:pick-research-files', async (event,kind) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return {canceled:true};
  const result=await dialog.showOpenDialog(mainWindow,{
    title:tr('关联科研文件或目录','Link research files or folders'),
    properties:kind==='folder'?['openDirectory']:['openFile','multiSelections']
  });
  return {canceled:result.canceled,paths:result.filePaths};
});

ipcMain.handle('shixu:open-research-artifact', async (event,projectId,artifactId) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return {ok:false,error:'INVALID_SENDER'};
  const p=(store||loadData()).projects.find(p=>p.id===projectId);
  const a=p?.artifacts?.find(a=>a.id===artifactId);
  const t=ResearchCore.target(a?.path);
  try {
    const {shell}=require('electron');
    if(t.kind==='web'){await shell.openExternal(t.value);return {ok:true};}
    if(t.kind==='local'&&isAbsoluteReference(t.value)) {
      if(!fs.existsSync(t.value))return {ok:false,error:tr('文件已移动或不可访问，请更新关联路径。','File moved or inaccessible. Update the linked path.')};
      // Reveal the file instead of executing scripts or binaries linked to a project.
      shell.showItemInFolder(t.value);return {ok:true};
    }
    return {ok:false,error:tr('服务器路径请复制到你的分析环境中使用。','Copy server paths to your analysis environment.')};
  } catch(err){return {ok:false,error:err.message};}
});

ipcMain.handle('shixu:open-experiment-artifact', async (event,experimentId,artifactId) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return {ok:false,error:'INVALID_SENDER'};
  const a=(store||loadData()).experiments.find(e=>e.id===experimentId)?.artifacts?.find(a=>a.id===artifactId);
  const target=ResearchCore.target(a?.path);
  try {
    const {shell}=require('electron');
    if(target.kind==='web'){await shell.openExternal(target.value);return {ok:true};}
    if(target.kind==='local'&&isAbsoluteReference(target.value)){
      if(!fs.existsSync(target.value))return {ok:false,error:tr('文件已移动或不可访问，请更新实验文件路径。','File moved or inaccessible. Update the experiment file path.')};
      shell.showItemInFolder(target.value);return {ok:true};
    }
    return {ok:false,error:tr('服务器路径可在实验记录中复制。','Copy server paths from the experiment record.')};
  }catch(err){return {ok:false,error:err.message};}
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
  dockExpanded = !!expanded;
  if (dockExpanded) placePanel(420, 660, true);
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
  if (on && !dockExpanded) placeBall(false);
  // 从球恢复：用鼠标所在屏，面板完整靠右贴回屏内
  else if (!on) placePanel(dockExpanded ? 420 : 340, dockExpanded ? 660 : 200, true);
  return true;
});

ipcMain.handle('shixu:dock-slide', (_e, payload) => {
  if (!dockWindow) return false;
  const mode = (payload && payload.mode) || 'show';
  if (mode === 'hide-edge') {
    if (!dockExpanded) placeBall(true);
  } else if (mode === 'show') {
    // 碰到球时鼠标在屏幕上：用 cursor 屏，并强制完整可见（不用球的 x）
    placePanel(dockExpanded ? 420 : 340, dockExpanded ? 660 : 200, true);
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

function updateMacMenu() {
  // macOS 程序坞菜单
  if (process.platform === 'darwin') {
    const dockMenu = Menu.buildFromTemplate([
      {
        label: tr('打开主界面', 'Open main window'),
        click: () => {
          if (!mainWindow) createMainWindow();
          else mainWindow.show();
        }
      },
      {
        label: tr('显示/隐藏悬浮窗', 'Show / hide floating panel'),
        click: () => {
          if (!dockWindow) createDockWindow();
          else if (dockWindow.isVisible()) dockWindow.hide();
          else dockWindow.show();
        }
      }
    ]);
    app.dock.setMenu(dockMenu);
  }

}

app.whenReady().then(() => {
  locale=loadSettings().locale === 'en' ? 'en' : 'zh-CN';
  store = loadData();
  // The OS owns login-item state. Do not override a user's system-level change on launch.

  updateMacMenu();

  createMainWindow();
  createDockWindow();
  createTray();
  const notifyDue = () => {
    if(!store)return;
    let changed=false;
    for(const e of store.experiments || []) {
      const step=LabCore.currentStep(e);
      if(step?.status!=='running'||!step.dueAt||Date.parse(step.dueAt)>Date.now()||step.alertedAt===step.dueAt)continue;
      if(!Notification.isSupported())continue;
      try {
        const notification=new Notification({title:tr('实验步骤已到时','Experiment step is due'),body:e.title+' · '+step.title,timeoutType:'never'});
        liveNotifications.add(notification);
        notification.on('click',()=>{openLab();liveNotifications.delete(notification);});
        notification.on('close',()=>liveNotifications.delete(notification));
        notification.show(); step.alertedAt=step.dueAt; changed=true;
      } catch(err) {console.error('Notification failed',err);}
    }
    if(changed){try {saveData(store);broadcast('shixu:updated',store);}catch(err){console.error('Could not persist alert',err);}}
  };
  setInterval(notifyDue,1000);
  powerMonitor.on('resume',notifyDue);
  notifyDue();

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
