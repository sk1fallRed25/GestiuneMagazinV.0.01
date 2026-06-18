import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Configure Structured Logging with electron-log
import log from 'electron-log/main.js';
log.initialize();

const mainLog = log.create({ logId: 'main' });
const rendererLog = log.create({ logId: 'renderer' });
const updaterLog = log.create({ logId: 'updater' });

const getLogPath = (filename) => {
    return path.join(app.getPath('userData'), 'logs', filename);
};

mainLog.transports.file.resolvePathFn = () => getLogPath('main.log');
rendererLog.transports.file.resolvePathFn = () => getLogPath('renderer.log');
updaterLog.transports.file.resolvePathFn = () => getLogPath('updater.log');

export { mainLog, rendererLog, updaterLog };

import { initializeUpdater } from './electron-updater-service.js';
import { 
    initDb, saveCacheBundle, searchLocalProducts, getLocalProductByBarcode, 
    getLocalCacheStatus, saveLocalShiftState, getLocalShiftState, getOrCreateDeviceInfo,
    validateCartItemsLocal, enqueueOfflineSale, listOfflineSales, getOfflineSale, 
    updateOfflineSaleStatus, deleteOfflineSale, getOfflineSalesSummary,
    getAllLocalProducts, logPosCartEvent, listLocalPosCartEvents, getLocalCategories,
    getDbState
} from './electron-sqlite-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let win = null;

function createWindow() {
    win = new BrowserWindow({
        // Setări specifice v0.1.2 pentru securitate POS
        fullscreen: false,           // Pornire normală, nu forțat în fullscreen
        autoHideMenuBar: true,      // Ascunde bara de meniu (File, Edit, etc.)
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false, // Recomandat pentru securitate
            contextIsolation: true,
            preload: path.join(__dirname, 'electron-preload.js')
        },
        // Iconița pentru fereastra de Windows
        icon: path.join(__dirname, 'public/vite.svg')
    });

    win.maximize();

    // Gestionare URL în funcție de mediu (Dev vs Producție)
    const startUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, 'dist/index.html')}`;

    win.loadURL(startUrl);

    // Deschide uneltele de dezvoltare doar în modul dev
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    // Initialize the auto updater service
    initializeUpdater(win);
}

app.whenReady().then(() => {
    try {
        initDb(app.getPath('userData'));
    } catch (err) {
        mainLog.error('Failed to initialize local database:', err);
    }
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function isSafeTxtFilename(filename) {
    if (typeof filename !== 'string') return false;
    if (!filename.endsWith('.txt')) return false;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes(':')) {
        return false;
    }
    // Block control characters
    for (let i = 0; i < filename.length; i++) {
        const code = filename.charCodeAt(i);
        if (code < 32 || code === 127) return false;
    }
    // Strict regex validation: only alphanumeric, dot, underscore, hyphen
    const regex = /^[a-zA-Z0-9._-]+\.txt$/;
    return regex.test(filename);
}

function assertDirectoryExists(dirPath, label) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
        throw new Error(`Calea pentru folderul ${label} nu poate fi goala.`);
    }
    try {
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
            throw new Error();
        }
    } catch (e) {
        throw new Error(`Folderul ${label} nu exista sau nu este director.`);
    }
}

function resolveInside(baseDir, filename) {
    const resolvedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(baseDir, filename);
    
    const isWindows = process.platform === 'win32';
    const baseCompare = isWindows ? resolvedBase.toLowerCase() : resolvedBase;
    const pathCompare = isWindows ? resolvedPath.toLowerCase() : resolvedPath;
    
    const expectedPrefix = baseCompare + (baseCompare.endsWith(path.sep) ? '' : path.sep);
    if (!pathCompare.startsWith(expectedPrefix)) {
        throw new Error('Securitate: fisierul rezultat iese din folderul configurat.');
    }
    return resolvedPath;
}

function serializeError(err) {
    if (err instanceof Error || (err && typeof err === 'object' && 'message' in err)) return err.message;
    return String(err || 'Eroare necunoscută.');
}

// Process Exception/Rejection Listeners
process.on('uncaughtException', (err) => {
    mainLog.error('Uncaught Exception:', err);
    if (win && !win.isDestroyed()) {
        win.webContents.send('app:main-error', {
            message: err.message || String(err),
            stack: err.stack || ''
        });
    }
});

process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    mainLog.error('Unhandled Rejection:', err);
    if (win && !win.isDestroyed()) {
        win.webContents.send('app:main-error', {
            message: err.message,
            stack: err.stack || ''
        });
    }
});

// Structured Logging & SQLite Diagnostics IPC Handlers
ipcMain.handle('log:renderer', (event, level, ...args) => {
    if (rendererLog[level]) {
        rendererLog[level](...args);
    } else {
        rendererLog.info(...args);
    }
    return { success: true };
});

ipcMain.handle('sqlite:get-state', () => {
    try {
        return getDbState();
    } catch (err) {
        return { initialized: false, corrupted: true, recreated: false, error: err.message };
    }
});

ipcMain.handle('app:quit', () => {
    mainLog.info('[AppControls] Quit requested via IPC.');
    app.quit();
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Handlers IPC securizate pentru Pilotul Controlat FiscalNet
ipcMain.handle('write-fiscal-net-file', async (event, { bonuriPath, filename, content, raspunsPath }) => {
    let tempPath = null;
    let tempWritten = false;
    try {
        if (!bonuriPath || !filename || !content) {
            return { success: false, error: 'Path, filename sau continut lipsa.' };
        }
        if (!isSafeTxtFilename(filename)) {
            return { success: false, error: 'Securitate: Cale sau nume fisier invalid.' };
        }

        assertDirectoryExists(bonuriPath, 'Bonuri');

        const finalPath = resolveInside(bonuriPath, filename);

        // Anti-duplicate checks
        if (fs.existsSync(finalPath)) {
            return { success: false, error: `Fisierul ${filename} exista deja. Nu rescriem pentru a evita dublarea bonului.` };
        }

        if (raspunsPath) {
            assertDirectoryExists(raspunsPath, 'Răspuns');
            const finalResponsePath = resolveInside(raspunsPath, filename);
            if (fs.existsSync(finalResponsePath)) {
                return { success: false, error: 'Există deja răspuns pentru această vânzare. Nu rescriem bonul pentru a evita dublarea fiscalizării.' };
            }
        }

        const basenameWithoutTxt = filename.slice(0, -4);
        const tempFilename = `${basenameWithoutTxt}.tmp`;
        tempPath = resolveInside(bonuriPath, tempFilename);

        if (fs.existsSync(tempPath)) {
            return { success: false, error: 'Există deja un fișier temporar pentru acest bon. Verifică manual folderul.' };
        }

        fs.writeFileSync(tempPath, content, 'utf8');
        tempWritten = true;
        fs.renameSync(tempPath, finalPath);

        console.log(`[FiscalNet Pilot] Scris bon in folder: ${finalPath}`);
        return { success: true, filePath: finalPath };
    } catch (err) {
        console.error('[FiscalNet Pilot] Eroare scriere bon:', err);
        if (tempWritten && tempPath) {
            try {
                fs.unlinkSync(tempPath);
            } catch (unlinkErr) {
                // ignore
            }
        }
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('read-fiscal-net-response', async (event, { raspunsPath, filename }) => {
    try {
        if (!raspunsPath || !filename) {
            return { success: false, error: 'Cale sau filename lipsa.' };
        }
        if (!isSafeTxtFilename(filename)) {
            return { success: false, error: 'Securitate: Cale sau nume fisier invalid.' };
        }

        assertDirectoryExists(raspunsPath, 'Răspuns');

        const filePath = resolveInside(raspunsPath, filename);

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `Fisierul de raspuns nu a fost gasit: ${filename}` };
        }

        const stat = fs.statSync(filePath);
        const MAX_SIZE = 64 * 1024; // 64 KB
        if (stat.size > MAX_SIZE) {
            return { success: false, error: 'Fișierul de răspuns este prea mare pentru parsare.' };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (err) {
        console.error('[FiscalNet Pilot] Eroare citire raspuns:', err);
        return { success: false, error: serializeError(err) };
    }
});

// Handlers IPC SQLite offline cache
ipcMain.handle('sqlite:save-bundle', async (event, { storeId, bundle }) => {
    try {
        return saveCacheBundle(storeId, bundle);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error saving cache bundle:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:search-products', async (event, { storeId, queryText, limit }) => {
    try {
        return searchLocalProducts(storeId, queryText, limit);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error searching products:', err);
        return [];
    }
});

ipcMain.handle('sqlite:get-product-by-barcode', async (event, { storeId, barcode }) => {
    try {
        return getLocalProductByBarcode(storeId, barcode);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting product by barcode:', err);
        return null;
    }
});

ipcMain.handle('sqlite:get-cache-status', async (event, { storeId }) => {
    try {
        return getLocalCacheStatus(storeId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting cache status:', err);
        return { initialized: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:save-shift', async (event, { shift }) => {
    try {
        return saveLocalShiftState(shift);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error saving shift state:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:get-shift', async (event, { storeId, cashierId }) => {
    try {
        return getLocalShiftState(storeId, cashierId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting shift state:', err);
        return null;
    }
});

ipcMain.handle('sqlite:get-device-info', async () => {
    try {
        return getOrCreateDeviceInfo(app.getPath('userData'));
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting device info:', err);
        return { fingerprint: 'unknown_fingerprint_err', name: 'unknown_name_err' };
    }
});

ipcMain.handle('sqlite:validate-cart-items', async (event, { storeId, itemIds }) => {
    try {
        return validateCartItemsLocal(storeId, itemIds);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error validating cart items:', err);
        return { valid: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:enqueue-offline-sale', async (event, { sale }) => {
    try {
        return enqueueOfflineSale(sale);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error enqueuing offline sale:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:list-offline-sales', async (event, { storeId }) => {
    try {
        return listOfflineSales(storeId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error listing offline sales:', err);
        return [];
    }
});

ipcMain.handle('sqlite:get-offline-sale', async (event, { localSaleId }) => {
    try {
        return getOfflineSale(localSaleId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting offline sale:', err);
        return null;
    }
});

ipcMain.handle('sqlite:update-offline-sale-status', async (event, { localSaleId, status, errorMsg, syncedSaleId }) => {
    try {
        return updateOfflineSaleStatus(localSaleId, status, errorMsg, syncedSaleId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error updating offline sale status:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:delete-offline-sale', async (event, { localSaleId }) => {
    try {
        return deleteOfflineSale(localSaleId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error deleting offline sale:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:get-offline-sales-summary', async (event, { storeId }) => {
    try {
        return getOfflineSalesSummary(storeId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting offline sales summary:', err);
        return { queuedCount: 0, queuedTotal: 0, lastSale: null };
    }
});

// POS Kiosk/Fullscreen/Resolution and Custom SQLite Handlers
ipcMain.handle('app:set-kiosk-mode', async (event, enabled) => {
    try {
        const value = !!enabled;
        console.log(`[AppControls] Setting kiosk mode: ${value}`);
        if (win) {
            win.setKiosk(value);
            if (!value) {
                win.setFullScreen(false);
                win.maximize();
            }
        }
        return { success: true };
    } catch (err) {
        console.error('[AppControls] Error setting kiosk mode:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('app:set-fullscreen-mode', async (event, enabled) => {
    try {
        const value = !!enabled;
        console.log(`[AppControls] Setting fullscreen mode: ${value}`);
        if (win) {
            win.setFullScreen(value);
            if (!value) {
                win.maximize();
            }
        }
        return { success: true };
    } catch (err) {
        console.error('[AppControls] Error setting fullscreen mode:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('app:get-window-state', async () => {
    try {
        if (win) {
            return {
                isKiosk: win.isKiosk(),
                isFullscreen: win.isFullScreen(),
                isMaximized: win.isMaximized()
            };
        }
        return { isKiosk: false, isFullscreen: false, isMaximized: false };
    } catch (err) {
        console.error('[AppControls] Error getting window state:', err);
        return { isKiosk: false, isFullscreen: false, isMaximized: false };
    }
});

ipcMain.handle('app:get-screen-size', async () => {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        return {
            width: primaryDisplay.workAreaSize.width,
            height: primaryDisplay.workAreaSize.height
        };
    } catch (err) {
        console.error('[AppControls] Error getting screen size:', err);
        return { width: 1024, height: 768 };
    }
});

ipcMain.handle('sqlite:get-all-products', async (event, { storeId }) => {
    try {
        return getAllLocalProducts(storeId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting all products:', err);
        return [];
    }
});

ipcMain.handle('sqlite:log-cart-event', async (event, cartEvent) => {
    try {
        return logPosCartEvent(cartEvent);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error logging cart event:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:list-cart-events', async (event, { storeId }) => {
    try {
        return listLocalPosCartEvents(storeId);
    } catch (err) {
        console.error('[Electron SQLite IPC] Error listing cart events:', err);
        return [];
    }
});

ipcMain.handle('sqlite:get-categories', async (event) => {
    try {
        return getLocalCategories();
    } catch (err) {
        console.error('[Electron SQLite IPC] Error getting local categories:', err);
        return [];
    }
});