import React, { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/ui';
import { 
    Info, Database, Wifi, WifiOff, AlertTriangle, 
    CheckCircle2, RefreshCw, ShieldAlert, Bug
} from 'lucide-react';
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
        } catch (err) {
            console.error('[StoreDiagnosticsPanel] Error loading diagnostics:', err);
        } finally {
            setLoading(false);
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
        </Card>
    );
};
