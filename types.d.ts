type JsonString = string;

type TrpcEvent = {
  procedureName: string;
  data: JsonString;
};

interface FileValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  extension?: string;
}

interface ElectronAPI {
  // File operations
  openFileDialog: () => Promise<string | null>;
  validateFile: (filePath: string) => Promise<FileValidationResult>;
  readFileContent: (filePath: string) => Promise<ArrayBuffer>;
  
  // Window operations
  toggleFullscreen: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  
  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // Development utilities
  isDev: () => Promise<boolean>;
  
  // Event listeners
  onFileOpened: (callback: (filePath: string) => void) => void;
  onWindowStateChanged: (callback: (isFullscreen: boolean) => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};