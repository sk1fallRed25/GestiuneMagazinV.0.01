import React, { useState } from 'react';
import { Users, Mail, User, Calendar, CheckCircle2, XCircle, ShieldAlert, AlertCircle, Loader2 } from 'lucide-react';
import { OwnerStoreMember, OwnerMemberRole, OwnerStore } from '../types';
import { MemberRoleBadge } from './MemberRoleBadge';

interface StoreMembersTableProps {
  members: OwnerStoreMember[];
  selectedStore: OwnerStore | null;
  onToggleActive: (memberId: string, active: boolean) => Promise<void>;
  onChangeRole: (memberId: string, role: OwnerMemberRole) => Promise<void>;
  loading?: boolean;
}

export const StoreMembersTable: React.FC<StoreMembersTableProps> = ({
  members,
  selectedStore,
  onToggleActive,
  onChangeRole,
  loading
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleActive = async (member: OwnerStoreMember, newActive: boolean) => {
    setProcessingId(member.id);
    setErrorMsg(null);
    try {
      await onToggleActive(member.id, newActive);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare la modificarea stării.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeRole = async (member: OwnerStoreMember, newRole: OwnerMemberRole) => {
    setProcessingId(member.id);
    setErrorMsg(null);
    try {
      await onChangeRole(member.id, newRole);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare la modificarea rolului.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!selectedStore) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700/60 text-center">
        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Niciun magazin selectat</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Selectați un magazin din tabelul de mai sus pentru a vizualiza și gestiona permisiunile utilizatorilor asociați.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden mt-8">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Membri Magazin:</span>
              <span className="text-indigo-600 dark:text-indigo-400">{selectedStore.name}</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Gestionați starea și rolurile de acces pentru personalul magazinului
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full self-start sm:self-auto">
          {members.length} Membri Asociați
        </span>
      </div>

      {errorMsg && (
        <div className="m-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <p>{errorMsg}</p>
        </div>
      )}

      {loading && members.length === 0 ? (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă membrii magazinului...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Utilizator</th>
                <th className="py-3.5 px-6">Nume Complet</th>
                <th className="py-3.5 px-6">Rol Curent</th>
                <th className="py-3.5 px-6 text-center">Stare Acces</th>
                <th className="py-3.5 px-6">Data Asocierii</th>
                <th className="py-3.5 px-6 text-right">Modifică Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-gray-500 dark:text-gray-400">
                    Nu există membri asociați acestui magazin.
                  </td>
                </tr>
              ) : (
                members.map(member => {
                  const isProcessing = processingId === member.id;
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      {/* Email */}
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{member.email}</span>
                        </div>
                      </td>

                      {/* Full Name */}
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{member.fullName || <span className="text-gray-400 italic">Nespecificat</span>}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        <MemberRoleBadge role={member.role} />
                      </td>

                      {/* Active Toggle */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleActive(member, !member.active)}
                          disabled={isProcessing}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            member.active
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30'
                          } disabled:opacity-50`}
                          title={member.active ? "Faceți clic pentru a dezactiva" : "Faceți clic pentru a activa"}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : member.active ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span>{member.active ? 'Activ' : 'Inactiv'}</span>
                        </button>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{new Date(member.createdAt).toLocaleDateString('ro-RO')}</span>
                        </div>
                      </td>

                      {/* Change Role Dropdown */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                          <select
                            value={member.role}
                            disabled={isProcessing}
                            onChange={(e) => handleChangeRole(member, e.target.value as OwnerMemberRole)}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <option value="admin">Administrator</option>
                            <option value="manager">Manager</option>
                            <option value="gestionar">Gestionar</option>
                            <option value="casier">Casier</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
