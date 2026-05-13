import React from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { SaleSummary } from '../types';
import { SaleStatusBadge } from './SaleStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';

interface SalesHistoryTableProps {
    sales: SaleSummary[];
    loading: boolean;
    onViewDetails: (id: string) => void;
}

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({ sales, loading, onViewDetails }) => {
    if (loading && sales.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
                <div className="w-12 h-12 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Se încarcă registrul...</p>
            </div>
        );
    }

    if (sales.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-gray-100 shadow-sm text-gray-300">
                <Package size={64} className="mb-4 opacity-20" />
                <p className="text-xl font-bold">Nu există vânzări pentru criteriile selectate.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="p-6">ID BON</th>
                            <th className="p-6">DATA & ORA</th>
                            <th className="p-6">CASIER</th>
                            <th className="p-6 text-center">ARTICOLE</th>
                            <th className="p-6 text-center">METODĂ PLATĂ</th>
                            <th className="p-6 text-right">TOTAL</th>
                            <th className="p-6 text-center">STATUS</th>
                            <th className="p-6 text-center">ACȚIUNI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="p-6">
                                    <span className="font-mono text-xs text-gray-400 group-hover:text-indigo-600 font-bold transition-colors">
                                        #{sale.id.slice(0, 8)}...
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="font-bold text-gray-700">
                                        {new Date(sale.createdAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium">
                                        {new Date(sale.createdAt).toLocaleDateString('ro-RO')}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                                            {sale.cashierName?.charAt(0) || 'S'}
                                        </div>
                                        <span className="text-sm font-bold text-gray-600">{sale.cashierName}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-center font-bold text-gray-500 text-sm">
                                    {sale.itemsCount}
                                </td>
                                <td className="p-6 text-center">
                                    <PaymentMethodBadge method={sale.paymentMethod} />
                                </td>
                                <td className="p-6 text-right">
                                    <span className="text-lg font-black text-gray-900">{sale.total.toFixed(2)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 ml-1">LEI</span>
                                </td>
                                <td className="p-6 text-center">
                                    <SaleStatusBadge status={sale.status} />
                                </td>
                                <td className="p-6 text-center">
                                    <button
                                        onClick={() => onViewDetails(sale.id)}
                                        className="p-3 bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all active:scale-90"
                                        title="Detalii Bon"
                                    >
                                        <ChevronRight size={18} />
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
