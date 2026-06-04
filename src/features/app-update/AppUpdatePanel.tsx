import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  RefreshCw, 
  Download, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Info 
} from 'lucide-react';
import { useNetworkStatus } from '../../shared/network/useNetworkStatus';

export const AppUpdatePanel: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [runtime, setRuntime] = useState<string>('Web Browser');
  const [status, setStatus] = useState<string>('idle'); 
  // status states: 'idle', 'checking', 'not-available', 'available', 'downloading', 'downloaded', 'error'
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const { isOnline } = useNetworkStatus();

  // Load app version and runtime environment
  useEffect(() => {
    const loadSystemInfo = async () => {
      if (window.electronAPI) {
        setIsElectron(true);
        setRuntime('Electron Desktop');
        try {
          const version = await window.electronAPI.getAppVersion();
          setCurrentVersion(version);
        } catch (e) {
          console.error("Failed to get app version:", e);
        }

        // Get initial update status if any
        if (window.electronAPI.updater) {
          try {
            const initial = await window.electronAPI.updater.getUpdateStatus();
            setStatus(initial.status || 'idle');
            setProgress(initial.progress || 0);
          } catch (e) {
            console.error("Failed to get initial update status:", e);
          }
        }
      } else {
        setIsElectron(false);
        setRuntime('Web Browser');
      }
    };

    loadSystemInfo();
  }, []);

  // Listen to update events in Electron
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.updater) return;

    const unsubChecking = window.electronAPI.updater.onUpdateEvent(
      'updater:checking-for-update',
      () => {
        setStatus('checking');
        setErrorMessage('');
      }
    );

    const unsubAvailable = window.electronAPI.updater.onUpdateEvent(
      'updater:update-available',
      (event, info: any) => {
        setStatus('available');
        toast.success(`Versiune nouă disponibilă: ${info?.version || ''}`);
      }
    );

    const unsubNotAvailable = window.electronAPI.updater.onUpdateEvent(
      'updater:update-not-available',
      () => {
        setStatus('not-available');
        toast.success('Aplicația este la zi!');
      }
    );

    const unsubProgress = window.electronAPI.updater.onUpdateEvent(
      'updater:download-progress',
      (event, progressObj: any) => {
        setStatus('downloading');
        setProgress(Math.round(progressObj?.percent || 0));
      }
    );

    const unsubDownloaded = window.electronAPI.updater.onUpdateEvent(
      'updater:update-downloaded',
      () => {
        setStatus('downloaded');
        setProgress(100);
        toast.success('Actualizarea a fost descărcată cu succes!');
      }
    );

    const unsubError = window.electronAPI.updater.onUpdateEvent(
      'updater:error',
      (event, err: any) => {
        setStatus('error');
        setErrorMessage(err?.message || 'Eroare la actualizare.');
        toast.error(`Eroare update: ${err?.message || 'Eroare la actualizare.'}`);
      }
    );

    return () => {
      unsubChecking();
      unsubAvailable();
      unsubNotAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!isElectron || !window.electronAPI?.updater) {
      toast.error("Actualizările sunt disponibile doar în aplicația desktop.");
      return;
    }
    if (!isOnline) {
      toast.error("Conectează-te la internet pentru a verifica actualizările.");
      return;
    }

    setStatus('checking');
    try {
      const res = await window.electronAPI.updater.checkForUpdates();
      if (!res.success) {
        setStatus('error');
        setErrorMessage(res.error || 'Eroare la verificarea actualizărilor.');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e.message || 'Eroare la verificarea actualizărilor.');
    }
  };

  const handleDownloadUpdate = async () => {
    if (!isElectron || !window.electronAPI?.updater) return;
    if (!isOnline) {
      toast.error("Conectează-te la internet pentru a descărca actualizarea.");
      return;
    }

    setStatus('downloading');
    setProgress(0);
    try {
      const res = await window.electronAPI.updater.downloadUpdate();
      if (!res.success) {
        setStatus('error');
        setErrorMessage(res.error || 'Eroare la descărcarea actualizării.');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e.message || 'Eroare la descărcarea actualizării.');
    }
  };

  const handleInstallUpdate = async () => {
    if (!isElectron || !window.electronAPI?.updater) return;

    // Check POS Safety Guards
    const savedCart = localStorage.getItem('pos_cart');
    let hasActiveCart = false;
    try {
      if (savedCart) {
        const items = JSON.parse(savedCart);
        hasActiveCart = Array.isArray(items) && items.length > 0;
      }
    } catch (e) {
      hasActiveCart = false;
    }

    if (hasActiveCart) {
      toast.error("Finalizează sau golește coșul înainte de instalarea update-ului.");
      alert("Finalizează sau golește coșul înainte de instalarea update-ului.");
      return;
    }

    const confirmInstall = window.confirm(
      "Închide aplicația și instalează update-ul? Asigură-te că nu ai vânzări în curs."
    );

    if (!confirmInstall) return;

    try {
      await window.electronAPI.updater.installUpdateAndRestart();
    } catch (e: any) {
      toast.error(`Eroare la repornire: ${e.message}`);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Se verifică actualizările...';
      case 'not-available':
        return 'Aplicația este la zi (Ești pe ultima versiune).';
      case 'available':
        return 'Actualizare nouă disponibilă!';
      case 'downloading':
        return `Se descarcă actualizarea... (${progress}%)`;
      case 'downloaded':
        return 'Actualizare descărcată. Gata de instalare!';
      case 'error':
        return `Eroare: ${errorMessage || 'Eroare necunoscută.'}`;
      case 'idle':
      default:
        return 'Nu s-a verificat recent.';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'not-available':
        return 'text-green-700 bg-green-50 border-green-100';
      case 'available':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'downloading':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'downloaded':
        return 'text-teal-700 bg-teal-50 border-teal-100';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-100';
      case 'idle':
      default:
        return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div 
      data-testid="app-update-panel"
      className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-6 md:p-8 font-sans"
    >
      <div className="flex items-center gap-4 border-b border-gray-100 pb-5 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
          <RefreshCw size={24} className={status === 'checking' ? 'animate-spin' : ''} />
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Centru Actualizări</h3>
          <p className="text-gray-500 text-xs font-semibold">Administrează versiunea și actualizările aplicației desktop</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Info carduri */}
        <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Versiune Curentă</span>
          <span 
            data-testid="app-update-current-version"
            className="text-lg font-black text-gray-800"
          >
            {currentVersion}
          </span>
        </div>

        <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Mediu de Rulare</span>
          <span className="text-lg font-black text-gray-800">{runtime}</span>
        </div>
      </div>

      {/* Mesaj de stare */}
      <div className={`border rounded-2xl p-4 mb-6 flex items-start gap-3 transition-all ${getStatusColor()}`}>
        {status === 'error' ? (
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        ) : status === 'not-available' || status === 'downloaded' ? (
          <CheckCircle size={20} className="shrink-0 mt-0.5" />
        ) : (
          <Info size={20} className="shrink-0 mt-0.5" />
        )}
        <div>
          <span className="text-xs font-black uppercase tracking-wider block opacity-70">Stare actualizare</span>
          <span 
            data-testid="app-update-status"
            className="font-bold text-sm block mt-0.5"
          >
            {getStatusMessage()}
          </span>
        </div>
      </div>

      {/* Fallback pentru browser */}
      {!isElectron && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-amber-800 text-xs font-bold flex items-start gap-2.5">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>Auto-update este disponibil exclusiv în aplicația desktop. În versiunea Web, actualizările se aplică automat la reîncărcarea paginii.</span>
        </div>
      )}

      {/* Notă pentru mediu Electron (NSIS vs Portable) */}
      {isElectron && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 text-slate-500 text-xs font-bold flex items-start gap-2.5">
          <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
          <span>Auto-update se aplică doar pentru versiunea instalată prin installer NSIS. Versiunea portable este doar pentru testare.</span>
        </div>
      )}

      {/* Progres descarcare */}
      {status === 'downloading' && (
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-2">
            <span>Descarcare actualizare...</span>
            <span data-testid="app-update-progress">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-200/50">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Butoane Actiuni */}
      {isElectron && (
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-50">
          <button
            data-testid="app-update-check-button"
            onClick={handleCheckForUpdates}
            disabled={status === 'checking' || status === 'downloading'}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
            Verifică update
          </button>

          {status === 'available' && (
            <button
              data-testid="app-update-download-button"
              onClick={handleDownloadUpdate}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 transition-all active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              Descarcă update
            </button>
          )}

          {status === 'downloaded' && (
            <button
              data-testid="app-update-install-button"
              onClick={handleInstallUpdate}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-100 transition-all active:scale-95 cursor-pointer"
            >
              <Play size={16} />
              Instalează și repornește
            </button>
          )}
        </div>
      )}
    </div>
  );
};
