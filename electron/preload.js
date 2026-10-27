const { contextBridge, ipcRenderer } = require('electron');

let snapshot = null;

contextBridge.exposeInMainWorld('shixu', {
  load: async () => { const data=await ipcRenderer.invoke('shixu:load'); snapshot=structuredClone(data); return data; },
  save: (payload) => ipcRenderer.invoke('shixu:save', payload, snapshot),
  projectDeletionPlan: projectId => ipcRenderer.invoke('shixu:project-deletion-plan',projectId),
  deleteProject: async (projectId,options) => {
    const result=await ipcRenderer.invoke('shixu:delete-project',projectId,options);
    if(result.ok)snapshot=structuredClone(result.data);
    return result;
  },
  getLocale: () => ipcRenderer.invoke('shixu:get-locale'),
  setLocale: value => ipcRenderer.invoke('shixu:set-locale',value),
  onLocale: cb => { const h=(_e,value)=>cb(value);ipcRenderer.on('shixu:locale',h);return ()=>ipcRenderer.removeListener('shixu:locale',h); },
  openLab: () => ipcRenderer.invoke('shixu:open-lab'),
  onOpenLab: cb => { const h=()=>cb();ipcRenderer.on('shixu:open-lab',h);return ()=>ipcRenderer.removeListener('shixu:open-lab',h); },
  onUpdate: (cb) => {
    const handler = (_e, data) => {
      snapshot=structuredClone(data);
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
  pickResearchFiles: kind => ipcRenderer.invoke('shixu:pick-research-files',kind),
  openResearchArtifact: (projectId,artifactId) => ipcRenderer.invoke('shixu:open-research-artifact',projectId,artifactId),
  openExperimentArtifact: (experimentId,artifactId) => ipcRenderer.invoke('shixu:open-experiment-artifact',experimentId,artifactId),
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
  dockDisplayMode: (mode) => ipcRenderer.invoke('shixu:dock-display-mode', mode),
  dockGetDisplayMode: () => ipcRenderer.invoke('shixu:dock-get-display-mode'),
  dockSlide: (payload) => ipcRenderer.invoke('shixu:dock-slide', payload),
  dockSetBall: (on) => ipcRenderer.invoke('shixu:dock-set-ball', !!on),
  openMain: () => ipcRenderer.invoke('shixu:open-main'),
  hideDock: () => ipcRenderer.invoke('shixu:hide-dock'),
  closeApp: () => ipcRenderer.invoke('shixu:close-app'),
  isElectron: true
});
