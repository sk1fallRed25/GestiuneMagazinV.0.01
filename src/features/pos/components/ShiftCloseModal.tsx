import React, { useState } from 'react';
import { ActiveShift, ShiftCloseResult } from '../types';

interface ShiftCloseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCloseShift: (declaredCash: number, closingNotes?: string) => Promise<ShiftCloseResult | null>;
    activeShift: ActiveShift | null;
    loading: boolean;
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({
    isOpen,
    onClose,
    onCloseShift,
    activeShift,
    loading
}) => {
    const [declaredCash, setDeclaredCash] = useState<string>('');
    const [closingNotes, setClosingNotes] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ShiftCloseResult | null>(null);

    if (!isOpen || (!activeShift && !result)) return null;

    const currentTotals = activeShift?.currentTotals || { totalCash: 0, totalCard: 0, transactionsCount: 0 };
    const expectedCash = (activeShift?.openingCash || 0) + currentTotals.totalCash;
    const declaredNum = Number(declaredCash) || 0;
    const cashDiff = declaredNum - expectedCash;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (declaredCash === '' || isNaN(declaredNum) || declaredNum < 0) {
            setError('Te rugăm să introduci suma faptică din sertar (număr pozitiv).');
            return;
        }

        const res = await onCloseShift(declaredNum, closingNotes.trim() || undefined);
        if (res) {
            setResult(res);
        }
    };

    const handleFinish = () => {
        setDeclaredCash('');
        setClosingNotes('');
        setResult(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform animate-scaleUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-wide">Închidere Tură POS</h3>
                    </div>
                    {!result && (
                        <button 
                            onClick={onClose}
                            disabled={loading}
                            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Body - Daca avem rezultat, afisam sumarul de inchidere */}
                {result ? (
                    <div className="p-6 space-y-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-2">
                            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-emerald-400">Tura a fost închisă și înregistrată!</h4>
                            <p className="text-slate-400 text-sm">Toate datele au fost securizate în registrul financiar.</p>
                        </div>

                        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3 text-sm">
                            <div className="flex justify-between py-1 border-b border-slate-700/50">
                                <span className="text-slate-400">Total Vânzări (Bonuri):</span>
                                <span className="font-bold text-slate-200">{result.summary.totalSales.toFixed(2)} RON</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-700/50">
                                <span className="text-slate-400">Total Încasări Cash:</span>
                                <span className="font-bold text-slate-200">{result.summary.totalCash.toFixed(2)} RON</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-700/50">
                                <span className="text-slate-400">Total Încasări Card:</span>
                                <span className="font-bold text-slate-200">{result.summary.totalCard.toFixed(2)} RON</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-700/50">
                                <span className="text-slate-400">Numerar Așteptat (Scriptic):</span>
                                <span className="font-bold text-indigo-400">{result.summary.expectedCash.toFixed(2)} RON</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-700/50">
                                <span className="text-slate-400">Numerar Faptic (Sertar):</span>
                                <span className="font-bold text-slate-200">{result.summary.declaredCash.toFixed(2)} RON</span>
                            </div>
                            <div className="flex justify-between py-1 pt-2 text-base font-bold">
                                <span className="text-slate-300">Diferență de Casă:</span>
                                <span className={result.summary.cashDifference === 0 ? 'text-emerald-400' : (result.summary.cashDifference > 0 ? 'text-blue-400' : 'text-rose-400')}>
                                    {result.summary.cashDifference > 0 ? '+' : ''}{result.summary.cashDifference.toFixed(2)} RON
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleFinish}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                        >
                            Închide Fereastra
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-sm flex items-center space-x-3 animate-shake">
                                <svg className="w-5 h-5 flex-shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Sumar Scriptic */}
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Situație Scriptică Tură</h4>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/40">
                                    <span className="block text-slate-400 text-xs mb-1">Sold Inițial:</span>
                                    <span className="font-bold text-slate-200">{(activeShift?.openingCash || 0).toFixed(2)} RON</span>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/40">
                                    <span className="block text-slate-400 text-xs mb-1">Vânzări Cash:</span>
                                    <span className="font-bold text-emerald-400">+{currentTotals.totalCash.toFixed(2)} RON</span>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/40">
                                    <span className="block text-slate-400 text-xs mb-1">Vânzări Card:</span>
                                    <span className="font-bold text-indigo-400">+{currentTotals.totalCard.toFixed(2)} RON</span>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/40">
                                    <span className="block text-slate-400 text-xs mb-1">Total Tranzacții:</span>
                                    <span className="font-bold text-slate-200">{currentTotals.transactionsCount} bonuri</span>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-300">Total Așteptat în Sertar:</span>
                                <span className="text-xl font-extrabold text-white">{expectedCash.toFixed(2)} RON</span>
                            </div>
                        </div>

                        {/* Introducere Numerar Faptic */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Numerar Faptic în Sertar (RON)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={declaredCash}
                                    onChange={(e) => setDeclaredCash(e.target.value)}
                                    disabled={loading}
                                    placeholder="0.00"
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-4 pr-12 py-3.5 text-slate-100 font-bold text-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 font-bold">
                                    RON
                                </div>
                            </div>
                            
                            {/* Afisare diferenta dinamica */}
                            {declaredCash !== '' && !isNaN(declaredNum) && (
                                <div className={`mt-2 flex items-center justify-between px-1 text-sm font-semibold ${cashDiff === 0 ? 'text-emerald-400' : (cashDiff > 0 ? 'text-blue-400' : 'text-rose-400')}`}>
                                    <span>Diferență faptic vs scriptic:</span>
                                    <span>{cashDiff > 0 ? '+' : ''}{cashDiff.toFixed(2)} RON</span>
                                </div>
                            )}
                        </div>

                        {/* Observatii de inchidere */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Note de Închidere (Opțional)
                            </label>
                            <textarea
                                value={closingNotes}
                                onChange={(e) => setClosingNotes(e.target.value)}
                                disabled={loading}
                                rows={3}
                                placeholder="Explicații pentru eventuale diferențe de casă, predare de schimb, etc."
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none text-sm"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center space-x-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-semibold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50"
                            >
                                Renunță
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Se închide...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Închide Tura</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
