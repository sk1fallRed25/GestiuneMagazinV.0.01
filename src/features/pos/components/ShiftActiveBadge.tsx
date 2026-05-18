import React from 'react';
import { ActiveShift } from '../types';

interface ShiftActiveBadgeProps {
    activeShift: ActiveShift | null;
    onOpenClick: () => void;
    onCloseClick: () => void;
    onCancelClick: () => void;
    loading: boolean;
}

export const ShiftActiveBadge: React.FC<ShiftActiveBadgeProps> = ({
    activeShift,
    onOpenClick,
    onCloseClick,
    onCancelClick,
    loading
}) => {
    if (!activeShift) {
        return (
            <div className="flex items-center space-x-3 bg-indigo-50/80 border border-indigo-200/80 px-4 py-2.5 rounded-2xl shadow-sm animate-pulse">
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
                    <span>Nu ai nicio tură deschisă</span>
                </div>
                <button
                    onClick={onOpenClick}
                    disabled={loading}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    Deschide Tură
                </button>
            </div>
        );
    }

    const totalIncasari = activeShift.currentTotals.totalCash + activeShift.currentTotals.totalCard;

    return (
        <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-700/80 px-5 py-2.5 rounded-2xl shadow-lg shadow-slate-950/20 text-slate-200">
            {/* Status indicator */}
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Tură Activă</span>
            </div>

            {/* Casa & Detalii */}
            <div className="flex items-center space-x-4 text-xs font-medium border-x border-slate-700/60 px-4 py-0.5">
                <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Casă de Marcat</span>
                    <span className="font-bold text-white">{activeShift.cashRegisterName || 'Generală'}</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Sold Inițial</span>
                    <span className="font-bold text-slate-300">{activeShift.openingCash.toFixed(2)} RON</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Încasări Curente</span>
                    <span className="font-bold text-emerald-400">+{totalIncasari.toFixed(2)} RON</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
                <button
                    onClick={onCloseClick}
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-600/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    Închide Tura
                </button>
                <button
                    onClick={onCancelClick}
                    disabled={loading}
                    className="bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-600 hover:border-rose-500/40 text-xs font-medium px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                    title="Anulează tura deschisă din greșeală (fără tranzacții)"
                >
                    Anulează
                </button>
            </div>
        </div>
    );
};
