import React from 'react';
import { AlertCircle, Warehouse, ArrowRightLeft, Store, Package } from 'lucide-react';
import { TransferProduct, TransferDirection } from '../types';

interface TransferStockStatusCardProps {
    product: TransferProduct | null;
    direction: TransferDirection;
}

export const TransferStockStatusCard: React.FC<TransferStockStatusCardProps> = ({
    product,
    direction
}) => {
    return (
        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden h-[450px]">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-10 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="relative z-10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                    <AlertCircle size={16} /> Status Stoc
                </h3>

                {product ? (
                    <div className="space-y-4">
                        <div className={`p-5 rounded-2xl border transition-all ${direction === 'depozit_spre_magazin' ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-3 text-slate-400 mb-1 text-xs font-bold uppercase tracking-wide">
                                <Warehouse size={14} /> Depozit
                            </div>
                            <div className="text-4xl font-black text-white tracking-tight">
                                {product.stoc_depozit}
                                <span className="text-sm font-medium text-slate-500 ml-2 align-middle">buc</span>
                            </div>
                        </div>

                        <div className="flex justify-center -my-2 opacity-50">
                            <ArrowRightLeft className="text-slate-400 rotate-90" size={24} />
                        </div>

                        <div className={`p-5 rounded-2xl border transition-all ${direction === 'magazin_spre_depozit' ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-3 text-slate-400 mb-1 text-xs font-bold uppercase tracking-wide">
                                <Store size={14} /> Magazin
                            </div>
                            <div className="text-4xl font-black text-white tracking-tight">
                                {product.stoc_magazin}
                                <span className="text-sm font-medium text-slate-500 ml-2 align-middle">buc</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-600 text-center space-y-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/20">
                        <Package size={48} className="opacity-20" />
                        <p className="text-sm px-4">Selectează un produs pentru a vedea distribuția stocului.</p>
                    </div>
                )}
            </div>

            <div className="relative z-10 pt-6 border-t border-slate-800/50 text-[10px] text-slate-500 text-center font-mono">
                SYNC: REAL-TIME • DATABASE: CONNECTED
            </div>
        </div>
    );
};
