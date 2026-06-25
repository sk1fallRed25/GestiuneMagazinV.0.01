import React from 'react';
import { BusinessInsight } from '../types';
import { Lightbulb, ArrowUpRight, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SmartInsightsCardProps {
    insights: BusinessInsight[];
    loading?: boolean;
}

export const SmartInsightsCard: React.FC<SmartInsightsCardProps> = ({ insights, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    const typeConfig = {
        success: {
            bg: 'bg-emerald-50 border-emerald-100',
            text: 'text-emerald-950',
            icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
            actionBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100',
        },
        warning: {
            bg: 'bg-amber-50 border-amber-100',
            text: 'text-amber-950',
            icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
            actionBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100',
        },
        danger: {
            bg: 'bg-rose-50 border-rose-100',
            text: 'text-rose-950',
            icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
            actionBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100',
        },
        info: {
            bg: 'bg-indigo-50 border-indigo-100',
            text: 'text-indigo-950',
            icon: <Info className="w-5 h-5 text-indigo-600" />,
            actionBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100',
        },
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col font-sans h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Decizii Automate & Recomandări</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Asistent inteligent de optimizare a stocului și prețurilor</p>
                </div>
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
            </div>

            {insights.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-3">
                        <Lightbulb className="w-6 h-6 animate-bounce" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-950">Analizor activ</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Se analizează vânzările și stocurile pentru a genera decizii comerciale...</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[360px]">
                    {insights.map((insight, idx) => {
                        const cfg = typeConfig[insight.type] || typeConfig.info;
                        return (
                            <div key={idx} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:shadow-gray-50 ${cfg.bg}`}>
                                <div className="flex gap-3">
                                    <div className="shrink-0 mt-0.5">{cfg.icon}</div>
                                    <div className="space-y-1">
                                        <h4 className={`text-xs font-black uppercase tracking-wide leading-tight ${cfg.text}`}>
                                            {insight.title}
                                        </h4>
                                        <p className="text-xs text-gray-700 leading-relaxed font-medium">
                                            {insight.message}
                                        </p>
                                    </div>
                                </div>
                                {insight.actionLink && (
                                    <Link
                                        to={insight.actionLink}
                                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 justify-center transition-all active:scale-95 shadow-sm border border-transparent ${cfg.actionBtn}`}
                                    >
                                        <span>{insight.actionText}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
