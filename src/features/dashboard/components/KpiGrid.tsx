import React from 'react';
import { DashboardStats } from '../types';
import { TrendingUp, DollarSign, Percent, Receipt, Users, ShoppingBag } from 'lucide-react';

interface KpiGridProps {
    stats: DashboardStats;
    loading?: boolean;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ stats, loading }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(value);
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('ro-RO').format(value);
    };

    const kpis = [
        {
            title: 'Cifră de Afaceri',
            description: 'Venituri totale din vânzări',
            icon: <DollarSign className="w-5 h-5 text-indigo-600" />,
            bgColor: 'bg-indigo-50/50',
            borderColor: 'border-indigo-100/80',
            todayValue: formatCurrency(stats.todaySalesTotal),
            monthValue: formatCurrency(stats.monthSalesTotal),
        },
        {
            title: 'Profit Brut',
            description: 'Valoare vânzări minus cost achiziție',
            icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
            bgColor: 'bg-emerald-50/50',
            borderColor: 'border-emerald-100/80',
            todayValue: formatCurrency(stats.todayProfitTotal),
            monthValue: formatCurrency(stats.monthProfitTotal),
            accent: true,
        },
        {
            title: 'Marjă Medie',
            description: 'Procentul de profit brut obținut',
            icon: <Percent className="w-5 h-5 text-teal-600" />,
            bgColor: 'bg-teal-50/50',
            borderColor: 'border-teal-100/80',
            todayValue: formatPercent(stats.todayMarginPercent),
            monthValue: formatPercent(stats.monthMarginPercent),
        },
        {
            title: 'Bon Mediu',
            description: 'Valoarea medie per tranzacție',
            icon: <Receipt className="w-5 h-5 text-amber-600" />,
            bgColor: 'bg-amber-50/50',
            borderColor: 'border-amber-100/80',
            todayValue: formatCurrency(stats.todayReceiptAverage),
            monthValue: formatCurrency(stats.monthReceiptAverage),
        },
        {
            title: 'Număr Clienți',
            description: 'Tranzacții finalizate la casă',
            icon: <Users className="w-5 h-5 text-sky-600" />,
            bgColor: 'bg-sky-50/50',
            borderColor: 'border-sky-100/80',
            todayValue: formatNumber(stats.todaySalesCount),
            monthValue: formatNumber(stats.todaySalesCount + stats.monthSalesCount - stats.todaySalesCount), // handle correct sum
        },
        {
            title: 'Produse Vândute',
            description: 'Volumul total de unități vândute',
            icon: <ShoppingBag className="w-5 h-5 text-purple-600" />,
            bgColor: 'bg-purple-50/50',
            borderColor: 'border-purple-100/80',
            todayValue: formatNumber(stats.todayItemsSold),
            monthValue: formatNumber(stats.monthItemsSold),
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-44 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 font-sans">
            {kpis.map((kpi, idx) => (
                <div 
                    key={idx} 
                    className={`bg-white rounded-2xl border ${kpi.borderColor} p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between`}
                >
                    <div>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{kpi.title}</h4>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">{kpi.description}</p>
                            </div>
                            <div className={`${kpi.bgColor} p-3 rounded-xl border border-white shadow-inner`}>
                                {kpi.icon}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Azi</span>
                                <span className={`text-lg font-black tracking-tight ${kpi.accent && stats.todayProfitTotal < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                                    {kpi.todayValue}
                                </span>
                            </div>
                            <div className="border-l border-gray-100 pl-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Lună Curentă</span>
                                <span className={`text-lg font-black tracking-tight ${kpi.accent && stats.monthProfitTotal < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                                    {kpi.monthValue}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
