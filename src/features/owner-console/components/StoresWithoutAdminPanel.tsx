import React from 'react';
import { ShieldAlert, CheckCircle2, Store, Users, AlertOctagon, ArrowRight } from 'lucide-react';
import { StoreWithoutAdmin } from '../types';

interface StoresWithoutAdminPanelProps {
  storesWithoutAdmin: StoreWithoutAdmin[];
  onSelectStore?: (storeId: string) => void;
}

export const StoresWithoutAdminPanel: React.FC<StoresWithoutAdminPanelProps> = ({ storesWithoutAdmin, onSelectStore }) => {
  if (storesWithoutAdmin.length === 0) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between animate-fade-in"
        role="status"
        aria-label="Toate magazinele au administrator activ"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Toate magazinele au administrator activ</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Fiecare magazin activ ar trebui să aibă cel puțin un administrator sau manager responsabil.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold shrink-0">
          Stare Optimă ✓
        </span>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-500/30 overflow-hidden animate-fade-in"
      role="region"
      aria-label="Magazine fără administrator activ"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-red-50/80 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-red-900 dark:text-red-300">
                Magazine Fără Administrator Activ
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 max-w-xl">
                Fiecare magazin activ ar trebui să aibă cel puțin un administrator sau manager responsabil.
                Selectați un magazin pentru a gestiona membrii săi.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full border border-red-200 dark:border-red-500/30 whitespace-nowrap shrink-0 animate-pulse">
            {storesWithoutAdmin.length} Magazine Afectate
          </span>
        </div>
      </div>

      {/* Store cards grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {storesWithoutAdmin.map(store => (
          <div
            key={store.storeId}
            className="p-4 bg-red-50/30 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-500/20 flex flex-col gap-3 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                  <Store className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{store.storeName}</h4>
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5 font-medium">
                    <AlertOctagon className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Niciun admin activ</span>
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                store.active
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
              }`}>
                {store.active ? 'Activ' : 'Inactiv'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-red-100 dark:border-red-500/20">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{store.memberCount} membri alocați</span>
              </span>
              {onSelectStore && (
                <button
                  onClick={() => onSelectStore(store.storeId)}
                  aria-label={`Gestionează membrii magazinului ${store.storeName}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <span>Gestionează Membrii</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
