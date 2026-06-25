import React from 'react';
import { Search } from 'lucide-react';
import { PosProduct } from '../types';
import { HighlightText } from '../../../shared/components/ui';

interface PosProductResultsProps {
    products: PosProduct[];
    onProductSelect: (p: PosProduct) => void;
    searchTerm?: string;
}

export const PosProductResults: React.FC<PosProductResultsProps> = ({ products, onProductSelect, searchTerm = '' }) => {
    if (products.length === 0) {
        const isSearching = searchTerm && searchTerm.length >= 2;
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-350 py-20 text-center">
                <Search size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-bold text-slate-400">
                    {isSearching ? `Nu s-au găsit rezultate pentru "${searchTerm}"` : 'Scanează sau caută un produs...'}
                </p>
                {isSearching && (
                    <p className="text-xs text-slate-400 mt-1">Verifică corectitudinea denumirii sau a codului de bare.</p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                {products.length} {products.length === 1 ? 'produs găsit' : 'produse găsite'}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4 overflow-y-auto flex-1">
                {products.map(p => (
                    <button
                        key={p.id}
                        onClick={() => onProductSelect(p)}
                        disabled={p.stockMagazin <= 0}
                        className={`relative p-5 rounded-2xl shadow-sm border text-left flex flex-col justify-between h-36 transition-all active:scale-95 group ${
                            p.stockMagazin <= 0
                                ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                                : 'bg-white border-white hover:border-indigo-300 hover:shadow-md'
                        }`}
                    >
                        <div>
                            <div className="font-bold text-gray-800 line-clamp-2 leading-tight">
                                <HighlightText text={p.name} search={searchTerm} />
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                                {p.stockMagazin <= 0 ? (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                        STOC EPUIZAT
                                    </span>
                                ) : p.stockMagazin <= 5 ? (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                        STOC CRITIC: {p.stockMagazin} {p.unit}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150">
                                        Stoc: {p.stockMagazin} {p.unit}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="font-black text-xl text-indigo-600 self-end">
                            {p.priceSale.toFixed(2)} <span className="text-xs font-medium text-gray-400">LEI</span>
                        </div>
                        <div className="absolute bottom-2 left-4 text-[10px] text-gray-300 font-mono">
                            <HighlightText text={p.barcode} search={searchTerm} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
