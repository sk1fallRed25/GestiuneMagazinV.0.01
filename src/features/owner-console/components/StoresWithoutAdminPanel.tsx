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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 mb-8 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Toate magazinele au administrator activ</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fiecare unitate comercială are cel puțin un cont cu rolul de administrare alocat.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold">
          Stare Optimă
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-500/30 overflow-hidden mb-8 animate-fade-in">
      <div className="px-6 py-4 bg-red-50/80 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 animate-bounce" />
          <div>
            <h3 className="text-sm font-bold text-red-900 dark:text-red-300">Magazine Fără Administrator Activ</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Aceste unități comerciale nu au personal de conducere alocat pentru gestiunea stocurilor și personalului</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full animate-pulse">
          {storesWithoutAdmin.length} Magazine Afectate
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storesWithoutAdmin.map(store => (
          <div key={store.storeId} className="p-5 bg-red-50/30 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-500/20 flex flex-col justify-between gap-4 group hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{store.storeName}</h4>
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5 font-medium">
                    <AlertOctagon className="w-3 h-3" />
                    <span>Niciun admin activ</span>
                  </p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                store.active
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
              }`}>
                {store.active ? 'Activ' : 'Inactiv'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-red-100 dark:border-red-500/20">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{store.memberCount} membri alocați</span>
              </span>

              {onSelectStore && (
                <button
                  onClick={() => onSelectStore(store.storeId)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Gestionează</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
