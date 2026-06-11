import React, { useMemo, useState } from 'react';
import { AlertCircle, X, Archive, AlertTriangle } from 'lucide-react';
import { useOwnerConsole } from './hooks/useOwnerConsole';
import { OwnerHeader } from './components/OwnerHeader';
import { OwnerTabs } from './components/OwnerTabs';
import { OwnerGlobalStatsCards } from './components/OwnerGlobalStatsCards';
import { OwnerUnassignedProfilesPanel } from './components/OwnerUnassignedProfilesPanel';
import { StoresWithoutAdminPanel } from './components/StoresWithoutAdminPanel';
import { StoresTable } from './components/StoresTable';
import { OwnerProfilesTable } from './components/OwnerProfilesTable';
import { StoreMembersTable } from './components/StoreMembersTable';
import { AssignMemberModal } from './components/AssignMemberModal';
import { StoreFormModal } from './components/StoreFormModal';
import { OwnerAuditLogsPanel } from './components/OwnerAuditLogsPanel';
import { OwnerStoreModulesPanel } from './components/OwnerStoreModulesPanel';
import { OwnerStore, CreateStorePayload, UpdateStorePayload } from './types';
import { StoreLifecycleActionModal } from './components/StoreLifecycleActionModal';
import { StoreDeletionEligibilityModal } from './components/StoreDeletionEligibilityModal';

export const OwnerConsolePage: React.FC = () => {
  const {
    stats,
    stores,
    selectedStoreId,
    selectedStoreMembers,
    profiles,
    unassignedProfiles,
    storesWithoutAdmin,
    auditLogs,
    selectedTab,
    setSelectedTab,
    loading,
    loadingAuditLogs,
    error,
    selectStore,
    toggleMemberActive,
    changeMemberRole,
    assignMemberToStore,
    createStore,
    updateStore,
    refreshAll,
    loadAuditLogs
  } = useOwnerConsole();

  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignModalProfileId, setAssignModalProfileId] = useState<string | undefined>(undefined);

  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);
  const [storeModalMode, setStoreModalMode] = useState<'create' | 'edit'>('create');
  const [storeModalData, setStoreModalData] = useState<OwnerStore | null>(null);

  // Lifecycle management states
  const [lifecycleStore, setLifecycleStore] = useState<OwnerStore | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<'suspend' | 'reactivate' | 'archive' | 'request_deletion' | 'cancel_deletion' | null>(null);
  const [isLifecycleActionModalOpen, setIsLifecycleActionModalOpen] = useState<boolean>(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState<boolean>(false);

  const activeStores = useMemo(() => {
    return stores.filter(s => s.lifecycleStatus !== 'archived');
  }, [stores]);

  const archivedStores = useMemo(() => {
    return stores.filter(s => s.lifecycleStatus === 'archived');
  }, [stores]);

  const handleLifecycleActionClick = (store: OwnerStore, action: 'suspend' | 'reactivate' | 'archive' | 'request_deletion' | 'cancel_deletion') => {
    setLifecycleStore(store);
    setLifecycleAction(action);
    setIsLifecycleActionModalOpen(true);
  };

  const handleCheckEligibilityClick = (store: OwnerStore) => {
    setLifecycleStore(store);
    setIsEligibilityModalOpen(true);
  };

  const selectedStore = useMemo(() => {
    return stores.find(s => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  const handleSelectStoreFromPanel = (storeId: string) => {
    selectStore(storeId);
    setSelectedTab('members');
  };

  const handleOpenAssignModal = (profileId?: string) => {
    setAssignModalProfileId(profileId);
    setIsAssignModalOpen(true);
  };

  const handleCreateStoreClick = () => {
    setStoreModalMode('create');
    setStoreModalData(null);
    setIsStoreModalOpen(true);
  };

  const handleEditStoreClick = (store: OwnerStore) => {
    setStoreModalMode('edit');
    setStoreModalData(store);
    setIsStoreModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in" data-testid="owner-console-page">
      {/* Header */}
      <OwnerHeader onRefresh={refreshAll} loading={loading} />

      {/* Error Banner */}
      {error && dismissedError !== error && (
        <div 
          data-testid="owner-alert-danger" 
          className="mb-8 p-4 bg-red-600 text-white rounded-2xl flex items-center justify-between gap-3 text-sm shadow-md border border-red-700 animate-shake"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-white" />
            <p className="font-semibold">{error}</p>
          </div>
          <button
            data-testid="owner-alert-close"
            onClick={() => setDismissedError(error)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            aria-label="Închide alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab-uri de navigare */}
      <OwnerTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        storesCount={activeStores.length}
        profilesCount={profiles.length}
        membersCount={selectedStoreMembers.length}
        auditCount={auditLogs.length}
        archivedStoresCount={archivedStores.length}
      />

      {/* Secțiunea Overview */}
      {selectedTab === 'overview' && (
        <div className="space-y-8 animate-fade-in" data-testid="owner-section-overview">
          <OwnerGlobalStatsCards stats={stats} />
          <OwnerUnassignedProfilesPanel
            unassignedProfiles={unassignedProfiles}
            onOpenAssignModal={handleOpenAssignModal}
          />
          <StoresWithoutAdminPanel
            storesWithoutAdmin={storesWithoutAdmin}
            onSelectStore={handleSelectStoreFromPanel}
          />
        </div>
      )}

      {/* Secțiunea Magazine */}
      {selectedTab === 'stores' && (
        <div className="animate-fade-in" data-testid="owner-section-stores">
          <StoresTable
            stores={activeStores}
            selectedStoreId={selectedStoreId}
            onSelectStore={(id) => {
               selectStore(id);
               setSelectedTab('members');
            }}
            onCreateStore={handleCreateStoreClick}
            onEditStore={handleEditStoreClick}
            loading={loading}
            onLifecycleAction={handleLifecycleActionClick}
            onCheckEligibility={handleCheckEligibilityClick}
          />
        </div>
      )}

      {/* Secțiunea Profile Utilizatori */}
      {selectedTab === 'profiles' && (
        <div className="animate-fade-in" data-testid="owner-section-users">
          <OwnerProfilesTable
            profiles={profiles}
            loading={loading}
            onOpenAssignModal={handleOpenAssignModal}
          />
        </div>
      )}

      {/* Secțiunea Membri Magazin */}
      {selectedTab === 'members' && (
        <div className="space-y-8 animate-fade-in" data-testid="owner-section-members">
          <StoresTable
            stores={activeStores}
            selectedStoreId={selectedStoreId}
            onSelectStore={selectStore}
            onCreateStore={handleCreateStoreClick}
            onEditStore={handleEditStoreClick}
            loading={loading}
            onLifecycleAction={handleLifecycleActionClick}
            onCheckEligibility={handleCheckEligibilityClick}
          />
          <StoreMembersTable
            members={selectedStoreMembers}
            selectedStore={selectedStore}
            onToggleActive={toggleMemberActive}
            onChangeRole={changeMemberRole}
            loading={loading}
          />
        </div>
      )}

      {/* Secțiunea Module Magazin */}
      {selectedTab === 'modules' && (
        <div className="space-y-8 animate-fade-in" data-testid="owner-section-modules">
          <StoresTable
            stores={activeStores}
            selectedStoreId={selectedStoreId}
            onSelectStore={selectStore}
            onCreateStore={handleCreateStoreClick}
            onEditStore={handleEditStoreClick}
            loading={loading}
            onLifecycleAction={handleLifecycleActionClick}
            onCheckEligibility={handleCheckEligibilityClick}
          />
          <OwnerStoreModulesPanel
            selectedStoreId={selectedStoreId}
            selectedStore={selectedStore}
          />
        </div>
      )}

      {/* Secțiunea Pachete Comerciale */}
      {selectedTab === 'commercial-packages' && (
        <div className="space-y-6 animate-fade-in" data-testid="owner-section-commercial-packages">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pachete Comerciale & Abonamente</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Configurațiile comerciale pre-stabilite pentru punctele de lucru active din rețea.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: 'Bronze (Basic)',
                  price: '19 €/lună',
                  modules: ['Punct de vânzare (POS)', 'Nomenclator Produse'],
                  popular: false,
                  color: 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                },
                {
                  name: 'Silver (Standard)',
                  price: '39 €/lună',
                  modules: ['POS', 'Produse', 'Gestiune Expirări', 'Raportare Pierderi'],
                  popular: false,
                  color: 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                },
                {
                  name: 'Gold (Complet)',
                  price: '59 €/lună',
                  modules: ['POS', 'Produse', 'Expirări', 'Pierderi', 'Recepție & NIR', 'Transferuri'],
                  popular: true,
                  color: 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-lg shadow-indigo-100/10'
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  modules: ['Toate modulele Gold', 'AI Consultant avansat', 'Audit extins', 'SLA Garantat & Support 24/7'],
                  popular: false,
                  color: 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                }
              ].map((pkg, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border-2 flex flex-col justify-between relative ${pkg.color}`}>
                  {pkg.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-650 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                      Recomandat
                    </span>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-2">{pkg.name}</h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mb-6">{pkg.price}</p>
                    <ul className="space-y-2.5">
                      {pkg.modules.map((m, mIdx) => (
                        <li key={mIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-center">
                      Configurabil prin module magazin
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Secțiunea Audit Logs */}
      {selectedTab === 'audit' && (
        <div className="animate-fade-in" data-testid="owner-section-audit">
          <OwnerAuditLogsPanel
            logs={auditLogs}
            loading={loadingAuditLogs}
            onRefresh={loadAuditLogs}
          />
        </div>
      )}

      {/* Secțiunea Magazine Arhivate */}
      {selectedTab === 'archived-stores' && (
        <div className="space-y-6 animate-fade-in" data-testid="owner-section-archived-stores">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden" data-testid="owner-archived-stores-section">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
                  <Archive className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Magazine Arhivate</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Punctele de lucru care au fost scoase din uz, dar ale căror date sunt păstrate pentru audit fiscal.
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="mx-6 mt-6 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800 dark:text-purple-300 font-semibold leading-relaxed">
                <strong>Notă importantă:</strong> Magazinele arhivate nu pot fi selectate în contextul activ al header-ului și nu permit operațiuni POS. 
                Puteți reactiva un magazin pentru a-l repune în funcțiune oricând.
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto p-6">
              {archivedStores.length === 0 ? (
                <div data-testid="owner-archived-store-empty-state" className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-750 rounded-2xl">
                  <Archive className="w-12 h-12 text-slate-305 dark:text-slate-600 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Nu există magazine arhivate în rețea.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse" role="table" aria-label="Tabel magazine arhivate">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Nume Magazin / Cod</th>
                      <th className="py-3 px-4">CUI / Fiscal</th>
                      <th className="py-3 px-4 text-center">Punct Lucru</th>
                      <th className="py-3 px-4 text-center">Stare</th>
                      <th className="py-3 px-4 text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
                    {archivedStores.map(store => (
                      <tr key={store.id} data-testid="owner-archived-store-row" className="hover:bg-slate-50/50 dark:hover:bg-gray-750/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-800 dark:text-white">{store.name}</td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-350">{store.fiscalCode}</td>
                        <td className="py-4 px-4 text-center font-semibold text-slate-755 dark:text-slate-350">{store.workpointNumber}</td>
                        <td className="py-4 px-4 text-center">
                          <span data-testid="owner-store-status-archived-badge" className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-750 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 rounded-full text-xs font-semibold">
                            Arhivat
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleLifecycleActionClick(store, 'reactivate')}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-750 dark:text-white border border-slate-200 dark:border-slate-650 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Reactivează
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Alocare Utilizator la Magazin */}
      <AssignMemberModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={assignMemberToStore}
        profiles={profiles}
        stores={stores}
        initialProfileId={assignModalProfileId}
      />

      {/* Modal Gestiune Magazin (Creare / Editare) */}
      <StoreFormModal
        isOpen={isStoreModalOpen}
        mode={storeModalMode}
        store={storeModalData}
        onClose={() => setIsStoreModalOpen(false)}
        onSubmit={async (payload) => {
          if (storeModalMode === 'create') {
            await createStore(payload as CreateStorePayload);
          } else {
            await updateStore(payload as UpdateStorePayload);
          }
        }}
        loading={loading}
      />

      {/* Lifecycle Action Modals */}
      <StoreLifecycleActionModal
        isOpen={isLifecycleActionModalOpen}
        store={lifecycleStore}
        action={lifecycleAction}
        onClose={() => {
          setIsLifecycleActionModalOpen(false);
          setLifecycleStore(null);
          setLifecycleAction(null);
        }}
        onSuccess={() => {
          refreshAll();
          loadAuditLogs();
        }}
      />

      <StoreDeletionEligibilityModal
        isOpen={isEligibilityModalOpen}
        store={lifecycleStore}
        onClose={() => {
          setIsEligibilityModalOpen(false);
          setLifecycleStore(null);
        }}
        onRequestDeletion={() => {
          if (lifecycleStore) {
            handleLifecycleActionClick(lifecycleStore, 'request_deletion');
          }
        }}
      />
    </div>
  );
};

export default OwnerConsolePage;


