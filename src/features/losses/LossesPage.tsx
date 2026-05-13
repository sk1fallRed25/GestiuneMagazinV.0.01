import React from 'react';
import { useLosses } from './hooks/useLosses';
import { LossesHeader } from './components/LossesHeader';
import { LossesSearchBar } from './components/LossesSearchBar';
import { LossesProductGrid } from './components/LossesProductGrid';
import { LossReportModal } from './components/LossReportModal';

const LossesPage: React.FC = () => {
    const {
        loading,
        submitting,
        search,
        setSearch,
        selectedProduct,
        showModal,
        scrapQty,
        setScrapQty,
        reason,
        setReason,
        description,
        setDescription,
        source,
        setSource,
        filteredProducts,
        openScrapModal,
        closeModal,
        submitLoss
    } = useLosses();

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <LossesHeader />
                    <div className="w-full md:w-96">
                        <LossesSearchBar value={search} onChange={setSearch} />
                    </div>
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
                    description={description}
                    source={source}
                    submitting={submitting}
                    onQuantityChange={setScrapQty}
                    onReasonChange={setReason}
                    onDescriptionChange={setDescription}
                    onSourceChange={setSource}
                    onClose={closeModal}
                    onSubmit={submitLoss}
                />
            </div>
        </div>
    );
};

export default LossesPage;
