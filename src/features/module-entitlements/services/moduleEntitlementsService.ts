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
  }
};
