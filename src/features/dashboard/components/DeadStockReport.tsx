import React, { useState, useMemo } from 'react';
import { SlowMoverProduct } from '../types';
import { Search, Calendar, PackageMinus, TrendingDown } from 'lucide-react';
import { EmptyState, Button } from '../../../shared/components/ui';

interface DeadStockReportProps {
    slowMovers: SlowMoverProduct[];
    loading?: boolean;
}

export const DeadStockReport: React.FC<DeadStockReportProps> = ({ slowMovers, loading }) => {
    const [daysFilter, setDaysFilter] = useState<30 | 60 | 90>(30);
    const [searchTerm, setSearchTerm] = useState('');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(value);
    };

    // Filter and search
    const filteredMovers = useMemo(() => {
        return slowMovers
            .filter(item => {
                const matchesDays = item.daysWithoutSale >= daysFilter;
                const matchesSearch = 
                    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.barcode.includes(searchTerm);
                return matchesDays && matchesSearch;
            })
            .sort((a, b) => b.blockedValue - a.blockedValue);
    }, [slowMovers, daysFilter, searchTerm]);

    const totalBlockedValue = useMemo(() => {
        return filteredMovers.reduce((acc, item) => acc + item.blockedValue, 0);
    }, [filteredMovers]);

    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-96" />
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col font-sans">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Raport Stoc Mort (Dead Stock)</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Produse cu stoc activ care nu au înregistrat vânzări în ultima perioadă</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Range selectors */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        {([30, 60, 90] as const).map((days) => (
                            <button
                                key={days}
                                onClick={() => setDaysFilter(days)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    daysFilter === days
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {days}+ Zile
                            </button>
                        ))}
                    </div>

                    {/* Total Blocked capital badge */}
                    <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        <div className="text-left">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block leading-none">Capital Blocat</span>
                            <span className="text-xs font-black leading-none mt-0.5 block">{formatCurrency(totalBlockedValue)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Caută după nume sau cod bare..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 font-medium"
                />
            </div>

            {/* Data Table */}
            {filteredMovers.length === 0 ? (
                <div className="py-12 border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                    <EmptyState
                        title="Fără produse în stoc mort"
                        description={
                            searchTerm 
                                ? 'Niciun produs nu corespunde căutării tale.' 
                                : `Felicitări! Toate produsele cu stoc au avut vânzări în ultimele ${daysFilter} de zile.`
                        }
                        icon={<PackageMinus size={36} className="text-gray-400" />}
                        action={searchTerm ? (
                            <Button variant="secondary" onClick={() => setSearchTerm('')}>
                                Resetează căutarea
                            </Button>
                        ) : undefined}
                    />
                </div>
            ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider border-b border-gray-100">
                                <th className="p-4">Produs</th>
                                <th className="p-4">Cod Bare</th>
                                <th className="p-4 text-center">Fără Vânzare</th>
                                <th className="p-4 text-right">Stoc Actual</th>
                                <th className="p-4 text-right">Valoare Blocată</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                            {filteredMovers.map((item) => (
                                <tr key={item.productId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900">{item.productName}</td>
                                    <td className="p-4 text-gray-400 font-mono">{item.barcode}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-100 font-black">
                                            {item.daysWithoutSale} zile
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {item.currentStock} {item.unit}
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-900">
                                        {formatCurrency(item.blockedValue)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
