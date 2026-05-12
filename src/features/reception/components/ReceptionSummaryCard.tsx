import React from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

interface ReceptionSummaryCardProps {
    totalValue: number;
    submitting: boolean;
    onSave: () => void;
    disabled: boolean;
}

export const ReceptionSummaryCard = ({ totalValue, submitting, onSave, disabled }: ReceptionSummaryCardProps) => (
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

            <button
                onClick={onSave}
                disabled={disabled || submitting}
                className="group relative bg-green-500 hover:bg-green-400 disabled:bg-slate-700 text-slate-900 px-12 py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4 overflow-hidden shadow-xl shadow-green-500/20"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center gap-3">
                    {submitting ? (
                        <>
                            <div className="w-6 h-6 border-4 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                            SE PROCESEAZĂ...
                        </>
                    ) : (
                        <>
                            <Save size={24} />
                            FINALIZEAZĂ RECEPȚIA
                        </>
                    )}
                </span>
            </button>
        </div>
    </div>
);
