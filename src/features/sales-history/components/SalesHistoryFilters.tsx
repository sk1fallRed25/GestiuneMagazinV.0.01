import React from 'react';
import { Search, Calendar, CreditCard, X } from 'lucide-react';
import { SalesHistoryFilters as Filters } from '../types';

interface SalesHistoryFiltersProps {
    filters: Filters;
    onFilterChange: (f: Partial<Filters>) => void;
}

export const SalesHistoryFilters: React.FC<SalesHistoryFiltersProps> = ({ filters, onFilterChange }) => {
    return (
        <div data-testid="sales-history-filter-panel" className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            {/* Căutare */}
            <div className="lg:col-span-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">CĂUTARE</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="ID sau Casier..."
                        className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm font-bold"
                        value={filters.search}
                        onChange={e => onFilterChange({ search: e.target.value })}
                    />
                    {filters.search && (
                        <button
                            onClick={() => onFilterChange({ search: '' })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Curăță"
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Metodă Plată */}
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">METODĂ PLATĂ</label>
                <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm font-bold appearance-none cursor-pointer"
                        value={filters.paymentMethod}
                        onChange={e => onFilterChange({ paymentMethod: e.target.value as any })}
                    >
                        <option value="all">Toate Metodele</option>
                        <option value="cash">Numerar</option>
                        <option value="card">Card</option>
                        <option value="mixed">Mixt</option>
                    </select>
                </div>
            </div>

            {/* Status */}
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">STATUS</label>
                <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm font-bold appearance-none cursor-pointer"
                    value={filters.status}
                    onChange={e => onFilterChange({ status: e.target.value as any })}
                >
                    <option value="all">Toate Statusurile</option>
                    <option value="finalized">Finalizate</option>
                    <option value="cancelled">Anulate</option>
                    <option value="returned">Retur</option>
                </select>
            </div>

            {/* Interval Date */}
            <div className="md:col-span-1 lg:col-span-2 grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">DE LA</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm font-bold cursor-pointer"
                            value={filters.dateFrom}
                            onChange={e => onFilterChange({ dateFrom: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">PÂNĂ LA</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm font-bold cursor-pointer"
                            value={filters.dateTo}
                            onChange={e => onFilterChange({ dateTo: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
