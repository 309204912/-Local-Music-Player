const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanFolders: () => ipcRenderer.invoke('scan-folders'),
  scanAudioFiles: (folderName) => ipcRenderer.invoke('scan-audio-files', folderName),
  getMusicRoot: () => ipcRenderer.invoke('get-music-root'),
  setLocked: (locked) => ipcRenderer.invoke('set-locked', locked),
  getLocked: () => ipcRenderer.invoke('get-locked'),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  setWindowSize: (w, h) => ipcRenderer.invoke('set-window-size', w, h),
  openFolder: (folderName) => ipcRenderer.invoke('open-folder', folderName),
  closeApp: () => ipcRenderer.invoke('close-app'),
  setGhost: (enabled) => ipcRenderer.invoke('set-ghost', enabled),
  setMouseForward: (forward) => ipcRenderer.invoke('set-mouse-forward', forward)
});
