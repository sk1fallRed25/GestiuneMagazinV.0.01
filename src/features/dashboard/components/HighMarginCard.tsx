import React from 'react';
import { HighMarginProduct } from '../types';
import { Percent, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HighMarginCardProps {
    products: HighMarginProduct[];
    loading?: boolean;
}

export const HighMarginCard: React.FC<HighMarginCardProps> = ({ products, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full font-sans">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Marjă Ridicată</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Top 10 produse cu marjă comercială ≥ 30%</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                    <Percent className="w-5 h-5" />
                </div>
            </div>

            {products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <p className="text-xs font-bold text-gray-400">Nu s-au găsit produse cu marjă mare</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                    {products.map((p, index) => (
                        <div 
                            key={p.productId} 
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/20 hover:bg-gray-50/50 transition-colors"
                        >
                            <div className="overflow-hidden mr-2">
                                <p className="text-xs font-bold text-gray-900 truncate">{p.productName}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Cod: {p.barcode}</p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-medium">Preț: {p.priceSale.toFixed(2)} lei</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Cost: {p.pricePurchase.toFixed(2)} lei</p>
                                </div>
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-100 flex items-center gap-0.5">
                                    {p.margin.toFixed(0)}%
                                    <ArrowUpRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
