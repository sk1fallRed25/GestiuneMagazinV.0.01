import React from 'react';
import { useReception } from './hooks/useReception';
import { ReceptionHeader } from './components/ReceptionHeader';
import { ReceptionDocumentForm } from './components/ReceptionDocumentForm';
import { ReceptionProductPicker } from './components/ReceptionProductPicker';
import { ReceptionItemsTable } from './components/ReceptionItemsTable';
import { ReceptionSummaryCard } from './components/ReceptionSummaryCard';

export const ReceptionPage = () => {
    const {
        document, setDocument,
        search, setSearch,
        filteredProducts,
        selectedProduct, selectProduct,
        isBax, setIsBax,
        quantityInput, setQuantityInput,
        bucatiPerBax, setBucatiPerBax,
        totalValueInput, setTotalValueInput,
        adaos, setAdaos,
        vatPercent, setVatPercent,
        batchNumber, setBatchNumber,
        expiryDate, setExpiryDate,
        lines, removeLine,
        submitting, submitReception,
        xmlStatus, parseXMLInvoice,
        loadingProducts,
        calculations,
        addLine
    } = useReception();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseXMLInvoice(text);
        };
        reader.readAsText(file);
    };

    const totalReceptionValue = lines.reduce((acc, l) => acc + (l.quantity * l.purchasePrice), 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <ReceptionHeader onFileUpload={handleFileUpload} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-1">
                        <ReceptionDocumentForm
                            document={document}
                            setDocument={setDocument}
                            xmlStatus={xmlStatus}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <ReceptionProductPicker
                            search={search}
                            setSearch={setSearch}
                            filteredProducts={filteredProducts}
                            onSelect={selectProduct}
                            selectedProduct={selectedProduct}
                            isBax={isBax}
                            setIsBax={setIsBax}
                            quantity={quantityInput}
                            setQuantity={setQuantityInput}
                            bucatiPerBax={bucatiPerBax}
                            setBucatiPerBax={setBucatiPerBax}
                            totalValue={totalValueInput}
                            setTotalValue={setTotalValueInput}
                            adaos={adaos}
                            setAdaos={setAdaos}
                            onAddLine={addLine}
                            calculations={calculations}
                            batchNumber={batchNumber}
                            setBatchNumber={setBatchNumber}
                            expiryDate={expiryDate}
                            setExpiryDate={setExpiryDate}
                        />
                    </div>
                </div>

                <div className="mb-12">
                    <ReceptionItemsTable
                        lines={lines}
                        onRemove={removeLine}
                    />
                </div>

                {lines.length > 0 && (
                    <ReceptionSummaryCard
                        totalValue={totalReceptionValue}
                        submitting={submitting}
                        onSave={submitReception}
                        disabled={!document.documentNumber}
                    />
                )}
            </div>
        </div>
    );
};
