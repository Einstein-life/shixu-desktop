const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shixu', {
  load: () => ipcRenderer.invoke('shixu:load'),
  save: (payload) => ipcRenderer.invoke('shixu:save', payload),
  onUpdate: (cb) => {
    const handler = (_e, data) => {
      if (typeof cb === 'function') cb(data);
    };
    ipcRenderer.on('shixu:updated', handler);
    return () => ipcRenderer.removeListener('shixu:updated', handler);
  },
  getAutoStart: () => ipcRenderer.invoke('shixu:get-autostart'),
  setAutoStart: (enabled) => ipcRenderer.invoke('shixu:set-autostart', !!enabled),
  exportData: (payload) => ipcRenderer.invoke('shixu:export-data', payload),
  importData: () => ipcRenderer.invoke('shixu:import-data'),
  revealData: () => ipcRenderer.invoke('shixu:reveal-data'),
  onMenuExport: (cb) => {
    const h = () => cb && cb();
    ipcRenderer.on('shixu:menu-export', h);
    return () => ipcRenderer.removeListener('shixu:menu-export', h);
  },
  onMenuImport: (cb) => {
    const h = () => cb && cb();
    ipcRenderer.on('shixu:menu-import', h);
    return () => ipcRenderer.removeListener('shixu:menu-import', h);
  },
  dockSetSize: (expanded) => ipcRenderer.invoke('shixu:dock-set-size', !!expanded),
  openMain: () => ipcRenderer.invoke('shixu:open-main'),
  hideDock: () => ipcRenderer.invoke('shixu:hide-dock'),
  closeApp: () => ipcRenderer.invoke('shixu:close-app'),
  isElectron: true
});
