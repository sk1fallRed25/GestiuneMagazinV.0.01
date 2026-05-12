import React from 'react';
import { useLosses } from './hooks/useLosses';
import { LossesHeader } from './components/LossesHeader';
import { LossesSearchBar } from './components/LossesSearchBar';
import { LossesProductGrid } from './components/LossesProductGrid';
import { LossReportModal } from './components/LossReportModal';

const LossesPage: React.FC = () => {
    const {
        loading,
        search,
        setSearch,
        selectedProduct,
        showModal,
        scrapQty,
        setScrapQty,
        reason,
        setReason,
        filteredProducts,
        openScrapModal,
        closeModal,
        submitLoss
    } = useLosses();

    return (
        <div className="p-8 max-w-7xl mx-auto bg-gray-50/30 min-h-screen">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <LossesHeader />
                <LossesSearchBar value={search} onChange={setSearch} />
            </div>

            <LossesProductGrid 
                products={filteredProducts} 
                onSelectProduct={openScrapModal} 
                loading={loading && !showModal} 
            />

            <LossReportModal
                product={selectedProduct}
                isOpen={showModal}
                quantity={scrapQty}
                reason={reason}
                loading={loading}
                onQuantityChange={setScrapQty}
                onReasonChange={setReason}
                onClose={closeModal}
                onSubmit={submitLoss}
            />
        </div>
    );
};

export default LossesPage;
