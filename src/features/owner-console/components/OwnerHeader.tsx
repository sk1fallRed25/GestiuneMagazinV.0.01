import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface OwnerHeaderProps {
  onRefresh: () => void;
  loading?: boolean;
}

export const OwnerHeader: React.FC<OwnerHeaderProps> = ({ onRefresh, loading }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 bg-gradient-to-r from-gray-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
          <ShieldAlert className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Consolă Proprietar Platformă
          </h1>
          <p className="text-sm text-gray-300 mt-1 max-w-xl">
            Gestionarea centralizată a tuturor magazinelor și a rolurilor de administrare din sistem.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10 self-start md:self-auto">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-sm font-semibold backdrop-blur-md border border-white/10 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizează Datele</span>
        </button>
      </div>
    </div>
  );
};
