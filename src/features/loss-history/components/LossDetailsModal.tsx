import React from 'react';
import { X, Calendar, User, AlignLeft, Package } from 'lucide-react';
import { LossDetails } from '../types';
import { LossReasonBadge } from './LossReasonBadge';

interface Props {
    details: LossDetails | null;
    onClose: () => void;
}

export const LossDetailsModal: React.FC<Props> = ({ details, onClose }) => {
    if (!details) return null;

    const totalValue = details.items.reduce((sum, item) => sum + item.estimatedValue, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-black text-slate-800">Detalii Eveniment Casare</h2>
                            <LossReasonBadge reason={details.reason} />
                        </div>
                        <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
                            <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(details.createdAt).toLocaleString('ro-RO')}</span>
                            <span className="flex items-center gap-1.5"><User size={14} /> {details.operatorName}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {details.description && (
                        <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                            <AlignLeft size={20} className="text-amber-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">Notă explicativă</p>
                                <p className="text-sm font-medium text-amber-900">{details.description}</p>
                            </div>
                        </div>
                    )}

                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package size={16} className="text-indigo-500" />
                        Produse Casate ({details.items.length})
                    </h3>

                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-3 pl-4 text-[10px] font-black uppercase text-slate-400">Produs</th>
                                    <th className="p-3 text-[10px] font-black uppercase text-slate-400 text-center">Cantitate</th>
                                    <th className="p-3 text-[10px] font-black uppercase text-slate-400">Zonă / Lot</th>
                                    <th className="p-3 pr-4 text-[10px] font-black uppercase text-slate-400 text-right">Valoare</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {details.items.map((item) => (
                                    <tr key={item.itemId}>
                                        <td className="p-3 pl-4">
                                            <p className="font-bold text-slate-800 text-sm">{item.productName}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{item.barcode}</p>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="font-black text-sm text-red-600">-{item.quantity} {item.unit}</span>
                                        </td>
                                        <td className="p-3">
                                            <p className="text-xs font-bold text-slate-600 uppercase">{item.zone || 'Nesetată'}</p>
                                            {item.batchNumber && <p className="text-[10px] font-bold text-slate-400">Lot: {item.batchNumber}</p>}
                                        </td>
                                        <td className="p-3 pr-4 text-right">
                                            <p className="font-black text-slate-700 text-sm">{item.estimatedValue.toFixed(2)} lei</p>
                                            {item.purchasePrice != null && <p className="text-[10px] font-bold text-slate-400">({item.purchasePrice.toFixed(2)}/buc)</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-500">
                        ID Eveniment: <span className="font-mono text-xs">{details.eventId.split('-')[0]}</span>
                    </p>
                    <div className="text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Pierdere Estimată</p>
                        <p className="text-2xl font-black text-red-600">{totalValue.toFixed(2)} lei</p>
                    </div>
                </div>

            </div>
        </div>
    );
};
