import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { SaleSummary } from '../types';
import { SaleStatusBadge } from './SaleStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import { LoadingState, EmptyState, HighlightText, Button } from '../../../shared/components/ui';

interface SalesHistoryTableProps {
    sales: SaleSummary[];
    loading: boolean;
    onViewDetails: (id: string) => void;
    searchTerm?: string;
    onClearFilters?: () => void;
}

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({ sales, loading, onViewDetails, searchTerm = '', onClearFilters }) => {
    if (loading && sales.length === 0) {
        return (
            <div data-testid="sales-history-loading-state" className="bg-white rounded-3xl border border-gray-100 shadow-sm">
                <LoadingState message="Se încarcă registrul..." size="lg" />
            </div>
        );
    }

    const hasFilters = searchTerm || (onClearFilters && sales.length === 0);

    if (sales.length === 0) {
        return (
            <div data-testid="sales-history-empty-state" className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <EmptyState 
                    title={hasFilters ? "Nicio vânzare găsită" : "Registrul de vânzări este gol"} 
                    description={
                        hasFilters
                            ? "Niciun bon fiscal nu corespunde criteriilor sau căutării tale."
                            : "Nu s-a înregistrat nicio vânzare în perioada selectată. Deschide POS-ul pentru a vinde."
                    } 
                    icon={<Package size={48} />}
                    action={
                        hasFilters ? (
                            <Button size="sm" variant="secondary" onClick={onClearFilters}>
                                Resetează filtrele
                            </Button>
                        ) : (
                            <Link to="/vanzare">
                                <Button size="sm" variant="primary">
                                    Deschide POS / Vinde
                                </Button>
                            </Link>
                        )
                    }
                />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table data-testid="sales-history-table" className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="p-6">ID BON</th>
                            <th className="p-6">DATA & ORA</th>
                            <th className="p-6">CASIER</th>
                            <th className="p-6 text-center">ARTICOLE</th>
                            <th className="p-6 text-center">METODĂ PLATĂ</th>
                            <th className="p-6 text-right">TOTAL</th>
                            <th className="p-6 text-center">STATUS</th>
                            <th className="p-6 text-center sticky right-0 bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">ACȚIUNI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sales.map((sale) => (
                            <tr key={sale.id} data-testid="sales-history-row" className="hover:bg-gray-50/80 transition-colors group">
                                <td className="p-6">
                                    <span className="font-mono text-xs text-gray-400 group-hover:text-indigo-600 font-bold transition-colors">
                                        #<HighlightText text={sale.id} search={searchTerm} />
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
                                        <span className="text-sm font-bold text-gray-600">
                                            <HighlightText text={sale.cashierName || ''} search={searchTerm} />
                                        </span>
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
                                <td className="p-6 text-center sticky right-0 bg-white group-hover:bg-gray-50/80 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">
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
