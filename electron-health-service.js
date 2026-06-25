import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDb } from './electron-sqlite-service.js';

export function checkHealth() {
    const health = {
        sqlite: { status: 'UNKNOWN', message: '' },
        backup: { status: 'UNKNOWN', message: '', lastBackup: null },
        disk: { status: 'UNKNOWN', message: '', freeBytes: 0, totalBytes: 0 },
        writeAccess: { status: 'UNKNOWN', message: '' },
        overallStatus: 'RED'
    };

    let redFlags = 0;
    let yellowFlags = 0;

    // 1. SQLite Integrity check
    try {
        const db = getDb();
        if (!db) {
            health.sqlite.status = 'RED';
            health.sqlite.message = 'Conexiunea la baza de date locală nu este deschisă.';
            redFlags++;
        } else {
            const check = db.pragma('integrity_check');
            if (check && check.length > 0 && check[0].integrity_check === 'ok') {
                health.sqlite.status = 'GREEN';
                health.sqlite.message = 'Integritatea bazei de date SQLite este OK.';
            } else {
                health.sqlite.status = 'RED';
                health.sqlite.message = 'Eroare integritate SQLite: ' + JSON.stringify(check);
                redFlags++;
            }
        }
    } catch (err) {
        health.sqlite.status = 'RED';
        health.sqlite.message = 'Eroare la verificarea integrității: ' + err.message;
        redFlags++;
    }

    // 2. Existence of recent backup
    try {
        const backupsDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupsDir)) {
            health.backup.status = 'YELLOW';
            health.backup.message = 'Nu s-a detectat folderul de backup.';
            yellowFlags++;
        } else {
            const files = fs.readdirSync(backupsDir);
            const backupFiles = files
                .filter(f => f.startsWith('offline_cache_backup_') && f.endsWith('.db'));
            
            if (backupFiles.length === 0) {
                health.backup.status = 'YELLOW';
                health.backup.message = 'Nu s-a găsit niciun fișier de backup local.';
                yellowFlags++;
            } else {
                backupFiles.sort((a, b) => b.localeCompare(a));
                const latestBackup = backupFiles[0];
                const stats = fs.statSync(path.join(backupsDir, latestBackup));
                health.backup.lastBackup = stats.mtime.toISOString();
                
                const ageMs = Date.now() - stats.mtimeMs;
                if (ageMs < 24 * 60 * 60 * 1000) {
                    health.backup.status = 'GREEN';
                    health.backup.message = `Recent backup: ${latestBackup} (${(ageMs / 3600000).toFixed(1)} ore în urmă).`;
                } else {
                    health.backup.status = 'YELLOW';
                    health.backup.message = `Ultimul backup este mai vechi de 24h: ${latestBackup}.`;
                    yellowFlags++;
                }
            }
        }
    } catch (err) {
        health.backup.status = 'YELLOW';
        health.backup.message = 'Eroare verificare backup: ' + err.message;
        yellowFlags++;
    }

    // 3. Free disk space
    try {
        const stats = fs.statfsSync(app.getPath('userData'));
        const freeBytes = stats.free * stats.bsize;
        const totalBytes = stats.blocks * stats.bsize;
        health.disk.freeBytes = freeBytes;
        health.disk.totalBytes = totalBytes;

        const freeMB = freeBytes / (1024 * 1024);
        
        if (freeMB < 100) {
            health.disk.status = 'RED';
            health.disk.message = `Spațiu disc critic de mic: ${freeMB.toFixed(1)} MB liberi.`;
            redFlags++;
        } else if (freeMB < 500) {
            health.disk.status = 'YELLOW';
            health.disk.message = `Spațiu disc scăzut: ${freeMB.toFixed(1)} MB liberi.`;
            yellowFlags++;
        } else {
            health.disk.status = 'GREEN';
            health.disk.message = `Spațiu disc sănătos: ${freeMB.toFixed(1)} MB liberi.`;
        }
    } catch (err) {
        health.disk.status = 'YELLOW';
        health.disk.message = 'Eroare citire spațiu disc: ' + err.message;
        yellowFlags++;
    }

    // 4. Write access to AppData
    const tempFile = path.join(app.getPath('userData'), '.healthcheck_write_test_' + Date.now());
    try {
        fs.writeFileSync(tempFile, 'write_test', 'utf8');
        fs.unlinkSync(tempFile);
        health.writeAccess.status = 'GREEN';
        health.writeAccess.message = 'Permisiunile de scriere în AppData sunt active.';
    } catch (err) {
        health.writeAccess.status = 'RED';
        health.writeAccess.message = 'Eroare scriere AppData: ' + err.message;
        redFlags++;
    }

    // Overall status determination
    if (redFlags > 0) {
        health.overallStatus = 'RED';
    } else if (yellowFlags > 0) {
        health.overallStatus = 'YELLOW';
    } else {
        health.overallStatus = 'GREEN';
    }

    return health;
}
