import React from 'react';
import { Search } from 'lucide-react';
import { PosProduct } from '../types';

interface PosProductResultsProps {
    products: PosProduct[];
    onProductSelect: (p: PosProduct) => void;
}

export const PosProductResults: React.FC<PosProductResultsProps> = ({ products, onProductSelect }) => {
    if (products.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                <Search size={64} className="mb-4 opacity-20" />
                <p className="text-lg">Scanează sau caută un produs...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4 overflow-y-auto">
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
                        <div className="font-bold text-gray-800 line-clamp-2 leading-tight">{p.name}</div>
                        <div className={`text-xs font-bold mt-2 px-2 py-0.5 rounded w-fit ${p.stockMagazin < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            Stoc: {p.stockMagazin} {p.unit}
                        </div>
                    </div>
                    <div className="font-black text-xl text-indigo-600 self-end">
                        {p.priceSale.toFixed(2)} <span className="text-xs font-medium text-gray-400">LEI</span>
                    </div>
                    <div className="absolute bottom-2 left-4 text-[10px] text-gray-300 font-mono">{p.barcode}</div>
                </button>
            ))}
        </div>
    );
};
