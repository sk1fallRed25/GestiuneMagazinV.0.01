import React from 'react';
import { NegativeProfitProduct } from '../types';
import { TrendingDown, AlertOctagon } from 'lucide-react';

interface NegativeProfitCardProps {
    products: NegativeProfitProduct[];
    loading?: boolean;
}

export const NegativeProfitCard: React.FC<NegativeProfitCardProps> = ({ products, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    return (
        <div className="bg-white border border-rose-100/50 rounded-2xl p-6 shadow-sm flex flex-col h-full font-sans">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-rose-950 uppercase tracking-tight">Adaos Negativ</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Produse vândute sub prețul de achiziție</p>
                </div>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                    <TrendingDown className="w-5 h-5" />
                </div>
            </div>

            {products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                        <AlertOctagon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-emerald-700">Excelent! Fără vânzări în pierdere.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                    {products.map((p) => (
                        <div 
                            key={p.productId} 
                            className="flex items-center justify-between p-3 rounded-xl border border-rose-100/50 bg-rose-50/10 hover:bg-rose-50/20 transition-colors"
                        >
                            <div className="overflow-hidden mr-2">
                                <p className="text-xs font-bold text-gray-900 truncate">{p.productName}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Cod: {p.barcode}</p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                                <div>
                                    <p className="text-[10px] text-rose-700 font-bold">Preț: {p.priceSale.toFixed(2)} lei</p>
                                    <p className="text-[10px] text-gray-500 font-medium">Cost: {p.pricePurchase.toFixed(2)} lei</p>
                                </div>
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-black rounded-lg border border-rose-100 shrink-0">
                                    -{p.lossPerUnit.toFixed(2)} lei
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
