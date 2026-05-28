import React from 'react';
import { useStoreSettings } from './hooks/useStoreSettings';
import { StoreFiscalSettingsPanel } from './components/StoreFiscalSettingsPanel';
import { StoreTaxSettingsPanel } from './components/StoreTaxSettingsPanel';
import { StoreStockSettingsPanel } from './components/StoreStockSettingsPanel';
import { StorePosSettingsPanel } from './components/StorePosSettingsPanel';
import { StoreDocumentsSettingsPanel } from './components/StoreDocumentsSettingsPanel';
import { StoreReportsAlertsPanel } from './components/StoreReportsAlertsPanel';
import { StoreSettingsSaveBar } from './components/StoreSettingsSaveBar';
import { StoreSettings } from './types';
import { Settings, RefreshCw, AlertTriangle, BrainCircuit, ShieldAlert, Store } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { FiscalNetStationSettings } from '../fiscal-net';

export const StoreSettingsPage: React.FC = () => {
  const { role } = useAuth();
  const {
    settings, storeInfo, loading, saving, error, isDirty, saveSuccess,
    canView, canEdit, setSettings, save, reload, reset,
  } = useStoreSettings();

  // ─── Forbidden state (casier/gestionar) ────────────────────
  if (!canView) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Acces Interzis</h2>
        <p className="text-gray-600 font-medium max-w-md">Nu ai permisiunea necesară pentru setările magazinului.</p>
      </div>
    );
  }

  // ─── No store selected (platform_owner) ────────────────────
  if (!storeInfo.storeId && !loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-100">
          <BrainCircuit size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Setări Magazin</h2>
        <p className="text-gray-600 font-medium max-w-md">Selectează un magazin pentru a configura setările operaționale.</p>
      </div>
    );
  }

  // ─── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-sans">
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
          <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Se încarcă setările magazinului...</p>
        </div>
      </div>
    );
  }

  // ─── Error state with retry ────────────────────────────────
  if (error && !storeInfo.storeId) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-sans">
        <div className="bg-red-50 text-red-700 p-8 rounded-3xl flex flex-col items-center gap-4 border border-red-100 text-center">
          <AlertTriangle size={32} />
          <h3 className="font-bold text-lg">Eroare</h3>
          <p className="text-sm">{error}</p>
          <button onClick={reload}
            className="mt-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95">
            Reîncearcă
          </button>
        </div>
      </div>
    );
  }

  // ─── Updater helpers ───────────────────────────────────────
  const updateSection = <K extends keyof StoreSettings>(section: K, value: StoreSettings[K]) => {
    setSettings((prev) => ({ ...prev, [section]: value }));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32 font-sans bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
            <Settings size={28} className="text-indigo-600" />
            Setări Magazin
          </h1>
          <p className="text-gray-400 font-medium mt-1">Configurează date fiscale, TVA, stoc, POS și alerte operaționale.</p>
          {storeInfo.storeName && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Store size={14} className="text-indigo-600" />
                <span className="text-xs font-black text-indigo-700 uppercase">{storeInfo.storeName}</span>
              </div>
              {!canEdit && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                    Mod vizualizare — doar admin sau platform owner poate modifica setările
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={reload} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-100 text-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Se încarcă...' : 'Reîncarcă'}
        </button>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="bg-red-50 text-red-700 p-6 rounded-3xl mb-8 flex items-start gap-4 border border-red-100">
          <AlertTriangle size={24} className="flex-shrink-0" />
          <div>
            <h5 className="font-bold">Eroare</h5>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Settings panels */}
      <div className="space-y-8">
        <StoreFiscalSettingsPanel
          settings={settings.fiscal}
          fiscalCode={storeInfo.fiscalCode}
          disabled={!canEdit}
          onChange={(v) => updateSection('fiscal', v)}
        />

        <StoreTaxSettingsPanel
          settings={settings.tax}
          disabled={!canEdit}
          onChange={(v) => updateSection('tax', v)}
        />

        <StoreStockSettingsPanel
          settings={settings.stock}
          disabled={!canEdit}
          onChange={(v) => updateSection('stock', v)}
        />

        <StorePosSettingsPanel
          settings={settings.pos}
          disabled={!canEdit}
          onChange={(v) => updateSection('pos', v)}
        />

        <StoreDocumentsSettingsPanel
          settings={settings.documents}
          disabled={!canEdit}
          onChange={(v) => updateSection('documents', v)}
        />

        <StoreReportsAlertsPanel
          reports={settings.reports}
          alerts={settings.alerts}
          disabled={!canEdit}
          onChangeReports={(v) => updateSection('reports', v)}
          onChangeAlerts={(v) => updateSection('alerts', v)}
        />

        <FiscalNetStationSettings disabled={!canView} />
      </div>

      {/* Save bar */}
      <StoreSettingsSaveBar
        isDirty={isDirty}
        saving={saving}
        saveSuccess={saveSuccess}
        canEdit={canEdit}
        onSave={save}
        onReset={reset}
      />
    </div>
  );
};

export default StoreSettingsPage;
