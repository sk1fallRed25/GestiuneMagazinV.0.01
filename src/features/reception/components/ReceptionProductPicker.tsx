import React, { useState, useRef, useEffect } from 'react';
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
}: ReceptionProductPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Preveni redeschiderea dropdown-ului din cauza focus-ului imediat după click.
    const isSelectingRef = useRef(false);

    // Închidere la click în afara zonei
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Focus pe inputul de cantitate când se selectează un produs
    useEffect(() => {
        if (selectedProduct) {
            const timer = setTimeout(() => {
                quantityInputRef.current?.focus();
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [selectedProduct, isBax]);

    const handleSelect = (p: ReceptionProduct) => {
        isSelectingRef.current = true;
        onSelect(p);
        setIsOpen(false);
        setHighlightedIndex(-1);
        
        // Asigurăm că isSelectingRef se resetează după ce focus-ul a fost mutat
        setTimeout(() => {
            isSelectingRef.current = false;
        }, 200);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'Escape') {
            setIsOpen(false);
            searchInputRef.current?.blur();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => 
                filteredProducts.length > 0 ? (prev + 1) % filteredProducts.length : -1
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => 
                filteredProducts.length > 0 ? (prev - 1 + filteredProducts.length) % filteredProducts.length : -1
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
                handleSelect(filteredProducts[highlightedIndex]);
            }
        }
    };

    const shouldShowDropdown = isOpen && !selectedProduct && filteredProducts.length > 0;

    return (
        <div ref={containerRef} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative">
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
                            ref={searchInputRef}
                            data-testid="reception-product-search"
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-gray-700 transition-all"
                            placeholder="Scrie denumirea sau codul..."
                            value={search}
                            onFocus={() => {
                                if (!selectedProduct && !isSelectingRef.current) {
                                    setIsOpen(true);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            onChange={e => {
                                setSearch(e.target.value);
                                setIsOpen(true);
                                setHighlightedIndex(-1);
                            }}
                            autoComplete="off"
                        />
                    </div>

                    {shouldShowDropdown && (
                        <div 
                            data-testid="reception-product-search-dropdown"
                            className="absolute z-30 w-full bg-white shadow-2xl border border-gray-100 rounded-2xl mt-2 max-h-60 overflow-y-auto"
                        >
                            {filteredProducts.map((p, idx) => (
                                <div
                                    key={p.id}
                                    data-testid="reception-product-search-option"
                                    className={`p-4 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                                        highlightedIndex === idx ? 'bg-indigo-50' : ''
                                    }`}
                                    onClick={() => handleSelect(p)}
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

                {/* Selected Product Card (Zonă separată, aerisită) */}
                {selectedProduct && (
                    <div 
                        data-testid="reception-selected-product-card"
                        className="p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"
                    >
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Produs selectat</span>
                            <h4 className="font-extrabold text-slate-800 text-base leading-snug">{selectedProduct.nume}</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                <span>Cod bare: <span className="font-mono font-bold text-slate-700">{selectedProduct.cod_bare}</span></span>
                                <span>UM: <span className="font-bold text-slate-700">{selectedProduct.um}</span></span>
                                <span>Categorie: <span className="font-bold text-indigo-600">{selectedProduct.category_name || 'Necategorizat'}</span></span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center text-xs bg-white px-4 py-2.5 rounded-xl border border-indigo-50 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stoc curent</span>
                                <span className="font-extrabold text-slate-700">{selectedProduct.stoc !== undefined ? `${selectedProduct.stoc} ${selectedProduct.um}` : '0 buc'}</span>
                            </div>
                            <span className="text-slate-200">|</span>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preț vânzare curent</span>
                                <span className="font-extrabold text-indigo-600">{selectedProduct.pret_vanzare.toFixed(2)} LEI</span>
                            </div>
                            {selectedProduct.pret_achizitie && (
                                <>
                                    <span className="text-slate-200">|</span>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preț achiziție curent</span>
                                        <span className="font-extrabold text-amber-600">{selectedProduct.pret_achizitie.toFixed(2)} LEI</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

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
                                    ref={quantityInputRef}
                                    data-testid="reception-item-quantity"
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
                                ref={quantityInputRef}
                                data-testid="reception-item-quantity"
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
                            data-testid="reception-item-purchase-price"
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
                            data-testid="reception-add-line-button"
                            onClick={onAddLine}
                            disabled={!selectedProduct}
                            className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl shadow-xl shadow-slate-100 transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed font-black flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                        >
                            <Plus size={18} /> Adaugă Linie
                        </button>
                    </div>
                </div>

                {/* Calcul Live & Adaos / Preț Nou */}
                {selectedProduct && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                        <div className="text-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Calcul preț unitar de achiziție</p>
                            <p className="font-bold text-slate-700">
                                {calculations.quantityTotal} {selectedProduct.um} la cost unitar{' '}
                                <span className="font-mono text-orange-600 font-extrabold">{calculations.purchasePriceUnit.toFixed(4)} LEI</span>
                            </p>
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
                            <div className="flex flex-col items-end" data-testid="reception-item-sale-price">
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Preț Nou propus</span>
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
};
