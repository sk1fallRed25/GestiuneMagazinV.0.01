import React from 'react';
import { Search, Filter, Warehouse, Store, LayoutGrid, X } from 'lucide-react';
import { ExpirationFilter } from '../types';

interface ExpirationsFiltersProps {
    filters: ExpirationFilter;
    onFilterChange: (updates: Partial<ExpirationFilter>) => void;
}

export const ExpirationsFilters: React.FC<ExpirationsFiltersProps> = ({ filters, onFilterChange }) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Căutare produs sau cod bare..."
                    className="w-full pl-12 pr-10 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all text-gray-700"
                    value={filters.search}
                    onChange={(e) => onFilterChange({ search: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') onFilterChange({ search: '' });
                    }}
                />
                {filters.search && (
                    <button
                        type="button"
                        onClick={() => onFilterChange({ search: '' })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200/50 rounded-full text-slate-400 hover:text-slate-650 transition-colors"
                        aria-label="Șterge căutarea"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                <button
                    onClick={() => onFilterChange({ status: 'all' })}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        filters.status === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Toate
                </button>
                <button
                    onClick={() => onFilterChange({ status: 'expired' })}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        filters.status === 'expired' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-red-400'
                    }`}
                >
                    Expirate
                </button>
                <button
                    onClick={() => onFilterChange({ status: 'critical' })}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        filters.status === 'critical' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-orange-400'
                    }`}
                >
                    Critice
                </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                <button
                    onClick={() => onFilterChange({ zone: 'all' })}
                    className={`p-2 rounded-xl transition-all ${
                        filters.zone === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
                    }`}
                    title="Toate zonele"
                >
                    <LayoutGrid size={20} />
                </button>
                <button
                    onClick={() => onFilterChange({ zone: 'magazin' })}
                    className={`p-2 rounded-xl transition-all ${
                        filters.zone === 'magazin' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
                    }`}
                    title="Magazin"
                >
                    <Store size={20} />
                </button>
                <button
                    onClick={() => onFilterChange({ zone: 'depozit' })}
                    className={`p-2 rounded-xl transition-all ${
                        filters.zone === 'depozit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
                    }`}
                    title="Depozit"
                >
                    <Warehouse size={20} />
                </button>
            </div>
        </div>
    );
};
