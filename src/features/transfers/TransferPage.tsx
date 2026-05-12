import React from 'react';
import { useTransfer } from './hooks/useTransfer';
import { TransferHeader } from './components/TransferHeader';
import { TransferProductSelector } from './components/TransferProductSelector';
import { TransferDirectionSelector } from './components/TransferDirectionSelector';
import { TransferQuantityForm } from './components/TransferQuantityForm';
import { TransferStockStatusCard } from './components/TransferStockStatusCard';
import { Loader } from 'lucide-react';

const TransferPage: React.FC = () => {
    const {
        products,
        loading,
        selectedProductId,
        selectedProduct,
        quantity,
        direction,
        submitting,
        setSelectedProductId,
        setQuantity,
        setDirection,
        submitTransfer
    } = useTransfer();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-500 gap-2">
                <Loader className="animate-spin" /> Se încarcă stocurile...
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <TransferHeader />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- INPUT CARD (LEFT) --- */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 h-fit">
                    <TransferProductSelector 
                        products={products} 
                        selectedProductId={selectedProductId} 
                        onChange={setSelectedProductId} 
                    />

                    <TransferDirectionSelector 
                        direction={direction} 
                        onChange={setDirection} 
                    />

                    <TransferQuantityForm 
                        quantity={quantity} 
                        onQuantityChange={setQuantity} 
                        onSubmit={submitTransfer} 
                        submitting={submitting} 
                        disabled={!selectedProduct} 
                    />
                </div>

                {/* --- INFO CARD (RIGHT) --- */}
                <TransferStockStatusCard 
                    product={selectedProduct} 
                    direction={direction} 
                />
            </div>
        </div>
    );
};

export default TransferPage;
