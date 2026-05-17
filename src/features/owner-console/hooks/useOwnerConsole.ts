import { useState, useEffect, useCallback } from 'react';
import { ownerConsoleService } from '../services/ownerConsoleService';
import { OwnerConsoleStats, OwnerStore, OwnerStoreMember, OwnerMemberRole } from '../types';

export const useOwnerConsole = () => {
  const [stats, setStats] = useState<OwnerConsoleStats | null>(null);
  const [stores, setStores] = useState<OwnerStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStoreMembers, setSelectedStoreMembers] = useState<OwnerStoreMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
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
      const message = err instanceof Error ? err.message : 'Eroare neașteptată la încărcarea datelor Owner Console.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectStore = useCallback(async (storeId: string) => {
    setSelectedStoreId(storeId);
    setLoading(true);
    setError(null);
    try {
      const members = await ownerConsoleService.getStoreMembers(storeId);
      setSelectedStoreMembers(members);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la obținerea membrilor magazinului.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleMemberActive = useCallback(async (memberId: string, active: boolean) => {
    setError(null);
    try {
      await ownerConsoleService.setStoreMemberActive(memberId, active);
      // Actualizează starea locală
      setSelectedStoreMembers(prev => prev.map(m => m.id === memberId ? { ...m, active } : m));
      // Reîmprospătează statisticile generale
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la modificarea stării membrului.';
      setError(message);
      throw err;
    }
  }, []);

  const changeMemberRole = useCallback(async (memberId: string, role: OwnerMemberRole) => {
    setError(null);
    try {
      await ownerConsoleService.updateStoreMemberRole(memberId, role);
      // Actualizează starea locală
      setSelectedStoreMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
      // Reîmprospătează statisticile generale
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la modificarea rolului membrului.';
      setError(message);
      throw err;
    }
  }, []);

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
