/**
 * Global type augmentation for the Electron preload API.
 * 
 * This is the canonical type definition for window.electronAPI.
 * The preload script (electron-preload.js) exposes this via contextBridge.
 */

export interface ElectronAPI {
  isElectron: boolean;
  writeFiscalNetFile: (args: {
    bonuriPath: string;
    filename: string;
    content: string;
    raspunsPath?: string;
  }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  readFiscalNetResponse: (args: {
    raspunsPath: string;
    filename: string;
  }) => Promise<{ success: boolean; content?: string; error?: string }>;
  getAppVersion: () => Promise<string>;
  updater?: {
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdateAndRestart: () => Promise<{ success: boolean; error?: string }>;
    getUpdateStatus: () => Promise<{ status: string; progress: number }>;
    onUpdateEvent: (channel: string, callback: (event: any, ...args: any[]) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
