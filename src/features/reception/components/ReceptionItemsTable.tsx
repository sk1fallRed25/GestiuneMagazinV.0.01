import React from 'react';
import { Package, Trash2, Calendar, Tag } from 'lucide-react';
import { ReceptionLine } from '../types';
import { EmptyState } from '../../../shared/components/ui';

interface ReceptionItemsTableProps {
    lines: ReceptionLine[];
    onRemove: (tempId: string) => void;
}

export const ReceptionItemsTable = ({ lines, onRemove }: ReceptionItemsTableProps) => (
    <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Package className="text-indigo-500" size={20} />
                Linii NIR ({lines.length})
            </h3>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Trasabilitate activă per Lot
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-50">
                        <th className="p-5 pl-8">Produs</th>
                        <th className="p-5 text-center">Cantitate</th>
                        <th className="p-5 text-right">Cost Unitar</th>
                        <th className="p-5 text-right">Preț Nou</th>
                        <th className="p-5 text-center">Informații Lot</th>
                        <th className="p-5 text-right">Subtotal</th>
                        <th className="p-5 text-center"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                    {lines.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-12 text-center">
                                <EmptyState
                                    title="Nicio linie de recepție"
                                    description="Nu ai adăugat niciun produs în recepția curentă."
                                    icon={<Package className="text-slate-400" size={32} />}
                                />
                            </td>
                        </tr>
                    ) : (
                        lines.map(l => (
                            <tr key={l.tempId} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="p-4 pl-8">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{l.productName}</span>
                                        <span className="text-[10px] font-mono text-slate-400">{l.barcode}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="inline-flex flex-col items-center gap-1">
                                        <div className="text-xs font-semibold text-slate-500">
                                            Facturat: <span className="font-bold text-slate-700">{l.invoiceQuantity ?? l.quantity}</span>
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500">
                                            Recepționat: <span className="font-bold text-slate-800">{l.quantity}</span>
                                        </div>
                                        {l.isBax && (
                                            <span className="text-[9px] font-black text-indigo-400 uppercase">
                                                {l.cantitateBaxuri} x {l.bucatiPerBax} buc
                                            </span>
                                        )}
                                        {l.difference !== undefined && l.difference !== 0 && (
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                                l.difference < 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                            }`}>
                                                {l.difference < 0 ? `Minus: ${l.difference}` : `Plus: +${l.difference}`}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-slate-600">
                                    {l.purchasePrice.toFixed(4)}
                                </td>
                                <td className="p-4 text-right font-bold text-green-600">
                                    {l.salePrice.toFixed(2)}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        {l.batchNumber && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                <Tag size={10} /> {l.batchNumber}
                                            </div>
                                        )}
                                        {l.expiryDate && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                                <Calendar size={10} /> {l.expiryDate}
                                            </div>
                                        )}
                                        {!l.batchNumber && !l.expiryDate && <span className="text-slate-300">-</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right font-black text-slate-900 font-mono">
                                    {(l.quantity * l.purchasePrice).toFixed(2)}
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => onRemove(l.tempId)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
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
