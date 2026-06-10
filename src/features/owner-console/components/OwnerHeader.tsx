import React from 'react';
import { ShieldAlert, RefreshCw, Globe, Crown } from 'lucide-react';

interface OwnerHeaderProps {
  onRefresh: () => void;
  loading?: boolean;
}

export const OwnerHeader: React.FC<OwnerHeaderProps> = ({ onRefresh, loading }) => {
  return (
    <div className="mb-8 relative overflow-hidden rounded-3xl shadow-xl animate-fade-in" data-testid="owner-console-header">
      {/* Background gradient */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white">
        {/* Decorative glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left side: Icon + Title */}
          <div className="flex items-start gap-5">
            <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 shadow-inner shrink-0">
              <ShieldAlert className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/25 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-200 tracking-wider uppercase backdrop-blur-sm">
                  <Crown className="w-3 h-3" aria-hidden="true" />
                  Platform Owner
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-semibold text-gray-300 tracking-wider backdrop-blur-sm">
                  <Globe className="w-3 h-3" aria-hidden="true" />
                  Platform Administration
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1.5">
                Owner Console
              </h1>
              <p className="text-sm text-indigo-200/80 max-w-xl leading-relaxed">
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
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-sm font-semibold backdrop-blur-md border border-white/15 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{loading ? 'Se actualizează...' : 'Actualizează Datele'}</span>
            </button>
          </div>
        </div>

        {/* Bottom info strip */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-indigo-300/70">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            Monitorizare platformă activă
          </span>
          <span className="hidden sm:block">·</span>
          <span>Gestionare multi-store centralizată</span>
          <span className="hidden sm:block">·</span>
          <span>Audit complet al operațiunilor administrative</span>
        </div>
      </div>
    </div>
  );
};
