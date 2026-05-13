import React from 'react';
import { History, BarChart2 } from 'lucide-react';
import { WasteSummary } from '../types';

interface WasteSummaryCardProps {
    waste: WasteSummary;
}

export const WasteSummaryCard: React.FC<WasteSummaryCardProps> = ({ waste }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-amber-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <History size={20} className="text-amber-600" />
                    Analiză Pierderi
                </h3>
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">
                    LUNA CURENTĂ
                </span>
            </div>

            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">EVENIMENTE TOTALE</p>
                        <p className="text-3xl font-black text-gray-900">{waste.monthCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                        <BarChart2 size={24} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOP MOTIVE</h4>
                    {waste.topReasons.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Niciun eveniment raportat luna aceasta.</p>
                    ) : (
                        <div className="space-y-3">
                            {waste.topReasons.map((r, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-gray-600 uppercase">{r.reason}</span>
                                        <span className="text-gray-900">{r.count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-amber-400 h-full rounded-full" 
                                            style={{ width: `${Math.min(100, (r.count / waste.monthCount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
