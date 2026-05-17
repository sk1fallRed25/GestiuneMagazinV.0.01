import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useOwnerConsole } from './hooks/useOwnerConsole';
import { OwnerHeader } from './components/OwnerHeader';
import { OwnerStatsCards } from './components/OwnerStatsCards';
import { StoresTable } from './components/StoresTable';
import { StoreMembersTable } from './components/StoreMembersTable';

export const OwnerConsolePage: React.FC = () => {
  const {
    stats,
    stores,
    selectedStoreId,
    selectedStoreMembers,
    loading,
    error,
    selectStore,
    toggleMemberActive,
    changeMemberRole,
    refreshData
  } = useOwnerConsole();

  const selectedStore = useMemo(() => {
    return stores.find(s => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <OwnerHeader onRefresh={refreshData} loading={loading} />

      {/* Error Banner */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <OwnerStatsCards stats={stats} />

      {/* Stores Table */}
      <StoresTable
        stores={stores}
        selectedStoreId={selectedStoreId}
        onSelectStore={selectStore}
        loading={loading}
      />

      {/* Store Members Table */}
      <StoreMembersTable
        members={selectedStoreMembers}
        selectedStore={selectedStore}
        onToggleActive={toggleMemberActive}
        onChangeRole={changeMemberRole}
        loading={loading}
      />
    </div>
  );
};

export default OwnerConsolePage;
