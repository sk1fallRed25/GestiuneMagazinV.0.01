import React from 'react';
import { LossProduct } from '../types';

interface LossesProductGridProps {
    products: LossProduct[];
    onSelectProduct: (product: LossProduct) => void;
    loading: boolean;
}

export const LossesProductGrid: React.FC<LossesProductGridProps> = ({ 
    products, 
    onSelectProduct, 
    loading 
}) => {
    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-400">Nu am găsit produse care să corespundă căutării.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => (
                <button
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all flex justify-between items-center group text-left"
                >
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{prod.nume}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-1">{prod.cod_bare}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Total Disponibil</p>
                        <p className="text-lg font-black text-red-600">
                            {(prod.stoc_depozit || 0) + (prod.stoc_magazin || 0)}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
};
