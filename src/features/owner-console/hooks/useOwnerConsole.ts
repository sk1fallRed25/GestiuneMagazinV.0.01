import { useState, useEffect, useCallback } from 'react';
import { ownerConsoleService } from '../services/ownerConsoleService';
import { OwnerConsoleStats, OwnerStore, OwnerStoreMember, OwnerMemberRole } from '../types';
import { useAuth } from '../../auth/useAuth';

export const useOwnerConsole = () => {
  const { role } = useAuth();
  const [stats, setStats] = useState<OwnerConsoleStats | null>(null);
  const [stores, setStores] = useState<OwnerStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStoreMembers, setSelectedStoreMembers] = useState<OwnerStoreMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
      if (data.stores.length > 0) {
        setSelectedStoreId(data.stores[0].id);
        setSelectedStoreMembers(data.selectedStoreMembers);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nu s-au putut încărca datele.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectStore = useCallback(async (storeId: string) => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      return;
    }

    setSelectedStoreId(storeId);
    setLoading(true);
    setError(null);
    try {
      const members = await ownerConsoleService.getStoreMembers(storeId);
      setSelectedStoreMembers(members);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nu s-au putut încărca datele.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  const toggleMemberActive = useCallback(async (storeId: string, profileId: string, active: boolean) => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      return;
    }

    setError(null);
    try {
      await ownerConsoleService.setStoreMemberActive(storeId, profileId, active);
      // Actualizează starea locală
      setSelectedStoreMembers(prev => prev.map(m => (m.storeId === storeId && m.profileId === profileId) ? { ...m, active } : m));
      // Reîmprospătează statisticile generale
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operațiunea nu a putut fi finalizată.';
      setError(message);
      throw err;
    }
  }, [role]);

  const changeMemberRole = useCallback(async (storeId: string, profileId: string, memberRole: OwnerMemberRole) => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      return;
    }

    setError(null);
    try {
      await ownerConsoleService.updateStoreMemberRole(storeId, profileId, memberRole);
      // Actualizează starea locală
      setSelectedStoreMembers(prev => prev.map(m => (m.storeId === storeId && m.profileId === profileId) ? { ...m, role: memberRole } : m));
      // Reîmprospătează statisticile generale
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operațiunea nu a putut fi finalizată.';
      setError(message);
      throw err;
    }
  }, [role]);

  return {
    stats,
    stores,
    selectedStoreId,
    selectedStoreMembers,
    loading,
    error,
    selectStore,
    toggleMemberActive,
    changeMemberRole,
    refreshData: loadInitialData
  };
};
