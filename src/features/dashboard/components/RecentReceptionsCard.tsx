import React from 'react';
import { PackageOpen, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RecentReception } from '../types';

interface RecentReceptionsCardProps {
    receptions: RecentReception[];
}

export const RecentReceptionsCard: React.FC<RecentReceptionsCardProps> = ({ receptions }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <PackageOpen size={20} className="text-indigo-600" />
                    Recepții Recente
                </h3>
                <Link to="/receptie" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    VEZI TOT <ChevronRight size={14} />
                </Link>
            </div>
            
            <div className="flex-1">
                {receptions.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-medium italic">Nicio recepție înregistrată recent.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <tr>
                                <th className="px-6 py-3">Nr. Doc</th>
                                <th className="px-6 py-3">Furnizor</th>
                                <th className="px-6 py-3">Dată</th>
                                <th className="px-6 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {receptions.map((rec) => (
                                <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-700">
                                            {rec.documentNumber}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-900 line-clamp-1">{rec.supplierText}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-gray-500">
                                            {rec.receptionDate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-[10px] font-black uppercase ${
                                            rec.status === 'posted' ? 'text-emerald-600' : (rec.status === 'draft' ? 'text-amber-500' : 'text-red-500')
                                        }`}>
                                            {rec.status === 'posted' ? 'NIR' : (rec.status === 'draft' ? 'Ciornă' : rec.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
