import React, { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, CheckCircle2, Folder, RefreshCw, XCircle } from 'lucide-react';
import { 
  getFiscalNetConfig, 
  saveFiscalNetConfig, 
  resetFiscalNetConfig, 
  isFiscalNetConfigReady,
  FiscalNetLocalConfig 
} from '../fiscalNetConfigService';
import { isFiscalNetDesktopRuntime, getFiscalNetRuntimeDiagnostics } from '../fiscalNetRuntime';
import { toast } from 'react-hot-toast';

interface Props {
  disabled?: boolean;
}

export const FiscalNetStationSettings: React.FC<Props> = ({ disabled = false }) => {
  const [config, setConfig] = useState<FiscalNetLocalConfig>(() => getFiscalNetConfig());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(isFiscalNetConfigReady(config));
  }, [config]);

  const isElectronAvailable = isFiscalNetDesktopRuntime();
  const diagnostics = getFiscalNetRuntimeDiagnostics();

  const handleValidate = () => {
    if (!config.bonuriPath.trim() || !config.raspunsPath.trim()) {
      toast.error("Căile pentru folderele Bonuri și Răspuns nu pot fi goale.");
      return;
    }

    if (config.bonuriPath.trim() === config.raspunsPath.trim()) {
      toast.error("Directoarele de bonuri și răspunsuri nu pot fi identice.");
      return;
    }

    if (!isElectronAvailable) {
      toast.error("Validarea folderelor este disponibilă doar în aplicația desktop.");
    }

    const updated = {
      ...config,
      validatedAt: new Date().toISOString()
    };
    setConfig(updated);
    toast.success("Configurare validată local!");
  };

  const handleSave = () => {
    if (config.enabled && (!config.bonuriPath.trim() || !config.raspunsPath.trim())) {
      toast.error("Vă rugăm să configurați căile sau să dezactivați FiscalNet.");
      return;
    }
    saveFiscalNetConfig(config);
    toast.success("Configurarea locală FiscalNet a fost salvată!");
  };

  const handleReset = () => {
    resetFiscalNetConfig();
    const defaulted = getFiscalNetConfig();
    setConfig(defaulted);
    toast.success("Configurarea a fost resetată la valorile implicite.");
  };

  const inputCls = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-gray-400 font-mono ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div 
      data-testid="fiscalnet-station-settings"
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-300"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
          <Cpu size={22} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Setări Stație FiscalNet</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Configurare locală pentru imprimanta/casa de marcat de pe această stație POS</p>
        </div>
      </div>

      <div className="p-8">
        {/* Runtime Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Runtime:</span>
            <span 
              data-testid="fiscalnet-settings-runtime-status"
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isElectronAvailable 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isElectronAvailable ? 'Desktop Bridge Activ (Electron)' : 'Browser Sandbox (Scriere dezactivată)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configurare Stație:</span>
            <span 
              data-testid="fiscalnet-settings-status"
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isReady 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isReady ? 'Configurată & Validată' : 'Neconfigurată / Invalidă'}
            </span>
          </div>
        </div>

        {/* Runtime Diagnostics Panel */}
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Diagnosticare Runtime Electron</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Runtime:</span>
              <span
                data-testid="fiscalnet-runtime-is-electron"
                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-center ${
                  diagnostics.isElectron
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {diagnostics.isElectron ? 'Desktop/Electron detectat' : 'Browser Sandbox'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Preload:</span>
              <span
                data-testid="fiscalnet-runtime-has-electron-api"
                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-center ${
                  diagnostics.hasElectronAPI
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                electronAPI prezent: {diagnostics.hasElectronAPI ? 'DA' : 'NU'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">writeFiscalNetFile:</span>
              <span
                data-testid="fiscalnet-runtime-has-write-api"
                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-center ${
                  diagnostics.hasWriteAPI
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                disponibil: {diagnostics.hasWriteAPI ? 'DA' : 'NU'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">readFiscalNetResponse:</span>
              <span
                data-testid="fiscalnet-runtime-has-read-api"
                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-center ${
                  diagnostics.hasReadAPI
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                disponibil: {diagnostics.hasReadAPI ? 'DA' : 'NU'}
              </span>
            </div>
          </div>
        </div>

        {/* Path configuration fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className={labelCls}>Folder Bonuri (Monitorizat de FiscalNet)</label>
            <input 
              type="text" 
              data-testid="fiscalnet-settings-bonuri-path"
              value={config.bonuriPath} 
              disabled={disabled}
              onChange={(e) => setConfig({ ...config, bonuriPath: e.target.value, validatedAt: null })}
              placeholder="Ex: C:\FiscalNet\Bonuri" 
              className={inputCls} 
            />
          </div>
          <div>
            <label className={labelCls}>Folder Răspunsuri (Generat de FiscalNet)</label>
            <input 
              type="text" 
              data-testid="fiscalnet-settings-raspuns-path"
              value={config.raspunsPath} 
              disabled={disabled}
              onChange={(e) => setConfig({ ...config, raspunsPath: e.target.value, validatedAt: null })}
              placeholder="Ex: C:\FiscalNet\Raspuns" 
              className={inputCls} 
            />
          </div>
        </div>

        {/* Option toggles */}
        <div className="space-y-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox"
              data-testid="fiscalnet-settings-enabled"
              checked={config.enabled}
              disabled={disabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked, validatedAt: null })}
              className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <div>
              <span className="text-sm font-bold text-gray-800">Activează FiscalNet pe această stație POS</span>
              <p className="text-xs text-gray-400 font-medium">Permite exportul și integrarea casei de marcat pentru această sesiune locală de browser.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox"
              data-testid="fiscalnet-settings-real-write"
              checked={config.realWriteEnabled}
              disabled={disabled}
              onChange={(e) => setConfig({ ...config, realWriteEnabled: e.target.checked })}
              className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <div>
              <span className="text-sm font-bold text-gray-800">Permite scriere locală controlată (Real Write)</span>
              <p className="text-xs text-gray-400 font-medium">Activează scrierea efectivă a fișierelor de bonuri în directorul monitorizat.</p>
            </div>
          </label>
        </div>

        {/* Warning messages */}
        <div className="space-y-4 mb-8">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-extrabold uppercase tracking-wide block mb-0.5">Informație Importantă:</span>
              Această configurare este stocată local pe acest calculator POS. Setările nu sunt salvate în baza de date centrală și nu se aplică altor stații de vânzare din magazin.
            </div>
          </div>

          {config.realWriteEnabled && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-800 flex items-start gap-3 animate-in fade-in duration-300">
              <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wide block mb-0.5">Atenție Real Write:</span>
                Dacă folderul Bonuri configurat este monitorizat activ de aplicația FiscalNet, scrierea fișierului din ecranul de detalii bon va declanșa emiterea bonului fiscal real de către casa de marcat.
              </div>
            </div>
          )}
        </div>

        {/* Actions buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-testid="fiscalnet-settings-validate-button"
            disabled={disabled}
            onClick={handleValidate}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-black text-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Validează configurarea
          </button>

          <button
            type="button"
            data-testid="fiscalnet-settings-save-button"
            disabled={disabled}
            onClick={handleSave}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50 shadow-sm shadow-indigo-100"
          >
            Salvează configurarea locală
          </button>

          <button
            type="button"
            data-testid="fiscalnet-settings-reset-button"
            disabled={disabled}
            onClick={handleReset}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black transition-colors disabled:opacity-50"
          >
            Resetează configurarea
          </button>
        </div>
      </div>
    </div>
  );
};
