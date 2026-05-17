import React from 'react';
import { Store, MapPin, FileText, Users, Calendar, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { OwnerStore } from '../types';

interface StoresTableProps {
  stores: OwnerStore[];
  selectedStoreId: string | null;
  onSelectStore: (storeId: string) => void;
  loading?: boolean;
}

export const StoresTable: React.FC<StoresTableProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  loading
}) => {
  if (loading && stores.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă lista magazinelor...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Magazine Înregistrate</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Selectați un magazin pentru a-i gestiona membrii</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full">
          {stores.length} Magazine
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">Magazin</th>
              <th className="py-3.5 px-6">Adresă</th>
              <th className="py-3.5 px-6">Cod Fiscal</th>
              <th className="py-3.5 px-6 text-center">Membri</th>
              <th className="py-3.5 px-6 text-center">Stare</th>
              <th className="py-3.5 px-6">Data Înregistrării</th>
              <th className="py-3.5 px-6 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
            {stores.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-6 text-center text-gray-500 dark:text-gray-400">
                  Nu există magazine înregistrate în sistem.
                </td>
              </tr>
            ) : (
              stores.map(store => {
                const isSelected = store.id === selectedStoreId;
                return (
                  <tr
                    key={store.id}
                    onClick={() => onSelectStore(store.id)}
                    className={`group cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${store.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span>{store.name}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{store.address || <span className="text-gray-400 italic">Nespecificată</span>}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span>{store.fiscalCode || <span className="text-gray-400 italic">Nespecificat</span>}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span>{store.membersCount}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {store.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Activ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactiv</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(store.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStore(store.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
