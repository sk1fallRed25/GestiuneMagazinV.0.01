import React from 'react';
import { usePosOfflineCache } from '../hooks/usePosOfflineCache';
import { Database, RefreshCw, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface OfflineCacheSyncPanelProps {
    storeId: string | null;
}

export const OfflineCacheSyncPanel: React.FC<OfflineCacheSyncPanelProps> = ({ storeId }) => {
    const isDesktop = !!window.electronAPI;
    const { syncStatus, isSyncing, syncError, triggerSync } = usePosOfflineCache(storeId);

    // Calculate age of sync
    const getSyncAgeStatus = () => {
        if (!syncStatus || !syncStatus.lastSyncAt) {
            return {
                label: 'Niciodată sincronizat',
                color: 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400',
                icon: <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />,
                severity: 'expired'
            };
        }

        const lastSync = new Date(syncStatus.lastSyncAt);
        const now = new Date();
        const ageHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

        if (ageHours > 48) {
            return {
                label: 'Expirat (Blocat) - Peste 48 ore',
                color: 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400',
                icon: <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />,
                severity: 'expired'
            };
        } else if (ageHours > 24) {
            return {
                label: 'Atenție (Date Stale) - Peste 24 ore',
                color: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/50 dark:text-yellow-400',
                icon: <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
                severity: 'stale'
            };
        }

        return {
            label: 'Date Sincronizate la zi',
            color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-400',
            icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
            severity: 'ok'
        };
    };

    const ageStatus = getSyncAgeStatus();
    const formattedDate = syncStatus?.lastSyncAt 
        ? new Date(syncStatus.lastSyncAt).toLocaleString('ro-RO')
        : 'Niciodată';

    const handleSync = async () => {
        if (isSyncing) return;
        await triggerSync();
    };

    if (!isDesktop) {
        return (
            <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="w-6 h-6 text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Date Offline Cache (SQLite)</h3>
                </div>
                <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">Această facilitate este disponibilă exclusiv în aplicația desktop packaged (Electron).</p>
                        <p className="text-xs mt-1 text-blue-700/80 dark:text-blue-400/80">În modul browser, aplicația se bazează direct pe conexiunea de rețea Supabase live.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-zinc-900 dark:border-zinc-800" data-testid="offline-cache-sync-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 text-blue-600 rounded-xl bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Baza de Date Locală (Offline Cache)</h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Gestiune catalog produse, prețuri și stocuri pentru vânzări offline</p>
                    </div>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing || !storeId}
                    data-testid="sqlite-sync-now-button"
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white transition-all rounded-xl ${
                        isSyncing || !storeId
                            ? 'bg-blue-400 cursor-not-allowed opacity-70'
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/10'
                    }`}
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Se sincronizează...' : 'Sincronizează date offline'}
                </button>
            </div>

            {/* Status indicators */}
            <div className={`flex items-center gap-3 p-4 mb-6 border rounded-xl ${ageStatus.color}`} data-testid="sqlite-sync-status-badge">
                {ageStatus.icon}
                <div className="flex-1">
                    <p className="text-sm font-bold">{ageStatus.label}</p>
                    <p className="text-xs opacity-90">Ultima actualizare: {formattedDate}</p>
                </div>
            </div>

            {/* Error Message */}
            {syncError && (
                <div className="p-4 mb-6 text-sm text-red-800 border border-red-200 rounded-xl bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
                    <span className="font-bold">Eroare sincronizare: </span>
                    {syncError}
                </div>
            )}

            {/* Row counts */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Produse</p>
                    <p className="text-2xl font-black text-gray-800 mt-1 dark:text-zinc-200" data-testid="sqlite-count-products">
                        {syncStatus?.initialized ? syncStatus.productCount : 0}
                    </p>
                </div>
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Prețuri active</p>
                    <p className="text-2xl font-black text-gray-800 mt-1 dark:text-zinc-200" data-testid="sqlite-count-prices">
                        {syncStatus?.initialized ? syncStatus.priceCount : 0}
                    </p>
                </div>
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Loturi Stoc</p>
                    <p className="text-2xl font-black text-gray-800 mt-1 dark:text-zinc-200" data-testid="sqlite-count-stocks">
                        {syncStatus?.initialized ? syncStatus.stockCount : 0}
                    </p>
                </div>
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Categorii</p>
                    <p className="text-2xl font-black text-gray-800 mt-1 dark:text-zinc-200" data-testid="sqlite-count-categories">
                        {syncStatus?.initialized ? syncStatus.categoryCount : 0}
                    </p>
                </div>
            </div>

            <div className="mt-6 text-xs text-gray-400 dark:text-zinc-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                <p>
                    Baza de date locală SQLite este securizată cu tranzacții ACID și previne pierderea datelor dacă terminalul se defectează sau dacă alimentarea este oprită brusc.
                </p>
            </div>
        </div>
    );
};
