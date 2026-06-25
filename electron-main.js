import { app, BrowserWindow, ipcMain, screen, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

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
    getDbState,
    createBackup, getBackupInfo, validateBackupFile, restoreBackup, getDb
} from './electron-sqlite-service.js';
import { checkHealth } from './electron-health-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// === TASK D 6SEC.1: Fiscal directory whitelist for IPC hardening ===
const ALLOWED_FISCAL_DIRS = new Set();

function registerAllowedFiscalDir(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') return;
    const normalized = path.resolve(dirPath);
    ALLOWED_FISCAL_DIRS.add(normalized.toLowerCase());
    mainLog.info(`[FiscalNet Security] Registered allowed directory: ${normalized}`);
}

function validateFiscalPath(dirPath, label) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
        throw new Error(`Calea pentru ${label} este obligatorie.`);
    }
    // Block path traversal patterns in the raw input
    if (dirPath.includes('..')) {
        throw new Error(`Securitate: traversal ('..') interzis in calea ${label}.`);
    }
    const normalized = path.resolve(dirPath);
    // Always allow userData subdirectories
    const userDataNorm = path.resolve(app.getPath('userData')).toLowerCase();
    const normalizedLower = normalized.toLowerCase();
    if (normalizedLower.startsWith(userDataNorm + path.sep) || normalizedLower === userDataNorm) {
        return normalized;
    }
    // Check registered whitelist
    if (ALLOWED_FISCAL_DIRS.size > 0) {
        const isAllowed = [...ALLOWED_FISCAL_DIRS].some(allowed =>
            normalizedLower.startsWith(allowed + path.sep) || normalizedLower === allowed
        );
        if (isAllowed) {
            return normalized;
        }
    }
    throw new Error(`Securitate: directorul ${label} ('${dirPath}') nu este in lista directoarelor aprobate. Inregistrati-l mai intai.`);
}
// === END TASK D ===

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

let isQuitting = false;

app.on('before-quit', async (event) => {
    if (isQuitting) return; // Allow normal exit
    
    // Prevent immediate exit to allow async backup to complete
    event.preventDefault();
    isQuitting = true;
    
    mainLog.info('[App] Running automated backup before quitting...');
    try {
        await createBackup();
        mainLog.info('[App] Automated shutdown backup completed.');
    } catch (err) {
        mainLog.error('[App] Automated shutdown backup failed:', err);
    } finally {
        app.quit();
    }
});

function scheduleDailyBackup() {
    const backupsDir = path.join(app.getPath('userData'), 'backups');
    
    const checkAndRunBackup = async () => {
        try {
            if (!fs.existsSync(backupsDir)) {
                await createBackup();
                return;
            }
            const files = fs.readdirSync(backupsDir);
            const backupFiles = files
                .filter(f => f.startsWith('offline_cache_backup_') && f.endsWith('.db'));
            
            if (backupFiles.length === 0) {
                await createBackup();
                return;
            }
            
            backupFiles.sort((a, b) => b.localeCompare(a));
            const latestBackup = backupFiles[0];
            const filePath = path.join(backupsDir, latestBackup);
            const stats = fs.statSync(filePath);
            const ageMs = Date.now() - stats.mtimeMs;
            
            if (ageMs >= 24 * 60 * 60 * 1000) {
                mainLog.info('[Backup Scheduler] Latest backup is older than 24h. Running backup...');
                await createBackup();
            }
        } catch (err) {
            mainLog.error('[Backup Scheduler] Failed check and run backup:', err);
        }
    };

    setTimeout(checkAndRunBackup, 5000);
    setInterval(checkAndRunBackup, 60 * 60 * 1000);
}

app.whenReady().then(() => {
    try {
        initDb(app.getPath('userData'));
        // 6OPS.3 Run startup backup and schedule periodic backups
        createBackup().catch(err => mainLog.error('Startup backup failed:', err));
        scheduleDailyBackup();
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
        // 6SEC.1: Validate fiscal paths against whitelist
        validateFiscalPath(bonuriPath, 'Bonuri');
        if (raspunsPath) validateFiscalPath(raspunsPath, 'Raspuns');

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
        // 6SEC.1: Validate fiscal path against whitelist
        validateFiscalPath(raspunsPath, 'Raspuns');

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

// 6SEC.1: IPC handler for registering allowed fiscal directories
ipcMain.handle('fiscal:register-allowed-dir', async (event, { dirPath }) => {
    try {
        if (!dirPath || typeof dirPath !== 'string') {
            return { success: false, error: 'Calea directorului este obligatorie.' };
        }
        registerAllowedFiscalDir(dirPath);
        return { success: true };
    } catch (err) {
        mainLog.error('[FiscalNet Security] Error registering allowed dir:', err);
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

// === 6OPS.3 Backup, Restore & Disaster Recovery IPC Handlers ===

ipcMain.handle('sqlite:create-backup', async () => {
    try {
        return await createBackup();
    } catch (err) {
        mainLog.error('[Backup IPC] Error creating manual backup:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:get-backup-info', async () => {
    try {
        return getBackupInfo();
    } catch (err) {
        mainLog.error('[Backup IPC] Error getting backup stats:', err);
        return { count: 0, totalSize: 0, lastBackup: null, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:open-backup-folder', async () => {
    try {
        const backupsDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        await shell.openPath(backupsDir);
        return { success: true };
    } catch (err) {
        mainLog.error('[Backup IPC] Error opening backup folder:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:select-backup-file', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Selectează fișierul de backup pentru restaurare',
            defaultPath: path.join(app.getPath('userData'), 'backups'),
            filters: [
                { name: 'Baze de date SQLite Backup', extensions: ['db'] }
            ],
            properties: ['openFile']
        });
        if (canceled || filePaths.length === 0) {
            return { success: false, cancelled: true };
        }
        return { success: true, filePath: filePaths[0] };
    } catch (err) {
        mainLog.error('[Restore IPC] Error selecting backup file:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:validate-backup-file', async (event, { filePath }) => {
    try {
        return validateBackupFile(filePath);
    } catch (err) {
        mainLog.error('[Restore IPC] Error validating backup file:', err);
        return { valid: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:restore-backup', async (event, { filePath }) => {
    try {
        return restoreBackup(filePath);
    } catch (err) {
        mainLog.error('[Restore IPC] Error restoring backup:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:relaunch-app', async () => {
    try {
        mainLog.info('[Restore IPC] Relaunching application...');
        app.relaunch();
        app.exit(0);
        return { success: true };
    } catch (err) {
        mainLog.error('[Restore IPC] Error relaunching application:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('sqlite:export-store-zip', async (event, { storeId, metadata }) => {
    try {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Export complet magazin (ZIP)',
            defaultPath: path.join(app.getPath('downloads'), `export_magazin_${storeId || 'unknown'}_${new Date().toISOString().slice(0, 10)}.zip`),
            filters: [
                { name: 'Arhivă ZIP', extensions: ['zip'] }
            ]
        });

        if (canceled || !filePath) return { success: false, cancelled: true };

        const tempDir = path.join(app.getPath('temp'), `export_magazin_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        // 1. Copy SQLite database safely using backup (to avoid lock issues)
        const tempDbPath = path.join(tempDir, 'offline_cache.db');
        const localDb = getDb();
        if (localDb) {
            await localDb.backup(tempDbPath);
        } else {
            const activeDbPath = path.join(app.getPath('userData'), 'offline_cache.db');
            if (fs.existsSync(activeDbPath)) {
                fs.copyFileSync(activeDbPath, tempDbPath);
            }
        }

        // 2. Copy logs folder
        const logsSrcDir = path.join(app.getPath('userData'), 'logs');
        const logsDestDir = path.join(tempDir, 'logs');
        if (fs.existsSync(logsSrcDir)) {
            fs.mkdirSync(logsDestDir, { recursive: true });
            const logFiles = fs.readdirSync(logsSrcDir);
            for (const file of logFiles) {
                fs.copyFileSync(path.join(logsSrcDir, file), path.join(logsDestDir, file));
            }
        }

        // 3. Write metadata and diagnostics info
        const diagInfo = {
            appVersion: app.getVersion(),
            storeId,
            exportTimestamp: new Date().toISOString(),
            os: {
                platform: process.platform,
                arch: process.arch,
                release: os.release(),
                totalmem: os.totalmem(),
                freemem: os.freemem()
            },
            metadata
        };
        fs.writeFileSync(path.join(tempDir, 'diagnostics.json'), JSON.stringify(diagInfo, null, 2), 'utf8');

        // 4. Compress to ZIP using PowerShell
        const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${filePath}' -Force"`;
        await execPromise(psCommand);

        // 5. Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        return { success: true, filePath };
    } catch (err) {
        mainLog.error('[Export IPC] Export failed:', err);
        return { success: false, error: serializeError(err) };
    }
});

ipcMain.handle('health:check', async () => {
    try {
        return checkHealth();
    } catch (err) {
        mainLog.error('[Health IPC] Health check failed:', err);
        return {
            overallStatus: 'RED',
            error: serializeError(err)
        };
    }
});