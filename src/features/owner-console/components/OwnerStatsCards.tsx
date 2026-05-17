import React from 'react';
import { Store, CheckCircle, Users, ShieldCheck } from 'lucide-react';
import { OwnerConsoleStats } from '../types';

interface OwnerStatsCardsProps {
  stats: OwnerConsoleStats | null;
}

export const OwnerStatsCards: React.FC<OwnerStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Magazine Totale */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Magazine Totale
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.storesCount ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
            <Store className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Total unități comerciale înregistrate</span>
        </div>
      </div>

      {/* Magazine Active */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Magazine Active
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.activeStoresCount ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Unități operaționale și funcționale</span>
        </div>
      </div>

      {/* Membri Total */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Membri Total
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.membersCount ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Personal alocat în magazine</span>
        </div>
      </div>

      {/* Administratori */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Administratori
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.adminsCount ?? '-'}
            </h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Conturi cu drepturi de administrare</span>
        </div>
      </div>
    </div>
  );
};
