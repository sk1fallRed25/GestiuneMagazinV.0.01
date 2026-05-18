import { useState, useEffect, useCallback } from 'react';
import { ownerConsoleService } from '../services/ownerConsoleService';
import {
  OwnerConsoleStats,
  OwnerStore,
  OwnerStoreMember,
  OwnerMemberRole,
  OwnerProfile,
  UnassignedProfile,
  StoreWithoutAdmin,
  AssignStoreMemberPayload,
  CreateStorePayload,
  UpdateStorePayload,
  OwnerAuditLogView
} from '../types';
import { useAuth } from '../../auth/useAuth';

export type OwnerConsoleTab = 'overview' | 'stores' | 'profiles' | 'members' | 'audit';

export const useOwnerConsole = () => {
  const { role } = useAuth();
  const [stats, setStats] = useState<OwnerConsoleStats | null>(null);
  const [stores, setStores] = useState<OwnerStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStoreMembers, setSelectedStoreMembers] = useState<OwnerStoreMember[]>([]);

  // State-uri solicitate pentru Etapa 5E.2 și 5E.5
  const [profiles, setProfiles] = useState<OwnerProfile[]>([]);
  const [unassignedProfiles, setUnassignedProfiles] = useState<UnassignedProfile[]>([]);
  const [storesWithoutAdmin, setStoresWithoutAdmin] = useState<StoreWithoutAdmin[]>([]);
  const [auditLogs, setAuditLogs] = useState<OwnerAuditLogView[]>([]);
  const [selectedTab, setSelectedTab] = useState<OwnerConsoleTab>('overview');

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    if (role !== 'platform_owner') return;
    setLoadingAuditLogs(true);
    try {
      const logs = await ownerConsoleService.getOwnerAuditLogs(50);
      setAuditLogs(logs);
    } catch (err: unknown) {
      console.error("Eroare la încărcarea audit logs:", err);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [role]);

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
      setProfiles(data.profiles);
      setUnassignedProfiles(data.unassignedProfiles);
      setStoresWithoutAdmin(data.storesWithoutAdmin);

      if (data.stores.length > 0) {
        setSelectedStoreId(data.stores[0].id);
        setSelectedStoreMembers(data.selectedStoreMembers);
      }

      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nu s-au putut încărca datele.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [role, loadAuditLogs]);

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
      // Reîmprospătează toate datele
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
      setProfiles(data.profiles);
      setUnassignedProfiles(data.unassignedProfiles);
      setStoresWithoutAdmin(data.storesWithoutAdmin);
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operațiunea nu a putut fi finalizată.';
      setError(message);
      throw err;
    }
  }, [role, loadAuditLogs]);

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
      // Reîmprospătează toate datele
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setProfiles(data.profiles);
      setUnassignedProfiles(data.unassignedProfiles);
      setStoresWithoutAdmin(data.storesWithoutAdmin);
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operațiunea nu a putut fi finalizată.';
      setError(message);
      throw err;
    }
  }, [role, loadAuditLogs]);

  const assignMemberToStore = useCallback(async (payload: AssignStoreMemberPayload) => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ownerConsoleService.assignStoreMember(payload);
      // Reîmprospătează toate datele pentru a reflecta alocarea în UI
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
      setProfiles(data.profiles);
      setUnassignedProfiles(data.unassignedProfiles);
      setStoresWithoutAdmin(data.storesWithoutAdmin);
      if (selectedStoreId) {
        const members = await ownerConsoleService.getStoreMembers(selectedStoreId);
        setSelectedStoreMembers(members);
      } else if (data.stores.length > 0) {
        setSelectedStoreId(data.stores[0].id);
        setSelectedStoreMembers(data.selectedStoreMembers);
      }
      await loadAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operațiunea nu a putut fi finalizată.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [role, selectedStoreId, loadAuditLogs]);

  const createStore = useCallback(async (payload: CreateStorePayload): Promise<void> => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await ownerConsoleService.createStore(payload);
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
      setProfiles(data.profiles);
      setUnassignedProfiles(data.unassignedProfiles);
      setStoresWithoutAdmin(data.storesWithoutAdmin);

      setSelectedStoreId(res.storeId);
      const members = await ownerConsoleService.getStoreMembers(res.storeId);
      setSelectedStoreMembers(members);
      await loadAuditLogs();
    } catch (err: unknown) {
      let message = "Magazinul nu a putut fi creat.";
      if (err instanceof Error) {
        if (err.message.includes("Există deja") || err.message.includes("duplicat")) {
          message = "Există deja un magazin pentru acest CUI și punct de lucru.";
        } else {
          message = err.message;
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [role, loadAuditLogs]);

  const updateStore = useCallback(async (payload: UpdateStorePayload): Promise<void> => {
    if (role !== 'platform_owner') {
      setError("Acces permis doar pentru Platform Owner.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ownerConsoleService.updateStore(payload);
      const data = await ownerConsoleService.getOwnerConsoleData();
      setStats(data.stats);
      setStores(data.stores);
      setProfiles(data.profiles);
      setUnassignedProfiles(data.unassignedProfiles);
      setStoresWithoutAdmin(data.storesWithoutAdmin);

      if (selectedStoreId) {
        const members = await ownerConsoleService.getStoreMembers(selectedStoreId);
        setSelectedStoreMembers(members);
      }
      await loadAuditLogs();
    } catch (err: unknown) {
      let message = "Magazinul nu a putut fi actualizat.";
      if (err instanceof Error) {
        if (err.message.includes("Există deja") || err.message.includes("duplicat")) {
          message = "Există deja un magazin pentru acest CUI și punct de lucru.";
        } else {
          message = err.message;
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [role, selectedStoreId, loadAuditLogs]);

  return {
    stats,
    stores,
    selectedStoreId,
    selectedStoreMembers,
    profiles,
    unassignedProfiles,
    storesWithoutAdmin,
    auditLogs,
    selectedTab,
    setSelectedTab,
    loading,
    loadingAuditLogs,
    error,
    selectStore,
    toggleMemberActive,
    changeMemberRole,
    assignMemberToStore,
    createStore,
    updateStore,
    refreshData: loadInitialData,
    refreshAll: loadInitialData,
    loadAuditLogs
  };
};


