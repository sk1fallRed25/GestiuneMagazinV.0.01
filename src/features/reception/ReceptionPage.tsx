import React, { useState } from 'react';
import { useReception } from './hooks/useReception';
import { useAuth } from '../auth/useAuth';
import { ReceptionHeader } from './components/ReceptionHeader';
import { ReceptionDocumentForm } from './components/ReceptionDocumentForm';
import { ReceptionProductPicker } from './components/ReceptionProductPicker';
import { ReceptionItemsTable } from './components/ReceptionItemsTable';
import { ReceptionSummaryCard } from './components/ReceptionSummaryCard';
import { ReceptionHistory } from './components/ReceptionHistory';
import { ReceptionDetail } from './components/ReceptionDetail';
import { AlertCircle, PlusCircle, Check } from 'lucide-react';

export const ReceptionPage = () => {
    const { currentStoreName } = useAuth();
    const {
        view, setView,
        activeDraftId,
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
        submitting, confirmReception,
        savingDraft, saveCurrentDraft,
        cancelActiveDraft,
        startNewReception,
        editDraft,
        viewDetails,
        receptionsHistory,
        loadingHistory,
        historyFilters, setHistoryFilters,
        selectedReceptionDetails,
        loadingDetails,
        xmlStatus, parseXMLInvoice,
        calculations,
        addLine
    } = useReception();

    const [showConfirmModal, setShowConfirmModal] = useState(false);

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

    const triggerConfirm = () => {
        setShowConfirmModal(true);
    };

    const handleExecuteConfirm = async () => {
        setShowConfirmModal(false);
        await confirmReception();
    };

    return (
        <div data-testid="reception-page" className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* Header */}
                <ReceptionHeader 
                    view={view}
                    setView={setView}
                    onNewReception={startNewReception}
                    onFileUpload={handleFileUpload}
                    storeName={currentStoreName || undefined}
                />

                {/* View Switching */}
                {view === 'form' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Draft indicator */}
                        {activeDraftId && (
                            <div className="p-4 bg-indigo-50/70 border border-indigo-150 rounded-2xl flex items-center justify-between gap-4 text-indigo-900 text-xs font-bold shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span data-testid="reception-status-draft" className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase">
                                        Draft Edit
                                    </span>
                                    <span>Modifici acum schița salvată cu numărul: {document.documentNumber}</span>
                                </div>
                                <button
                                    onClick={startNewReception}
                                    className="text-[10px] uppercase font-black tracking-widest text-indigo-500 hover:text-indigo-800 transition"
                                >
                                    Renunță / Nouă
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

                        <div>
                            <ReceptionItemsTable
                                lines={lines}
                                onRemove={removeLine}
                            />
                        </div>

                        {lines.length > 0 && (
                            <ReceptionSummaryCard
                                totalValue={totalReceptionValue}
                                submitting={submitting}
                                savingDraft={savingDraft}
                                onSaveDraft={() => saveCurrentDraft(false)}
                                onConfirm={triggerConfirm}
                                onCancel={activeDraftId ? cancelActiveDraft : undefined}
                                hasActiveDraft={!!activeDraftId}
                                disabled={!document.documentNumber}
                            />
                        )}
                    </div>
                )}

                {view === 'history' && (
                    <ReceptionHistory
                        receptions={receptionsHistory}
                        loading={loadingHistory}
                        filters={historyFilters}
                        onFilterChange={setHistoryFilters}
                        onViewDetails={viewDetails}
                    />
                )}

                {view === 'detail' && (
                    <ReceptionDetail
                        reception={selectedReceptionDetails}
                        onBack={() => setView('history')}
                        onEdit={editDraft}
                        onConfirm={triggerConfirm}
                        onCancel={cancelActiveDraft}
                        submitting={submitting}
                    />
                )}
            </div>

            {/* Custom Confirm Modal E2E Compliant */}
            {showConfirmModal && (
                <div data-testid="reception-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-2xl max-w-md w-full mx-4 space-y-6 animate-scale-in">
                        <div className="flex items-center gap-3 text-amber-500">
                            <AlertCircle size={28} />
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Confirmare Document</h3>
                        </div>
                        <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                            Sigur dorești să finalizezi recepția facturii <span className="font-bold text-slate-800">"{document.documentNumber}"</span>? Această acțiune va genera intrări în stoc și NIR-ul aferent și este complet ireversibilă.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wide transition active:scale-95 cursor-pointer"
                            >
                                Renunță
                            </button>
                            <button
                                onClick={handleExecuteConfirm}
                                disabled={submitting}
                                className="px-6 py-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-bold rounded-xl text-xs uppercase tracking-wide transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                                <Check size={14} />
                                {submitting ? 'Confirmare...' : 'Confirmă recepția'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceptionPage;
