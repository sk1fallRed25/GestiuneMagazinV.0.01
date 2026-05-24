import React, { useState, useEffect } from 'react';
import { X, User, Building2, Shield, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { OwnerProfile, OwnerStore, OwnerMemberRole, AssignStoreMemberPayload } from '../types';

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (payload: AssignStoreMemberPayload) => Promise<void>;
  profiles: OwnerProfile[];
  stores: OwnerStore[];
  initialProfileId?: string;
}

const ROLE_CONFIG: Record<OwnerMemberRole, { label: string; description: string; color: string }> = {
  admin: {
    label: 'Administrator Magazin',
    description: 'Acces complet la magazin: stoc, utilizatori, setări.',
    color: 'text-purple-700 dark:text-purple-300',
  },
  manager: {
    label: 'Manager Magazin',
    description: 'Gestionează stocuri, recepții, transferuri, rapoarte.',
    color: 'text-blue-700 dark:text-blue-300',
  },
  gestionar: {
    label: 'Gestionar',
    description: 'Recepție marfă, gestionare stocuri, fără acces la vânzări.',
    color: 'text-teal-700 dark:text-teal-300',
  },
  casier: {
    label: 'Casier',
    description: 'Efectuează vânzări și vizualizare stoc.',
    color: 'text-emerald-700 dark:text-emerald-300',
  },
};

export const AssignMemberModal: React.FC<AssignMemberModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  profiles,
  stores,
  initialProfileId
}) => {
  const [profileId, setProfileId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [role, setRole] = useState<OwnerMemberRole>('casier');
  const [active, setActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfileId(initialProfileId || (profiles.length > 0 ? profiles[0].id : ''));
      setStoreId(stores.length > 0 ? stores[0].id : '');
      setRole('casier');
      setActive(true);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialProfileId, profiles, stores]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) { setError('Vă rugăm să selectați un utilizator.'); return; }
    if (!storeId) { setError('Vă rugăm să selectați un magazin.'); return; }

    setLoading(true);
    setError(null);
    try {
      await onAssign({ profileId, storeId, role, active });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la alocarea utilizatorului.');
    } finally {
      setLoading(false);
    }
  };

  // Exclude platform_owners
  const availableProfiles = profiles.filter(p => p.globalRole !== 'platform_owner');
  const selectedProfile = availableProfiles.find(p => p.id === profileId);
  const selectedStore = stores.find(s => s.id === storeId);
  const roleConfig = ROLE_CONFIG[role];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/60 w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="assign-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Alocare Utilizator la Magazin
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Asociază un profil existent din sistem cu un magazin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide modalul"
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Formular */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Global role warning */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl flex items-start gap-3 text-sm text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" aria-hidden="true" />
            <p className="text-xs leading-relaxed">
              <strong>Important:</strong> Rolul global al utilizatorului <strong>nu se modifică</strong>.
              Se modifică doar rolul operațional al acestuia <strong>în magazinul selectat</strong>.
            </p>
          </div>

          {error && (
            <div
              className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 animate-shake"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {/* Select Utilizator */}
          <div className="space-y-2">
            <label
              htmlFor="assign-profile-select"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
              Selectează Utilizator *
            </label>
            <select
              id="assign-profile-select"
              value={profileId}
              onChange={e => setProfileId(e.target.value)}
              disabled={loading || !!initialProfileId}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 transition-all"
            >
              <option value="">— Alege un utilizator —</option>
              {availableProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.email}{p.fullName ? ` (${p.fullName})` : ''}
                </option>
              ))}
            </select>
            {initialProfileId && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                * Utilizatorul a fost preselectat din tabel.
              </p>
            )}
          </div>

          {/* Select Magazin */}
          <div className="space-y-2">
            <label
              htmlFor="assign-store-select"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
              Selectează Magazin *
            </label>
            <select
              id="assign-store-select"
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="">— Alege un magazin —</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{!s.active ? ' (Inactiv)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Select Rol */}
          <div className="space-y-2">
            <label
              htmlFor="assign-role-select"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
              Rol în Magazin *
            </label>
            <select
              id="assign-role-select"
              value={role}
              onChange={e => setRole(e.target.value as OwnerMemberRole)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="admin">Administrator Magazin</option>
              <option value="manager">Manager Magazin</option>
              <option value="gestionar">Gestionar</option>
              <option value="casier">Casier</option>
            </select>
            {/* Role description */}
            {roleConfig && (
              <p className={`text-xs font-medium ${roleConfig.color} flex items-center gap-1`}>
                <span className="opacity-70">→</span>
                {roleConfig.description}
              </p>
            )}
          </div>

          {/* Toggle Activ */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <label htmlFor="assign-active-toggle" className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer">
                  Status Acces
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {active ? 'Utilizatorul va avea acces imediat' : 'Contul va fi alocat, dar inactiv temporar'}
                </span>
              </div>
            </div>
            <button
              id="assign-active-toggle"
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                active ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Summary preview */}
          {selectedProfile && selectedStore && (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2">
                Sumar alocare
              </p>
              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <p><span className="font-semibold">Utilizator:</span> {selectedProfile.email}</p>
                <p><span className="font-semibold">Magazin:</span> {selectedStore.name}</p>
                <p><span className="font-semibold">Rol:</span> {roleConfig?.label}</p>
                <p><span className="font-semibold">Acces:</span> {active ? 'Imediat' : 'Temporar inactiv'}</p>
              </div>
            </div>
          )}
        </form>

        {/* Footer - outside the scrollable form area */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
          disabled={loading || !profileId || !storeId}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>{loading ? 'Se alocă...' : 'Alocă Utilizator'}</span>
        </button>
      </div>
      </div>
    </div>
  );
};
