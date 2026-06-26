import React from 'react';
import { Package, Warehouse, Store } from 'lucide-react';
import { LossProduct } from '../types';
import { EmptyState, HighlightText } from '../../../shared/components/ui';

interface LossesProductGridProps {
    products: LossProduct[];
    onSelectProduct: (product: LossProduct) => void;
    loading: boolean;
    searchTerm?: string;
}

const LossesSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm h-60 flex flex-col justify-between">
                    <div className="space-y-2">
                        <div className="h-6 bg-slate-200 rounded-lg w-2/3" />
                        <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="h-14 bg-slate-100 rounded-2xl" />
                        <div className="h-14 bg-slate-100 rounded-2xl" />
                    </div>
                    <div className="h-8 bg-slate-100 rounded-xl w-full" />
                </div>
            ))}
        </div>
    );
};

export const LossesProductGrid: React.FC<LossesProductGridProps> = ({ 
    products, 
    onSelectProduct, 
    loading,
    searchTerm = ''
}) => {
    if (loading) {
        return <LossesSkeleton />;
    }

    if (products.length === 0) {
        return (
            <div className="p-12 bg-white rounded-[2rem] border border-slate-150">
                <EmptyState
                    title="Niciun produs găsit"
                    description="Nu am găsit produse active care să corespundă criteriilor sau stocul este zero."
                    icon={<Package className="text-slate-400" size={36} />}
                />
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
                        <h3 className="font-bold text-gray-800 text-lg leading-tight pr-10 group-hover:text-red-600 transition-colors">
                            <HighlightText text={prod.nume} search={searchTerm} />
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            COD: <HighlightText text={prod.cod_bare} search={searchTerm} />
                        </p>
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
