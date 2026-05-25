import React, { useEffect } from 'react';
import { X, ShieldAlert, Archive, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { OwnerStore } from '../types';
import { useStoreLifecycle } from '../hooks/useStoreLifecycle';

interface StoreDeletionEligibilityModalProps {
  isOpen: boolean;
  store: OwnerStore | null;
  onClose: () => void;
  onRequestDeletion: () => void;
}

const keyLabels: Record<string, string> = {
  sales: 'Vânzări (Bonuri)',
  posShifts: 'Sesiuni POS',
  stockMovements: 'Mișcări Stocuri',
  stockBatchesWithQuantity: 'Loturi Stoc Active',
  returns: 'Retururi',
  wasteEvents: 'Pierderi / Deșeuri',
  storeMembers: 'Membri Alocați',
  moduleOverrides: 'Entitlements Module',
  auditLogs: 'Loguri Audit',
  products: 'Produse',
  productPrices: 'Prețuri Produse',
  categories: 'Categorii',
  devices: 'Dispozitive Înregistrate'
};

export const StoreDeletionEligibilityModal: React.FC<StoreDeletionEligibilityModalProps> = ({
  isOpen,
  store,
  onClose,
  onRequestDeletion
}) => {
  const {
    eligibility,
    loading,
    error,
    checkDeletionEligibility
  } = useStoreLifecycle(store?.id || null);

  useEffect(() => {
    if (isOpen && store?.id) {
      checkDeletionEligibility();
    }
  }, [isOpen, store?.id, checkDeletionEligibility]);

  if (!isOpen || !store) return null;

  return (
    <div
      id="store-deletion-eligibility-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eligibility-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/60 w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="eligibility-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Verificare Eligibilitate Ștergere
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

        {/* Body content */}
        <div className="p-6 overflow-y-auto grow space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Se analizează dependențele din baza de date...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          ) : eligibility ? (
            <div className="space-y-5">
              {/* Permanent Warning about hard delete */}
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex gap-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-bold">Ștergerea definitivă este dezactivată în această versiune.</p>
                  <p className="mt-0.5">Magazinele cu activitate comercială istorică trebuie arhivate pentru a asigura trasabilitatea fiscală și auditul.</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="p-4 rounded-2xl border flex gap-3 text-sm items-start bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700">
                {eligibility.canDelete ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {eligibility.canDelete ? 'Eligibil pentru solicitare ștergere' : 'Ineligibil pentru ștergere'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {eligibility.reason}
                  </p>
                </div>
              </div>

              {/* Recommendation Banner */}
              {!eligibility.canDelete && (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                  <Archive className="w-5 h-5 shrink-0 text-indigo-500" />
                  <div>
                    <span className="font-bold">Recomandare:</span> Acest magazin are activitate istorică înregistrată. Se recomandă <strong>arhivarea</strong>, nu ștergerea.
                  </div>
                </div>
              )}

              {/* Dependences list */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                  Analiză Înregistrări Dependente ({Object.values(eligibility.counts).reduce((a, b) => a + b, 0)} total)
                </h4>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60 border border-gray-100 dark:border-gray-700/60 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-800/20 text-xs">
                  {Object.entries(eligibility.counts).map(([key, count]) => {
                    const label = keyLabels[key] || key;
                    return (
                      <div key={key} className="px-4 py-3 flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{label}</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-lg ${count > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Butoane */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
          <button
            id="store-deletion-close-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            Închide
          </button>
          {eligibility?.canDelete && (
            <button
              id="store-deletion-request-btn"
              type="button"
              onClick={() => {
                onClose();
                onRequestDeletion();
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all text-sm"
            >
              Solicită Ștergerea
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
