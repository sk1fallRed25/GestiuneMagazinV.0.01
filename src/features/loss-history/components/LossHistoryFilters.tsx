import React from 'react';
import { Search, Calendar, Filter } from 'lucide-react';
import { LossHistoryFilters as FilterType } from '../types';

interface Props {
    filters: FilterType;
    onFilterChange: (field: keyof FilterType, value: string) => void;
    onRefresh: () => void;
}

export const LossHistoryFilters: React.FC<Props> = ({ filters, onFilterChange, onRefresh }) => {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Căutare Globală
                </label>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        placeholder="Produs, cod bare, motiv..."
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                </div>
            </div>

            <div className="w-[180px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Zonă
                </label>
                <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                    value={filters.zone}
                    onChange={(e) => onFilterChange('zone', e.target.value)}
                >
                    <option value="all">Toate zonele</option>
                    <option value="magazin">Magazin</option>
                    <option value="depozit">Depozit</option>
                </select>
            </div>

            <div className="w-[180px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Motiv (DB Filter)
                </label>
                <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                    value={filters.reason}
                    onChange={(e) => onFilterChange('reason', e.target.value)}
                >
                    <option value="all">Toate motivele</option>
                    <option value="expirat">Expirat</option>
                    <option value="deteriorat">Deteriorat</option>
                    <option value="eroare_inventar">Eroare Inventar</option>
                    <option value="uz_intern">Uz Intern</option>
                </select>
            </div>

            <div className="flex gap-2">
                <div className="w-[140px]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">De la</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                            value={filters.dateFrom}
                            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-[140px]">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Până la</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                            value={filters.dateTo}
                            onChange={(e) => onFilterChange('dateTo', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={onRefresh}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
            >
                <Filter size={18} /> Aplică Filtre DB
            </button>
        </div>
    );
};
