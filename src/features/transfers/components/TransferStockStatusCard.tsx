import React from 'react';
import { Warehouse, Store, Info } from 'lucide-react';
import { TransferProduct } from '../types';

interface TransferStockStatusCardProps {
    product: TransferProduct | null;
}

export const TransferStockStatusCard = ({ product }: TransferStockStatusCardProps) => {
    if (!product) {
        return (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-4 rounded-full shadow-sm text-slate-300 mb-4">
                    <Info size={32} />
                </div>
                <h3 className="font-bold text-slate-400">Niciun produs selectat</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-[200px]">Selectează un produs din listă pentru a vedea disponibilitatea pe zone.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 flex flex-col gap-8 h-full animate-in zoom-in-95 duration-300">
            <h3 className="font-bold text-slate-800 border-b border-gray-50 pb-4 flex items-center gap-2">
                <Info className="text-blue-500" size={18} />
                Status Stoc Curent
            </h3>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-xl shadow-sm text-slate-400 group-hover:text-amber-500 transition-colors">
                            <Warehouse size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Depozit</p>
                            <p className="font-bold text-slate-800">Zona de Recepție</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-slate-900 font-mono">{product.stoc_depozit}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{product.um}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-xl shadow-sm text-slate-400 group-hover:text-amber-500 transition-colors">
                            <Store size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Magazin</p>
                            <p className="font-bold text-slate-800">Zona de Vânzare</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-slate-900 font-mono">{product.stoc_magazin}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{product.um}</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-700 leading-relaxed italic">
                    * Stocul este calculat prin agregarea tuturor loturilor (FEFO) disponibile în magazinul curent.
                </p>
            </div>
        </div>
    );
};
