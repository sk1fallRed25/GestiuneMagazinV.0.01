import React, { useState } from 'react';
import { Trophy, Calendar, Sparkles } from 'lucide-react';
import { TopSellerProduct } from '../types';

interface TopProductsCardProps {
    today: TopSellerProduct[];
    month: TopSellerProduct[];
}

export const TopProductsCard: React.FC<TopProductsCardProps> = ({ today, month }) => {
    const [period, setPeriod] = useState<'today' | 'month'>('today');
    const items = period === 'today' ? today : month;

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                        <Trophy className="text-amber-500" size={20} />
                        Top Produse
                    </h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setPeriod('today')}
                            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                period === 'today' 
                                    ? 'bg-white text-indigo-650 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Azi
                        </button>
                        <button
                            onClick={() => setPeriod('month')}
                            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                period === 'month' 
                                    ? 'bg-white text-indigo-650 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Lună
                        </button>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                        <Sparkles size={36} className="opacity-20 animate-pulse text-indigo-500" />
                        <p className="text-xs font-bold uppercase tracking-wider">Nicio vânzare înregistrată</p>
                        <p className="text-[10px] text-slate-400">Datele vor apărea imediat ce vinzi primul produs.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {items.map((prod, idx) => (
                            <div 
                                key={prod.productId}
                                className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-extrabold text-xs text-slate-800 truncate leading-snug">
                                            {prod.productName}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                            Cantitate: {prod.quantity} {prod.unit}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-xs text-slate-800">{prod.revenue.toFixed(2)} Lei</p>
                                    <p className="text-[9px] text-green-600 font-black uppercase tracking-wider mt-0.5">
                                        +{prod.profit.toFixed(2)} Lei Profit
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
