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
    validateCartItems: (args: {
      storeId: string;
      itemIds: string[];
    }) => Promise<{ valid: boolean; reason?: 'missing_product' | 'missing_price'; productId?: string; error?: string }>;
    enqueueOfflineSale: (args: {
      sale: {
        local_sale_id: string;
        store_id: string;
        device_fingerprint: string;
        shift_id: string | null;
        cashier_profile_id: string;
        created_at_local: string;
        status: 'queued';
        cart_items_json: string;
        payments_json: string;
        totals_json: string;
        sgr_totals_json?: string | null;
        vat_breakdown_json?: string | null;
        fiscal_status?: 'not_allowed_offline' | 'pending_after_sync' | 'fiscalized' | 'fiscal_failed';
      };
    }) => Promise<{ success: boolean; local_sale_id: string; payload_hash: string; error?: string }>;
    listOfflineSales: (args: { storeId: string }) => Promise<any[]>;
    getOfflineSale: (args: { localSaleId: string }) => Promise<any | null>;
    updateOfflineSaleStatus: (args: {
      localSaleId: string;
      status: 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict' | 'cancelled';
      errorMsg?: string | null;
      syncedSaleId?: string | null;
    }) => Promise<{ success: boolean; error?: string }>;
    deleteOfflineSale: (args: { localSaleId: string }) => Promise<{ success: boolean; error?: string }>;
    getOfflineSalesSummary: (args: { storeId: string }) => Promise<{
      queuedCount: number;
      queuedTotal: number;
      lastSale: { createdAtLocal: string; grandTotal: number } | null;
    }>;
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
