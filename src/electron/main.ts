import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { isDev } from "./util.js";
import { pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      sandbox: false, // We need this false for file access
      webSecurity: true, // Security: enable web security
    },
    show: false, // Don't show until ready
    icon: path.join(__dirname, '../../desktopIcon.png'), // App icon
  });

  // Load the app
  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(getUIPath());
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start resource polling
  pollResources(mainWindow);
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Books', extensions: ['epub', 'pdf'] },
      { name: 'EPUB Files', extensions: ['epub'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    
    // Validate file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
      
      // Get file stats for additional validation
      const stats = await fs.stat(filePath);
      
      // Check if file is too large (e.g., > 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (stats.size > maxSize) {
        throw new Error('File is too large. Maximum size is 100MB.');
      }
      
      // Notify renderer process about the opened file
      mainWindow.webContents.send('file:opened', filePath);
      return filePath;
    } catch (error) {
      console.error('File validation error:', error);
      throw new Error('File is not accessible or invalid.');
    }
  }
  
  return null;
});

// --- NEW IPC Handler to read file content ---
ipcMain.handle('file:readContent', async (event, filePath) => {
  try {
    const fileContent = await fs.readFile(filePath);
    // Electron's IPC can serialize Buffer/Uint8Array automatically
    return fileContent; 
  } catch (error) {
    console.error(`Failed to read file content for path: ${filePath}`, error);
    // Return null or throw an error to signal failure to the renderer
    throw new Error('Could not read file content.');
  }
});

ipcMain.handle('file:validate', async (event, filePath: string) => {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    
    // Check file size
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (stats.size > maxSize) {
      return { valid: false, error: 'File is too large. Maximum size is 100MB.' };
    }
    
    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!['.epub', '.pdf'].includes(ext)) {
      return { valid: false, error: 'Unsupported file type. Only EPUB and PDF files are supported.' };
    }
    
    return { valid: true, size: stats.size, extension: ext };
  } catch (error) {
    return { valid: false, error: `File is not accessible. ${error}` };
  }
});

ipcMain.handle('window:toggleFullscreen', () => {
  if (!mainWindow) return;
  
  const isFullscreen = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFullscreen);
  
  // Notify renderer about state change
  mainWindow.webContents.send('window:stateChanged', !isFullscreen);
});

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return;
  
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

ipcMain.handle('app:isDev', () => {
  return isDev();
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up IPC handlers to prevent duplicate registration issues
  ipcMain.removeHandler('dialog:openFile');
  ipcMain.removeHandler('file:readContent');
  ipcMain.removeHandler('file:validate');
  ipcMain.removeHandler('window:toggleFullscreen');
  ipcMain.removeHandler('window:minimize');
  ipcMain.removeHandler('window:maximize');
  ipcMain.removeHandler('app:getVersion');
  ipcMain.removeHandler('app:getPlatform');
  ipcMain.removeHandler('app:isDev');
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
