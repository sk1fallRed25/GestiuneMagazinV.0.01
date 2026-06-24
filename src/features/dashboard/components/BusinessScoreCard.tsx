import React from 'react';
import { BusinessHealthScore } from '../types';
import { ShieldCheck, ShieldAlert, Activity, DollarSign, Percent, RefreshCw, Layers, Ban } from 'lucide-react';

interface BusinessScoreCardProps {
    score: BusinessHealthScore;
    loading?: boolean;
}

export const BusinessScoreCard: React.FC<BusinessScoreCardProps> = ({ score, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    const {
        globalScore,
        profitability,
        stockRotation,
        stockAvailability,
        priceCompleteness,
        expirationScore
    } = score;

    // Determine color scheme based on score
    let scoreColor = 'text-rose-600 bg-rose-50 border-rose-100';
    let ringColor = 'stroke-rose-600';
    let statusText = 'Critic';
    let description = 'Performanța magazinului este sub parametri. Necesită atenție imediată.';
    let Icon = ShieldAlert;

    if (globalScore >= 80) {
        scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
        ringColor = 'stroke-emerald-600';
        statusText = 'Excelent';
        description = 'Toate sistemele operaționale și comerciale funcționează optim.';
        Icon = ShieldCheck;
    } else if (globalScore >= 50) {
        scoreColor = 'text-amber-700 bg-amber-50 border-amber-100';
        ringColor = 'stroke-amber-500';
        statusText = 'Stabil';
        description = 'Funcționare generală acceptabilă, dar există oportunități majore de optimizare.';
        Icon = Activity;
    }

    // Circular gauge properties
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (globalScore / 100) * circumference;

    const submetrics = [
        { label: 'Profitabilitate (30%)', value: profitability, icon: <Percent className="w-3.5 h-3.5" />, color: 'bg-indigo-600' },
        { label: 'Disponibilitate Stoc (25%)', value: stockAvailability, icon: <Layers className="w-3.5 h-3.5" />, color: 'bg-emerald-600' },
        { label: 'Rotație Stoc (20%)', value: stockRotation, icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'bg-teal-600' },
        { label: 'Siguranță Expirare (15%)', value: expirationScore, icon: <Ban className="w-3.5 h-3.5" />, color: 'bg-rose-600' },
        { label: 'Configurare Prețuri (10%)', value: priceCompleteness, icon: <DollarSign className="w-3.5 h-3.5" />, color: 'bg-amber-600' },
    ];

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col font-sans h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Sănătate Afacere</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Scor de performanță calculat în timp real</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider flex items-center gap-1 ${scoreColor}`}>
                    <Icon className="w-3 h-3" />
                    {statusText}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center flex-1">
                {/* Circular Gauge */}
                <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                    <div className="relative w-36 h-36">
                        <svg className="w-full h-full transform -rotate-90">
                            {/* Background Track Ring */}
                            <circle
                                cx="72"
                                cy="72"
                                r={radius}
                                className="stroke-gray-100 fill-none"
                                strokeWidth="12"
                            />
                            {/* Animated Active Ring */}
                            <circle
                                cx="72"
                                cy="72"
                                r={radius}
                                className={`fill-none transition-all duration-1000 ease-out ${ringColor}`}
                                strokeWidth="12"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                            />
                        </svg>
                        {/* Text center */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-gray-950 tracking-tighter">{globalScore}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Scor</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-4 max-w-[180px] leading-relaxed mx-auto">
                        {description}
                    </p>
                </div>

                {/* Submetrics list */}
                <div className="md:col-span-3 space-y-4">
                    {submetrics.map((metric, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                <div className="flex items-center gap-2">
                                    <div className="text-gray-400 shrink-0">{metric.icon}</div>
                                    <span>{metric.label}</span>
                                </div>
                                <span className="font-black text-gray-950">{metric.value}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-700 ${metric.color}`}
                                    style={{ width: `${metric.value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
