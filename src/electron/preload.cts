

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  validateFile: (filePath: string) => ipcRenderer.invoke('file:validate', filePath),
  
  // --- NEW: Securely read file content from the main process ---
  readFileContent: (filePath: string) => ipcRenderer.invoke('file:readContent', filePath),
  
  // Window operations
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  
  // Development utilities
  isDev: () => ipcRenderer.invoke('app:isDev'),
  
  // Event listeners for main process events
  onFileOpened: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file:opened', (event: any, filePath: string) => callback(filePath));
  },
  
  onWindowStateChanged: (callback: (isFullscreen: boolean) => void) => {
    ipcRenderer.on('window:stateChanged', (event: any, isFullscreen: boolean) => callback(isFullscreen));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});