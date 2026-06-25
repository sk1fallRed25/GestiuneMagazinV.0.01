import React from 'react';
import { ShoppingBag, TrendingUp, CreditCard, Banknote, Calculator } from 'lucide-react';
import { useSalesHistory } from './hooks/useSalesHistory';
import { SalesHistoryHeader } from './components/SalesHistoryHeader';
import { SalesHistoryFilters } from './components/SalesHistoryFilters';
import { SalesHistoryTable } from './components/SalesHistoryTable';
import { SaleDetailsModal } from './components/SaleDetailsModal';
import { VoidSaleModal } from './components/VoidSaleModal';
import { ReturnSaleModal } from './components/ReturnSaleModal';

const SalesHistoryPage: React.FC = () => {
    const {
        sales,
        summary,
        filters,
        loading,
        loadingDetails,
        selectedSale,
        showDetailsModal,
        fetchSales,
        updateFilter,
        openSaleDetails,
        closeDetailsModal,
        page,
        totalPages,
        totalCount,
        nextPage,
        prevPage,
        goToPage,

        // Void state & actions
        voidEligibility,
        voidEligibilityLoading,
        voidActionLoading,
        voidError,
        voidModalOpen,
        selectedSaleForVoid,
        openVoidModal,
        closeVoidModal,
        confirmVoidSale,

        // Return state & actions
        returnEligibility,
        returnEligibilityLoading,
        returnActionLoading,
        returnError,
        returnModalOpen,
        selectedSaleForReturn,
        openReturnModal,
        closeReturnModal,
        confirmReturnSale
    } = useSalesHistory();

    return (
        <div data-testid="sales-history-page" className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50 pb-20 font-sans">
            <SalesHistoryHeader loading={loading} onRefresh={fetchSales} />

            {/* Sumar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NR. VÂNZĂRI</p>
                        <p className="text-2xl font-black text-gray-900">{summary?.salesCount || 0}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL ÎNCASĂRI</p>
                        <p className="text-2xl font-black text-gray-900">{(summary?.totalRevenue || 0).toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                        <Banknote size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CASH TOTAL</p>
                        <p className="text-2xl font-black text-gray-900">{(summary?.cashTotal || 0).toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CARD TOTAL</p>
                        <p className="text-2xl font-black text-gray-900">{(summary?.cardTotal || 0).toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BON MEDIU</p>
                        <p className="text-2xl font-black text-gray-900">{(summary?.averageSale || 0).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <SalesHistoryFilters filters={filters} onFilterChange={updateFilter} />

            <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-xs font-black text-slate-550 uppercase tracking-widest">
                    {sales.length} {sales.length === 1 ? 'vânzare găsită' : 'vânzări găsite'}
                </span>
            </div>

            <SalesHistoryTable 
                sales={sales} 
                loading={loading} 
                onViewDetails={openSaleDetails} 
                searchTerm={filters.search}
                onClearFilters={() => updateFilter({ search: '', paymentMethod: 'all', status: 'all', dateFrom: '', dateTo: '' })}
            />

            {/* Pagination Controls */}
            {!loading && sales.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
                    <div className="text-xs font-semibold text-slate-500">
                        Se afișează <span className="font-bold text-slate-800">{Math.min(totalCount, (page - 1) * 50 + 1)}</span> - <span className="font-bold text-slate-800">{Math.min(totalCount, page * 50)}</span> din <span className="font-bold text-slate-800">{totalCount}</span> vânzări
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={prevPage}
                                disabled={page === 1}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm"
                            >
                                Anterior
                            </button>
                            
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    if (
                                        totalPages > 7 &&
                                        pageNum !== 1 &&
                                        pageNum !== totalPages &&
                                        Math.abs(pageNum - page) > 1
                                    ) {
                                        if (pageNum === 2 && page > 3) {
                                            return <span key="dots-start" className="text-slate-400 px-1 text-xs">...</span>;
                                        }
                                        if (pageNum === totalPages - 1 && page < totalPages - 2) {
                                            return <span key="dots-end" className="text-slate-400 px-1 text-xs">...</span>;
                                        }
                                        return null;
                                    }
                                    
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => goToPage(pageNum)}
                                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                                page === pageNum
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <button
                                onClick={nextPage}
                                disabled={page === totalPages}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm"
                            >
                                Următor
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showDetailsModal && (
                <SaleDetailsModal 
                    sale={selectedSale} 
                    loading={loadingDetails} 
                    onClose={closeDetailsModal} 
                    onVoidClick={openVoidModal}
                    onReturnClick={openReturnModal}
                />
            )}

            {voidModalOpen && (
                <VoidSaleModal
                    isOpen={voidModalOpen}
                    sale={selectedSaleForVoid}
                    eligibility={voidEligibility}
                    loading={voidEligibilityLoading}
                    actionLoading={voidActionLoading}
                    error={voidError}
                    onClose={closeVoidModal}
                    onConfirm={confirmVoidSale}
                />
            )}

            {returnModalOpen && (
                <ReturnSaleModal
                    isOpen={returnModalOpen}
                    sale={selectedSaleForReturn}
                    eligibility={returnEligibility}
                    loading={returnEligibilityLoading}
                    actionLoading={returnActionLoading}
                    error={returnError}
                    onClose={closeReturnModal}
                    onConfirm={confirmReturnSale}
                />
            )}
        </div>
    );
};

export default SalesHistoryPage;
