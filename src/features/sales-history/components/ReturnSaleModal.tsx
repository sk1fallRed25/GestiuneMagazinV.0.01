import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Package, CreditCard, Banknote, HelpCircle, Loader2, Minus, Plus, RefreshCw, Calendar } from 'lucide-react';
import { SaleSummary, ReturnEligibility, ReturnSaleItemInput } from '../types';

interface ReturnSaleModalProps {
    isOpen: boolean;
    sale: SaleSummary | null;
    eligibility: ReturnEligibility | null;
    loading: boolean;
    actionLoading: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (
        items: ReturnSaleItemInput[],
        refundMethod: 'cash' | 'card' | 'voucher',
        reason: string,
        notes?: string | null
    ) => Promise<void> | void;
}

export const ReturnSaleModal: React.FC<ReturnSaleModalProps> = ({
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
    const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'voucher'>('cash');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [validationError, setValidationError] = useState<string | null>(null);

    // Reset when modal is opened or sale changes
    useEffect(() => {
        if (isOpen) {
            setReason('');
            setNotes('');
            setRefundMethod('cash');
            setQuantities({});
            setValidationError(null);
        }
    }, [isOpen, sale]);

    // Handle allowed refund methods default selection when eligibility is loaded
    useEffect(() => {
        if (eligibility && eligibility.allowedRefundMethods?.length > 0) {
            if (eligibility.allowedRefundMethods.includes('cash')) {
                setRefundMethod('cash');
            } else {
                setRefundMethod(eligibility.allowedRefundMethods[0]);
            }
        }
    }, [eligibility]);

    if (!isOpen || !sale) return null;

    // Helper to change quantity
    const handleQtyChange = (saleItemId: string, val: number, max: number) => {
        let parsed = Number(val);
        if (isNaN(parsed) || parsed < 0) parsed = 0;
        if (parsed > max) parsed = max;
        setQuantities(prev => ({
            ...prev,
            [saleItemId]: parsed
        }));
    };

    // Helper to calculate total refund live
    const calculateTotalRefund = (): number => {
        if (!eligibility) return 0;
        return eligibility.items.reduce((total, item) => {
            const qty = quantities[item.saleItemId] || 0;
            return total + qty * item.unitPrice;
        }, 0);
    };

    const totalRefundLive = calculateTotalRefund();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setValidationError('Motivul returului este obligatoriu.');
            return;
        }
        if (trimmedReason.length < 3) {
            setValidationError('Motivul trebuie să conțină cel puțin 3 caractere.');
            return;
        }

        if (eligibility && !eligibility.canReturn) {
            setValidationError(eligibility.reasonIfNot || 'Acest bon nu permite retur.');
            return;
        }

        const itemsToReturn: ReturnSaleItemInput[] = Object.entries(quantities)
            .filter(([_, qty]) => qty > 0)
            .map(([saleItemId, qty]) => ({
                saleItemId,
                quantity: qty
            }));

        if (itemsToReturn.length === 0) {
            setValidationError('Selectați cel puțin un produs și cantitatea aferentă pentru a efectua returul.');
            return;
        }

        try {
            await onConfirm(itemsToReturn, refundMethod, trimmedReason, notes.trim() || null);
        } catch (err: unknown) {
            // Managed in hook
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <RefreshCw size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">RETUR PRODUSE</h3>
                            <p className="text-xs text-gray-400 font-mono">ID Bon: {sale.id.slice(0, 8)}...</p>
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
                    {/* General Info Alert */}
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-indigo-800 text-sm">
                        <AlertTriangle className="shrink-0 text-indigo-600 mt-0.5" size={18} />
                        <div>
                            <p className="font-bold">Procesare Retur</p>
                            <p className="mt-0.5 text-indigo-700">
                                Returul va readuce produsele selectate în stoc pe loturile lor originale și va recalcula statusul bonului.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                            <p className="text-xs font-bold uppercase tracking-wider">Se încarcă eligibilitatea returului...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Details */}
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Total Bon Original</p>
                                    <p className="text-sm font-black text-gray-900 mt-0.5">{sale.total.toFixed(2)} LEI</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Plată Originală</p>
                                    <p className="text-sm font-black text-gray-700 mt-0.5 uppercase">{sale.paymentMethod || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Status Bon</p>
                                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-800 border border-gray-200">
                                        {sale.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase">Permisiune Retur</p>
                                    {eligibility?.canReturn ? (
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
                            {eligibility && !eligibility.canReturn && (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 text-orange-800 text-xs">
                                    <HelpCircle className="shrink-0 text-orange-600 mt-0.5" size={18} />
                                    <div>
                                        <p className="font-bold">Motivul ineligibilității:</p>
                                        <p className="mt-0.5 text-orange-700 font-medium">
                                            {eligibility.reasonIfNot || 'Acest bon nu este eligibil pentru retur în acest moment.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Previous Returns History */}
                            {eligibility && eligibility.previousReturns && eligibility.previousReturns.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        Istoric Retururi Anterioare pe acest Bon
                                    </h4>
                                    <div className="border border-indigo-100 rounded-2xl bg-indigo-50/30 overflow-hidden text-xs">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-indigo-50/50 text-[10px] text-indigo-500 uppercase font-black border-b border-indigo-100">
                                                <tr>
                                                    <th className="p-3">Data retur</th>
                                                    <th className="p-3">Sumă stornată</th>
                                                    <th className="p-3">Metodă refund</th>
                                                    <th className="p-3">Motiv</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-indigo-50/50">
                                                {eligibility.previousReturns.map((ret, idx) => (
                                                    <tr key={idx} className="text-gray-700">
                                                        <td className="p-3 font-medium">{new Date(ret.createdAt).toLocaleString('ro-RO')}</td>
                                                        <td className="p-3 font-black text-indigo-700">-{ret.totalRefund.toFixed(2)} LEI</td>
                                                        <td className="p-3 font-bold uppercase text-gray-500">{ret.refundMethod}</td>
                                                        <td className="p-3 italic text-gray-600">{ret.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {eligibility && eligibility.canReturn && (
                                <div className="space-y-4">
                                    {/* Product list to choose quantities */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Selectare Produse și Cantități de Returnat</h4>
                                        <div className="border border-gray-100 rounded-2xl overflow-hidden text-xs max-h-60 overflow-y-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black border-b border-gray-100">
                                                    <tr>
                                                        <th className="p-3">Produs</th>
                                                        <th className="p-3 text-center">Vândut</th>
                                                        <th className="p-3 text-center">Returnat</th>
                                                        <th className="p-3 text-center">Disponibil</th>
                                                        <th className="p-3 text-right">Preț unitar</th>
                                                        <th className="p-3 text-center w-36">Cantitate Retur</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {eligibility.items.map((item) => {
                                                        const currentQty = quantities[item.saleItemId] || 0;
                                                        const maxQty = item.quantityAvailableToReturn;
                                                        return (
                                                            <tr key={item.saleItemId} className={`hover:bg-gray-50/50 ${maxQty === 0 ? 'opacity-50 bg-gray-50/30' : ''}`}>
                                                                <td className="p-3">
                                                                    <div className="font-bold text-gray-800">{item.productName}</div>
                                                                    {item.barcode && <div className="text-[10px] text-gray-400 font-mono">{item.barcode}</div>}
                                                                </td>
                                                                <td className="p-3 text-center font-bold text-gray-600">{item.quantitySold}</td>
                                                                <td className="p-3 text-center text-gray-400">{item.quantityReturned}</td>
                                                                <td className="p-3 text-center font-black text-gray-700">{maxQty}</td>
                                                                <td className="p-3 text-right text-gray-500">{item.unitPrice.toFixed(2)}</td>
                                                                <td className="p-3">
                                                                    {maxQty > 0 ? (
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleQtyChange(item.saleItemId, currentQty - 1, maxQty)}
                                                                                disabled={currentQty <= 0}
                                                                                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 rounded-lg flex items-center justify-center transition-colors"
                                                                            >
                                                                                <Minus size={12} />
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                value={currentQty || ''}
                                                                                onChange={(e) => handleQtyChange(item.saleItemId, Number(e.target.value), maxQty)}
                                                                                placeholder="0"
                                                                                className="w-12 text-center py-1 border border-gray-200 rounded-lg font-black text-gray-800"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleQtyChange(item.saleItemId, currentQty + 1, maxQty)}
                                                                                disabled={currentQty >= maxQty}
                                                                                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 rounded-lg flex items-center justify-center transition-colors"
                                                                            >
                                                                                <Plus size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center text-[10px] font-black text-red-500 uppercase">Fără unități</div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Live Refund Summary Card */}
                                    {totalRefundLive > 0 && (
                                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center text-indigo-900">
                                            <div className="flex items-center gap-2">
                                                <Package className="text-indigo-600" size={18} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Total de returnat clientului:</span>
                                            </div>
                                            <span className="text-lg font-black text-indigo-700">{totalRefundLive.toFixed(2)} LEI</span>
                                        </div>
                                    )}

                                    {/* Input form */}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Select refund method */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                Metodă de Rambursare <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-3">
                                                {['cash', 'card', 'voucher'].map((m) => {
                                                    const isAllowed = eligibility.allowedRefundMethods.includes(m as 'cash' | 'card' | 'voucher');
                                                    const isSelected = refundMethod === m;
                                                    return (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            disabled={!isAllowed || actionLoading}
                                                            onClick={() => setRefundMethod(m as 'cash' | 'card' | 'voucher')}
                                                            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${
                                                                isSelected 
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                            } ${!isAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                        >
                                                            {m === 'cash' && <Banknote size={16} />}
                                                            {m === 'card' && <CreditCard size={16} />}
                                                            {m === 'voucher' && <Package size={16} />}
                                                            {m}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Motiv */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">
                                                Motiv Retur <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                disabled={actionLoading}
                                                placeholder="Introduceți motivul returului (ex: Produs defect, Clientul dorește altceva, etc.)"
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 resize-none font-medium"
                                            />
                                            <p className="text-[10px] text-gray-400">Minim 3 caractere. Acest motiv este obligatoriu pentru auditul operațiunilor.</p>
                                        </div>

                                        {/* Note */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">
                                                Note Adiționale <span className="text-gray-400 font-normal">(Opțional)</span>
                                            </label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                disabled={actionLoading}
                                                placeholder="Detalii suplimentare despre această stornare..."
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 resize-none font-medium"
                                            />
                                        </div>

                                        {/* Errors */}
                                        {(validationError || error) && (
                                            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                                                {validationError || error}
                                            </div>
                                        )}

                                        <button type="submit" className="hidden" />
                                    </form>
                                </div>
                            )}
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
                        disabled={
                            actionLoading || 
                            loading || 
                            !eligibility || 
                            !eligibility.canReturn || 
                            reason.trim().length < 3 || 
                            totalRefundLive <= 0
                        }
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 text-sm flex items-center justify-center gap-2"
                    >
                        {actionLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Se procesează...
                            </>
                        ) : (
                            'CONFIRMĂ RETURUL'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
