import React from 'react';
import { LayoutDashboard, Store, Users, UserCheck } from 'lucide-react';
import { OwnerConsoleTab } from '../hooks/useOwnerConsole';

interface OwnerTabsProps {
  selectedTab: OwnerConsoleTab;
  onSelectTab: (tab: OwnerConsoleTab) => void;
  storesCount: number;
  profilesCount: number;
  membersCount: number;
}

interface TabItem {
  id: OwnerConsoleTab;
  label: string;
  icon: React.ElementType;
  count?: number;
}

export const OwnerTabs: React.FC<OwnerTabsProps> = ({
  selectedTab,
  onSelectTab,
  storesCount,
  profilesCount,
  membersCount
}) => {
  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'stores', label: 'Magazine', icon: Store, count: storesCount },
    { id: 'profiles', label: 'Profile Utilizatori', icon: Users, count: profilesCount },
    { id: 'members', label: 'Membri Magazin', icon: UserCheck, count: membersCount },
  ];

  return (
    <div className="flex items-center gap-2 mb-8 border-b border-gray-200 dark:border-gray-700/60 pb-4 overflow-x-auto animate-fade-in">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isSelected = selectedTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as OwnerConsoleTab)}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
              isSelected
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-100 dark:border-gray-700/60 shadow-sm'
            }`}
          >
            <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
