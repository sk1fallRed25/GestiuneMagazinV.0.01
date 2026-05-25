import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Loader2, HelpCircle } from 'lucide-react';
import { OwnerStore } from '../types';
import { useStoreLifecycle } from '../hooks/useStoreLifecycle';

interface StoreLifecycleActionModalProps {
  isOpen: boolean;
  store: OwnerStore | null;
  action: 'suspend' | 'reactivate' | 'archive' | 'request_deletion' | 'cancel_deletion' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StoreLifecycleActionModal: React.FC<StoreLifecycleActionModalProps> = ({
  isOpen,
  store,
  action,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState<string>('');
  
  const {
    saving,
    error,
    suspend,
    reactivate,
    archive,
    requestDeletion,
    cancelDeletion
  } = useStoreLifecycle(store?.id || null, () => {
    onSuccess();
    onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !store || !action) return null;

  const getActionDetails = () => {
    switch (action) {
      case 'suspend':
        return {
          title: 'Suspendă magazin',
          warning: 'Suspendarea blochează temporar accesul operațional la magazin. Datele rămân intacte și magazinul poate fi reactivat.',
          confirmText: 'Confirmă Suspendarea',
          colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
          btnClass: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
        };
      case 'reactivate':
        return {
          title: 'Reactivează magazin',
          warning: 'Reactivarea restabilește accesul operațional complet pentru utilizatori și activează magazinul.',
          confirmText: 'Confirmă Reactivarea',
          colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
        };
      case 'archive':
        return {
          title: 'Arhivează magazin',
          warning: 'Arhivarea închide colaborarea și păstrează datele istorice pentru audit și raportare. Este recomandată pentru clienții reali.',
          confirmText: 'Confirmă Arhivarea',
          colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
          btnClass: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
        };
      case 'request_deletion':
        return {
          title: 'Solicită ștergere magazin',
          warning: 'Disponibil doar dacă magazinul este eligibil (nu are activitate comercială înregistrată). Magazinele cu activitate trebuie arhivate.',
          confirmText: 'Solicită Ștergerea',
          colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
          btnClass: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
        };
      case 'cancel_deletion':
        return {
          title: 'Anulează cererea de ștergere',
          warning: 'Anularea cererii de ștergere va readuce magazinul în starea activă.',
          confirmText: 'Anulează Solicitarea de Ștergere',
          colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
        };
      default:
        return {
          title: 'Modificare stare magazin',
          warning: 'Confirmați modificarea stării magazinului.',
          confirmText: 'Confirmă',
          colorClass: 'text-gray-600 bg-gray-50 border-gray-200',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700'
        };
    }
  };

  const details = getActionDetails();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) return;

    switch (action) {
      case 'suspend':
        await suspend(reason);
        break;
      case 'reactivate':
        await reactivate(reason);
        break;
      case 'archive':
        await archive(reason);
        break;
      case 'request_deletion':
        await requestDeletion(reason);
        break;
      case 'cancel_deletion':
        await cancelDeletion(reason);
        break;
    }
  };

  return (
    <div
      id="store-lifecycle-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifecycle-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/60 w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${details.colorClass.split(' ')[2] || ''}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 id="lifecycle-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {details.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {store.name} · CUI {store.fiscalCode || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5 overflow-y-auto grow">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}

          {/* Warning Banner */}
          <div className={`p-4 rounded-2xl border flex gap-3 text-sm font-medium ${details.colorClass}`}>
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{details.warning}</p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label
              htmlFor="store-lifecycle-reason-input"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
            >
              Motivul acțiunii *
            </label>
            <textarea
              id="store-lifecycle-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Introduceți motivul acestei modificări (minim 3 caractere)..."
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Footer Butoane */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60 shrink-0">
            <button
              id="store-lifecycle-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              Anulează
            </button>
            <button
              id="store-lifecycle-confirm-btn"
              type="submit"
              disabled={saving || reason.trim().length < 3}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm ${details.btnClass}`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Se procesează...' : details.confirmText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
