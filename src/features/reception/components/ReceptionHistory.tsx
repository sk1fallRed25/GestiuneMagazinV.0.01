import React from 'react';
import { Search, Calendar, FileText, ChevronRight, User } from 'lucide-react';
import { ReceptionDbRow } from '../types';

interface ReceptionHistoryProps {
    receptions: ReceptionDbRow[];
    loading: boolean;
    filters: {
        date: string;
        supplier: string;
        status: string;
    };
    onFilterChange: (filters: any) => void;
    onViewDetails: (id: string) => void;
}

export const ReceptionHistory = ({
    receptions,
    loading,
    filters,
    onFilterChange,
    onViewDetails
}: ReceptionHistoryProps) => {

    const handleClearFilters = () => {
        onFilterChange({
            date: '',
            supplier: '',
            status: ''
        });
    };

    return (
        <div data-testid="reception-history-page" className="space-y-6">
            {/* Filtre */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Search className="text-indigo-500 w-5 h-5" /> Filtre Istoric
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Dată Recepție</label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => onFilterChange({ ...filters, date: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Furnizor (Căutare)</label>
                        <input
                            type="text"
                            value={filters.supplier}
                            onChange={(e) => onFilterChange({ ...filters, supplier: e.target.value })}
                            placeholder="Căutare după nume..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Status Document</label>
                        <select
                            value={filters.status}
                            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">Toate statusurile</option>
                            <option value="draft">Draft / În lucru</option>
                            <option value="posted">Confirmată / Postată</option>
                            <option value="cancelled">Anulată</option>
                        </select>
                    </div>
                    <div>
                        <button
                            onClick={handleClearFilters}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                        >
                            Curăță Filtrele
                        </button>
                    </div>
                </div>
            </div>

            {/* Listă Recepții */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                                <th className="p-4 pl-6">Nr. Document / NIR</th>
                                <th className="p-4">Dată</th>
                                <th className="p-4">Furnizor</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Valoare Totală</th>
                                <th className="p-4">Operat de</th>
                                <th className="p-4 text-center">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-16 text-center text-slate-400 italic">
                                        Se încarcă istoricul...
                                    </td>
                                </tr>
                            ) : receptions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-16 text-center text-slate-400 italic">
                                        Nu s-a găsit nicio recepție.
                                    </td>
                                </tr>
                            ) : (
                                receptions.map((r) => {
                                    const profEmail = r.profiles?.email || 'Sistem';
                                    const displayNir = r.nir_number ? ` / NIR: ${r.nir_number}` : '';
                                    return (
                                        <tr key={r.id} data-testid="reception-history-row" className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4 pl-6 font-bold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-slate-400" />
                                                    {r.document_number} {displayNir}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 font-bold font-mono">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    {r.reception_date || r.document_date}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-slate-700">
                                                {r.supplier_text || <span className="text-slate-300 italic">Nespecificat</span>}
                                                {r.supplier_cui && (
                                                    <div className="text-[10px] text-slate-400 font-normal">CUI: {r.supplier_cui}</div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {r.status === 'draft' && (
                                                    <span data-testid="reception-status-draft" className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                                        Draft
                                                    </span>
                                                )}
                                                {r.status === 'posted' && (
                                                    <span data-testid="reception-status-posted" className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-green-50 text-green-600 border border-green-100">
                                                        Confirmată
                                                    </span>
                                                )}
                                                {r.status === 'cancelled' && (
                                                    <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                                                        Anulată
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-black font-mono text-slate-800 text-sm">
                                                {r.total_value.toFixed(2)} LEI
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium">
                                                <div className="flex items-center gap-1">
                                                    <User size={12} className="text-slate-400" />
                                                    <span className="truncate max-w-[120px]">{profEmail.split('@')[0]}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    data-testid="reception-history-view-details"
                                                    onClick={() => onViewDetails(r.id)}
                                                    className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 px-3 py-1.5 rounded-xl font-bold transition-all active:scale-[0.97]"
                                                >
                                                    Detalii <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
