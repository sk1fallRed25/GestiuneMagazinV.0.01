import React, { useState, useEffect, useCallback } from 'react';
import { aiConsentService } from '../services/aiConsentService';
import { StoreAiConsent, StoreAiConsentPatch } from '../types';

import { BrainCircuit, Info, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  storeId: string | null;
  canEdit: boolean;
}

export const AiConsentSettingsCard: React.FC<Props> = ({ storeId, canEdit }) => {
  const [consent, setConsent] = useState<StoreAiConsent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('Toate modificările sunt salvate');

  // Dialog States
  const [pendingToggle, setPendingToggle] = useState<
    'allowModelImprovement' | 'allowExternalAiProcessing' | 'allowCrossStoreTraining' | null
  >(null);
  const [modalChecked, setModalChecked] = useState<boolean>(false);

  // Load consent data
  const loadConsent = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiConsentService.getStoreAiConsent(storeId);
      setConsent(data);
      setSaveStatus('Toate modificările sunt salvate');
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea setărilor de consimțământ AI.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadConsent();
  }, [loadConsent]);

  // Save specific consent key
  const handleToggle = async (key: keyof StoreAiConsentPatch, currentValue: boolean) => {
    if (!storeId || !canEdit || !consent) return;

    const newValue = !currentValue;

    // Sensitive keys confirmation flow
    if (
      newValue &&
      (key === 'allowModelImprovement' ||
        key === 'allowExternalAiProcessing' ||
        key === 'allowCrossStoreTraining')
    ) {
      setPendingToggle(key);
      setModalChecked(false);
      return;
    }

    // Direct save for non-sensitive or disabling actions
    await savePatch({ [key]: newValue });
  };

  const savePatch = async (patch: Partial<StoreAiConsentPatch>) => {
    if (!storeId || !consent) return;

    setSaving(true);
    setSaveStatus('Se salvează...');
    try {
      const updated = await aiConsentService.updateStoreAiConsent(storeId, patch);
      setConsent(updated);
      setSaveStatus('Modificări salvate');
      toast.success('Setările de consimțământ AI au fost actualizate.');
    } catch (err: any) {
      setSaveStatus('Eroare la salvare');
      toast.error(err.message || 'Nu s-au putut salva setările.');
    } finally {
      setSaving(false);
    }
  };

  // Confirm Modal handlers
  const handleAcceptConfirm = async () => {
    if (!pendingToggle) return;
    const key = pendingToggle;
    setPendingToggle(null);
    setModalChecked(false);
    await savePatch({ [key]: true });
  };

  const handleCancelConfirm = () => {
    setPendingToggle(null);
    setModalChecked(false);
  };

  // UX States Renderers
  if (!storeId) {
    return null;
  }

  if (loading) {
    return (
      <div
        data-testid="ai-consent-loading"
        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]"
      >
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-650 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
          Se încarcă setările AI...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="ai-consent-error"
        className="bg-white rounded-3xl border border-red-100 shadow-sm p-8 flex flex-col items-center justify-center text-center gap-4"
      >
        <AlertTriangle size={36} className="text-red-500" />
        <div>
          <h4 className="font-extrabold text-gray-900 uppercase tracking-tight">Eroare încărcare</h4>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <button
          type="button"
          data-testid="ai-consent-retry"
          onClick={loadConsent}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-650 hover:bg-red-750 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-red-100"
        >
          <RefreshCw size={16} /> Reîncearcă
        </button>
      </div>
    );
  }

  if (!consent) {
    return null;
  }

  // Toggles Config List
  const toggles = [
    {
      key: 'aiConsultantEnabled' as const,
      label: 'Activează AI Consultant',
      description: 'Permite afișarea modulului AI Consultant pentru acest magazin.',
      testId: 'ai-consent-toggle-consultant',
      isSensitive: false,
    },
    {
      key: 'aiDataPreparationEnabled' as const,
      label: 'Permite pregătirea analizelor AI',
      description:
        'Aplicația poate calcula snapshot-uri agregate pe server pentru vânzări, stocuri, pierderi și expirări.',
      testId: 'ai-consent-toggle-data-preparation',
      isSensitive: false,
    },
    {
      key: 'allowModelImprovement' as const,
      label:
        'Permit folosirea datelor agregate și anonimizate pentru îmbunătățirea AI-ului platformei',
      description:
        'Datele brute ale magazinului nu sunt partajate cu alte magazine. Se folosesc doar indicatori agregați, fără date personale.',
      testId: 'ai-consent-toggle-model-improvement',
      isSensitive: true,
    },
    {
      key: 'allowAnonymizedBenchmarking' as const,
      label: 'Permit comparații anonimizate cu magazine similare',
      description:
        'Permite includerea în statistici comparative anonimizate. Nu sunt afișate datele magazinului către alți clienți.',
      testId: 'ai-consent-toggle-benchmarking',
      isSensitive: false,
    },
    {
      key: 'allowExternalAiProcessing' as const,
      label: 'Permit procesare prin servicii AI externe',
      description:
        'Permite trimiterea de date agregate către servicii AI externe. Dezactivat implicit.',
      testId: 'ai-consent-toggle-external-processing',
      isSensitive: true,
    },
    {
      key: 'allowCrossStoreTraining' as const,
      label: 'Permit antrenare cross-store',
      description:
        'Permite folosirea datelor agregate în modele ML globale ale platformei. Dezactivat implicit și recomandat doar cu acord contractual clar.',
      testId: 'ai-consent-toggle-cross-store-training',
      isSensitive: true,
    },
  ];

  return (
    <div
      data-testid="ai-consent-settings-card"
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between flex-wrap gap-4 bg-gray-50/20">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center">
            <BrainCircuit size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
              Setări AI și date
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Administrarea consimțământului pentru serviciile inteligente de analiză
            </p>
          </div>
        </div>
        <div
          data-testid="ai-consent-save-status"
          className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
        >
          {saving && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
          {!saving && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          {saveStatus}
        </div>
      </div>

      {/* Body */}
      <div className="p-8 space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3.5 p-5 bg-indigo-50/60 border border-indigo-100/50 rounded-2xl">
          <ShieldCheck size={20} className="text-indigo-650 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900/80 leading-relaxed font-semibold">
            AI Consultant folosește datele magazinului doar conform setărilor de mai jos. Datele
            brute nu sunt partajate între magazine. Opțiunile de îmbunătățire a modelului sunt
            dezactivate implicit și necesită acord explicit.
          </p>
        </div>

        {/* Gated Role Warning */}
        {!canEdit && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-bold">
              Doar administratorul magazinului poate modifica aceste setări.
            </p>
          </div>
        )}

        {/* Toggles List */}
        <div className="divide-y divide-gray-100">
          {toggles.map((t) => {
            const isChecked = !!consent[t.key];
            return (
              <div key={t.key} className="py-5 first:pt-0 last:pb-0 flex items-start justify-between gap-6 relative">
                {/* E2E Test Helper Elements */}
                <span className="hidden" data-testid="ai-consent-toggle" />
                {isChecked && <span className="hidden" data-testid="ai-consent-toggle-active" />}
                {(!canEdit || saving) && <span className="hidden" data-testid="ai-consent-toggle-disabled" />}

                <div className="flex-1">
                  <span className="block text-sm font-black text-gray-800 tracking-tight">
                    {t.label}
                  </span>
                  <span className="block text-xs text-gray-400 font-medium mt-1 leading-relaxed max-w-2xl">
                    {t.description}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  disabled={!canEdit || saving}
                  data-testid={t.testId}
                  onClick={() => handleToggle(t.key, isChecked)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isChecked 
                      ? 'bg-indigo-650 border-indigo-700 shadow-lg shadow-indigo-100' 
                      : 'bg-slate-300 dark:bg-slate-650 border-slate-400 dark:border-slate-550 hover:border-slate-500'
                  } ${!canEdit || saving ? 'opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-700' : ''}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Revocation Note */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
          <Info size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Retragerea acordului oprește prelucrarea datelor viitoare. Tratamentul datelor deja
            agregate trebuie reglementat contractual.
          </p>
        </div>
      </div>

      {/* Sensitive Confirmation Dialog */}
      {pendingToggle && (
        <div
          data-testid="ai-consent-confirm-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-150 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                Confirmare consimțământ AI
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Această opțiune permite folosirea datelor agregate ale magazinului pentru funcții AI
              avansate. Datele personale și datele brute nu trebuie incluse. Poți retrage acordul
              oricând.
            </p>
            <div className="flex items-start gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                id="ai-consent-confirm-checkbox"
                data-testid="ai-consent-confirm-checkbox"
                checked={modalChecked}
                onChange={(e) => setModalChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="ai-consent-confirm-checkbox"
                className="text-xs font-bold text-gray-700 cursor-pointer select-none leading-relaxed"
              >
                Confirm că am înțeles și accept această prelucrare.
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                Renunță
              </button>
              <button
                type="button"
                data-testid="ai-consent-confirm-activate"
                disabled={!modalChecked || saving}
                onClick={handleAcceptConfirm}
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-md shadow-indigo-100"
              >
                Activează opțiunea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
