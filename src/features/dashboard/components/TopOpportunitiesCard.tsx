import React from 'react';
import { TopOpportunity } from '../types';
import { Sparkles, TrendingUp, DollarSign, Percent, BarChart3, CheckCircle2 } from 'lucide-react';

interface TopOpportunitiesCardProps {
    opportunities: TopOpportunity[];
    loading?: boolean;
}

export const TopOpportunitiesCard: React.FC<TopOpportunitiesCardProps> = ({ opportunities, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);
    };

    const getMetricDetails = (type: 'sales' | 'profit' | 'margin') => {
        switch (type) {
            case 'sales':
                return {
                    label: 'Creștere volum vânzări',
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
                    icon: <BarChart3 className="w-3.5 h-3.5" />
                };
            case 'profit':
                return {
                    label: 'Creștere profit brut',
                    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
                    icon: <DollarSign className="w-3.5 h-3.5" />
                };
            case 'margin':
                return {
                    label: 'Creștere marjă comercială',
                    color: 'text-teal-700 bg-teal-50 border-teal-100',
                    icon: <Percent className="w-3.5 h-3.5" />
                };
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col font-sans h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Oportunități de Creștere</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Produse cu performanțe accelerate în ultimele 30 zile</p>
                </div>
                <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>

            {opportunities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-950">Fără accelerări notabile</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Vânzările sunt constante în raport cu luna trecută.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
                    {opportunities.map((item, idx) => {
                        const m = getMetricDetails(item.metricType);
                        return (
                            <div key={idx} className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900">{item.productName}</h4>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wide flex items-center gap-1 ${m.color}`}>
                                            {m.icon}
                                            {m.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-sans">Creștere</span>
                                        <span className="text-xs font-black text-emerald-600 flex items-center justify-end gap-0.5 mt-0.5 font-sans">
                                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                            +{item.growthPercent.toFixed(0)}%
                                        </span>
                                    </div>

                                    <div className="text-right pl-4 border-l border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-sans">Potențial Profit Extra</span>
                                        <span className="text-xs font-black text-indigo-600 block mt-0.5 font-sans">
                                            +{formatCurrency(item.extraProfitPotential)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
