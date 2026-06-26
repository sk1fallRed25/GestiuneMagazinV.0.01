import React from 'react';
import { Trash2, Warehouse, Store, Hash, Package } from 'lucide-react';
import { ExpirationItem } from '../types';
import { ExpirationStatusBadge } from './ExpirationStatusBadge';
import { EmptyState, HighlightText } from '../../../shared/components/ui';

interface ExpirationsTableProps {
    items: ExpirationItem[];
    onReportLoss: (item: ExpirationItem) => void;
    searchTerm?: string;
}

export const ExpirationsTable: React.FC<ExpirationsTableProps> = ({ items, onReportLoss, searchTerm = '' }) => {
    if (items.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow-sm">
                <EmptyState
                    title="Totul este în regulă!"
                    description="Nu există loturi care să corespundă filtrelor selectate."
                    icon={<Package size={36} className="text-slate-400" />}
                />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">Produs</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-center">Lot / Zonă</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-center">Cantitate</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-center">Expirare</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-center">Valoare Risc</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map((item) => (
                            <tr key={item.batchId} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">
                                            <HighlightText text={item.productName} search={searchTerm} />
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400 uppercase">
                                            COD: <HighlightText text={item.barcode} search={searchTerm} />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500 uppercase">
                                            <Hash size={10} /> {item.batchNumber || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase">
                                            {item.zone === 'magazin' ? <Store size={10} /> : <Warehouse size={10} />}
                                            {item.zone}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className="font-black text-gray-700">{item.quantity}</span>
                                    <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">{item.unit}</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="font-mono font-bold text-gray-600">
                                            {new Date(item.expiryDate).toLocaleDateString('ro-RO')}
                                        </span>
                                        <ExpirationStatusBadge status={item.status} days={item.daysUntilExpiry} />
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className="font-black text-slate-800">{item.estimatedValue.toFixed(2)}</span>
                                    <span className="ml-1 text-[10px] font-bold text-slate-400">RON</span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <button
                                        onClick={() => onReportLoss(item)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100 group-hover:shadow-md shadow-red-100"
                                    >
                                        <Trash2 size={14} /> Casare
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
