import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../shared/supabase/supabaseClient';
import toast from 'react-hot-toast';

export interface LocalCacheStatus {
    initialized: boolean;
    productCount?: number;
    priceCount?: number;
    stockCount?: number;
    categoryCount?: number;
    lastSyncAt?: string | null;
    checksum?: string | null;
    syncType?: string | null;
    rowCountsJson?: string;
    error?: string;
}

export function usePosOfflineCache(storeId: string | null) {
    const [syncStatus, setSyncStatus] = useState<LocalCacheStatus | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const loadCacheStatus = useCallback(async () => {
        if (!storeId || !window.electronAPI?.sqlite) {
            setSyncStatus(null);
            return;
        }

        try {
            const status = await window.electronAPI.sqlite.getCacheStatus({ storeId });
            setSyncStatus(status);
        } catch (err: any) {
            console.error('[usePosOfflineCache] Error reading cache status:', err);
            setSyncStatus({ initialized: false, error: err.message });
        }
    }, [storeId]);

    // Initial load
    useEffect(() => {
        loadCacheStatus();
    }, [loadCacheStatus]);

    const triggerSync = async () => {
        if (!storeId) {
            toast.error('Nu este selectat niciun magazin.');
            return { success: false, error: 'Store not selected' };
        }

        if (!window.electronAPI?.sqlite) {
            console.warn('[usePosOfflineCache] SQLite is not available (not running in Electron).');
            return { success: false, error: 'SQLite is only available in desktop runtime' };
        }

        setIsSyncing(true);
        setSyncError(null);
        const toastId = toast.loading('Se inițializează sincronizarea datelor...');

        try {
            // 1. Get device fingerprint and name from local configuration
            const devInfo = await window.electronAPI.sqlite.getDeviceInfo();
            if (!devInfo || !devInfo.fingerprint) {
                throw new Error('Nu s-a putut obține identitatea dispozitivului.');
            }

            toast.loading('Se verifică înregistrarea dispozitivului pe server...', { id: toastId });

            // 2. Fetch device registry from Supabase
            let { data: device, error: devError } = await supabase
                .from('pos_devices')
                .select('id, active')
                .eq('store_id', storeId)
                .eq('device_fingerprint', devInfo.fingerprint)
                .maybeSingle();

            if (devError) {
                throw new Error(`Eroare verificare dispozitiv: ${devError.message}`);
            }

            // 3. Register or reactivate device on-the-fly if not found or inactive (requires admin/manager session to write)
            if (!device || !device.active) {
                toast.loading(
                    !device 
                        ? 'Dispozitiv nou detectat. Se încearcă înregistrarea...' 
                        : 'Dispozitiv inactiv detectat. Se încearcă reactivarea...', 
                    { id: toastId }
                );
                
                const { data: regData, error: regError } = await supabase.rpc('register_pos_device', {
                    p_store_id: storeId,
                    p_device_fingerprint: devInfo.fingerprint,
                    p_device_name: devInfo.name
                });

                if (regError) {
                    console.error('[usePosOfflineCache] Device registration/reactivation failed:', regError);
                    if (!device) {
                        throw new Error('Acest calculator POS nu este înregistrat. Te rugăm să te autentifici ca Administrator sau Manager pentru a-l înregistra prima dată.');
                    } else {
                        throw new Error('Acest dispozitiv este dezactivat de administrator pe server. Doar un Administrator sau Manager îl poate reactiva.');
                    }
                }
                device = regData;
            }

            if (!device) {
                throw new Error('Dispozitivul POS nu a fost găsit sau nu a putut fi înregistrat.');
            }

            // 4. Verify the registered device is active
            if (!device.active) {
                throw new Error('Acest dispozitiv a fost dezactivat de administrator pe server. Sincronizarea este blocată.');
            }

            toast.loading('Se descarcă pachetul de date de pe server...', { id: toastId });

            // 5. Fetch offline cache bundle from server (Supabase RPC)
            const { data: bundle, error: bundleError } = await supabase.rpc('get_offline_cache_bundle', {
                p_store_id: storeId,
                p_device_id: device.id
            });

            if (bundleError) {
                throw new Error(`Eroare descărcare catalog date: ${bundleError.message}`);
            }

            toast.loading('Se salvează datele local în baza de date offline...', { id: toastId });

            // 6. Write bundle to local SQLite database in Electron Main
            const saveRes = await window.electronAPI.sqlite.saveCacheBundle({
                storeId,
                bundle
            });

            if (saveRes && 'error' in saveRes && saveRes.error) {
                throw new Error(`Eroare salvare SQLite: ${saveRes.error}`);
            }

            // 7. Reload status and show success
            await loadCacheStatus();
            toast.success('Datele offline au fost sincronizate cu succes!', { id: toastId });
            setIsSyncing(false);
            return { success: true };
        } catch (err: any) {
            console.error('[usePosOfflineCache] Sync failed:', err);
            const errMsg = err.message || 'Eroare necunoscută la sincronizare.';
            setSyncError(errMsg);
            toast.error(`Sincronizarea a eșuat: ${errMsg}`, { id: toastId });
            setIsSyncing(false);
            return { success: false, error: errMsg };
        }
    };

    return {
        syncStatus,
        isSyncing,
        syncError,
        triggerSync,
        loadCacheStatus
    };
}
