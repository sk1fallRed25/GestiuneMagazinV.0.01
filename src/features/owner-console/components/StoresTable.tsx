import React, { useState } from 'react';
import {
  Store, MapPin, FileText, Users, Calendar, CheckCircle2,
  XCircle, ChevronRight, Plus, Edit2, Hash,
  MoreVertical, Play, Pause, Trash2, ShieldAlert,
  RotateCcw, Archive, AlertTriangle
} from 'lucide-react';
import { OwnerStore } from '../types';
import { EmptyState } from '../../../shared/components/ui';

interface StoresTableProps {
  stores: OwnerStore[];
  selectedStoreId: string | null;
  onSelectStore: (storeId: string) => void;
  onEditStore?: (store: OwnerStore) => void;
  onCreateStore?: () => void;
  loading?: boolean;
  onLifecycleAction?: (store: OwnerStore, action: 'suspend' | 'reactivate' | 'archive' | 'request_deletion' | 'cancel_deletion') => void;
  onCheckEligibility?: (store: OwnerStore) => void;
}

export const StoresTable: React.FC<StoresTableProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  onEditStore,
  onCreateStore,
  loading,
  onLifecycleAction,
  onCheckEligibility
}) => {
  const [openMenuStoreId, setOpenMenuStoreId] = useState<string | null>(null);

  if (loading && stores.length === 0) {
    return (
      <div 
        data-testid="owner-console-loading-state"
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col items-center justify-center min-h-[300px] animate-fade-in"
      >
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" role="status" aria-label="Se încarcă" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă lista magazinelor...</p>
      </div>
    );
  }

  if (!loading && stores.length === 0) {
    return (
      <div 
        data-testid="owner-console-empty-state"
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/60"
      >
        <EmptyState
          title="Nu există magazine înregistrate"
          description="Înregistrează primul magazin sau punct de lucru în sistem pentru a începe."
          icon={<Store size={40} className="text-slate-400" />}
          action={
            onCreateStore && (
              <button
                onClick={onCreateStore}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Adaugă primul magazin
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div 
      data-testid="owner-console-store-table"
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden animate-fade-in" 
      role="region" 
      aria-label="Magazine și puncte de lucru"
    >
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
            {stores.map(store => {
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
                  data-testid="owner-console-store-row"
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
                    {(() => {
                      const status = store.lifecycleStatus || (store.active ? 'active' : 'suspended');
                      switch (status) {
                        case 'active':
                          return (
                            <span
                              data-testid={`store-lifecycle-badge-${store.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold"
                            >
                              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                              Activ
                            </span>
                          );
                        case 'suspended':
                          return (
                            <span
                              data-testid={`store-lifecycle-badge-${store.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-full text-xs font-semibold"
                            >
                              <XCircle className="w-3 h-3" aria-hidden="true" />
                              Suspendat
                            </span>
                          );
                        case 'archived':
                          return (
                            <span
                              data-testid={`store-lifecycle-badge-${store.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded-full text-xs font-semibold"
                            >
                              <Archive className="w-3 h-3" aria-hidden="true" />
                              Arhivat
                            </span>
                          );
                        case 'pending_deletion':
                          return (
                            <span
                              data-testid={`store-lifecycle-badge-${store.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-full text-xs font-semibold animate-pulse"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-500" aria-hidden="true" />
                              În așteptare ștergere
                            </span>
                          );
                        case 'deleted':
                          return (
                            <span
                              data-testid={`store-lifecycle-badge-${store.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full text-xs font-semibold"
                            >
                              <XCircle className="w-3 h-3" aria-hidden="true" />
                              Șters
                            </span>
                          );
                        default:
                          return (
                            <span
                              data-testid={`store-lifecycle-badge-${store.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full text-xs font-semibold"
                            >
                              {status}
                            </span>
                          );
                      }
                    })()}
                  </td>

                  {/* Data */}
                  <td className="py-4 px-5 text-gray-500 dark:text-gray-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                      <span>{new Date(store.createdAt).toLocaleDateString('ro-RO')}</span>
                    </div>
                  </td>

                  {/* Acțiuni */}
                  <td className="py-4 px-5 text-right relative">
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

                      {/* Dropdown pentru operatiuni ciclu de viata */}
                      <div className="relative inline-block text-left">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setOpenMenuStoreId(openMenuStoreId === store.id ? null : store.id);
                          }}
                          title="Opțiuni ciclu viață"
                          aria-label={`Opțiuni ciclu viață pentru ${store.name}`}
                          data-testid={`store-lifecycle-menu-${store.id}`}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        
                        {openMenuStoreId === store.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuStoreId(null);
                              }}
                            />
                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 ring-1 ring-black ring-opacity-5 z-20 focus:outline-none overflow-hidden">
                              <div className="py-1 divide-y divide-gray-100 dark:divide-gray-700/60" role="menu">
                                <div className="py-1">
                                  {/* Suspend (only active) */}
                                  {(store.lifecycleStatus || (store.active ? 'active' : 'suspended')) === 'active' && onLifecycleAction && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenMenuStoreId(null);
                                        onLifecycleAction(store, 'suspend');
                                      }}
                                      data-testid={`store-action-suspend-${store.id}`}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors flex items-center gap-2 animate-fade-in"
                                      role="menuitem"
                                    >
                                      <Pause className="w-3.5 h-3.5" />
                                      Suspendă magazin
                                    </button>
                                  )}

                                  {/* Reactivate (suspended or archived) */}
                                  {['suspended', 'archived'].includes(store.lifecycleStatus || (store.active ? 'active' : 'suspended')) && onLifecycleAction && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenMenuStoreId(null);
                                        onLifecycleAction(store, 'reactivate');
                                      }}
                                      data-testid={`store-action-reactivate-${store.id}`}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors flex items-center gap-2 animate-fade-in"
                                      role="menuitem"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                      Reactivează magazin
                                    </button>
                                  )}

                                  {/* Archive (active or suspended) */}
                                  {['active', 'suspended'].includes(store.lifecycleStatus || (store.active ? 'active' : 'suspended')) && onLifecycleAction && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenMenuStoreId(null);
                                        onLifecycleAction(store, 'archive');
                                      }}
                                      data-testid={`store-action-archive-${store.id}`}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors flex items-center gap-2 animate-fade-in"
                                      role="menuitem"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                      Arhivează magazin
                                    </button>
                                  )}

                                  {/* Cancel deletion request (pending_deletion) */}
                                  {(store.lifecycleStatus || (store.active ? 'active' : 'suspended')) === 'pending_deletion' && onLifecycleAction && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenMenuStoreId(null);
                                        onLifecycleAction(store, 'cancel_deletion');
                                      }}
                                      data-testid={`store-action-cancel-deletion-${store.id}`}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors flex items-center gap-2 animate-fade-in"
                                      role="menuitem"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      Anulează cerere ștergere
                                    </button>
                                  )}
                                </div>

                                <div className="py-1">
                                  {onCheckEligibility && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenMenuStoreId(null);
                                        onCheckEligibility(store);
                                      }}
                                      data-testid={`store-action-check-delete-${store.id}`}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                                      role="menuitem"
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
                                      Verifică eligibilitate
                                    </button>
                                  )}
                                  <button
                                    disabled
                                    title="Ștergerea definitivă este dezactivată în această versiune."
                                    className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 cursor-not-allowed flex items-center gap-2"
                                    role="menuitem"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                                    Șterge definitiv (Disabled)
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

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
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      {stores.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {stores.filter(s => (s.lifecycleStatus || (s.active ? 'active' : 'suspended')) === 'active').length} active · {' '}
            {stores.filter(s => ['suspended', 'pending_deletion'].includes(s.lifecycleStatus || (s.active ? 'active' : 'suspended'))).length} suspendate · {' '}
            {stores.filter(s => (s.lifecycleStatus || '') === 'archived').length} arhivate
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
            {selectedStoreId ? '← Magazin selectat. Vezi membrii mai jos.' : 'Click pe un rând pentru a selecta magazinul.'}
          </span>
        </div>
      )}
    </div>
  );
};
