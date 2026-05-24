import { useState, useEffect, useCallback, useRef } from 'react';
import { StoreModuleAccessItem, ModuleAccessMap, toModuleAccessMap } from '../types';
import { moduleEntitlementsService } from '../services/moduleEntitlementsService';

export interface UseModuleEntitlementsResult {
  modules: StoreModuleAccessItem[];
  moduleMap: ModuleAccessMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isModuleEnabled: (moduleKey: string) => boolean;
  getModule: (moduleKey: string) => StoreModuleAccessItem | undefined;
}

export function useModuleEntitlements(
  storeId: string | null,
  role: string | null
): UseModuleEntitlementsResult {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<StoreModuleAccessItem[]>([]);
  const [moduleMap, setModuleMap] = useState<ModuleAccessMap>({});
  
  // Cache referenced by storeId (use 'global' for null)
  const cacheRef = useRef<Record<string, StoreModuleAccessItem[]>>({});

  const loadModules = useCallback(async (forceRefresh = false) => {
    // 1. If not a platform_owner and we have no storeId, return empty lists immediately
    if (!storeId && role !== 'platform_owner') {
      setModules([]);
      setModuleMap({});
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = storeId || 'global';

    // 2. If it is already in the cache and we are not forcing refresh, use it
    if (!forceRefresh && cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      setModules(cached);
      setModuleMap(toModuleAccessMap(cached));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await moduleEntitlementsService.getStoreModuleAccess(storeId);
      cacheRef.current[cacheKey] = items;
      setModules(items);
      setModuleMap(toModuleAccessMap(items));
    } catch (err) {
      console.error('Failed to load module entitlements:', err);
      setError('Nu s-au putut încărca permisiunile modulelor.');
      setModules([]);
      setModuleMap({});
    } finally {
      setLoading(false);
    }
  }, [storeId, role]);

  useEffect(() => {
    loadModules(false);
  }, [loadModules]);

  const refresh = useCallback(async () => {
    await loadModules(true);
  }, [loadModules]);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (moduleKey === 'owner_console' && role === 'platform_owner') {
      return true;
    }
    const item = moduleMap[moduleKey];
    return item ? item.effectiveEnabled : false;
  }, [moduleMap, role]);

  const getModule = useCallback((moduleKey: string): StoreModuleAccessItem | undefined => {
    return moduleMap[moduleKey];
  }, [moduleMap]);

  return {
    modules,
    moduleMap,
    loading,
    error,
    refresh,
    isModuleEnabled,
    getModule
  };
}
