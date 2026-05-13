import React from 'react';
import { Package, Warehouse, Store } from 'lucide-react';
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
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-gray-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Fără rezultate</h3>
                <p className="text-gray-400 mt-1">Nu am găsit produse care să corespundă criteriilor.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => (
                <button
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-red-200 transition-all flex flex-col gap-6 group text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-3xl flex items-center justify-center text-red-500 transform translate-x-1 -translate-y-1 group-hover:scale-110 transition-transform">
                        <Package size={24} />
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight pr-10 group-hover:text-red-600 transition-colors">{prod.nume}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">COD: {prod.cod_bare}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <Warehouse size={12} />
                                <span className="text-[9px] font-black uppercase">Depozit</span>
                            </div>
                            <p className="font-bold text-slate-700">{prod.stoc_depozit} <span className="text-[9px] font-medium">{prod.um}</span></p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <Store size={12} />
                                <span className="text-[9px] font-black uppercase">Magazin</span>
                            </div>
                            <p className="font-bold text-slate-700">{prod.stoc_magazin} <span className="text-[9px] font-medium">{prod.um}</span></p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Stoc Total</span>
                        <div className="text-right">
                            <span className="text-xl font-black text-red-600">{prod.stoc_total}</span>
                            <span className="text-[10px] font-bold text-red-400 ml-1 uppercase">{prod.um}</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};
