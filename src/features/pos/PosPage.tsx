import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { usePos } from './hooks/usePos';
import { usePosCategories } from './hooks/usePosCategories';
import { PosHeader } from './components/PosHeader';
import { PosSearchBar } from './components/PosSearchBar';
import { PosProductResults } from './components/PosProductResults';
import { PosCategoryBrowser } from './components/PosCategoryBrowser';
import { PosCart } from './components/PosCart';
import { PosPaymentPanel } from './components/PosPaymentPanel';
import { ShiftOpenModal } from './components/ShiftOpenModal';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { PosLockScreen } from './components/PosLockScreen';
import { posService } from './services/posService';
import { useAuth } from '../auth/useAuth';
import { PosProduct } from './types';

const PosPage: React.FC = () => {
    const { currentStoreId } = useAuth();
    const {
        query,
        setQuery,
        searchResults,
        cart,
        loadingSearch,
        submitting,
        paymentMethod,
        setPaymentMethod,
        cashAmount,
        setCashAmount,
        cardAmount,
        setCardAmount,
        onCashBlur,
        onCardBlur,
        totalBon,
        activeShift,
        cashRegisters,
        shiftLoading,
        shiftError,
        handleOpenShift,
        handleCloseShift,
        handleCancelShift,
        addToCart,
        removeFromCart,
        updateQuantity,
        isSgrBlocked,
        finalizeSale,
        barcodeNotFound,
        setBarcodeNotFound,
        handleBarcodeEnter
    } = usePos();

    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Toate produsele pentru browser categorii
    const [allProducts, setAllProducts] = useState<PosProduct[]>([]);
    const [loadingAllProducts, setLoadingAllProducts] = useState(false);

    const loadAllProducts = useCallback(async () => {
        if (!currentStoreId) return;
        setLoadingAllProducts(true);
        try {
            const prods = await posService.listAllProducts(currentStoreId);
            setAllProducts(prods);
        } catch (err) {
            console.error('PosPage.loadAllProducts error:', err);
        } finally {
            setLoadingAllProducts(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        loadAllProducts();
    }, [loadAllProducts]);

    // Hook categorii pentru browser
    const {
        categoriesTree,
        activeSubcategories,
        browseProducts,
        activeCategoryId,
        activeSubcategoryId,
        loadingCategories,
        selectCategory,
        selectSubcategory,
        resetBrowse
    } = usePosCategories({ storeId: currentStoreId, allProducts });

    const inputRef = useRef<HTMLInputElement>(null);

    // Când userul tastează, resetăm browse-ul
    const handleQueryChange = (q: string) => {
        setQuery(q);
        if (q && activeCategoryId) {
            resetBrowse();
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = query.trim();
            if (!val) return;

            await handleBarcodeEnter(val);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    };

    // Dacă query e gol, afișăm browser; altfel rezultatele de căutare
    const showBrowser = !query.trim();

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
            {/* Ecran de blocare obligatoriu cand nu exista tura activa */}
            {!activeShift && !shiftLoading && (
                <PosLockScreen
                    onOpenShiftClick={() => setIsOpenModalOpen(true)}
                    loading={shiftLoading}
                />
            )}

            {/* Modale Ture */}
            <ShiftOpenModal
                isOpen={isOpenModalOpen}
                onClose={() => setIsOpenModalOpen(false)}
                onOpenShift={handleOpenShift}
                cashRegisters={cashRegisters}
                loading={shiftLoading}
            />

            <ShiftCloseModal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
                onCloseShift={handleCloseShift}
                activeShift={activeShift}
                loading={shiftLoading}
            />

            {/* Buton Ieșire Global (z-50 pentru a fi accesibil si peste lock screen) */}
            <div className="absolute top-6 right-6 z-50">
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl shadow-lg border border-slate-700 transition-all transform hover:scale-105 active:scale-95 text-sm font-bold"
                    title="Ieșire spre Dashboard"
                >
                    <LogOut size={18} className="text-rose-400" />
                    <span>Ieșire POS</span>
                </Link>
            </div>

            {/* --- STANGA: CATALOG --- */}
            <div className="w-3/5 p-6 flex flex-col gap-2 pt-20 md:pt-6">
                <PosHeader
                    isOnline={navigator.onLine}
                    syncStatus={shiftLoading ? "Verificare tură..." : (loadingSearch ? "Căutare în curs..." : "Sistem Pregătit (v2)")}
                    loading={loadingSearch || shiftLoading}
                    activeShift={activeShift}
                    onOpenClick={() => setIsOpenModalOpen(true)}
                    onCloseClick={() => setIsCloseModalOpen(true)}
                    onCancelClick={() => handleCancelShift()}
                    shiftLoading={shiftLoading}
                />

                <PosSearchBar
                    ref={inputRef}
                    query={query}
                    onQueryChange={handleQueryChange}
                    onKeyDown={handleKeyDown}
                />

                {barcodeNotFound && (
                    <div 
                        data-testid="pos-barcode-not-found"
                        className="mb-6 p-4 bg-rose-50 border-2 border-rose-200/50 rounded-xl text-rose-800 font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"
                    >
                        <span className="text-xl">⚠️</span>
                        <div>
                            Produsul cu codul <span className="font-bold font-mono bg-rose-100/50 px-1.5 py-0.5 rounded border border-rose-200">{barcodeNotFound}</span> nu există.
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2">
                    {showBrowser ? (
                        <PosCategoryBrowser
                            categoriesTree={categoriesTree}
                            activeSubcategories={activeSubcategories}
                            browseProducts={browseProducts}
                            activeCategoryId={activeCategoryId}
                            activeSubcategoryId={activeSubcategoryId}
                            loadingCategories={loadingCategories || loadingAllProducts}
                            onSelectCategory={selectCategory}
                            onSelectSubcategory={selectSubcategory}
                            onSelectProduct={addToCart}
                        />
                    ) : (
                        <PosProductResults
                            products={searchResults}
                            onProductSelect={addToCart}
                        />
                    )}
                </div>
            </div>

            {/* --- DREAPTA: BON --- */}
            <div className="w-2/5 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10 relative pt-20 md:pt-0">
                <div className="flex-1 overflow-hidden flex flex-col pt-6 md:pt-0">
                    <PosCart
                        items={cart}
                        onUpdateQuantity={updateQuantity}
                        onRemoveItem={removeFromCart}
                    />
                </div>

                {isSgrBlocked && (
                    <div
                        className="bg-amber-50 border-y border-amber-200 p-4 text-xs text-amber-800 flex flex-col gap-1 animate-in fade-in duration-300"
                        data-testid="pos-sgr-preflight-banner"
                    >
                        <div className="font-bold flex items-center gap-1.5">
                            ⚠️ Preflight Guard SGR Activat
                        </div>
                        <div>
                            Sistemul de Garanție SGR este configurat în POS, însă finalizarea checkout-ului cu produse SGR va fi activată după actualizarea backend-ului (Etapa 6D.6.6).
                        </div>
                    </div>
                )}

                <PosPaymentPanel
                    total={totalBon}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    cashAmount={cashAmount}
                    onCashAmountChange={setCashAmount}
                    cardAmount={cardAmount}
                    onCardAmountChange={setCardAmount}
                    onCashBlur={onCashBlur}
                    onCardBlur={onCardBlur}
                    onFinalize={finalizeSale}
                    loading={submitting}
                    disabled={cart.length === 0 || !activeShift || isSgrBlocked}
                />
            </div>
        </div>
    );
};

export default PosPage;
