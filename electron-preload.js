const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    writeFiscalNetFile: (args) => ipcRenderer.invoke('write-fiscal-net-file', args),
    readFiscalNetResponse: (args) => ipcRenderer.invoke('read-fiscal-net-response', args),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isElectron: true
});
