const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getVaultInfo: () => ipcRenderer.invoke('vault:get-info'),
  chooseVaultFolder: () => ipcRenderer.invoke('vault:choose-folder'),
  saveWorkspace: (workspaceData) => ipcRenderer.invoke('vault:save-workspace', workspaceData),
  revealInFinder: () => ipcRenderer.invoke('vault:reveal-in-finder'),
  exportFile: (payload) => ipcRenderer.invoke('vault:export-file', payload),
  getSystemIdleTime: () => ipcRenderer.invoke('system:get-idle-time'),
});
