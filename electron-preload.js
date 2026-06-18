const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    writeFiscalNetFile: (args) => ipcRenderer.invoke('write-fiscal-net-file', args),
    readFiscalNetResponse: (args) => ipcRenderer.invoke('read-fiscal-net-response', args),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    log: (level, ...args) => ipcRenderer.invoke('log:renderer', level, ...args),
    onMainError: (callback) => {
        const subscription = (event, err) => callback(err);
        ipcRenderer.on('app:main-error', subscription);
        return () => {
            ipcRenderer.removeListener('app:main-error', subscription);
        };
    },
    isElectron: true,
    appControls: {
        quitApp: () => ipcRenderer.invoke('app:quit'),
        setKioskMode: (enabled) => ipcRenderer.invoke('app:set-kiosk-mode', enabled),
        setFullscreenMode: (enabled) => ipcRenderer.invoke('app:set-fullscreen-mode', enabled),
        getWindowState: () => ipcRenderer.invoke('app:get-window-state'),
        getScreenSize: () => ipcRenderer.invoke('app:get-screen-size')
    },
    sqlite: {
        saveCacheBundle: (args) => ipcRenderer.invoke('sqlite:save-bundle', args),
        searchProducts: (args) => ipcRenderer.invoke('sqlite:search-products', args),
        getProductByBarcode: (args) => ipcRenderer.invoke('sqlite:get-product-by-barcode', args),
        getCacheStatus: (args) => ipcRenderer.invoke('sqlite:get-cache-status', args),
        saveShift: (args) => ipcRenderer.invoke('sqlite:save-shift', args),
        getShift: (args) => ipcRenderer.invoke('sqlite:get-shift', args),
        getDeviceInfo: () => ipcRenderer.invoke('sqlite:get-device-info'),
        validateCartItems: (args) => ipcRenderer.invoke('sqlite:validate-cart-items', args),
        enqueueOfflineSale: (args) => ipcRenderer.invoke('sqlite:enqueue-offline-sale', args),
        listOfflineSales: (args) => ipcRenderer.invoke('sqlite:list-offline-sales', args),
        getOfflineSale: (args) => ipcRenderer.invoke('sqlite:get-offline-sale', args),
        updateOfflineSaleStatus: (args) => ipcRenderer.invoke('sqlite:update-offline-sale-status', args),
        deleteOfflineSale: (args) => ipcRenderer.invoke('sqlite:delete-offline-sale', args),
        getOfflineSalesSummary: (args) => ipcRenderer.invoke('sqlite:get-offline-sales-summary', args),
        getAllProducts: (args) => ipcRenderer.invoke('sqlite:get-all-products', args),
        logCartEvent: (args) => ipcRenderer.invoke('sqlite:log-cart-event', args),
        listCartEvents: (args) => ipcRenderer.invoke('sqlite:list-cart-events', args),
        getCategories: () => ipcRenderer.invoke('sqlite:get-categories'),
        getState: () => ipcRenderer.invoke('sqlite:get-state')
    },
    updater: {
        checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
        downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
        installUpdateAndRestart: () => ipcRenderer.invoke('updater:install-update-now'),
        getUpdateStatus: () => ipcRenderer.invoke('updater:get-update-status'),
        onUpdateEvent: (channel, callback) => {
            const validChannels = [
                'updater:checking-for-update',
                'updater:update-available',
                'updater:update-not-available',
                'updater:download-progress',
                'updater:update-downloaded',
                'updater:error'
            ];
            if (validChannels.includes(channel)) {
                const subscription = (event, ...args) => callback(event, ...args);
                ipcRenderer.on(channel, subscription);
                return () => {
                    ipcRenderer.removeListener(channel, subscription);
                };
            }
            return () => {};
        }
    }
});
