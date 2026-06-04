import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeUpdater } from './electron-updater-service.js';
import { initDb, saveCacheBundle, searchLocalProducts, getLocalProductByBarcode, getLocalCacheStatus, saveLocalShiftState, getLocalShiftState, getOrCreateDeviceInfo } from './electron-sqlite-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        // Setări specifice v0.1.2 pentru securitate POS
        fullscreen: true,           // Forțează aplicația în ecran complet
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
        console.error('Failed to initialize local database:', err);
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

ipcMain.handle('app:quit', () => {
    console.log('[AppControls] Quit requested via IPC.');
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