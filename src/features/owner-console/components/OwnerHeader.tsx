import React from 'react';
import { ShieldAlert, RefreshCw, Globe, Crown } from 'lucide-react';

interface OwnerHeaderProps {
  onRefresh: () => void;
  loading?: boolean;
}

export const OwnerHeader: React.FC<OwnerHeaderProps> = ({ onRefresh, loading }) => {
  return (
    <div className="mb-8 relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in" data-testid="owner-console-header">
      {/* Background light/neutral card */}
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 text-slate-800 dark:text-gray-150">
        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left side: Icon + Title */}
          <div className="flex items-start gap-5">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-650 shadow-inner shrink-0">
              <ShieldAlert className="w-8 h-8 text-indigo-650 dark:text-indigo-400" />
            </div>
            <div>
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full text-xs font-bold text-indigo-750 dark:text-indigo-300 tracking-wider uppercase backdrop-blur-sm">
                  <Crown className="w-3 h-3" aria-hidden="true" />
                  Platform Owner
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider backdrop-blur-sm">
                  <Globe className="w-3 h-3" aria-hidden="true" />
                  Platform Administration
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1.5 font-sans">
                Owner Console
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                Administrare platformă, magazine, utilizatori și audit operațional.
              </p>
            </div>
          </div>

          {/* Right side: Refresh action */}
          <div className="flex items-center gap-3 shrink-0 self-start">
            <button
              onClick={onRefresh}
              disabled={loading}
              aria-label="Actualizează datele Owner Console"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:bg-slate-350 text-slate-850 dark:text-white rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-650 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <RefreshCw className={`w-4 h-4 text-slate-650 dark:text-slate-350 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{loading ? 'Se actualizează...' : 'Actualizează Datele'}</span>
            </button>
          </div>
        </div>

        {/* Bottom info strip */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Monitorizare platformă activă
          </span>
          <span className="hidden sm:block text-slate-300 dark:text-slate-600">·</span>
          <span>Gestionare multi-store centralizată</span>
          <span className="hidden sm:block text-slate-300 dark:text-slate-600">·</span>
          <span>Audit complet al operațiunilor administrative</span>
        </div>
      </div>
    </div>
  );
};
