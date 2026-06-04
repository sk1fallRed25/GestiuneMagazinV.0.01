const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    writeFiscalNetFile: (args) => ipcRenderer.invoke('write-fiscal-net-file', args),
    readFiscalNetResponse: (args) => ipcRenderer.invoke('read-fiscal-net-response', args),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isElectron: true,
    appControls: {
        quitApp: () => ipcRenderer.invoke('app:quit')
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
