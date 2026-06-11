import React from 'react';
import { useTransfer } from './hooks/useTransfer';
import { TransferHeader } from './components/TransferHeader';
import { TransferProductSelector } from './components/TransferProductSelector';
import { TransferStockStatusCard } from './components/TransferStockStatusCard';
import { AlertCircle, Send, RefreshCw } from 'lucide-react';

export const TransferPage = () => {
    const {
        allStores,
        availableStores,
        sourceStoreId,
        setSourceStoreId,
        destinationStoreId,
        setDestinationStoreId,
        validationError,
        search,
        setSearch,
        filteredProducts,
        selectedProductId,
        setSelectedProductId,
        selectedProduct,
        quantity,
        setQuantity,
        submitting,
        submitTransfer
    } = useTransfer();

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-fade-in">
                <TransferHeader />

                {/* Select Puncte de Lucru Sursă / Destinație */}
                <div className="bg-white p-6 rounded-3xl border border-slate-205 shadow-sm mb-8">
                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        Configurare Traseu Transfer
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        {/* Punct Lucru Sursă */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Punct de Lucru Sursă</label>
                            {availableStores.length <= 1 ? (
                                <div 
                                    data-testid="transfer-source-select"
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 select-none"
                                >
                                    {allStores.find(s => s.id === sourceStoreId)?.name || 'Magazin Curent'}
                                </div>
                            ) : (
                                <select
                                    data-testid="transfer-source-select"
                                    value={sourceStoreId}
                                    onChange={e => setSourceStoreId(e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold text-slate-850"
                                >
                                    <option value="">Alege Punct Lucru Sursă...</option>
                                    {allStores.map(store => (
                                        <option 
                                            key={store.id} 
                                            value={store.id}
                                            disabled={store.active === false || store.lifecycle_status === 'archived'}
                                        >
                                            {store.name} {store.lifecycle_status === 'archived' ? '(Arhivat)' : store.active === false ? '(Inactiv)' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Punct Lucru Destinație */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Punct de Lucru Destinație</label>
                            <select
                                data-testid="transfer-destination-select"
                                value={destinationStoreId}
                                onChange={e => setDestinationStoreId(e.target.value)}
                                className="w-full p-3 bg-white border border-slate-205 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold text-slate-800"
                            >
                                <option value="">Alege Punct Lucru Destinație...</option>
                                {allStores.map(store => (
                                    <option 
                                        key={store.id} 
                                        value={store.id}
                                        disabled={store.active === false || store.lifecycle_status === 'archived'}
                                    >
                                        {store.name} {store.lifecycle_status === 'archived' ? '(Arhivat)' : store.active === false ? '(Inactiv)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Validation Error Message */}
                    {validationError && (
                        <div 
                            data-testid="transfer-validation-error"
                            className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2"
                        >
                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Product selector */}
                    <div className="lg:col-span-2 space-y-8">
                        <TransferProductSelector
                            search={search}
                            setSearch={setSearch}
                            filteredProducts={filteredProducts}
                            onSelect={setSelectedProductId}
                            selectedProduct={selectedProduct}
                        />
                    </div>

                    {/* Right: Stocks and finalization */}
                    <div className="lg:col-span-1 space-y-8">
                        <TransferStockStatusCard product={selectedProduct} />

                        {/* Summary Preview & Quantity Form */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-650" />
                                Sumar & Finalizare Transfer
                            </h3>

                            {/* Summary Preview Section */}
                            <div 
                                data-testid="transfer-summary-preview"
                                className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 space-y-3"
                            >
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Magazin Sursă:</span>
                                    <span className="font-bold text-slate-800">
                                        {allStores.find(s => s.id === sourceStoreId)?.name || 'Neselectat'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Magazin Destinație:</span>
                                    <span className="font-bold text-slate-800">
                                        {allStores.find(s => s.id === destinationStoreId)?.name || 'Neselectat'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Produs:</span>
                                    <span className="font-bold text-slate-850 truncate max-w-[150px]">
                                        {selectedProduct ? selectedProduct.nume : 'Neselectat'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-indigo-100/60">
                                    <span className="text-slate-600 font-bold">Cantitate:</span>
                                    <span className="font-black text-indigo-700 text-sm">
                                        {quantity ? `${quantity} ${selectedProduct?.um || 'buc'}` : '0'}
                                    </span>
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cantitate</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono text-xl font-bold text-center text-slate-800"
                                    placeholder="0.00"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    disabled={!selectedProductId}
                                />
                            </div>

                            {/* Confirm Button */}
                            <button
                                data-testid="transfer-confirm-button"
                                onClick={submitTransfer}
                                disabled={!!validationError || !selectedProductId || !quantity || submitting}
                                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Se procesează...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Execută Transferul
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferPage;
