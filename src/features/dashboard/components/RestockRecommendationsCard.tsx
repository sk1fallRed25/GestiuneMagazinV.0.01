import React from 'react';
import { RestockRecommendation } from '../types';
import { Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RestockRecommendationsCardProps {
    recommendations: RestockRecommendation[];
    loading?: boolean;
}

export const RestockRecommendationsCard: React.FC<RestockRecommendationsCardProps> = ({ recommendations, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col font-sans h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Recomandări Reaprovizionare</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Produse cu vânzări active care necesită refacerea stocurilor</p>
                </div>
                <Truck className="w-5 h-5 text-indigo-600 shrink-0" />
            </div>

            {recommendations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-950">Stocuri optime</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Toate produsele cu vânzări au stoc asigurat pentru minim 7 zile.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
                    {recommendations.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-xs font-bold text-gray-900">{item.productName}</h4>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[10px] font-medium text-gray-400 font-mono">{item.barcode}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <span className="text-[10px] font-bold text-gray-500">
                                        Viteza: {item.dailySalesAverage.toFixed(2)} {item.unit}/zi
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Zile rămase</span>
                                    {item.daysUntilDepletion <= 1 ? (
                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded border border-rose-100 flex items-center gap-1 mt-0.5 animate-pulse">
                                            <AlertTriangle className="w-3 h-3" />
                                            &lt; 1 zi
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-black mt-0.5 block ${item.daysUntilDepletion <= 3 ? 'text-amber-600' : 'text-gray-900'}`}>
                                            {item.daysUntilDepletion.toFixed(1)} zile
                                        </span>
                                    )}
                                </div>

                                <div className="text-right pl-4 border-l border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-sans">Sugestie Necesar</span>
                                    <span className="text-xs font-black text-indigo-600 block mt-0.5 font-sans">
                                        +{item.recommendedQty} {item.unit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                    <Link
                        to="/receptie"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-center block text-xs uppercase tracking-wider active:scale-95 shadow-sm shadow-indigo-100"
                    >
                        Creează Recepție Nouă (NIR)
                    </Link>
                </div>
            )}
        </div>
    );
};
