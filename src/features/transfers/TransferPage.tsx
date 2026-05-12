import React from 'react';
import { useTransfer } from './hooks/useTransfer';
import { TransferHeader } from './components/TransferHeader';
import { TransferProductSelector } from './components/TransferProductSelector';
import { TransferDirectionSelector } from './components/TransferDirectionSelector';
import { TransferQuantityForm } from './components/TransferQuantityForm';
import { TransferStockStatusCard } from './components/TransferStockStatusCard';

export const TransferPage = () => {
    const {
        search, setSearch,
        filteredProducts,
        selectedProductId, setSelectedProductId,
        selectedProduct,
        quantity, setQuantity,
        direction, setDirection,
        submitting, submitTransfer
    } = useTransfer();

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <TransferHeader />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <TransferProductSelector
                            search={search}
                            setSearch={setSearch}
                            filteredProducts={filteredProducts}
                            onSelect={setSelectedProductId}
                            selectedProduct={selectedProduct}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <TransferDirectionSelector
                                direction={direction}
                                setDirection={setDirection}
                            />
                            <TransferQuantityForm
                                quantity={quantity}
                                setQuantity={setQuantity}
                                onSubmit={submitTransfer}
                                submitting={submitting}
                                disabled={!selectedProductId}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <TransferStockStatusCard product={selectedProduct} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferPage;
