import React from 'react';
import { UserX, AlertTriangle, Info, Mail, Shield, Calendar, UserPlus, AlertCircle } from 'lucide-react';
import { UnassignedProfile } from '../types';

interface OwnerUnassignedProfilesPanelProps {
  unassignedProfiles: UnassignedProfile[];
  onOpenAssignModal?: (profileId?: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  admin: 'Administrator',
  manager: 'Manager',
  gestionar: 'Gestionar',
  casier: 'Casier',
};

export const OwnerUnassignedProfilesPanel: React.FC<OwnerUnassignedProfilesPanelProps> = ({ unassignedProfiles, onOpenAssignModal }) => {
  const platformOwners = unassignedProfiles.filter(p => p.globalRole === 'platform_owner');
  const regularUnassigned = unassignedProfiles.filter(p => p.globalRole !== 'platform_owner');

  if (unassignedProfiles.length === 0) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between animate-fade-in"
        role="status"
        aria-label="Toți utilizatorii sunt alocați"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <UserX className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Toți utilizatorii sunt alocați</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Nu există niciun cont activ fără cel puțin un magazin asociat.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold shrink-0">
          Stare Optimă ✓
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" role="region" aria-label="Utilizatori nealocați">
      {/* Warning: Utilizatori standard nealocați */}
      {regularUnassigned.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-500/30 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50/80 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    Utilizatori Nealocați — Acțiune Necesară
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 max-w-xl">
                    Utilizatorii fără magazin nu pot opera în aplicația de gestiune până nu sunt alocați.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-500/30 whitespace-nowrap shrink-0 animate-pulse">
                {regularUnassigned.length} Nealocați
              </span>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regularUnassigned.map(p => (
              <div
                key={p.id}
                className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-500/20 flex flex-col gap-3 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  {p.fullName && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">
                      {p.fullName}
                    </div>
                  )}
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1.5">
                    <Shield className="w-3 h-3" aria-hidden="true" />
                    <span>{ROLE_LABELS[p.globalRole] || p.globalRole}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-amber-500/20">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    {new Date(p.createdAt).toLocaleDateString('ro-RO')}
                  </span>
                  <button
                    onClick={() => onOpenAssignModal && onOpenAssignModal(p.id)}
                    aria-label={`Alocă utilizatorul ${p.email} la un magazin`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    <UserPlus className="w-3 h-3" aria-hidden="true" />
                    <span>Alocă</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info: Platform Owners */}
      {platformOwners.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Platform Owner — Acces Global Inerent
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 max-w-xl">
                    Acești utilizatori au acces global la platformă și nu necesită alocare directă pe un magazin.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600 whitespace-nowrap shrink-0">
                {platformOwners.length} Conturi
              </span>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {platformOwners.map(p => (
              <div key={p.id} className="p-3 bg-slate-50/30 dark:bg-slate-800/30 rounded-xl border border-slate-100/80 dark:border-slate-700/40 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-gray-950 dark:text-white flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    <span>Platform Owner · Global</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0 ml-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />
                  {new Date(p.createdAt).toLocaleDateString('ro-RO')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
