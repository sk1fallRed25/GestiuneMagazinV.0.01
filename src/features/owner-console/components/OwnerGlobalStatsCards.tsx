import React from 'react';
import {
  Store, CheckCircle, Users, UserCheck, AlertTriangle,
  UserX, Shield, TrendingUp, Activity
} from 'lucide-react';
import { OwnerConsoleStats } from '../types';

interface OwnerGlobalStatsCardsProps {
  stats: OwnerConsoleStats | null;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  accentColor: 'indigo' | 'blue' | 'emerald' | 'amber' | 'red' | 'violet';
  footer?: React.ReactNode;
  isAlert?: boolean;
  testId?: string;
}

const accentMap = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    icon: 'text-indigo-600 dark:text-indigo-400',
    glow: 'bg-indigo-500/5',
    value: 'text-indigo-900 dark:text-indigo-100',
    border: 'border-indigo-100 dark:border-indigo-500/20',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    glow: 'bg-blue-500/5',
    value: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-100 dark:border-blue-500/20',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    glow: 'bg-emerald-500/5',
    value: 'text-emerald-900 dark:text-emerald-100',
    border: 'border-emerald-100 dark:border-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    glow: 'bg-amber-500/5',
    value: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-500/20',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    icon: 'text-red-600 dark:text-red-400',
    glow: 'bg-red-500/5',
    value: 'text-red-700 dark:text-red-400',
    border: 'border-red-100 dark:border-red-500/20',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    icon: 'text-violet-600 dark:text-violet-400',
    glow: 'bg-violet-500/5',
    value: 'text-violet-900 dark:text-violet-100',
    border: 'border-violet-100 dark:border-violet-500/20',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title, value, description, icon: Icon, accentColor, footer, isAlert, testId
}) => {
  const colors = accentMap[accentColor];
  return (
    <div 
      data-testid={testId || "owner-global-stat-card"}
      className={`
        bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border
        ${isAlert && Number(value) > 0 ? 'border-amber-200 dark:border-amber-500/30' : 'border-gray-100 dark:border-gray-700/60'}
        relative overflow-hidden group hover:shadow-md transition-all duration-200
      `}
    >
      {/* Decorative corner glow */}
      <div className={`absolute -top-8 -right-8 w-28 h-28 ${colors.glow} rounded-full transition-transform group-hover:scale-125 duration-500`} aria-hidden="true" />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`w-11 h-11 ${colors.bg} rounded-xl flex items-center justify-center ${colors.icon} shadow-inner shrink-0`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          {isAlert && Number(value) > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-500/30 animate-pulse">
              Atenție
            </span>
          )}
        </div>

        {/* Value */}
        <p 
          data-testid="owner-global-stat-label"
          className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
        >
          {title}
        </p>
        <h3 
          data-testid="owner-global-stat-value"
          className={`text-3xl font-extrabold ${isAlert && Number(value) > 0 ? colors.value : 'text-gray-900 dark:text-white'} leading-none mb-1`}
        >
          {value ?? '—'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
          {description}
        </p>

        {/* Footer divider */}
        {footer && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const OwnerGlobalStatsCards: React.FC<OwnerGlobalStatsCardsProps> = ({ stats }) => {
  const alertCount = (stats?.unassignedProfiles ?? 0) + (stats?.storesWithoutAdmin ?? 0);

  return (
    <div 
      data-testid="owner-global-stats"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 animate-fade-in"
    >
      {/* Total Magazine */}
      <div className="sm:col-span-1 xl:col-span-1">
        <StatCard
          testId="total-stores-card"
          title="Total Magazine"
          value={stats?.totalStores ?? '—'}
          description="Puncte de lucru înregistrate"
          icon={Store}
          accentColor="indigo"
          footer={
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                <span>Active: <strong className="text-emerald-600 dark:text-emerald-400">{stats?.activeStores ?? 0}</strong></span>
              </span>
              <span>Inactive: <strong>{(stats?.totalStores ?? 0) - (stats?.activeStores ?? 0)}</strong></span>
            </div>
          }
        />
      </div>

      {/* Magazine Active */}
      <div className="sm:col-span-1 xl:col-span-1">
        <StatCard
          testId="active-stores-card"
          title="Magazine Active"
          value={stats?.activeStores ?? '—'}
          description="Puncte operaționale"
          icon={CheckCircle}
          accentColor="emerald"
          footer={
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Din total <strong>{stats?.totalStores ?? 0}</strong></span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {stats?.totalStores ? Math.round(((stats?.activeStores ?? 0) / stats.totalStores) * 100) : 0}%
              </span>
            </div>
          }
        />
      </div>

      {/* Total Utilizatori */}
      <div className="sm:col-span-1 xl:col-span-1">
        <StatCard
          testId="total-profiles-card"
          title="Utilizatori"
          value={stats?.totalProfiles ?? '—'}
          description="Profile înregistrate în sistem"
          icon={Users}
          accentColor="blue"
          footer={
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Activi: <strong className="text-blue-600 dark:text-blue-400">{stats?.activeProfiles ?? 0}</strong></span>
              <span>Inactivi: <strong>{(stats?.totalProfiles ?? 0) - (stats?.activeProfiles ?? 0)}</strong></span>
            </div>
          }
        />
      </div>

      {/* Membri Alocați */}
      <div className="sm:col-span-1 xl:col-span-1">
        <StatCard
          testId="active-members-card"
          title="Membri Alocați"
          value={stats?.activeStoreMembers ?? '—'}
          description="Asocieri active în magazine"
          icon={UserCheck}
          accentColor="violet"
          footer={
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-violet-500" aria-hidden="true" />
                <span>Admini: <strong className="text-violet-600 dark:text-violet-400">{stats?.totalStoreAdmins ?? 0}</strong></span>
              </span>
              <span>Total: <strong>{stats?.totalStoreMembers ?? 0}</strong></span>
            </div>
          }
        />
      </div>

      {/* Alerte Globale */}
      <div className="sm:col-span-1 xl:col-span-1">
        <StatCard
          testId="global-alerts-card"
          title="Alerte Globale"
          value={alertCount}
          description={alertCount === 0 ? 'Nicio alertă activă' : 'Necesită atenție'}
          icon={AlertTriangle}
          accentColor={alertCount > 0 ? 'amber' : 'emerald'}
          isAlert={alertCount > 0}
          footer={
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <UserX className="w-3 h-3 text-amber-500" aria-hidden="true" />
                <span>Nealoc.: <strong className="text-amber-600 dark:text-amber-400">{stats?.unassignedProfiles ?? 0}</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-red-500" aria-hidden="true" />
                <span>Fără admin: <strong className="text-red-600 dark:text-red-400">{stats?.storesWithoutAdmin ?? 0}</strong></span>
              </span>
            </div>
          }
        />
      </div>

      {/* Sănătate Platformă */}
      <div className="sm:col-span-2 xl:col-span-1">
        <StatCard
          testId="platform-health-card"
          title="Sănătate Platformă"
          value={alertCount === 0 ? '✓ OK' : `${alertCount} alerte`}
          description={alertCount === 0 ? 'Toate serviciile funcționează' : 'Verificați alertele de mai jos'}
          icon={TrendingUp}
          accentColor={alertCount === 0 ? 'emerald' : 'amber'}
          isAlert={alertCount > 0}
          footer={
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {alertCount === 0
                ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Stare Optimă ✓</span>
                : <span className="text-amber-600 dark:text-amber-400 font-semibold">Acțiuni recomandate</span>
              }
            </div>
          }
        />
      </div>
    </div>
  );
};
