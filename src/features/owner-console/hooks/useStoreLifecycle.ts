import { useState, useEffect, useCallback } from 'react';
import { storeLifecycleService } from '../services/storeLifecycleService';
import { StoreLifecycleStatusResponse, StoreDeletionEligibility } from '../types';

export const useStoreLifecycle = (storeId: string | null, onSuccess?: () => void) => {
  const [lifecycle, setLifecycle] = useState<StoreLifecycleStatusResponse | null>(null);
  const [eligibility, setEligibility] = useState<StoreDeletionEligibility | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLifecycleStatus = useCallback(async (showLoader = true) => {
    if (!storeId) return;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await storeLifecycleService.getStoreLifecycleStatus(storeId);
      setLifecycle(res);
      if (res.deletionEligibility) {
        setEligibility(res.deletionEligibility);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la încărcarea stării magazinului.';
      setError(msg);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchLifecycleStatus(true);
    } else {
      setLifecycle(null);
      setEligibility(null);
    }
  }, [storeId, fetchLifecycleStatus]);

  const refresh = useCallback(async () => {
    await fetchLifecycleStatus(false);
  }, [fetchLifecycleStatus]);

  const checkDeletionEligibility = useCallback(async () => {
    if (!storeId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await storeLifecycleService.getStoreDeletionEligibility(storeId);
      setEligibility(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la verificarea eligibilității ștergerii.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const handleAction = useCallback(async (
    actionFn: (storeId: string, reason: string) => Promise<unknown>,
    reason: string
  ) => {
    if (!storeId) return false;
    setSaving(true);
    setError(null);
    try {
      await actionFn(storeId, reason);
      await fetchLifecycleStatus(false);
      if (onSuccess) {
        onSuccess();
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'A eșuat executarea acțiunii.';
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, [storeId, fetchLifecycleStatus, onSuccess]);

  const suspend = useCallback(async (reason: string) => {
    return handleAction(storeLifecycleService.suspendStore, reason);
  }, [handleAction]);

  const reactivate = useCallback(async (reason: string) => {
    return handleAction(storeLifecycleService.reactivateStore, reason);
  }, [handleAction]);

  const archive = useCallback(async (reason: string) => {
    return handleAction(storeLifecycleService.archiveStore, reason);
  }, [handleAction]);

  const requestDeletion = useCallback(async (reason: string) => {
    return handleAction(storeLifecycleService.requestStoreDeletion, reason);
  }, [handleAction]);

  const cancelDeletion = useCallback(async (reason: string) => {
    return handleAction(storeLifecycleService.cancelStoreDeletionRequest, reason);
  }, [handleAction]);

  return {
    lifecycle,
    eligibility,
    loading,
    saving,
    error,
    refresh,
    suspend,
    reactivate,
    archive,
    checkDeletionEligibility,
    requestDeletion,
    cancelDeletion
  };
};
