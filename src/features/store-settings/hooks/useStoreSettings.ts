// ─────────────────────────────────────────────────────────────
// useStoreSettings Hook — Etapa 6D.3
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { isAdminLike, isManagerLike } from '../../auth/permissions';
import { storeSettingsService, enforceVatPayerRules } from '../services/storeSettingsService';
import { StoreSettings, StoreSettingsResponse, DEFAULT_STORE_SETTINGS } from '../types';
import { toast } from 'react-hot-toast';

interface UseStoreSettingsReturn {
  // Data
  settings: StoreSettings;
  storeInfo: {
    storeId: string | null;
    storeName: string;
    fiscalCode: string | null;
    active: boolean;
  };
  // State
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  saveSuccess: boolean;
  // Permissions
  canView: boolean;
  canEdit: boolean;
  // Actions
  setSettings: (updater: StoreSettings | ((prev: StoreSettings) => StoreSettings)) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
}

export const useStoreSettings = (): UseStoreSettingsReturn => {
  const { currentStoreId, role } = useAuth();

  // Permissions
  const canView = isManagerLike(role);
  const canEdit = isAdminLike(role);

  // State
  const [settings, setSettingsRaw] = useState<StoreSettings>({ ...DEFAULT_STORE_SETTINGS });
  const [storeInfo, setStoreInfo] = useState<{
    storeId: string | null;
    storeName: string;
    fiscalCode: string | null;
    active: boolean;
  }>({ storeId: null, storeName: '', fiscalCode: null, active: true });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Keep a snapshot of the server state for dirty comparison
  const serverSettingsRef = useRef<StoreSettings>({ ...DEFAULT_STORE_SETTINGS });

  const setSettings = useCallback((updater: StoreSettings | ((prev: StoreSettings) => StoreSettings)) => {
    setSettingsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setIsDirty(JSON.stringify(next) !== JSON.stringify(serverSettingsRef.current));
      setSaveSuccess(false);
      return next;
    });
  }, []);

  const applyResponse = useCallback((resp: StoreSettingsResponse) => {
    setStoreInfo({
      storeId: resp.storeId,
      storeName: resp.storeName,
      fiscalCode: resp.fiscalCode,
      active: resp.active,
    });
    setSettingsRaw(resp.settings);
    serverSettingsRef.current = resp.settings;
    setIsDirty(false);
    setError(null);
  }, []);

  // ─── Load ────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    if (!currentStoreId) {
      setError(canView && role === 'platform_owner'
        ? 'Selectează un magazin pentru a configura setările.'
        : !canView ? 'Nu ai permisiunea necesară pentru setările magazinului.' : 'Niciun magazin selectat.');
      setSettingsRaw({ ...DEFAULT_STORE_SETTINGS });
      setStoreInfo({ storeId: null, storeName: '', fiscalCode: null, active: true });
      return;
    }

    if (!canView) {
      setError('Nu ai permisiunea necesară pentru setările magazinului.');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const resp = await storeSettingsService.getStoreSettings(currentStoreId);
      applyResponse(resp);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la încărcarea setărilor.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, canView, role, applyResponse]);

  // ─── Save ────────────────────────────────────────────────────

  const save = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Nu poți salva modificări cât timp aplicația este offline.");
      return;
    }
    if (!currentStoreId || !canEdit) return;

    const enforced = enforceVatPayerRules(settings);
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const resp = await storeSettingsService.updateStoreSettings(currentStoreId, enforced);
      applyResponse(resp);
      setSaveSuccess(true);
      toast.success('✓ Setări actualizate');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la salvarea setărilor.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [currentStoreId, canEdit, settings, applyResponse]);

  // ─── Reset (discard changes) ─────────────────────────────────

  const reset = useCallback(() => {
    setSettingsRaw(serverSettingsRef.current);
    setIsDirty(false);
    setSaveSuccess(false);
    setError(null);
  }, []);

  // ─── Auto-load on store change ───────────────────────────────

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    settings,
    storeInfo,
    loading,
    saving,
    error,
    isDirty,
    saveSuccess,
    canView,
    canEdit,
    setSettings,
    save,
    reload,
    reset,
  };
};
