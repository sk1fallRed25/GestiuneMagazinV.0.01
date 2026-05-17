import React from 'react';
import { Users, Mail, User, Shield, CheckCircle2, XCircle, Calendar, Building2, UserPlus } from 'lucide-react';
import { OwnerProfile } from '../types';

interface OwnerProfilesTableProps {
  profiles: OwnerProfile[];
  loading?: boolean;
  onOpenAssignModal?: (profileId?: string) => void;
}

export const OwnerProfilesTable: React.FC<OwnerProfilesTableProps> = ({ profiles, loading, onOpenAssignModal }) => {
  if (loading && profiles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă lista profilelor globale...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden animate-fade-in">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Profile Utilizatori Globale</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toate conturile înregistrate în baza de date Supabase</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">
            {profiles.length} Profile
          </span>
          <button
            onClick={() => onOpenAssignModal && onOpenAssignModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Alocă Utilizator la Magazin</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">Utilizator</th>
              <th className="py-3.5 px-6">Rol Global</th>
              <th className="py-3.5 px-6 text-center">Status Global</th>
              <th className="py-3.5 px-6 text-center">Nr. Magazine</th>
              <th className="py-3.5 px-6">Magazine Alocate</th>
              <th className="py-3.5 px-6">Data Înregistrării</th>
              <th className="py-3.5 px-6 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-6 text-center text-gray-500 dark:text-gray-400">
                  Nu există profile înregistrate în sistem.
                </td>
              </tr>
            ) : (
              profiles.map(profile => (
                <tr key={profile.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold shrink-0">
                        {profile.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{profile.email}</span>
                        </div>
                        {profile.fullName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-gray-400" />
                            <span>{profile.fullName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      profile.globalRole === 'platform_owner'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      <Shield className="w-3.5 h-3.5" />
                      <span>{profile.globalRole}</span>
                    </span>
                  </td>

                  <td className="py-4 px-6 text-center">
                    {profile.active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Activ</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Inactiv</span>
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      profile.storeCount > 0
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{profile.storeCount}</span>
                    </span>
                  </td>

                  <td className="py-4 px-6">
                    {profile.assignedStores.length === 0 ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 italic font-medium">
                        {profile.globalRole === 'platform_owner' ? 'Platform Owner global (fără magazin alocat direct)' : 'Niciun magazin alocat'}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {profile.assignedStores.map(st => (
                          <span
                            key={st.storeId}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                              st.active
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 line-through'
                            }`}
                            title={`Rol: ${st.role} | Stare: ${st.active ? 'Activ' : 'Inactiv'}`}
                          >
                            <span>{st.storeName}</span>
                            <span className="text-[10px] opacity-70">({st.role})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(profile.createdAt).toLocaleDateString('ro-RO')}</span>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onOpenAssignModal && onOpenAssignModal(profile.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold transition-colors border border-indigo-100 dark:border-indigo-800/50"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Alocă la magazin</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

