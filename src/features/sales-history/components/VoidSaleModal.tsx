import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Package, CreditCard, Banknote, HelpCircle, Loader2 } from 'lucide-react';
import { SaleSummary, VoidEligibility } from '../types';

interface VoidSaleModalProps {
    isOpen: boolean;
    sale: SaleSummary | null;
    eligibility: VoidEligibility | null;
    loading: boolean;
    actionLoading: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (reason: string, notes?: string | null) => Promise<void> | void;
}

export const VoidSaleModal: React.FC<VoidSaleModalProps> = ({
    isOpen,
    sale,
    eligibility,
    loading,
    actionLoading,
    error,
    onClose,
    onConfirm
}) => {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Reset fields on open/change
    useEffect(() => {
        if (isOpen) {
            setReason('');
            setNotes('');
            setValidationError(null);
        }
    }, [isOpen, sale]);

    if (!isOpen || !sale) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setValidationError('Motivul anulării este obligatoriu.');
            return;
        }
        if (trimmedReason.length < 3) {
            setValidationError('Motivul trebuie să conțină cel puțin 3 caractere.');
            return;
        }

        if (eligibility && !eligibility.canVoid) {
            setValidationError(eligibility.reasonIfNot || 'Bonul nu poate fi anulat.');
            return;
        }

        try {
            await onConfirm(trimmedReason, notes.trim() || null);
        } catch (err: any) {
            // Error is handled in hook/parent and passed via `error` prop
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">ANULARE BON (VOID)</h3>
                            <p className="text-xs text-gray-400 font-mono">ID: {sale.id.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={actionLoading}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Warning Banner */}
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-800 text-sm">
                        <AlertTriangle className="shrink-0 text-red-600 mt-0.5" size={18} />
                        <div>
                            <p className="font-bold">Avertisment critic</p>
                            <p className="mt-0.5 text-red-700">
                                Această acțiune va marca bonul ca anulat și va readuce produsele în stoc printr-o tranzacție atomică.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                            <p className="text-xs font-bold uppercase tracking-wider">Se verifică eligibilitatea anulării...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Details */}
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Total Bon</p>
                                    <p className="text-sm font-black text-gray-900 mt-0.5">{sale.total.toFixed(2)} LEI</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Metodă Plată</p>
                                    <p className="text-sm font-black text-gray-700 mt-0.5 uppercase">{sale.paymentMethod}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Tura Curentă</p>
                                    <p className="text-sm font-black text-gray-700 mt-0.5">
                                        {eligibility?.shiftId ? `#${eligibility.shiftId.slice(0, 8)}` : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Eligibilitate</p>
                                    {eligibility?.canVoid ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase mt-0.5">
                                            Eligibil
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 uppercase mt-0.5">
                                            Ineligibil
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Eligibility Error Display */}
                            {eligibility && !eligibility.canVoid && (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 text-orange-800 text-xs">
                                    <HelpCircle className="shrink-0 text-orange-600 mt-0.5" size={18} />
                                    <div>
                                        <p className="font-bold">Motivul blocării:</p>
                                        <p className="mt-0.5 text-orange-700 font-medium">
                                            {eligibility.reasonIfNot || 'Acest bon nu poate fi anulat în conformitate cu regulile operaționale.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Items and Payments summary */}
                            {eligibility && (
                                <div className="space-y-4">
                                    {/* Items List */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sumar Produse Returnate în Stoc</h4>
                                        <div className="border border-gray-100 rounded-xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black border-b border-gray-100">
                                                    <tr>
                                                        <th className="p-3">Produs</th>
                                                        <th className="p-3 text-center">Cantitate</th>
                                                        <th className="p-3 text-right">Preț Unitar</th>
                                                        <th className="p-3 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {eligibility.itemsSummary.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50">
                                                            <td className="p-3 font-bold text-gray-800">{item.productName}</td>
                                                            <td className="p-3 text-center font-black text-gray-600">x{item.quantity}</td>
                                                            <td className="p-3 text-right text-gray-500">{item.unitPrice.toFixed(2)}</td>
                                                            <td className="p-3 text-right font-black text-gray-900">{item.totalItem.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Payments List */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Restituire Plăți</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {eligibility.paymentsSummary.map((pay, idx) => (
                                                <div key={idx} className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 flex items-center gap-2 text-xs">
                                                    {pay.method === 'card' ? <CreditCard size={14} className="text-blue-500" /> : <Banknote size={14} className="text-emerald-500" />}
                                                    <span className="font-bold uppercase text-gray-700">{pay.method}:</span>
                                                    <span className="font-black text-gray-900">{pay.amount.toFixed(2)} LEI</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inputs form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        Motiv Anulare <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        disabled={actionLoading || (eligibility !== null && !eligibility.canVoid)}
                                        placeholder="Introduceți motivul anulării (ex: Eroare scanare, Clientul s-a răzgândit etc.)"
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 resize-none font-medium"
                                    />
                                    <p className="text-[10px] text-gray-400">Minim 3 caractere. Acest motiv va fi înregistrat în istoricul de retururi.</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Note Adiționale <span className="text-gray-400 font-normal">(Opțional)</span>
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        disabled={actionLoading || (eligibility !== null && !eligibility.canVoid)}
                                        placeholder="Detalii suplimentare despre această anulare..."
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 resize-none font-medium"
                                    />
                                </div>

                                {/* Errors & Messages */}
                                {(validationError || error) && (
                                    <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                                        {validationError || error}
                                    </div>
                                )}

                                {/* Hidden submit button to allow Enter submission */}
                                <button type="submit" className="hidden" />
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={actionLoading}
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
                    >
                        RENUNȚĂ
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={actionLoading || loading || (eligibility !== null && !eligibility.canVoid) || reason.trim().length < 3}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 text-sm flex items-center justify-center gap-2"
                    >
                        {actionLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Se anulează...
                            </>
                        ) : (
                            'CONFIRMĂ ANULAREA'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
