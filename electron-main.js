import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Handlers IPC securizate pentru Pilotul Controlat FiscalNet
ipcMain.handle('write-fiscal-net-file', async (event, { bonuriPath, filename, content }) => {
    try {
        if (!bonuriPath || !filename || !content) {
            return { success: false, error: 'Path, filename sau continut lipsa.' };
        }
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return { success: false, error: 'Securitate: Cale invalida in filename.' };
        }
        if (!filename.endsWith('.txt')) {
            return { success: false, error: 'Extensie invalida. Doar .txt este permis.' };
        }

        if (!fs.existsSync(bonuriPath)) {
            return { success: false, error: `Folderul de bonuri nu exista la calea specificata: ${bonuriPath}` };
        }

        const finalPath = path.join(bonuriPath, filename);

        if (fs.existsSync(finalPath)) {
            return { success: false, error: `Fisierul ${filename} exista deja. Nu rescriem pentru a evita dublarea bonului.` };
        }

        const tempPath = path.join(bonuriPath, filename.replace('.txt', '.tmp'));

        fs.writeFileSync(tempPath, content, 'utf8');
        fs.renameSync(tempPath, finalPath);

        console.log(`[FiscalNet Pilot] Scris bon in folder: ${finalPath}`);
        return { success: true, filePath: finalPath };
    } catch (err) {
        console.error('[FiscalNet Pilot] Eroare scriere bon:', err);
        return { success: false, error: err.message || String(err) };
    }
});

ipcMain.handle('read-fiscal-net-response', async (event, { raspunsPath, filename }) => {
    try {
        if (!raspunsPath || !filename) {
            return { success: false, error: 'Cale sau filename lipsa.' };
        }
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return { success: false, error: 'Securitate: Cale invalida in filename.' };
        }
        if (!filename.endsWith('.txt')) {
            return { success: false, error: 'Extensie invalida. Doar .txt este permis.' };
        }

        const filePath = path.join(raspunsPath, filename);

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `Fisierul de raspuns nu a fost gasit: ${filename}` };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (err) {
        console.error('[FiscalNet Pilot] Eroare citire raspuns:', err);
        return { success: false, error: err.message || String(err) };
    }
});