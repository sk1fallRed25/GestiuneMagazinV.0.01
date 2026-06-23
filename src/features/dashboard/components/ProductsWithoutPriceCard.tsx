import React from 'react';
import { Tag, HelpCircle } from 'lucide-react';

interface ProductsWithoutPriceCardProps {
    products: Array<{ id: string; name: string; barcode: string; priceSale: number }>;
}

export const ProductsWithoutPriceCard: React.FC<ProductsWithoutPriceCardProps> = ({ products }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-amber-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <Tag size={20} className="text-amber-500" />
                    Produse Fără Preț
                </h3>
                <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">
                    Erori Nomenclator
                </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px]">
                {products.length === 0 ? (
                    <div className="p-10 text-center text-emerald-500 font-bold bg-emerald-50/20">
                        Toate produsele au prețuri configurate corect.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {products.map((p) => (
                            <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50/50 text-amber-600 flex items-center justify-center">
                                        <HelpCircle size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 truncate max-w-[200px]" title={p.name}>{p.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-mono">{p.barcode}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 uppercase animate-pulse">
                                        FĂRĂ PREȚ
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
