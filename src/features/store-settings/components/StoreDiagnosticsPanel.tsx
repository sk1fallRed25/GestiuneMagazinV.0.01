import React, { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/ui';
import { 
    Info, Database, Wifi, WifiOff, AlertTriangle, 
    CheckCircle2, RefreshCw, ShieldAlert, Bug, HardDrive
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSessionErrorCount } from '../../../shared/utils/errorReporter';
import { useNetworkStatus } from '../../../shared/network/useNetworkStatus';

const getUpdateStatusLabel = (status: string) => {
    switch (status) {
        case 'idle': return 'Inactiv';
        case 'checking': return 'Se verifică...';
        case 'not-available': return 'Aplicația este la zi';
        case 'available': return 'Update disponibil';
        case 'downloading': return 'Se descarcă...';
        case 'downloaded': return 'Gata de instalare';
        case 'error': return 'Eroare';
        default: return status;
    }
};

interface Props {
    storeId: string;
}

interface SQLiteState {
    initialized: boolean;
    corrupted: boolean;
    recreated: boolean;
    path: string;
    error: string | null;
}

export const StoreDiagnosticsPanel: React.FC<Props> = ({ storeId }) => {
    const { isOnline } = useNetworkStatus();
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [sqliteState, setSqliteState] = useState<SQLiteState>({
        initialized: false,
        corrupted: false,
        recreated: false,
        path: '',
        error: null
    });
    const [offlineCount, setOfflineCount] = useState(0);
    const [hasUnsyncedOver24h, setHasUnsyncedOver24h] = useState(false);
    const [sessionErrors, setSessionErrors] = useState(0);
    const [loading, setLoading] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('idle');

    // 6OPS.3 State variables
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [backupInfo, setBackupInfo] = useState<any>({ count: 0, totalSize: 0, lastBackup: null });
    const [backupLoading, setBackupLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const loadDiagnostics = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;

            // 1. Get version
            if (api.getAppVersion) {
                const version = await api.getAppVersion();
                setAppVersion(version);
            }

            // 2. Get SQLite State
            if (api.sqlite?.getState) {
                const state = await api.sqlite.getState();
                setSqliteState(state);
            }

            // 3. Get offline sales & check >24h
            if (api.sqlite?.listOfflineSales && storeId) {
                const sales = await api.sqlite.listOfflineSales({ storeId });
                const queued = sales.filter((s: any) => s.status === 'queued');
                setOfflineCount(queued.length);

                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                const oldQueued = queued.some((s: any) => {
                    const createdTime = new Date(s.created_at_local).getTime();
                    return createdTime < oneDayAgo;
                });
                setHasUnsyncedOver24h(oldQueued);
            }

            // 4. Get session errors
            setSessionErrors(getSessionErrorCount());

            // 5. Get auto-update status
            if (api.updater?.getUpdateStatus) {
                const updateInfo = await api.updater.getUpdateStatus();
                setUpdateStatus(updateInfo.status || 'idle');
            }

            // 6. Get Backup Info
            if (api.sqlite?.getBackupInfo) {
                const bInfo = await api.sqlite.getBackupInfo();
                setBackupInfo(bInfo);
            }

            // 7. Get Health Status
            if (api.health?.check) {
                const hStatus = await api.health.check();
                setHealthStatus(hStatus);
            }
        } catch (err) {
            console.error('[StoreDiagnosticsPanel] Error loading diagnostics:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        const api = (window as any).electronAPI;
        if (!api?.sqlite?.createBackup) {
            toast.error('API-ul de backup nu este disponibil.');
            return;
        }
        setBackupLoading(true);
        try {
            const res = await api.sqlite.createBackup();
            if (res && res.success) {
                toast.success(`Backup creat cu succes: ${res.filename}`);
                await loadDiagnostics();
            } else {
                throw new Error(res?.error || 'Eroare la crearea backup-ului.');
            }
        } catch (err: any) {
            console.error('[StoreDiagnosticsPanel] Manual backup failed:', err);
            toast.error(`Eroare la crearea backup-ului: ${err.message}`);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleOpenBackupFolder = async () => {
        const api = (window as any).electronAPI;
        if (!api?.sqlite?.openBackupFolder) {
            toast.error('API-ul pentru deschiderea folderului nu este disponibil.');
            return;
        }
        try {
            await api.sqlite.openBackupFolder();
        } catch (err: any) {
            console.error('[StoreDiagnosticsPanel] Open backup folder failed:', err);
            toast.error(`Eroare la deschiderea folderului: ${err.message}`);
        }
    };

    const handleRestoreBackup = async () => {
        const api = (window as any).electronAPI;
        if (!api?.sqlite?.selectBackupFile || !api?.sqlite?.validateBackupFile || !api?.sqlite?.restoreBackup || !api?.sqlite?.relaunchApp) {
            toast.error('Mecanismul de restaurare nu este disponibil în acest mediu.');
            return;
        }

        try {
            // Step 1: Select backup file
            const fileRes = await api.sqlite.selectBackupFile();
            if (!fileRes || !fileRes.success || fileRes.cancelled || !fileRes.filePath) {
                return; // user cancelled
            }

            const { filePath } = fileRes;

            // Step 2: Validate SQLite integrity and schema
            setRestoreLoading(true);
            const valRes = await api.sqlite.validateBackupFile({ filePath });
            setRestoreLoading(false);

            if (!valRes || !valRes.valid) {
                toast.error(`Verificarea fișierului de backup a eșuat: ${valRes?.error || 'Format invalid'}`);
                return;
            }

            // Step 3: Prompt user confirmation
            const confirmed = window.confirm(
                `Ești sigur că vrei să restaurezi backup-ul?\nFișier: ${filePath.split(/[\\/]/).pop()}\n\nATENȚIE: Această acțiune va înlocui baza de date locală curentă și va RESTARTA aplicația imediat.`
            );

            if (!confirmed) return;

            // Step 4: Replace local database
            setRestoreLoading(true);
            const restoreRes = await api.sqlite.restoreBackup({ filePath });
            if (restoreRes && restoreRes.success) {
                toast.success('Baza de date a fost restaurată. Aplicația se restartează...');
                setTimeout(async () => {
                    await api.sqlite.relaunchApp();
                }, 1500);
            } else {
                throw new Error(restoreRes?.error || 'Eroare la înlocuirea fișierului.');
            }
        } catch (err: any) {
            console.error('[StoreDiagnosticsPanel] Restore failed:', err);
            toast.error(`Eroare la restaurarea backup-ului: ${err.message}`);
        } finally {
            setRestoreLoading(false);
        }
    };

    const handleExportStoreZip = async () => {
        const api = (window as any).electronAPI;
        if (!api?.sqlite?.exportStoreZip) {
            toast.error('API-ul de export nu este disponibil.');
            return;
        }
        setExportLoading(true);
        try {
            const res = await api.sqlite.exportStoreZip({
                storeId,
                metadata: {
                    offlineCount,
                    hasUnsyncedOver24h,
                    sqliteState: {
                        initialized: sqliteState.initialized,
                        recreated: sqliteState.recreated,
                        corrupted: sqliteState.corrupted
                    }
                }
            });

            if (res && res.success) {
                toast.success(`Export finalizat cu succes! Fișier: ${res.filePath}`);
            } else if (res && !res.cancelled) {
                throw new Error(res.error || 'Eroare la generarea arhivei.');
            }
        } catch (err: any) {
            console.error('[StoreDiagnosticsPanel] Export failed:', err);
            toast.error(`Eroare la export: ${err.message}`);
        } finally {
            setExportLoading(false);
        }
    };

    useEffect(() => {
        loadDiagnostics();
        const interval = setInterval(loadDiagnostics, 5000);
        return () => clearInterval(interval);
    }, [storeId]);

    const getSqliteBadge = () => {
        if (!sqliteState.initialized) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold uppercase">
                    <AlertTriangle size={12} /> Neinițializat
                </span>
            );
        }
        if (sqliteState.recreated) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-250 rounded-full text-xs font-bold uppercase" title={`Baza de date a fost recreată din cauza coruperii. Eroare inițială: ${sqliteState.error}`}>
                    <AlertTriangle size={12} /> Restaurat (Recreated)
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold uppercase">
                <CheckCircle2 size={12} /> Funcțional (WAL)
            </span>
        );
    };

    return (
        <Card className="p-6 border border-slate-300 shadow-sm flex flex-col gap-6" data-testid="store-diagnostics-card">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        🛡️ Centru de Diagnostic și Observabilitate
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Monitorizează în timp real starea serviciilor locale, baza de date și integritatea cozii de sincronizare.
                    </p>
                </div>
                <button
                    data-testid="diagnostics-refresh-button"
                    onClick={loadDiagnostics}
                    disabled={loading}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all active:scale-95 disabled:opacity-50"
                    title="Actualizează Observabilitate"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Health Check Alert / Status */}
            {healthStatus && (
                <div 
                    data-testid="health-status-banner"
                    className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${
                        healthStatus.overallStatus === 'GREEN' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : healthStatus.overallStatus === 'YELLOW'
                            ? 'bg-amber-50 border-amber-250 text-amber-800'
                            : 'bg-rose-50 border-rose-250 text-rose-800'
                    }`}
                >
                    <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                            healthStatus.overallStatus === 'GREEN'
                                ? 'bg-emerald-500 text-white'
                                : healthStatus.overallStatus === 'YELLOW'
                                ? 'bg-amber-500 text-white'
                                : 'bg-rose-500 text-white'
                        }`}>
                            {healthStatus.overallStatus === 'GREEN' ? '🟢' : healthStatus.overallStatus === 'YELLOW' ? '🟡' : '🔴'}
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold block opacity-60">Status Integritate & Backup (Disaster Recovery)</span>
                            <h3 className="text-sm font-black uppercase tracking-tight" data-testid="health-overall-status">
                                SISTEM {healthStatus.overallStatus === 'GREEN' ? 'EXCELENT' : healthStatus.overallStatus === 'YELLOW' ? 'AVERTISMENT' : 'CRITIC / COMPROMIS'}
                            </h3>
                            <p className="text-xs font-medium mt-0.5 opacity-80">
                                {healthStatus.overallStatus === 'GREEN' 
                                    ? 'Toate sistemele sunt funcționale, baza de date este validă și există un backup recent.'
                                    : healthStatus.overallStatus === 'YELLOW'
                                    ? 'Aplicația este operațională, dar există avertismente legate de spațiu disc sau lipsa backup-ului recent.'
                                    : 'Atenție! Există erori de integritate, spațiu disc critic sau probleme de scriere în AppData.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                        <span className="font-bold opacity-60">RAPORT DE DIAGNOSTIC</span>
                        <span>SQLite: <strong data-testid="health-sqlite-status">{healthStatus.sqlite.status}</strong></span>
                        <span>Backup: <strong data-testid="health-backup-status">{healthStatus.backup.status}</strong></span>
                        <span>Disc: <strong data-testid="health-disk-status">{healthStatus.disk.status}</strong></span>
                        <span>Scriere: <strong data-testid="health-write-status">{healthStatus.writeAccess.status}</strong></span>
                    </div>
                </div>
            )}

            {/* Warning if there are offline sales older than 24 hours */}
            {hasUnsyncedOver24h && (
                <div 
                    data-testid="diagnostics-24h-sync-warning"
                    className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-sm font-semibold animate-pulse"
                >
                    <ShieldAlert className="text-rose-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <span className="block font-bold uppercase tracking-tight text-xs text-rose-700">Alerte Sincronizare Critică</span>
                        <p className="mt-0.5 text-xs">Există tranzacții offline în coada de așteptare mai vechi de 24 de ore! Conectați terminalul la rețea pentru a preveni pierderea datelor fiscale.</p>
                    </div>
                </div>
            )}

            {/* Diagnostics details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Network diagnostics */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Conexiune Internet</span>
                            <span data-testid="diagnostics-network-status" className="text-sm font-black text-slate-700">
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* SQLite Diagnostics */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Database size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bazã Date Locală (SQLite)</span>
                            <div className="mt-1" data-testid="diagnostics-sqlite-status">
                                {getSqliteBadge()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Local Session Errors */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sessionErrors > 0 ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
                            <Bug size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Erori Sesiune Curentă</span>
                            <span data-testid="diagnostics-error-count" className={`text-base font-black ${sessionErrors > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {sessionErrors}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Database Version */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                        <Info size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Versiune Bază Date</span>
                        <span data-testid="diagnostics-db-version" className="text-sm font-bold text-slate-700">
                            Postgres 17 / SQLite 3
                        </span>
                    </div>
                </div>

                {/* Offline Sales Queue Count */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        ⏱️
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vânzări Coadă Offline</span>
                        <span data-testid="diagnostics-offline-queue-count" className="text-sm font-black text-slate-700">
                            {offlineCount} în așteptare
                        </span>
                    </div>
                </div>

                {/* Disk Space Diagnostics */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spațiu Liber Disc</span>
                        <span data-testid="diagnostics-disk-space" className="text-sm font-bold text-slate-700">
                            {healthStatus && healthStatus.disk.freeBytes 
                                ? `${formatBytes(healthStatus.disk.freeBytes)} liberi` 
                                : 'Se încarcă...'}
                        </span>
                    </div>
                </div>

                {/* Application version */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                        ℹ️
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Versiune Produs</span>
                        <span data-testid="diagnostics-app-version" className="text-sm font-bold text-slate-700">
                            v{appVersion}
                        </span>
                    </div>
                </div>

                {/* Auto-Update diagnostics */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <RefreshCw size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stare Auto-Update</span>
                        <span data-testid="diagnostics-update-status" className="text-sm font-bold text-slate-700">
                            {getUpdateStatusLabel(updateStatus)}
                        </span>
                    </div>
                </div>

            </div>

            {/* Backup & Disaster Recovery panel */}
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200 flex flex-col gap-6" data-testid="diagnostics-backup-recovery-panel">
                <div className="flex justify-between items-center border-b border-slate-250 pb-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            💾 Salvări de Siguranță & Recuperare Date (Disaster Recovery)
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Păstrează istoricul tranzacțiilor offline și starea bazei de date. Ultimele 30 de backup-uri sunt stocate local.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Database size={18} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Număr Backup-uri</span>
                            <span className="text-sm font-black text-slate-700" data-testid="backup-count">
                                {backupInfo.count} fișiere
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-sm font-bold">
                            KB
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dimensiune Totală</span>
                            <span className="text-sm font-black text-slate-700" data-testid="backup-total-size">
                                {formatBytes(backupInfo.totalSize)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            ⏱️
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ultimul Backup</span>
                            <span className="text-xs font-black text-slate-700 block truncate max-w-[160px]" data-testid="backup-last-time" title={backupInfo.lastBackup ? new Date(backupInfo.lastBackup).toLocaleString() : ''}>
                                {backupInfo.lastBackup ? new Date(backupInfo.lastBackup).toLocaleString() : 'Niciodată'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                    <button
                        data-testid="diagnostics-create-backup-button"
                        onClick={handleCreateBackup}
                        disabled={backupLoading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border border-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={backupLoading ? 'animate-spin' : ''} />
                        Creează Backup Acum
                    </button>

                    <button
                        data-testid="diagnostics-open-folder-button"
                        onClick={handleOpenBackupFolder}
                        className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm"
                    >
                        Deschide Folder Backup
                    </button>

                    <button
                        data-testid="diagnostics-restore-backup-button"
                        onClick={handleRestoreBackup}
                        disabled={restoreLoading}
                        className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-250 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        ⚡ Restore Backup
                    </button>

                    <button
                        data-testid="diagnostics-export-zip-button"
                        onClick={handleExportStoreZip}
                        disabled={exportLoading}
                        className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-250 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        📦 Export complet magazin (ZIP)
                    </button>
                </div>
            </div>
        </Card>
    );
};
