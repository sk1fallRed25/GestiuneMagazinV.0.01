import React, { useState, useEffect } from 'react';
import { CashRegister } from '../types';

interface ShiftOpenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenShift: (cashRegisterId: string | null, openingCash: number, notes?: string) => Promise<boolean>;
    cashRegisters: CashRegister[];
    loading: boolean;
}

export const ShiftOpenModal: React.FC<ShiftOpenModalProps> = ({
    isOpen,
    onClose,
    onOpenShift,
    cashRegisters,
    loading
}) => {
    const [selectedRegisterId, setSelectedRegisterId] = useState<string>(
        cashRegisters.length > 0 ? cashRegisters[0].id : ''
    );
    const [openingCash, setOpeningCash] = useState<string>('0');
    const [notes, setNotes] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (cashRegisters.length > 0 && !selectedRegisterId) {
            setSelectedRegisterId(cashRegisters[0].id);
        }
    }, [cashRegisters, selectedRegisterId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cash = Number(openingCash);
        if (isNaN(cash) || cash < 0) {
            setError('Suma de deschidere trebuie să fie un număr pozitiv.');
            return;
        }

        const success = await onOpenShift(
            selectedRegisterId || null,
            cash,
            notes.trim() || undefined
        );

        if (success) {
            setOpeningCash('0');
            setNotes('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-scaleUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-wide">Deschidere Tură POS</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-sm flex items-center space-x-3 animate-shake">
                            <svg className="w-5 h-5 flex-shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Selectare Casa */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Casă de Marcat / Sertar
                        </label>
                        <select
                            value={selectedRegisterId}
                            onChange={(e) => setSelectedRegisterId(e.target.value)}
                            disabled={loading || cashRegisters.length === 0}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 font-medium"
                        >
                            {cashRegisters.length === 0 ? (
                                <option value="">Nu există case definite</option>
                            ) : (
                                cashRegisters.map((reg) => (
                                    <option key={reg.id} value={reg.id}>
                                        {reg.name} {reg.code ? `(${reg.code})` : ''}
                                    </option>
                                ))
                            )}
                        </select>
                        {cashRegisters.length === 0 && (
                            <p className="text-xs text-amber-400 mt-1.5">
                                * Se va deschide o tură generală pe magazin.
                            </p>
                        )}
                    </div>

                    {/* Sold Initial */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Sold Inițial în Casă (RON)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={openingCash}
                                onChange={(e) => setOpeningCash(e.target.value)}
                                disabled={loading}
                                placeholder="0.00"
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-4 pr-12 py-3 text-slate-100 font-bold text-lg focus:outline-none focus:border-indigo-500 transition-colors"
                                required
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 font-bold">
                                RON
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Numerarul existent în sertar la începutul turei.
                        </p>
                    </div>

                    {/* Observatii */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Observații (Opțional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={loading}
                            rows={3}
                            placeholder="Mentiuni despre starea casei, fond de rulment, etc."
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-sm"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
                        >
                            Renunță
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Se deschide...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Deschide Tura</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
