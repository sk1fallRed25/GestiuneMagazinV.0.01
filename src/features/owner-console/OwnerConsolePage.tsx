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

export const OwnerConsolePage: React.FC = () => {
  const {
    stats,
    stores,
    selectedStoreId,
    selectedStoreMembers,
    profiles,
    unassignedProfiles,
    storesWithoutAdmin,
    selectedTab,
    setSelectedTab,
    loading,
    error,
    selectStore,
    toggleMemberActive,
    changeMemberRole,
    assignMemberToStore,
    refreshAll
  } = useOwnerConsole();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignModalProfileId, setAssignModalProfileId] = useState<string | undefined>(undefined);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <OwnerHeader onRefresh={refreshAll} loading={loading} />

      {/* Error Banner */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-50" />
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
            loading={loading}
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
            loading={loading}
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

      {/* Modal Alocare Utilizator la Magazin */}
      <AssignMemberModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={assignMemberToStore}
        profiles={profiles}
        stores={stores}
        initialProfileId={assignModalProfileId}
      />
    </div>
  );
};

export default OwnerConsolePage;

