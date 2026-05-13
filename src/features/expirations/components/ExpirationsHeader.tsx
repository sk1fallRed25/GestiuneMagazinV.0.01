import React from 'react';
import { CalendarClock, AlertCircle, TrendingDown, Clock } from 'lucide-react';
import { ExpirationSummary } from '../types';

interface ExpirationsHeaderProps {
    summary: ExpirationSummary;
}

export const ExpirationsHeader: React.FC<ExpirationsHeaderProps> = ({ summary }) => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                    <span className="bg-red-600 p-3 rounded-2xl text-white shadow-xl shadow-red-200">
                        <CalendarClock size={32} />
                    </span>
                    Monitorizare Expirări
                </h1>
                <p className="text-gray-500 mt-3 text-lg">Identificarea loturilor cu risc de perisabilitate ridicat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all">
                    <div className="bg-red-50 p-4 rounded-2xl text-red-600 group-hover:scale-110 transition-transform">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Expirate</p>
                        <p className="text-2xl font-black text-red-600">{summary.expiredCount}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all">
                    <div className="bg-orange-50 p-4 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Critice (7z)</p>
                        <p className="text-2xl font-black text-orange-600">{summary.criticalCount}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-yellow-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all">
                    <div className="bg-yellow-50 p-4 rounded-2xl text-yellow-600 group-hover:scale-110 transition-transform">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Atenție (30z)</p>
                        <p className="text-2xl font-black text-yellow-600">{summary.warningCount}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all">
                    <div className="bg-slate-50 p-4 rounded-2xl text-slate-600 group-hover:scale-110 transition-transform">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Valoare Risc</p>
                        <p className="text-2xl font-black text-slate-800">{summary.totalValueAtRisk.toFixed(2)} <span className="text-sm">RON</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};
