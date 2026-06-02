import React from 'react';
import { Link } from 'react-router-dom';
import { AiRecommendation } from '../types';
import { AlertCircle, AlertTriangle, Info, ArrowUpRight } from 'lucide-react';

interface AiRecommendationCardProps {
    recommendation: AiRecommendation;
}

const getActionRoute = (label: string): string | null => {
    const l = label.toLowerCase();
    if (l.includes('stoc')) return '/produse';
    if (l.includes('expir')) return '/expirari';
    if (l.includes('pierderi')) return '/istoric-pierderi';
    if (l.includes('rapoarte')) return '/rapoarte';
    if (l.includes('promotii') || l.includes('promoții')) return '/produse';
    return null;
};

export const AiRecommendationCard: React.FC<AiRecommendationCardProps> = ({
    recommendation
}) => {
    const config = {
        critical: { 
            bg: 'from-red-50/70 to-red-100/10', 
            border: 'border-red-200 dark:border-red-900/50',
            text: 'text-red-900', 
            iconColor: 'text-red-600', 
            badge: 'CRITICAL',
            icon: <AlertCircle size={22} />
        },
        warning: { 
            bg: 'from-orange-50/70 to-orange-100/10', 
            border: 'border-orange-200 dark:border-orange-900/50',
            text: 'text-orange-900', 
            iconColor: 'text-orange-600', 
            badge: 'ATENȚIE',
            icon: <AlertTriangle size={22} />
        },
        info: { 
            bg: 'from-indigo-50/70 to-indigo-100/10', 
            border: 'border-indigo-200 dark:border-indigo-900/50',
            text: 'text-indigo-900', 
            iconColor: 'text-indigo-600', 
            badge: 'INFO',
            icon: <Info size={22} />
        }
    };

    const style = config[recommendation.severity as keyof typeof config] || config.info;
    const route = recommendation.actionLabel ? getActionRoute(recommendation.actionLabel) : null;

    return (
        <div className={`bg-white bg-gradient-to-br ${style.bg} border ${style.border} p-6 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}>
            <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-2xl ${style.iconColor} bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100`}>
                    {style.icon}
                </div>
                <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider ${style.iconColor} border border-current bg-white/80`}>
                            {style.badge}
                        </span>
                    </div>
                    <h3 className={`text-lg font-black tracking-tight ${style.text}`}>{recommendation.title}</h3>
                    <p className={`text-sm font-semibold ${style.text} opacity-85 mt-1 leading-relaxed`}>{recommendation.description}</p>
                </div>
            </div>
            
            {recommendation.actionLabel && (
                route ? (
                    <Link 
                        to={route}
                        className="w-full md:w-auto shrink-0 px-5 py-3 bg-white text-slate-800 hover:text-indigo-600 font-black text-xs rounded-xl border border-slate-200 hover:border-indigo-500 shadow-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                        {recommendation.actionLabel}
                        <ArrowUpRight size={14} />
                    </Link>
                ) : (
                    <button 
                        disabled
                        title="Modul în curs de conectare"
                        className="w-full md:w-auto shrink-0 px-5 py-3 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {recommendation.actionLabel}
                        <span className="text-[9px] uppercase px-1 bg-slate-200 text-slate-500 rounded">Planned</span>
                    </button>
                )
            )}
        </div>
    );
};
