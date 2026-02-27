import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

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