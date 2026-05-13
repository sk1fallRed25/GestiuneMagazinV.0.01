import React from 'react';
import { ClipboardList, TrendingDown, PackageMinus, DollarSign, AlertCircle } from 'lucide-react';
import { LossHistorySummary } from '../types';

interface Props {
    summary: LossHistorySummary | null;
}

export const LossHistoryHeader: React.FC<Props> = ({ summary }) => {
    return (
        <div className="mb-8">
            <div className="mb-6">
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <ClipboardList className="text-indigo-600" size={32} /> Audit Pierderi & Casări (v2)
                </h1>
                <p className="text-slate-500 font-medium mt-1">
                    Monitorizarea activității de casare și a pierderilor valorice.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evenimente</p>
                        <p className="text-2xl font-black text-slate-800">{summary?.eventsCount || 0}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <PackageMinus size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cantitate Totală</p>
                        <p className="text-2xl font-black text-slate-800">{summary?.totalQuantity.toFixed(2) || '0.00'}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valoare Pierdere</p>
                        <p className="text-2xl font-black text-slate-800">{summary?.estimatedValue.toFixed(2) || '0.00'} lei</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Motiv</p>
                        <p className="text-lg font-black text-slate-800 truncate" title={summary?.topReasons[0]?.reason}>
                            {summary?.topReasons[0]?.reason || '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
