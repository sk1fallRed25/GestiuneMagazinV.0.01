import React from 'react';
import { Link } from 'react-router-dom';
import { 
    Clock, 
    ChevronRight, 
    Archive 
} from 'lucide-react';
import { SlowMoverProduct } from '../types';

interface SlowMoversCardProps {
    slowMovers: SlowMoverProduct[];
}

export const SlowMoversCard: React.FC<SlowMoversCardProps> = ({ slowMovers }) => {
    // Show only the top 5 slow movers in the card to keep it clean, but let the user know they can see more or link to products
    const displayItems = slowMovers.slice(0, 5);

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                        <Clock className="text-purple-600" size={20} />
                        Produse Rotație Lentă
                    </h3>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {slowMovers.length} Total
                    </span>
                </div>

                {displayItems.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                        <Archive size={36} className="opacity-20 text-purple-500" />
                        <p className="text-xs font-bold uppercase tracking-wider">Stoc optimizat</p>
                        <p className="text-[10px] text-slate-450">Nu s-au detectat produse cu stoc blocat de peste 30 de zile.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {displayItems.map((prod) => (
                            <div 
                                key={prod.productId}
                                className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between transition-all"
                            >
                                <div className="min-w-0 flex-1 mr-3">
                                    <h4 className="font-extrabold text-xs text-slate-850 truncate leading-snug">
                                        {prod.productName}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        <span>Stoc: {prod.currentStock} {prod.unit}</span>
                                        <span>•</span>
                                        <span className="text-purple-650">{prod.daysWithoutSale} zile fără vânzări</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-xs text-slate-800">
                                        {prod.blockedValue.toFixed(2)} Lei
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        Valoare blocată
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {slowMovers.length > 5 && (
                <div className="pt-2 border-t border-slate-50">
                    <Link 
                        to="/produse"
                        className="text-indigo-650 hover:text-indigo-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 py-1.5 rounded-xl hover:bg-slate-50 transition-all"
                    >
                        Vezi toate produsele în catalog
                        <ChevronRight size={16} />
                    </Link>
                </div>
            )}
        </div>
    );
};
