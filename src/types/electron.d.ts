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
  appControls?: {
    quitApp: () => Promise<void>;
  };
  sqlite?: {
    saveCacheBundle: (args: {
      storeId: string;
      bundle: any;
    }) => Promise<{ success: boolean; error?: string }>;
    searchProducts: (args: {
      storeId: string;
      queryText: string;
      limit?: number;
    }) => Promise<any[]>;
    getProductByBarcode: (args: {
      storeId: string;
      barcode: string;
    }) => Promise<any | null>;
    getCacheStatus: (args: {
      storeId: string;
    }) => Promise<{
      initialized: boolean;
      productCount?: number;
      priceCount?: number;
      stockCount?: number;
      categoryCount?: number;
      lastSyncAt?: string | null;
      checksum?: string | null;
      syncType?: string | null;
      rowCountsJson?: string;
      error?: string;
    }>;
    saveShift: (args: {
      shift: any;
    }) => Promise<{ success: boolean; error?: string }>;
    getShift: (args: {
      storeId: string;
      cashierId: string;
    }) => Promise<any | null>;
    getDeviceInfo: () => Promise<{ fingerprint: string; name: string }>;
  };
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
