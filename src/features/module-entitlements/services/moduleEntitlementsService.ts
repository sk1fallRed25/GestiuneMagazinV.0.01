import { supabase } from '../../../supabaseClient';
import { 
  PlatformModule, 
  StoreModuleAccessItem, 
  parsePlatformModule, 
  parseStoreModuleAccessItem 
} from '../types';

export const moduleEntitlementsService = {
  /**
   * Retrieves all modules registered on the platform.
   */
  async getPlatformModules(): Promise<PlatformModule[]> {
    try {
      const { data, error } = await supabase.rpc('get_platform_modules');
      if (error) {
        console.error('getPlatformModules RPC error:', error);
        return [];
      }
      if (!data || !Array.isArray(data)) {
        return [];
      }
      return data.map(item => parsePlatformModule(item));
    } catch (err) {
      console.error('getPlatformModules service error:', err);
      return [];
    }
  },

  /**
   * Retrieves the effective access state of all platform modules for a specific store.
   * If storeId is null and the current user is a platform owner, this retrieves the global default settings.
   */
  async getStoreModuleAccess(storeId: string | null): Promise<StoreModuleAccessItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_store_module_access', {
        p_store_id: storeId
      });

      if (error) {
        console.error(`getStoreModuleAccess RPC error for store ${storeId}:`, error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map(item => parseStoreModuleAccessItem(item));
    } catch (err) {
      console.error(`getStoreModuleAccess service error for store ${storeId}:`, err);
      return [];
    }
  },

  /**
   * Safe check for dynamic user access to a specific module under a store context.
   */
  async canAccessStoreModule(storeId: string | null, moduleKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_can_access_store_module', {
        p_store_id: storeId,
        p_module_key: moduleKey
      });

      if (error) {
        console.error(`user_can_access_store_module RPC error for store ${storeId}, module ${moduleKey}:`, error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error(`user_can_access_store_module service error for store ${storeId}, module ${moduleKey}:`, err);
      return false;
    }
  },

  /**
   * Set dynamic module access overrides for a specific store.
   */
  async setStoreModuleAccess(payload: {
    storeId: string;
    moduleKey: string;
    enabled: boolean;
    reason?: string | null;
  }): Promise<{
    ok: boolean;
    storeId: string;
    moduleKey: string;
    enabled: boolean;
    changed: boolean;
    effectiveEnabled: boolean;
    reason?: string | null;
  }> {
    try {
      const { data, error } = await supabase.rpc('set_store_module_access', {
        p_store_id: payload.storeId,
        p_module_key: payload.moduleKey,
        p_enabled: payload.enabled,
        p_reason: payload.reason || null
      });

      if (error) {
        console.error('setStoreModuleAccess RPC error:', error);
        throw new Error(error.message || 'Eroare la modificarea accesului la modul.');
      }

      const res = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      return {
        ok: !!res.ok,
        storeId: String(res.storeId || payload.storeId),
        moduleKey: String(res.moduleKey || payload.moduleKey),
        enabled: typeof res.enabled === 'boolean' ? res.enabled : payload.enabled,
        changed: typeof res.changed === 'boolean' ? res.changed : false,
        effectiveEnabled: typeof res.effectiveEnabled === 'boolean' ? res.effectiveEnabled : payload.enabled,
        reason: typeof res.reason === 'string' ? res.reason : (payload.reason || null)
      };
    } catch (err: unknown) {
      console.error('setStoreModuleAccess service error:', err);
      const msg = err instanceof Error ? err.message : 'Eroare necunoscută la modificarea accesului la modul.';
      throw new Error(msg);
    }
  },

  /**
   * Set multiple module access overrides at once (bulk preset application) for a store.
   */
  async bulkSetStoreModules(payload: {
    storeId: string;
    modules: Array<{
      moduleKey: string;
      enabled: boolean;
      reason?: string | null;
    }>;
  }): Promise<{
    updatedCount: number;
    enabledModules: string[];
    disabledModules: string[];
    skippedModules: string[];
  }> {
    try {
      // Map to snake_case module_key as expected by bulk_set_store_modules parameter constraints
      const mappedModules = payload.modules.map(m => ({
        module_key: m.moduleKey,
        enabled: m.enabled,
        reason: m.reason || null
      }));

      const { data, error } = await supabase.rpc('bulk_set_store_modules', {
        p_store_id: payload.storeId,
        p_modules: mappedModules
      });

      if (error) {
        console.error('bulkSetStoreModules RPC error:', error);
        throw new Error(error.message || 'Eroare la modificarea în masă a modulelor.');
      }

      const res = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      return {
        updatedCount: typeof res.updatedCount === 'number' ? res.updatedCount : 0,
        enabledModules: Array.isArray(res.enabledModules) ? res.enabledModules.map(String) : [],
        disabledModules: Array.isArray(res.disabledModules) ? res.disabledModules.map(String) : [],
        skippedModules: Array.isArray(res.skippedModules) ? res.skippedModules.map(String) : []
      };
    } catch (err: unknown) {
      console.error('bulkSetStoreModules service error:', err);
      const msg = err instanceof Error ? err.message : 'Eroare necunoscută la modificarea în masă a modulelor.';
      throw new Error(msg);
    }
  }
};
