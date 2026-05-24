import React, { useState, useMemo } from 'react';
import { Users, Mail, User, Shield, CheckCircle2, XCircle, Calendar, Building2, UserPlus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { OwnerProfile } from '../types';

interface OwnerProfilesTableProps {
  profiles: OwnerProfile[];
  loading?: boolean;
  onOpenAssignModal?: (profileId?: string) => void;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  platform_owner: { label: 'Platform Owner', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  admin: { label: 'Administrator', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  manager: { label: 'Manager', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  gestionar: { label: 'Gestionar', className: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30' },
  casier: { label: 'Casier', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};

export const OwnerProfilesTable: React.FC<OwnerProfilesTableProps> = ({ profiles, loading, onOpenAssignModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'email' | 'role' | 'stores' | 'date'>('email');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => (
    sortKey === col
      ? sortAsc ? <ChevronUp className="w-3 h-3 ml-1 inline" aria-hidden="true" /> : <ChevronDown className="w-3 h-3 ml-1 inline" aria-hidden="true" />
      : <ChevronDown className="w-3 h-3 ml-1 inline opacity-30" aria-hidden="true" />
  );

  const filteredProfiles = useMemo(() => {
    let list = profiles;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.email.toLowerCase().includes(term) ||
        (p.fullName || '').toLowerCase().includes(term) ||
        p.globalRole.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== 'all') {
      list = list.filter(p => p.globalRole === roleFilter);
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortKey === 'role') cmp = a.globalRole.localeCompare(b.globalRole);
      else if (sortKey === 'stores') cmp = a.storeCount - b.storeCount;
      else if (sortKey === 'date') cmp = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? cmp : -cmp;
    });
  }, [profiles, searchTerm, roleFilter, sortKey, sortAsc]);

  const uniqueRoles = useMemo(() => Array.from(new Set(profiles.map(p => p.globalRole))), [profiles]);

  if (loading && profiles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" role="status" aria-label="Se încarcă" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Se încarcă lista profilelor...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden animate-fade-in" role="region" aria-label="Profile utilizatori">
      {/* Table Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Profile Utilizatori</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Toate conturile înregistrate în sistem · <span className="font-semibold">{profiles.length} profile</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenAssignModal && onOpenAssignModal()}
            aria-label="Alocă utilizator la magazin"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Alocă Utilizator</span>
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Caută după email, nume, rol..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Caută utilizatori"
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            aria-label="Filtrează după rol"
            className="px-3 py-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">Toate rolurile</option>
            {uniqueRoles.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]?.label || r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table" aria-label="Tabel profile utilizatori">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="py-3.5 px-5">
                <button
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                  onClick={() => handleSort('email')}
                  aria-label="Sortează după utilizator"
                >
                  Utilizator <SortIcon col="email" />
                </button>
              </th>
              <th className="py-3.5 px-5">
                <button
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                  onClick={() => handleSort('role')}
                  aria-label="Sortează după rol"
                >
                  Rol Global <SortIcon col="role" />
                </button>
              </th>
              <th className="py-3.5 px-5 text-center">Status</th>
              <th className="py-3.5 px-5 text-center">
                <button
                  className="flex items-center mx-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                  onClick={() => handleSort('stores')}
                  aria-label="Sortează după număr magazine"
                >
                  Magazine <SortIcon col="stores" />
                </button>
              </th>
              <th className="py-3.5 px-5">Magazine Alocate</th>
              <th className="py-3.5 px-5">
                <button
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                  onClick={() => handleSort('date')}
                  aria-label="Sortează după data înregistrării"
                >
                  Înregistrat <SortIcon col="date" />
                </button>
              </th>
              <th className="py-3.5 px-5 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 px-6 text-center">
                  <Users className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {searchTerm || roleFilter !== 'all'
                      ? 'Nu există utilizatori care să corespundă filtrului.'
                      : 'Nu există profile înregistrate în sistem.'
                    }
                  </p>
                  {(searchTerm || roleFilter !== 'all') && (
                    <button
                      onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}
                      className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                    >
                      Resetează filtrele
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredProfiles.map(profile => {
                const roleInfo = ROLE_LABELS[profile.globalRole] || { label: profile.globalRole, className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300' };
                return (
                  <tr key={profile.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group">
                    {/* Utilizator */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-500/20 dark:to-blue-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                          {profile.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm truncate">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                            <span className="truncate">{profile.email}</span>
                          </div>
                          {profile.fullName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                              <span className="truncate">{profile.fullName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rol Global */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleInfo.className}`}>
                        <Shield className="w-3 h-3" aria-hidden="true" />
                        {roleInfo.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 text-center">
                      {profile.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Activ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded-full text-xs font-semibold">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          Inactiv
                        </span>
                      )}
                    </td>

                    {/* Nr. Magazine */}
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        profile.storeCount > 0
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          : profile.globalRole === 'platform_owner'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}>
                        <Building2 className="w-3 h-3" aria-hidden="true" />
                        {profile.storeCount}
                      </span>
                    </td>

                    {/* Magazine Alocate */}
                    <td className="py-4 px-5">
                      {profile.assignedStores.length === 0 ? (
                        <span className={`text-xs italic font-medium ${
                          profile.globalRole === 'platform_owner'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {profile.globalRole === 'platform_owner'
                            ? 'Acces global (Platform Owner)'
                            : 'Niciun magazin alocat'
                          }
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {profile.assignedStores.map(st => (
                            <span
                              key={st.storeId}
                              title={`Rol: ${st.role} | Stare: ${st.active ? 'Activ' : 'Inactiv'}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                st.active
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 line-through border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {st.storeName}
                              <span className="text-[10px] opacity-70">({st.role})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Data */}
                    <td className="py-4 px-5 text-gray-500 dark:text-gray-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                        <span>{new Date(profile.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </td>

                    {/* Acțiuni */}
                    <td className="py-4 px-5 text-right">
                      {profile.globalRole !== 'platform_owner' && (
                        <button
                          onClick={() => onOpenAssignModal && onOpenAssignModal(profile.id)}
                          aria-label={`Alocă ${profile.email} la un magazin`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold transition-colors border border-indigo-100 dark:border-indigo-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Alocă</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filteredProfiles.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {filteredProfiles.length !== profiles.length
              ? `${filteredProfiles.length} din ${profiles.length} profile`
              : `${profiles.length} profile`
            }
          </span>
          {(searchTerm || roleFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
            >
              Resetează filtrele
            </button>
          )}
        </div>
      )}
    </div>
  );
};
