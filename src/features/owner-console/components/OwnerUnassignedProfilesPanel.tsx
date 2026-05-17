import React from 'react';
import { UserX, AlertTriangle, Info, Mail, Shield, Calendar, UserPlus } from 'lucide-react';
import { UnassignedProfile } from '../types';

interface OwnerUnassignedProfilesPanelProps {
  unassignedProfiles: UnassignedProfile[];
  onOpenAssignModal?: (profileId?: string) => void;
}

export const OwnerUnassignedProfilesPanel: React.FC<OwnerUnassignedProfilesPanelProps> = ({ unassignedProfiles, onOpenAssignModal }) => {
  const platformOwners = unassignedProfiles.filter(p => p.globalRole === 'platform_owner');
  const regularUnassigned = unassignedProfiles.filter(p => p.globalRole !== 'platform_owner');

  if (unassignedProfiles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 mb-8 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Toți utilizatorii sunt alocați</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nu există niciun cont activ în sistem fără cel puțin un magazin asociat.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold">
          Stare Optimă
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8 animate-fade-in">
      {/* Platform Owners (Informational) */}
      {platformOwners.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-500/20 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50/50 dark:bg-blue-500/10 border-b border-blue-100 dark:border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">Platform Owner fără magazin alocat direct</h3>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Acești utilizatori au acces global și nu necesită alocare directă pe magazin</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">
              {platformOwners.length} Conturi
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformOwners.map(p => (
              <div key={p.id} className="p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{p.email}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                    <Shield className="w-3 h-3 text-blue-500" />
                    <span>{p.globalRole}</span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(p.createdAt).toLocaleDateString('ro-RO')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Unassigned (Warning) */}
      {regularUnassigned.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-500/30 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50/80 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">Utilizatori Nealocați (Fără Magazin)</h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Aceste conturi nu pot efectua operațiuni până nu sunt alocate unui magazin</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full animate-pulse">
              {regularUnassigned.length} Nealocați
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularUnassigned.map(p => (
              <div key={p.id} className="p-4 bg-amber-50/30 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex flex-col justify-between gap-4 group hover:shadow-sm transition-all">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  {p.fullName && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {p.fullName}
                    </div>
                  )}
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-2">
                    <Shield className="w-3 h-3" />
                    <span>Rol global: {p.globalRole}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-amber-100 dark:border-amber-500/20">
                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(p.createdAt).toLocaleDateString('ro-RO')}
                  </span>
                  <button
                    onClick={() => onOpenAssignModal && onOpenAssignModal(p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Alocă</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

