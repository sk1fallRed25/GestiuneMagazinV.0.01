import React from 'react';
import { Store, CheckCircle, Users, UserCheck, Shield, UserX, AlertTriangle } from 'lucide-react';
import { OwnerConsoleStats } from '../types';

interface OwnerGlobalStatsCardsProps {
  stats: OwnerConsoleStats | null;
}

export const OwnerGlobalStatsCards: React.FC<OwnerGlobalStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
      {/* Total Magazine */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Total Magazine
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.totalStores ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
            <Store className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Active: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{stats?.activeStores ?? 0}</strong></span>
          <span>Inactive: <strong>{(stats?.totalStores ?? 0) - (stats?.activeStores ?? 0)}</strong></span>
        </div>
      </div>

      {/* Total Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Total Profile
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.totalProfiles ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Active: <strong className="text-blue-600 dark:text-blue-400 font-bold">{stats?.activeProfiles ?? 0}</strong></span>
          <span>Inactive: <strong>{(stats?.totalProfiles ?? 0) - (stats?.activeProfiles ?? 0)}</strong></span>
        </div>
      </div>

      {/* Membri Alocați */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Membri Alocați
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.activeStoreMembers ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Admini Magazin: <strong className="text-purple-600 dark:text-purple-400 font-bold">{stats?.totalStoreAdmins ?? 0}</strong></span>
          <span>Total asocieri: <strong>{stats?.totalStoreMembers ?? 0}</strong></span>
        </div>
      </div>

      {/* Alerte Globale */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Alerte Globale
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {(stats?.unassignedProfiles ?? 0) + (stats?.storesWithoutAdmin ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-amber-500" />
            <span>Nealocați: <strong className="text-amber-600 dark:text-amber-400 font-bold">{stats?.unassignedProfiles ?? 0}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>Fără admin: <strong className="text-red-600 dark:text-red-400 font-bold">{stats?.storesWithoutAdmin ?? 0}</strong></span>
          </span>
        </div>
      </div>
    </div>
  );
};
