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
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50 pb-20 font-sans">
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

            <SalesHistoryTable 
                sales={sales} 
                loading={loading} 
                onViewDetails={openSaleDetails} 
            />

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
