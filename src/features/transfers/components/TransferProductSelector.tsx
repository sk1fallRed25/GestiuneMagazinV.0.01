import React from 'react';
import { Search, Package, X } from 'lucide-react';
import { TransferProduct } from '../types';
import { HighlightText } from '../../../shared/components/ui';

interface TransferProductSelectorProps {
    search: string;
    setSearch: (s: string) => void;
    filteredProducts: TransferProduct[];
    onSelect: (id: string) => void;
    selectedProduct: TransferProduct | null;
}

export const TransferProductSelector = ({
    search, setSearch, filteredProducts, onSelect, selectedProduct
}: TransferProductSelectorProps) => {
    const shouldShowDropdown = search && (!selectedProduct || search !== selectedProduct.nume);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-3 ml-1">Pas 1: Selectează Produsul</label>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold text-gray-700 transition-all"
                    placeholder="Caută după nume sau cod bare..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoComplete="off"
                    autoFocus
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-250/60 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}

                {shouldShowDropdown && (
                    <div className="absolute z-20 w-full bg-white shadow-2xl border border-gray-100 rounded-2xl mt-2 max-h-60 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                Nu s-au găsit rezultate
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                                    {filteredProducts.length} {filteredProducts.length === 1 ? 'rezultat găsit' : 'rezultate găsite'}
                                </div>
                                {filteredProducts.map(p => (
                                    <div
                                        key={p.id}
                                        className="p-4 hover:bg-amber-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                        onClick={() => {
                                            onSelect(p.id);
                                            setSearch(p.nume);
                                        }}
                                    >
                                        <div className="font-bold text-gray-800">
                                            <HighlightText text={p.nume} search={search} />
                                        </div>
                                        <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            <span>Cod: <HighlightText text={p.cod_bare} search={search} /></span>
                                            <span className="text-amber-605">Total: {p.stoc_depozit + p.stoc_magazin} {p.um}</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {selectedProduct && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500">
                        <Package size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-800">{selectedProduct.nume}</p>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">UM: {selectedProduct.um}</p>
                    </div>
                </div>
            )}
        </div>
    );
};
