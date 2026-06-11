import React from 'react';
import { Search, Plus, ArrowRight } from 'lucide-react';
import { ReceptionProduct } from '../types';

interface ReceptionProductPickerProps {
    search: string;
    setSearch: (s: string) => void;
    filteredProducts: ReceptionProduct[];
    onSelect: (p: ReceptionProduct) => void;
    selectedProduct: ReceptionProduct | null;
    isBax: boolean;
    setIsBax: (b: boolean) => void;
    quantity: string;
    setQuantity: (q: string) => void;
    bucatiPerBax: string;
    setBucatiPerBax: (b: string) => void;
    totalValue: string;
    setTotalValue: (v: string) => void;
    adaos: number;
    setAdaos: (a: number) => void;
    onAddLine: () => void;
    calculations: {
        quantityTotal: number;
        purchasePriceUnit: number;
        salePriceNew: number;
    };
    batchNumber: string;
    setBatchNumber: (b: string) => void;
    expiryDate: string;
    setExpiryDate: (d: string) => void;
}

export const ReceptionProductPicker = ({
    search, setSearch, filteredProducts, onSelect, selectedProduct,
    isBax, setIsBax, quantity, setQuantity, bucatiPerBax, setBucatiPerBax,
    totalValue, setTotalValue, adaos, setAdaos, onAddLine, calculations,
    batchNumber, setBatchNumber, expiryDate, setExpiryDate
}: ReceptionProductPickerProps) => (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Plus className="text-green-500" size={20} />
            Adaugă Linie Recepție
        </h3>

        <div className="space-y-6">
            {/* Căutare */}
            <div className="relative">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Caută Produs (Nume / Cod Bare)</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-gray-700 transition-all"
                        placeholder="Scrie denumirea sau codul..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                {filteredProducts.length > 0 && (
                    <div className="absolute z-20 w-full bg-white shadow-2xl border border-gray-100 rounded-2xl mt-2 max-h-60 overflow-y-auto">
                        {filteredProducts.map(p => (
                            <div
                                key={p.id}
                                className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                onClick={() => onSelect(p)}
                            >
                                <div className="font-bold text-gray-800">{p.nume}</div>
                                <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest gap-2 flex-wrap">
                                    <span>Cod: {p.cod_bare}</span>
                                    <span>Cat: {p.category_name || 'Necategorizat'}</span>
                                    <span className="text-indigo-600">Actual: {p.pret_vanzare.toFixed(2)} LEI</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Configurare Linie */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase mb-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                            checked={isBax}
                            onChange={e => setIsBax(e.target.checked)}
                        />
                        Intrare la Bax?
                    </label>
                    {isBax ? (
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className="w-1/2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-center font-bold text-indigo-600"
                                placeholder="Nr. Bax"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                            <input
                                type="number"
                                className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-center text-sm font-bold"
                                placeholder="Buc/Bax"
                                value={bucatiPerBax}
                                onChange={e => setBucatiPerBax(e.target.value)}
                            />
                        </div>
                    ) : (
                        <input
                            type="number"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                            placeholder="Cantitate"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3 ml-1">Valoare Factură (Fără TVA)</label>
                    <input
                        type="number"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-right font-mono font-bold"
                        placeholder="0.00"
                        value={totalValue}
                        onChange={e => setTotalValue(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3 ml-1">Nr. Lot / Expirare</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-xs font-mono"
                            placeholder="Lot"
                            value={batchNumber}
                            onChange={e => setBatchNumber(e.target.value)}
                        />
                        <input
                            type="date"
                            className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-xs"
                            value={expiryDate}
                            onChange={e => setExpiryDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={onAddLine}
                        disabled={!selectedProduct}
                        className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl shadow-xl shadow-slate-100 transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed font-black flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        <Plus size={18} /> Adaugă Linie
                    </button>
                </div>
            </div>

            {/* Calcul Live */}
            {selectedProduct && (
                <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                    <div className="text-sm">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Produs în curs de recepție</p>
                        <p className="font-bold text-slate-800">{selectedProduct.nume}</p>
                    </div>

                    <div className="flex items-center gap-3 text-xs bg-white px-4 py-2 rounded-xl border border-indigo-50 shadow-sm">
                        <span className="text-slate-400 font-bold">RECAP:</span>
                        <span className="font-black text-indigo-600">{calculations.quantityTotal} {selectedProduct.um}</span>
                        <span className="text-slate-200">|</span>
                        <span className="text-slate-400 font-bold">COST UNIT:</span>
                        <span className="font-black text-orange-600">{calculations.purchasePriceUnit.toFixed(4)} LEI</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <span className="px-3 py-2 bg-slate-50 text-slate-400 text-[10px] font-black border-r">ADAOS%</span>
                            <input
                                type="number"
                                className="w-16 p-2 text-center font-black text-slate-700 outline-none"
                                value={adaos}
                                onChange={e => setAdaos(Number(e.target.value))}
                            />
                        </div>
                        <ArrowRight size={16} className="text-slate-300" />
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Preț Nou</span>
                            <span className="font-black text-green-600 text-lg">
                                {calculations.salePriceNew.toFixed(2)} <span className="text-xs">LEI</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
