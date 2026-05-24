import React, { useState, useMemo } from 'react';
import {
  Layers, CheckCircle2, XCircle, Lock, AlertTriangle, Cpu, Sparkles,
  Package, History, Settings, BarChart3, Info, LockKeyhole, RefreshCw,
  FileText, Store, Activity, CloudLightning, ShieldAlert, ShoppingBag,
  ArrowRight, ShieldCheck, HelpCircle, Check, X
} from 'lucide-react';
import { useStoreModuleManagement } from '../../module-entitlements/hooks/useStoreModuleManagement';
import { StoreModuleAccessItem, ModuleCategory } from '../../module-entitlements/types';
import { COMMERCIAL_PRESETS } from '../../module-entitlements/modulePresets';
import { OwnerStore } from '../types';

interface OwnerStoreModulesPanelProps {
  selectedStoreId: string | null;
  selectedStore: OwnerStore | null;
}

export const OwnerStoreModulesPanel: React.FC<OwnerStoreModulesPanelProps> = ({
  selectedStoreId,
  selectedStore
}) => {
  const {
    modules,
    moduleMap,
    loading,
    error: managementError,
    savingModuleKey,
    refresh,
    toggleModule,
    applyPreset
  } = useStoreModuleManagement(selectedStoreId);

  // States for toggle modal
  const [confirmToggleData, setConfirmToggleData] = useState<{
    module: StoreModuleAccessItem;
    targetEnabled: boolean;
  } | null>(null);
  const [toggleReason, setToggleReason] = useState<string>('');

  // States for preset modal
  const [confirmPresetData, setConfirmPresetData] = useState<{
    key: string;
    name: string;
    description: string;
  } | null>(null);

  // Error handling state (local overlay in addition to hook error)
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || managementError;

  // Categories helper mapping
  const categoryMeta: Record<ModuleCategory, { label: string; icon: React.ElementType; color: string }> = {
    core: { label: 'Vânzare de Bază', icon: ShoppingBag, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' },
    stock: { label: 'Management Stocuri', icon: Package, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10' },
    sales: { label: 'Istoric Vânzări', icon: History, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
    reports: { label: 'Rapoarte detaliate & TVA', icon: BarChart3, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
    ai: { label: 'Inteligență Artificială', icon: Cpu, color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10' },
    fiscal: { label: 'Fiscal Bridge', icon: Activity, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
    offline: { label: 'Sincronizare Offline', icon: CloudLightning, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10' },
    admin: { label: 'Administrare Magazin', icon: Settings, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10' },
    platform: { label: 'Console Platformă', icon: ShieldAlert, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' }
  };

  // Group modules by category
  const groupedModules = useMemo(() => {
    const groups = {} as Record<ModuleCategory, StoreModuleAccessItem[]>;
    modules.forEach(m => {
      if (!groups[m.category]) {
        groups[m.category] = [];
      }
      groups[m.category].push(m);
    });
    return groups;
  }, [modules]);

  // Handle individual toggle change
  const handleToggleClick = (module: StoreModuleAccessItem) => {
    // Prevent interaction for planned / disabled / owner_only
    if (module.status === 'planned' || module.status === 'disabled' || module.ownerOnly) {
      return;
    }
    setToggleReason('');
    setConfirmToggleData({
      module,
      targetEnabled: !module.effectiveEnabled
    });
  };

  // Confirm individual toggle
  const handleConfirmToggle = async () => {
    if (!confirmToggleData) return;
    setLocalError(null);
    const success = await toggleModule(
      confirmToggleData.module.moduleKey,
      confirmToggleData.targetEnabled,
      toggleReason.trim() || null
    );
    if (success) {
      setConfirmToggleData(null);
      setToggleReason('');
    } else {
      // Keep modal open so owner can see what failed (e.g. dependency error)
    }
  };

  // Confirm preset application
  const handleConfirmPreset = async () => {
    if (!confirmPresetData) return;
    setLocalError(null);
    const success = await applyPreset(confirmPresetData.key);
    if (success) {
      setConfirmPresetData(null);
    }
  };

  if (!selectedStoreId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col items-center justify-center min-h-[350px] text-center animate-fade-in">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 shadow-inner">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Administrare Module Magazin</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Selectați un magazin sau un punct de lucru din tabelul de mai sus pentru a vedea și modifica accesul la modulele platformei.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" role="region" aria-label="Gestiune Module Magazin">
      {/* Store Info & Header */}
      {selectedStore && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-2xl text-indigo-300">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold truncate">{selectedStore.name}</h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedStore.active
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/10 text-gray-300 border-white/20'
                }`}>
                  {selectedStore.active ? 'Activ' : 'Inactiv'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1 font-mono">
                CUI: {selectedStore.fiscalCode || 'Nespecificat'} · Cod: {selectedStore.displayCode || '—'} · Punct lucru #{selectedStore.workpointNumber ?? 1}
              </p>
              {selectedStore.address && (
                <p className="text-xs text-indigo-300/80 mt-1 font-medium">{selectedStore.address}</p>
              )}
            </div>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => { setLocalError(null); refresh(); }}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 active:bg-white/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reîncarcă</span>
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {displayError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl flex items-start gap-3 text-rose-900 dark:text-rose-200 text-xs animate-shake">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Eroare de securitate sau validare:</span>
            <p className="mt-1 font-medium">{displayError}</p>
          </div>
          <button
            onClick={() => { setLocalError(null); }}
            className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-100/50"
            aria-label="Închide eroarea"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Presets Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Configurare Rapidă Pachet Comercial (Presets)</span>
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Aplicarea unui pachet va activa modulele aferente și le va dezactiva pe celelalte (fără a afecta modulele planificate sau cele destinate exclusiv Platform Owner-ului).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMERCIAL_PRESETS.map(preset => {
            return (
              <button
                key={preset.key}
                disabled={loading}
                onClick={() => setConfirmPresetData(preset)}
                className="group p-4 bg-gray-50 dark:bg-gray-700/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 border border-gray-100 dark:border-gray-700/60 hover:border-indigo-200 dark:hover:border-indigo-900/50 rounded-2xl text-left transition-all flex flex-col justify-between h-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {preset.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-3">
                    {preset.description}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md self-start mt-2">
                  {preset.moduleKeys.length} module
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Categorized Modules Grid */}
      <div className="space-y-8">
        {loading && modules.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          Object.entries(groupedModules).map(([catKey, catModules]) => {
            const meta = categoryMeta[catKey as ModuleCategory] || { label: catKey, icon: Layers, color: 'text-gray-600 bg-gray-50' };
            const CatIcon = meta.icon;

            return (
              <div key={catKey} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/60 pb-2">
                  <div className={`p-1.5 rounded-lg ${meta.color} shrink-0`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">{meta.label}</h4>
                  <span className="text-[11px] font-bold text-gray-400 px-1.5 py-0.2 bg-gray-100 dark:bg-gray-700 rounded-full">
                    {catModules.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {catModules.map(module => {
                    const isSaving = savingModuleKey === module.moduleKey;
                    const isDisabledOrPlanned = module.status === 'planned' || module.status === 'disabled';
                    const isToggleBlocked = isDisabledOrPlanned || module.ownerOnly;

                    return (
                      <div
                        key={module.moduleKey}
                        className={`bg-white dark:bg-gray-800 rounded-3xl p-5 border shadow-sm transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                          module.effectiveEnabled
                            ? 'border-emerald-100 dark:border-emerald-950/40 hover:shadow-md'
                            : 'border-gray-100 dark:border-gray-700/60'
                        }`}
                      >
                        {/* Status watermark / decoration */}
                        {module.ownerOnly && (
                          <div className="absolute top-0 right-0 p-1 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider transform rotate-0 rounded-bl-lg">
                            Owner Only
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h5 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{module.name}</span>
                                <span className="font-mono text-[10px] text-gray-400 font-normal">({module.moduleKey})</span>
                              </h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                {module.description || 'Nicio descriere definită în catalogul platformei.'}
                              </p>
                            </div>

                            {/* Enable Status Badges */}
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                              {module.effectiveEnabled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Activ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-full text-[10px] font-bold">
                                  <XCircle className="w-3 h-3" />
                                  Fără acces
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Technical attributes */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {/* Platform Status */}
                            {module.status === 'beta' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded">
                                Beta
                              </span>
                            )}
                            {module.status === 'planned' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Planificat
                              </span>
                            )}
                            {module.status === 'disabled' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Dezactivat global
                              </span>
                            )}

                            {/* Dependencies */}
                            {module.dependencies && module.dependencies.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <span className="font-semibold">Necesită:</span>
                                <span className="font-mono bg-gray-50 dark:bg-gray-700/50 px-1 py-0.2 rounded border border-gray-100 dark:border-gray-700">
                                  {module.dependencies.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Override reason display */}
                          {module.reason && (
                            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/60 flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <div className="break-words">
                                <span className="font-bold">Motiv audit: </span>
                                {module.reason}
                                {module.enabledBy && (
                                  <span className="text-[9px] text-gray-400 block mt-0.5">
                                    Modificat de {module.enabledBy} la {module.enabledAt ? new Date(module.enabledAt).toLocaleDateString('ro-RO') : '—'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Toggle Switches */}
                        <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50 pt-3">
                          <span className="text-xs text-gray-400 font-medium">
                            {isToggleBlocked
                              ? 'Modificare blocată de reguli'
                              : 'Permite acces magazin'}
                          </span>

                          <div className="flex items-center gap-2">
                            {isSaving && (
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Se salvează..." />
                            )}
                            <button
                              id={`toggle-${module.moduleKey}`}
                              role="switch"
                              aria-checked={module.effectiveEnabled}
                              aria-label={`Comută starea pentru ${module.name}`}
                              disabled={isToggleBlocked || loading || isSaving}
                              onClick={() => handleToggleClick(module)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                                module.effectiveEnabled
                                  ? 'bg-indigo-600'
                                  : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  module.effectiveEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Individual Toggle Reasoning Modal */}
      {confirmToggleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="toggle-modal-title">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 id="toggle-modal-title" className="text-base font-bold text-gray-900 dark:text-white">Confirmare Modificare Modul</h3>
              </div>
              <button
                onClick={() => setConfirmToggleData(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Modificați accesul la modulul <span className="font-bold text-gray-950 dark:text-white">{confirmToggleData.module.name}</span> pentru magazinul <span className="font-bold text-gray-950 dark:text-white">{selectedStore?.name || 'magazinul curent'}</span>.
              </p>
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/30 flex items-center gap-2.5">
                {confirmToggleData.targetEnabled ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs text-indigo-900 dark:text-indigo-200 font-semibold">Se comută din dezactivat în ACTIV.</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs text-indigo-900 dark:text-indigo-200 font-semibold">Se comută din activ în DEZACTIVAT.</span>
                  </>
                )}
              </div>

              {/* Dependency Warning */}
              {confirmToggleData.targetEnabled && confirmToggleData.module.dependencies.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold">Verificare dependențe:</span> Acest modul necesită modulele: <span className="font-mono font-bold">{confirmToggleData.module.dependencies.join(', ')}</span>. Asigurați-vă că acestea sunt activate mai întâi.
                  </div>
                </div>
              )}

              {/* Reason input */}
              <div className="space-y-1.5">
                <label htmlFor="reason-input" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Motivul modificării (obligatoriu pentru log audit):
                </label>
                <input
                  id="reason-input"
                  type="text"
                  placeholder="Ex: Solicitare client prin ticket #123"
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                onClick={() => setConfirmToggleData(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirmToggle}
                disabled={!toggleReason.trim() || loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                Salvează Modificarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Application Modal */}
      {confirmPresetData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="preset-modal-title">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 id="preset-modal-title" className="text-base font-bold text-gray-900 dark:text-white">Aplicare Pachet Comercial</h3>
              </div>
              <button
                onClick={() => setConfirmPresetData(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Sunteți sigur că doriți să aplicați pachetul comercial <span className="font-bold text-gray-950 dark:text-white">{confirmPresetData.name}</span> pentru magazinul <span className="font-bold text-gray-950 dark:text-white">{selectedStore?.name || 'magazinul curent'}</span>?
              </p>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 text-xs">
                <div className="font-bold text-gray-900 dark:text-white">Detalii pachet:</div>
                <div className="mt-1 text-gray-500 dark:text-gray-400">{confirmPresetData.description}</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 flex gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <div>
                  <span className="font-bold">Notă importantă:</span> Modulele neincluse în acest pachet vor fi dezactivate, cu excepția celor indisponibile global (planned/disabled) sau rezervate adminului de sistem.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                onClick={() => setConfirmPresetData(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirmPreset}
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                Aplică Pachet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
