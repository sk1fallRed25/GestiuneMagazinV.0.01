import React from 'react';
import {
  Store, MapPin, FileText, Users, Calendar, CheckCircle2,
  XCircle, ChevronRight, Plus, Edit2, Hash
} from 'lucide-react';
import { OwnerStore } from '../types';

interface StoresTableProps {
  stores: OwnerStore[];
  selectedStoreId: string | null;
  onSelectStore: (storeId: string) => void;
  onEditStore?: (store: OwnerStore) => void;
  onCreateStore?: () => void;
  loading?: boolean;
}

export const StoresTable: React.FC<StoresTableProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  onEditStore,
  onCreateStore,
  loading
}) => {
  if (loading && stores.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" role="status" aria-label="Se încarcă" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă lista magazinelor...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden animate-fade-in" role="region" aria-label="Magazine și puncte de lucru">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Store className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Magazine / Puncte de Lucru</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Gestionați punctele de lucru înregistrate · <span className="font-semibold">{stores.length} magazine</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full">
              {stores.filter(s => s.active).length} active / {stores.length} total
            </span>
            {onCreateStore && (
              <button
                onClick={onCreateStore}
                aria-label="Adaugă magazin nou"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Adaugă Magazin Nou</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table" aria-label="Tabel magazine">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="py-3.5 px-5">Magazin / Cod</th>
              <th className="py-3.5 px-5">Adresă</th>
              <th className="py-3.5 px-5">CUI / Fiscal</th>
              <th className="py-3.5 px-5 text-center">Punct Lucru</th>
              <th className="py-3.5 px-5 text-center">Membri</th>
              <th className="py-3.5 px-5 text-center">Stare</th>
              <th className="py-3.5 px-5">Înregistrat</th>
              <th className="py-3.5 px-5 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
            {stores.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 px-6 text-center">
                  <Store className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    Nu există magazine înregistrate în sistem.
                  </p>
                  {onCreateStore && (
                    <button
                      onClick={onCreateStore}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      Adaugă primul magazin
                    </button>
                  )}
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
                    aria-selected={isSelected}
                    role="row"
                  >
                    {/* Magazin / Cod */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${store.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{store.name}</div>
                          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                            {store.displayCode || `${store.fiscalCode || 'CUI'} / ${store.workpointNumber || '1'}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Adresă */}
                    <td className="py-4 px-5 text-gray-600 dark:text-gray-300 max-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                        <span className="truncate text-xs">{store.address || <span className="text-gray-400 italic">Nespecificată</span>}</span>
                      </div>
                    </td>

                    {/* CUI */}
                    <td className="py-4 px-5 text-gray-600 dark:text-gray-300 font-mono text-xs uppercase">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                        <span>{store.fiscalCode || <span className="text-gray-400 italic not-italic">—</span>}</span>
                      </div>
                    </td>

                    {/* Punct Lucru */}
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-xs">
                        <Hash className="w-3 h-3 text-gray-500" aria-hidden="true" />
                        {store.workpointNumber ?? 1}
                      </span>
                    </td>

                    {/* Membri */}
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold">
                        <Users className="w-3 h-3 text-gray-500" aria-hidden="true" />
                        {store.membersCount}
                      </span>
                    </td>

                    {/* Stare */}
                    <td className="py-4 px-5 text-center">
                      {store.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Activ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full text-xs font-semibold">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          Inactiv
                        </span>
                      )}
                    </td>

                    {/* Data */}
                    <td className="py-4 px-5 text-gray-500 dark:text-gray-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                        <span>{new Date(store.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </td>

                    {/* Acțiuni */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditStore && (
                          <button
                            onClick={e => { e.stopPropagation(); onEditStore(store); }}
                            title="Editează magazin"
                            aria-label={`Editează magazinul ${store.name}`}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); onSelectStore(store.id); }}
                          aria-label={`Selectează magazinul ${store.name} pentru a vedea membrii`}
                          title="Selectează magazin — afișează membrii"
                          className={`p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-300'
                          }`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      {stores.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{stores.filter(s => s.active).length} active · {stores.filter(s => !s.active).length} inactive</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
            {selectedStoreId ? '← Magazin selectat. Vezi membrii mai jos.' : 'Click pe un rând pentru a selecta magazinul.'}
          </span>
        </div>
      )}
    </div>
  );
};
