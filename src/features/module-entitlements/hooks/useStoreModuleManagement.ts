import { useState, useEffect, useCallback, useMemo } from 'react';
import { moduleEntitlementsService } from '../services/moduleEntitlementsService';
import { StoreModuleAccessItem } from '../types';
import { COMMERCIAL_PRESETS } from '../modulePresets';

export const useStoreModuleManagement = (storeId: string | null) => {
  const [modules, setModules] = useState<StoreModuleAccessItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null);

  const moduleMap = useMemo(() => {
    const map: Record<string, StoreModuleAccessItem> = {};
    modules.forEach(m => {
      map[m.moduleKey] = m;
    });
    return map;
  }, [modules]);

  const loadModules = useCallback(async () => {
    if (!storeId) {
      setModules([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await moduleEntitlementsService.getStoreModuleAccess(storeId);
      setModules(data);
    } catch (err: unknown) {
      console.error('Failed to load store modules:', err);
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea modulelor magazinului.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const toggleModule = useCallback(
    async (moduleKey: string, enabled: boolean, reason?: string | null): Promise<boolean> => {
      if (!storeId) {
        setError('Niciun magazin selectat.');
        return false;
      }
      setSavingModuleKey(moduleKey);
      setError(null);
      try {
        await moduleEntitlementsService.setStoreModuleAccess({
          storeId,
          moduleKey,
          enabled,
          reason
        });
        // Reload after success
        const data = await moduleEntitlementsService.getStoreModuleAccess(storeId);
        setModules(data);
        return true;
      } catch (err: unknown) {
        console.error(`Failed to toggle module ${moduleKey}:`, err);
        setError(err instanceof Error ? err.message : 'Eroare la salvarea modificării.');
        return false;
      } finally {
        setSavingModuleKey(null);
      }
    },
    [storeId]
  );

  const applyPreset = useCallback(
    async (presetKey: string): Promise<boolean> => {
      if (!storeId) {
        setError('Niciun magazin selectat.');
        return false;
      }

      const preset = COMMERCIAL_PRESETS.find(p => p.key === presetKey);
      if (!preset) {
        setError(`Pachetul "${presetKey}" nu este recunoscut.`);
        return false;
      }

      setLoading(true);
      setError(null);
      try {
        // Calculate which modules should be enabled/disabled
        // Planned and disabled modules are excluded from the payload
        // Owner only modules are also excluded from toggling
        const payloadModules = modules
          .filter(m => m.status !== 'planned' && m.status !== 'disabled' && !m.ownerOnly)
          .map(m => {
            const shouldBeEnabled = preset.moduleKeys.includes(m.moduleKey);
            return {
              moduleKey: m.moduleKey,
              enabled: shouldBeEnabled,
              reason: `Aplicare pachet ${preset.name}`
            };
          });

        if (payloadModules.length === 0) {
          setError('Niciun modul eligibil pentru actualizare.');
          setLoading(false);
          return false;
        }

        await moduleEntitlementsService.bulkSetStoreModules({
          storeId,
          modules: payloadModules
        });

        // Reload after success
        const data = await moduleEntitlementsService.getStoreModuleAccess(storeId);
        setModules(data);
        return true;
      } catch (err: unknown) {
        console.error(`Failed to apply preset ${presetKey}:`, err);
        setError(err instanceof Error ? err.message : 'Eroare la aplicarea pachetului comercial.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [storeId, modules]
  );

  return {
    modules,
    moduleMap,
    loading,
    error,
    savingModuleKey,
    refresh: loadModules,
    toggleModule,
    applyPreset
  };
};
