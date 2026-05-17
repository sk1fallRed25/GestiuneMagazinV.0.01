import React from 'react';
import { Calendar, Package, ChevronRight, Loader2 } from 'lucide-react';
import { LossHistoryItem } from '../types';
import { LossReasonBadge } from './LossReasonBadge';

interface Props {
    items: LossHistoryItem[];
    loading: boolean;
    onViewDetails: (eventId: string) => void;
}

export const LossHistoryTable: React.FC<Props> = ({ items, loading, onViewDetails }) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 pl-6 text-[10px] font-black uppercase text-slate-400">Data & Ora</th>
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400">Produs</th>
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center">Cantitate</th>
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400">Motiv & Zonă</th>
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Valoare</th>
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400">Operator</th>
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <Loader2 className="animate-spin" size={32} />
                                        <span className="font-bold">Se încarcă istoricul...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-16 text-center">
                                    <div className="p-4 bg-gray-50 rounded-2xl text-gray-300 w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                        <Package size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 mb-1">Nu există înregistrări disponibile</p>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">Nu există înregistrări de pierderi sau casări conform filtrelor selectate.</p>
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.itemId} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <Calendar size={14} className="text-indigo-400" />
                                            {new Date(item.createdAt).toLocaleString('ro-RO')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                <Package size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm leading-tight">{item.productName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                                                    {item.barcode} {item.batchNumber ? ` | LOT: ${item.batchNumber}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-black text-xs border border-red-100">
                                            -{item.quantity} {item.unit}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1.5">
                                            <LossReasonBadge reason={item.reason} />
                                            <span className="text-[10px] font-black uppercase text-slate-400">
                                                {item.zone || 'Nesetată'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <p className="text-sm font-black text-slate-700">{item.estimatedValue.toFixed(2)} lei</p>
                                        {item.purchasePrice != null && (
                                            <p className="text-[10px] font-bold text-slate-400">({item.purchasePrice.toFixed(2)} / buc)</p>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-bold text-slate-600 truncate max-w-[120px]" title={item.operatorName || ''}>
                                            {item.operatorName}
                                        </p>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => onViewDetails(item.eventId)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Vezi tot evenimentul"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
