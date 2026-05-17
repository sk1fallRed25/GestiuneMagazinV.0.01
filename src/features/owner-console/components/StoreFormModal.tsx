import React, { useState, useEffect } from 'react';
import { X, Building2, FileText, MapPin, CheckCircle2, AlertCircle, Loader2, Hash, Briefcase, StickyNote } from 'lucide-react';
import { OwnerStore, CreateStorePayload, UpdateStorePayload } from '../types';

interface StoreFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  store?: OwnerStore | null;
  onClose: () => void;
  onSubmit: (payload: CreateStorePayload | UpdateStorePayload) => Promise<void>;
  loading?: boolean;
}

export const StoreFormModal: React.FC<StoreFormModalProps> = ({
  isOpen,
  mode,
  store,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [name, setName] = useState<string>('');
  const [fiscalCode, setFiscalCode] = useState<string>('');
  const [workpointNumber, setWorkpointNumber] = useState<string>('1');
  const [address, setAddress] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && store) {
        setName(store.name || '');
        setFiscalCode(store.fiscalCode || '');
        setWorkpointNumber(store.workpointNumber !== undefined && store.workpointNumber !== null ? String(store.workpointNumber) : '1');
        setAddress(store.address || '');
        setCompanyName(store.settings?.companyName || '');
        setNotes(store.settings?.notes || '');
        setActive(store.active ?? true);
      } else {
        setName('');
        setFiscalCode('');
        setWorkpointNumber('1');
        setAddress('');
        setCompanyName('');
        setNotes('');
        setActive(true);
      }
      setError(null);
    }
  }, [isOpen, mode, store]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Numele magazinului este obligatoriu.');
      return;
    }
    if (!fiscalCode.trim()) {
      setError('CUI / Codul fiscal este obligatoriu.');
      return;
    }
    const wpNum = Number(workpointNumber);
    if (isNaN(wpNum) || !Number.isInteger(wpNum) || wpNum < 1 || wpNum > 999) {
      setError('Numărul punctului de lucru trebuie să fie un număr întreg între 1 și 999.');
      return;
    }

    setError(null);
    try {
      if (mode === 'create') {
        await onSubmit({
          name: name.trim(),
          fiscalCode: fiscalCode.trim(),
          workpointNumber: wpNum,
          address: address.trim() || null,
          companyName: companyName.trim() || null,
          notes: notes.trim() || null,
          active
        } as CreateStorePayload);
      } else {
        if (!store?.id) {
          setError('Eroare: ID-ul magazinului lipsește.');
          return;
        }
        await onSubmit({
          storeId: store.id,
          name: name.trim(),
          fiscalCode: fiscalCode.trim(),
          workpointNumber: wpNum,
          address: address.trim() || null,
          companyName: companyName.trim() || null,
          notes: notes.trim() || null,
          active
        } as UpdateStorePayload);
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare la salvarea magazinului.';
      setError(message);
    }
  };

  const previewDisplayCode = `${fiscalCode.trim().toUpperCase() || 'CUI'} / ${workpointNumber || 'N'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/60 w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {mode === 'create' ? 'Adăugare Magazin Nou' : 'Editare Magazin'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {mode === 'create' ? 'Creează un nou punct de lucru în sistem' : 'Modifică detaliile punctului de lucru selectat'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formular */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto grow">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-800 dark:text-red-300 shadow-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}

          {/* Preview Cod Punct Lucru */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center justify-between text-sm">
            <span className="text-indigo-900 dark:text-indigo-300 font-bold">Cod punct lucru (Preview):</span>
            <span className="font-mono bg-white dark:bg-gray-800 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm">
              {previewDisplayCode}
            </span>
          </div>

          {/* Nume Magazin */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nume Magazin *</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Magazin Central București"
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* CUI și Punct Lucru pe același rând */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>CUI / Cod Fiscal *</span>
              </label>
              <input
                type="text"
                value={fiscalCode}
                onChange={(e) => setFiscalCode(e.target.value)}
                placeholder="ex: RO12345678"
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-500" />
                <span>Număr Punct Lucru *</span>
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={workpointNumber}
                onChange={(e) => setWorkpointNumber(e.target.value)}
                placeholder="ex: 1"
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Adresă */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>Adresă Punct de Lucru</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ex: Bulevardul Unirii Nr. 10, Sector 3"
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Denumire Firmă (Opțional) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span>Denumire Firmă (Opțional)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ex: SC RETAIL PLUS SRL"
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Note (Opțional) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-indigo-500" />
              <span>Note / Observații (Opțional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalii interne, program de lucru, contacte..."
              disabled={loading}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Toggle Activ */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-900 dark:text-white block">
                  Status Magazin
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {active ? 'Magazinul este activ în sistem' : 'Magazin inoperabil / suspendat temporar'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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

          {/* Footer Butoane */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !fiscalCode.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Se salvează...' : mode === 'create' ? 'Creează magazin' : 'Salvează modificările'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
