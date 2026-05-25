import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <OwnerHeader onRefresh={refreshAll} loading={loading} />

      {/* Error Banner */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Tab-uri de navigare */}
      <OwnerTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        storesCount={stores.length}
        profilesCount={profiles.length}
        membersCount={selectedStoreMembers.length}
        auditCount={auditLogs.length}
      />

      {/* Secțiunea Overview */}
      {selectedTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
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
        <div className="animate-fade-in">
          <StoresTable
            stores={stores}
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
        <div className="animate-fade-in">
          <OwnerProfilesTable
            profiles={profiles}
            loading={loading}
            onOpenAssignModal={handleOpenAssignModal}
          />
        </div>
      )}

      {/* Secțiunea Membri Magazin */}
      {selectedTab === 'members' && (
        <div className="space-y-8 animate-fade-in">
          <StoresTable
            stores={stores}
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
        <div className="space-y-8 animate-fade-in">
          <StoresTable
            stores={stores}
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

      {/* Secțiunea Audit Logs */}
      {selectedTab === 'audit' && (
        <div className="animate-fade-in">
          <OwnerAuditLogsPanel
            logs={auditLogs}
            loading={loadingAuditLogs}
            onRefresh={loadAuditLogs}
          />
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


