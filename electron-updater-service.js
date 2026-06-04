import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

// Local console-based logger fallback
const log = {
    info: (...args) => console.log('[Updater Info]', ...args),
    error: (...args) => console.error('[Updater Error]', ...args)
};

let mainWindow = null;
let lastStatus = 'idle';
let downloadProgressPercent = 0;

export function initializeUpdater(win) {
    mainWindow = win;
    
    // Disable automatic downloading of updates on check
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Relay autoUpdater events to renderer process
    autoUpdater.on('checking-for-update', () => {
        lastStatus = 'checking';
        sendUpdateEvent('updater:checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
        lastStatus = 'available';
        sendUpdateEvent('updater:update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        lastStatus = 'not-available';
        sendUpdateEvent('updater:update-not-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        lastStatus = 'downloading';
        downloadProgressPercent = Math.round(progressObj.percent || 0);
        sendUpdateEvent('updater:download-progress', {
            percent: downloadProgressPercent,
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        lastStatus = 'downloaded';
        sendUpdateEvent('updater:update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
        lastStatus = 'error';
        sendUpdateEvent('updater:error', {
            message: err ? err.message : 'Eroare necunoscută la actualizare.'
        });
    });

    // Check for updates automatically 15 seconds after startup (only in packaged app)
    if (app.isPackaged) {
        setTimeout(() => {
            autoUpdater.checkForUpdates().catch(err => {
                log.error('Eroare verificare automata la pornire:', err);
            });
        }, 15000);
    }
}

function sendUpdateEvent(channel, data = {}) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

// IPC Handlers
ipcMain.handle('updater:check-for-updates', async () => {
    if (!app.isPackaged) {
        console.log('[Updater] Verificare blocata in Development Mode.');
        // Simulation helper for local dev/test environment
        sendUpdateEvent('updater:checking-for-update');
        await new Promise(resolve => setTimeout(resolve, 800));
        sendUpdateEvent('updater:update-available', { version: '1.2.4-test-mock' });
        return { success: true, message: 'Simulare update disponbil.' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result ? result.updateInfo : null };
    } catch (err) {
        log.error('[Updater] Eroare check-for-updates:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('updater:download-update', async () => {
    if (!app.isPackaged) {
        console.log('[Updater] Descarcare blocata in Development Mode.');
        // Simulation helper
        sendUpdateEvent('updater:download-progress', { percent: 10 });
        await new Promise(resolve => setTimeout(resolve, 500));
        sendUpdateEvent('updater:download-progress', { percent: 50 });
        await new Promise(resolve => setTimeout(resolve, 500));
        sendUpdateEvent('updater:download-progress', { percent: 100 });
        sendUpdateEvent('updater:update-downloaded', { version: '1.2.4-test-mock' });
        return { success: true };
    }
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (err) {
        log.error('[Updater] Eroare download-update:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('updater:install-update-now', async () => {
    if (!app.isPackaged) {
        console.log('[Updater] Instalare blocata in Development Mode.');
        return { success: true, message: 'Simulare instalare.' };
    }
    try {
        autoUpdater.quitAndInstall();
        return { success: true };
    } catch (err) {
        log.error('[Updater] Eroare install-update:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('updater:get-update-status', () => {
    return {
        status: lastStatus,
        progress: downloadProgressPercent
    };
});
