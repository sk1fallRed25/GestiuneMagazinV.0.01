import React from 'react';
import { LayoutDashboard, Store, Users, UserCheck, History, Layers, CreditCard, Archive } from 'lucide-react';
import { OwnerConsoleTab } from '../hooks/useOwnerConsole';

interface OwnerTabsProps {
  selectedTab: OwnerConsoleTab;
  onSelectTab: (tab: OwnerConsoleTab) => void;
  storesCount: number;
  profilesCount: number;
  membersCount: number;
  auditCount: number;
  archivedStoresCount?: number;
}

interface TabItem {
  id: OwnerConsoleTab;
  label: string;
  icon: React.ElementType;
  count?: number;
  description?: string;
  testId?: string;
}

export const OwnerTabs: React.FC<OwnerTabsProps> = ({
  selectedTab,
  onSelectTab,
  storesCount,
  profilesCount,
  membersCount,
  auditCount,
  archivedStoresCount = 0
}) => {
  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Dashboard platformă', testId: 'owner-console-tab-overview' },
    { id: 'stores', label: 'Magazine', icon: Store, count: storesCount, description: 'Puncte de lucru', testId: 'owner-console-tab-stores' },
    { id: 'profiles', label: 'Utilizatori', icon: Users, count: profilesCount, description: 'Conturi sistem', testId: 'owner-console-tab-users' },
    { id: 'members', label: 'Membri Magazine', icon: UserCheck, count: membersCount, description: 'Acces per magazin', testId: 'owner-console-tab-members' },
    { id: 'modules', label: 'Module', icon: Layers, description: 'Configurare module', testId: 'owner-console-tab-modules' },
    { id: 'commercial-packages', label: 'Pachete Comerciale', icon: CreditCard, description: 'Abonamente și prețuri', testId: 'owner-console-tab-commercial-packages' },
    { id: 'audit', label: 'Audit Logs', icon: History, count: auditCount > 0 ? auditCount : undefined, description: 'Trasabilitate', testId: 'owner-console-tab-audit' },
    { id: 'archived-stores', label: 'Magazine Arhivate', icon: Archive, count: archivedStoresCount > 0 ? archivedStoresCount : undefined, description: 'Puncte de lucru arhivate', testId: 'owner-console-tab-archived-stores' },
  ];

  return (
    <nav
      className="mb-8 animate-fade-in"
      aria-label="Navigare Owner Console"
      data-testid="owner-console-tabs"
    >
      {/* Tab strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700/60 pb-3">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = selectedTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`owner-tab-${tab.id}`}
              data-testid={tab.testId || `owner-console-tab-${tab.id}`}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`owner-tabpanel-${tab.id}`}
              onClick={() => onSelectTab(tab.id as OwnerConsoleTab)}
              className={`
                group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                whitespace-nowrap transition-all duration-200 focus:outline-none
                focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                rounded-xl border
                ${isSelected
                  ? 'border-indigo-600/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`}
                aria-hidden="true"
              />
              <span>{tab.label}</span>

              {/* Count badge */}
              {tab.count !== undefined && (
                <span
                  className={`ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                  }`}
                  aria-label={`${tab.count} ${tab.label.toLowerCase()}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
