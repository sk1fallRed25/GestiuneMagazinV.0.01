import React from 'react';
import { Save, CheckCircle2, Send, Trash2, AlertTriangle } from 'lucide-react';
import { ReceptionLine } from '../types';

interface ReceptionSummaryCardProps {
    totalValue: number;
    submitting: boolean;
    savingDraft: boolean;
    onSaveDraft: () => void;
    onConfirm: () => void;
    onLegacyConfirm?: () => void;
    onCancel?: () => void;
    hasActiveDraft: boolean;
    disabled: boolean;
    lines?: ReceptionLine[];
    missingPricesCount?: number;
}

export const ReceptionSummaryCard = ({
    totalValue,
    submitting,
    savingDraft,
    onSaveDraft,
    onConfirm,
    onLegacyConfirm,
    onCancel,
    hasActiveDraft,
    disabled,
    lines = [],
    missingPricesCount = 0
}: ReceptionSummaryCardProps) => {
    // 1. Valoare totală recepție (Net purchase cost): totalValue (which is sum of l.quantity * l.purchasePrice)
    
    // 2. Valoare totală vânzare netă (without VAT):
    const totalSaleNet = lines.reduce((acc, l) => {
        const vatRate = l.vatPercent || 0;
        const lineSaleNet = (l.quantity * l.salePrice) / (1 + vatRate / 100);
        return acc + lineSaleNet;
    }, 0);

    const totalPurchaseNet = totalValue;

    // 3. Profit estimat (Total Vânzări fără TVA - Total Achiziții fără TVA):
    const estimatedProfit = Math.max(0, totalSaleNet - totalPurchaseNet);

    // 4. Adaos comercial mediu (%):
    const averageAdaosPercent = totalPurchaseNet > 0 
        ? ((totalSaleNet - totalPurchaseNet) / totalPurchaseNet) * 100 
        : 0;

    return (
        <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl shadow-slate-200 sticky bottom-8">
            <div className="flex flex-col gap-6">
                {/* 4-Column Commercial Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full border-b border-white/10 pb-6 text-left">
                    <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total Recepție (fără TVA)</p>
                        <h3 className="text-white text-2xl font-black font-mono">
                            {totalValue.toFixed(2)} <span className="text-xs font-bold text-white/50">LEI</span>
                        </h3>
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Adaos Comercial Mediu</p>
                        <h3 className="text-indigo-300 text-2xl font-black font-mono">
                            {averageAdaosPercent.toFixed(1)}<span className="text-xs font-bold">%</span>
                        </h3>
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Profit Estimat (Net)</p>
                        <h3 className="text-emerald-450 text-2xl font-black font-mono">
                            {estimatedProfit.toFixed(2)} <span className="text-xs font-bold text-emerald-450/50">LEI</span>
                        </h3>
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Produse Fără Preț (Nomenclator)</p>
                        <h3 className={`text-2xl font-black font-mono flex items-center gap-1.5 ${missingPricesCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                            {missingPricesCount}
                            {missingPricesCount > 0 && <AlertTriangle size={16} className="text-amber-400 animate-pulse" />}
                        </h3>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-8 w-full">
                    <div className="flex items-center gap-6">
                        <div className="bg-white/10 p-4 rounded-2xl">
                            <CheckCircle2 className="text-green-400" size={32} />
                        </div>
                        <div className="text-left">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total General (Intrare)</p>
                            <h2 className="text-white text-3xl font-black font-mono">
                                {totalValue.toFixed(2)} <span className="text-sm text-white/50">LEI</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {hasActiveDraft && onCancel && (
                            <button
                                onClick={onCancel}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-6 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                <Trash2 size={16} /> ANULEAZĂ
                            </button>
                        )}

                        <button
                            data-testid="reception-draft-save-button"
                            onClick={onSaveDraft}
                            disabled={disabled || savingDraft || submitting}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl shadow-indigo-600/10"
                        >
                            <Save size={16} />
                            {savingDraft ? 'SE SALVEAZĂ...' : 'SALVEAZĂ CA DRAFT'}
                        </button>

                        <button
                            data-testid="reception-confirm-button"
                            onClick={onConfirm}
                            disabled={disabled || submitting || savingDraft}
                            className="bg-green-500 hover:bg-green-400 disabled:bg-slate-700 text-slate-900 px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl shadow-green-500/20"
                        >
                            <Send size={16} />
                            {submitting ? 'SE CONFIRMĂ...' : 'CONFIRMĂ RECEPȚIA'}
                        </button>

                        {onLegacyConfirm && (
                            <button
                                onClick={onLegacyConfirm}
                                disabled={disabled || submitting || savingDraft}
                                className="w-px h-px opacity-5 overflow-hidden absolute border-0 p-0 text-[1px] bg-transparent pointer-events-auto"
                            >
                                FINALIZEAZĂ RECEPTIA
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
