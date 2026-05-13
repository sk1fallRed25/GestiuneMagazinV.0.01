import React from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { LowStockProduct } from '../types';

interface LowStockCardProps {
    products: LowStockProduct[];
}

export const LowStockCard: React.FC<LowStockCardProps> = ({ products }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-red-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <AlertTriangle size={20} className="text-red-500" />
                    Stocuri Scăzute
                </h3>
                <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase">
                    ALERTE REAPROVIZIONARE
                </span>
            </div>

            <div className="flex-1">
                {products.length === 0 ? (
                    <div className="p-10 text-center text-emerald-500 font-bold bg-emerald-50/20">
                        Toate stocurile sunt în parametri optimi.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {products.map((p) => (
                            <div key={p.productId} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 truncate max-w-[150px]">{p.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-mono">{p.barcode}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-red-600 leading-none">
                                        {p.stockTotal} <span className="text-[10px] text-gray-400 font-bold uppercase">{p.unit}</span>
                                    </p>
                                    <div className="flex gap-2 justify-end mt-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">M: {p.stockMagazin}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">D: {p.stockDepozit}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
