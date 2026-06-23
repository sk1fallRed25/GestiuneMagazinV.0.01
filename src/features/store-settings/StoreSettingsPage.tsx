import React from 'react';
import { Link } from 'react-router-dom';
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
import { AiConsentSettingsCard } from '../ai-consultant';
import { useNetworkStatus } from '../../shared/network/useNetworkStatus';
import { AppUpdatePanel } from '../app-update/AppUpdatePanel';
import { OfflineCacheSyncPanel } from '../pos/components/OfflineCacheSyncPanel';
import { PosCartEventsPanel } from '../pos/components/PosCartEventsPanel';
import { PageHeader, Card } from '../../shared/components/ui';
import { StoreDiagnosticsPanel } from './components/StoreDiagnosticsPanel';

export const StoreSettingsPage: React.FC = () => {

  const { role } = useAuth();
  const { isOnline } = useNetworkStatus();
  const {
    settings, storeInfo, loading, saving, error, isDirty, saveSuccess,
    canView, canEdit, setSettings, save, reload, reset,
  } = useStoreSettings();

  const [appVersion, setAppVersion] = React.useState('1.0.0');
  const [windowState, setWindowState] = React.useState('Web Browser');

  React.useEffect(() => {
    const fetchVersion = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getAppVersion) {
        try {
          const v = await (window as any).electronAPI.getAppVersion();
          setAppVersion(v);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchVersion();
  }, []);

  React.useEffect(() => {
    const fetchWindowState = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.appControls?.getWindowState) {
        try {
          const state = await (window as any).electronAPI.appControls.getWindowState();
          if (state.isKiosk) {
            setWindowState('Desktop Kiosk Activ');
          } else if (state.isFullscreen) {
            setWindowState('Desktop Fullscreen');
          } else if (state.isMaximized) {
            setWindowState('Desktop Maximizat');
          } else {
            setWindowState('Desktop Fereastră');
          }
        } catch (e) {
          console.error(e);
          setWindowState('Eroare detecție');
        }
      } else {
        setWindowState('Web Browser');
      }
    };
    fetchWindowState();
    const interval = setInterval(fetchWindowState, 2500);
    return () => clearInterval(interval);
  }, []);

  // ─── Forbidden state (casier/gestionar) ────────────────────
  if (!canView) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Acces Interzis</h2>
        <p className="text-slate-600 font-medium max-w-md">Nu ai permisiunea necesară pentru setările magazinului.</p>
      </div>
    );
  }

  // ─── No store selected (platform_owner) ────────────────────
  const { currentStoreId } = useAuth();
  if (!currentStoreId && !loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-100">
          <BrainCircuit size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Setări Magazin</h2>
        <p className="text-slate-600 font-medium max-w-md">Selectează un magazin pentru a configura setările operaționale.</p>
      </div>
    );
  }

  // ─── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-sans animate-pulse space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <div className="h-6 bg-slate-200 rounded-full w-48 mb-2"></div>
            <div className="h-4 bg-slate-100 rounded-full w-80"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-32"></div>
        </div>

        {/* Form sections skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                <div className="h-4 bg-slate-200 rounded-full w-32"></div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="h-3 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-9 bg-slate-100/60 rounded-xl w-full"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-slate-100 rounded-full w-20"></div>
                  <div className="h-9 bg-slate-100/60 rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state with retry ────────────────────────────────
  if (error && !storeInfo.storeId && isOnline) {
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
    <div data-testid="store-settings-page" className="p-8 max-w-5xl mx-auto pb-32 font-sans bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div data-testid="store-settings-header">
        <PageHeader
          title="Setări Magazin"
          description="Configurează date fiscale, TVA, stoc, POS și alerte operaționale."
          icon={<Settings size={24} className="text-indigo-600" />}
          actions={
            <div className="flex items-center gap-3">
              <button
                data-testid="store-settings-reload-button"
                onClick={reload}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-100 text-sm"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Se încarcă...' : 'Reîncarcă'}
              </button>
            </div>
          }
        />
      </div>
      
      {storeInfo.storeName && (
        <div className="flex flex-wrap items-center gap-2 mb-6 -mt-2">
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
      
      {/* Offline warning notice */}
      {!isOnline && (
        <div data-testid="settings-offline-warning" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-3xl text-red-800 text-sm font-semibold flex items-center gap-3">
          <span>⚠️</span>
          <span>Nu poți salva modificări cât timp aplicația este offline.</span>
        </div>
      )}

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

        <AiConsentSettingsCard storeId={storeInfo.storeId || ''} canEdit={canEdit} />

        <OfflineCacheSyncPanel storeId={storeInfo.storeId || ''} />

        <StoreDiagnosticsPanel storeId={storeInfo.storeId || ''} />


        {/* Coadă Vânzări Offline */}
        <Card className="p-6 border border-slate-300 shadow-sm flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            🛍️ Administrare Coadă Vânzări Offline
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Monitorizează și gestionează vânzările salvate local în timp ce stația de vânzare (POS) a rulat fără conexiune la internet.
          </p>
          <div className="flex gap-4 mt-2">
            <Link
              to="/offline-sales"
              className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm transition-all border border-indigo-150 text-center shadow-sm"
            >
              Vizualizează Vânzări în Așteptare
            </Link>
          </div>
        </Card>

        {/* System & Application Info Card */}
        <Card className="p-6 border border-slate-300 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            ℹ️ Sistem și Informații Aplicație
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase">Versiune Aplicație</span>
              <span data-testid="settings-app-version-label" className="text-base font-black text-slate-700">
                {appVersion}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase">Mediu Runtime</span>
              <span data-testid="settings-app-runtime-label" className="text-base font-black text-slate-700">
                {((window as any).electronAPI?.isElectron) ? 'Electron Desktop' : 'Web Browser'}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase">Stare Fereastră (Kiosk)</span>
              <span data-testid="app-window-state-indicator" className="text-base font-black text-slate-700">
                {windowState}
              </span>
            </div>
          </div>
        </Card>

        {/* Centru de Actualizări (Auto-Update) */}
        <AppUpdatePanel />

        {/* Audit Evenimente Coș POS */}
        {storeInfo.storeId && (
          <PosCartEventsPanel storeId={storeInfo.storeId} />
        )}
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
