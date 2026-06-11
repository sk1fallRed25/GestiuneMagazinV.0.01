import React from 'react';
import { Save, CheckCircle2, Send, Trash2 } from 'lucide-react';

interface ReceptionSummaryCardProps {
    totalValue: number;
    submitting: boolean;
    savingDraft: boolean;
    onSaveDraft: () => void;
    onConfirm: () => void;
    onCancel?: () => void;
    hasActiveDraft: boolean;
    disabled: boolean;
}

export const ReceptionSummaryCard = ({
    totalValue,
    submitting,
    savingDraft,
    onSaveDraft,
    onConfirm,
    onCancel,
    hasActiveDraft,
    disabled
}: ReceptionSummaryCardProps) => (
    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl shadow-slate-200 sticky bottom-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
                <div className="bg-white/10 p-4 rounded-2xl">
                    <CheckCircle2 className="text-green-400" size={32} />
                </div>
                <div>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total General Recepție</p>
                    <h2 className="text-white text-4xl font-black font-mono">
                        {totalValue.toFixed(2)} <span className="text-lg text-white/50">LEI</span>
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
            </div>
        </div>
    </div>
);
