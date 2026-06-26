import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { logCartEvent } from './services/posCartEventService';
import { usePos } from './hooks/usePos';
import { usePosCategories } from './hooks/usePosCategories';
import { useScannerFocus } from './hooks/useScannerFocus';
import { useNetworkStatus } from '../../shared/network/useNetworkStatus';
import { PosHeader } from './components/PosHeader';
import { PosSearchBar } from './components/PosSearchBar';
import { PosProductResults } from './components/PosProductResults';
import { PosCategoryBrowser } from './components/PosCategoryBrowser';
import { PosCart } from './components/PosCart';
import { PosPaymentPanel } from './components/PosPaymentPanel';
import { ShiftOpenModal } from './components/ShiftOpenModal';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { PosLockScreen } from './components/PosLockScreen';
import { PosCartRecoveryDialog } from './components/PosCartRecoveryDialog';
import { OfflineSaleConfirmModal } from './components/OfflineSaleConfirmModal';
import { posService } from './services/posService';
import {
    hasPosCartDraft,
    loadPosCartDraft,
    clearPosCartDraft,
    validateCartItems,
    CartDraftContext,
    PosCartDraft,
} from './services/posCartRecoveryService';
import { useAuth } from '../auth/useAuth';
import { PosProduct } from './types';

const PosPage: React.FC = () => {
    const { currentStoreId, user } = useAuth();
    const { isOnline } = useNetworkStatus();
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
        restoreCartFromDraft,
        isSgrBlocked,
        finalizeSale,
        saveOfflineSale,
        barcodeNotFound,
        setBarcodeNotFound,
        handleBarcodeEnter,
        clearCart,
        productsSubtotal,
        cartSgrTotal,
        cartVatTotal
    } = usePos();

    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Offline sales queue state
    const [isOfflineConfirmOpen, setIsOfflineConfirmOpen] = useState(false);
    const [queuedCount, setQueuedCount] = useState(0);

    const updateOfflineSummary = useCallback(async () => {
        if (window.electronAPI?.sqlite && currentStoreId) {
            try {
                const summary = await window.electronAPI.sqlite.getOfflineSalesSummary({ storeId: currentStoreId });
                setQueuedCount(summary.queuedCount);
            } catch (e) {
                console.error('[PosPage] Failed to load offline sales summary:', e);
            }
        }
    }, [currentStoreId]);

    useEffect(() => {
        updateOfflineSummary();
        const interval = setInterval(updateOfflineSummary, 10000);
        return () => clearInterval(interval);
    }, [updateOfflineSummary]);

    const handleOfflineConfirm = async () => {
        setIsOfflineConfirmOpen(false);
        const res = await saveOfflineSale();
        if (res.success) {
            updateOfflineSummary();
        }
    };

    const handleFinalizeClick = async () => {
        if (isOnline) {
            await finalizeSale();
        } else {
            if (!window.electronAPI?.sqlite) {
                toast.error("SQLite nu este disponibil.");
                return;
            }
            if (cart.length === 0) {
                toast.error("Coșul este gol.");
                return;
            }

            // Client side validations
            const cacheStatus = await window.electronAPI.sqlite.getCacheStatus({ storeId: currentStoreId! });
            if (!cacheStatus || !cacheStatus.initialized || !cacheStatus.lastSyncAt) {
                toast.error("Nu există date offline suficiente pentru această vânzare.");
                return;
            }

            const lastSyncTime = new Date(cacheStatus.lastSyncAt).getTime();
            const ageHrs = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
            if (ageHrs > 48) {
                toast.error("Cache offline expirat. Reconectează aplicația pentru actualizare.");
                return;
            }

            const devInfo = await window.electronAPI.sqlite.getDeviceInfo();
            if (!devInfo || !devInfo.fingerprint) {
                toast.error("Nu s-a putut obține identitatea dispozitivului.");
                return;
            }

            const localShift = await window.electronAPI.sqlite.getShift({ storeId: currentStoreId!, cashierId: user!.id });
            if (!localShift || localShift.status !== 'open') {
                toast.error("Nu există tură activă salvată local. Reconectează aplicația.");
                return;
            }

            const itemIds = cart.map(item => item.productId);
            const validateRes = await window.electronAPI.sqlite.validateCartItems({ storeId: currentStoreId!, itemIds });
            if (!validateRes || !validateRes.valid) {
                if (validateRes && validateRes.reason === 'missing_product') {
                    toast.error("Produsul nu mai există în cache-ul local.");
                } else {
                    toast.error("Nu există date offline suficiente pentru această vânzare.");
                }
                return;
            }

            for (const item of cart) {
                if (item.quantity <= 0) {
                    toast.error("Cantitățile produselor din coș trebuie să fie pozitive.");
                    return;
                }
            }

            setIsOfflineConfirmOpen(true);
        }
    };

    // Cart Recovery State
    const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
    const [recoveryDraft, setRecoveryDraft] = useState<PosCartDraft | null>(null);
    const recoveryCheckedRef = useRef(false);

    // Kiosk active detection state
    const [isKioskActive, setIsKioskActive] = useState(false);

    useEffect(() => {
        const checkKiosk = async () => {
            if (window.electronAPI?.appControls?.getWindowState) {
                const state = await window.electronAPI.appControls.getWindowState();
                setIsKioskActive(!!state.isKiosk);
            }
        };
        checkKiosk();
        const interval = setInterval(checkKiosk, 2000);
        return () => clearInterval(interval);
    }, []);

    // Toate produsele pentru browser categorii
    const [allProducts, setAllProducts] = useState<PosProduct[]>([]);
    const [loadingAllProducts, setLoadingAllProducts] = useState(false);

    const loadAllProducts = useCallback(async () => {
        if (!currentStoreId) return;
        setLoadingAllProducts(true);
        try {
            const isDesktop = !!window.electronAPI;
            if (isDesktop && !isOnline && window.electronAPI?.sqlite?.getAllProducts) {
                console.log("[PosPage] Offline mode: loading all products from SQLite cache");
                const prods = await window.electronAPI.sqlite.getAllProducts({ storeId: currentStoreId });
                setAllProducts(prods);
            } else {
                const prods = await posService.listAllProducts(currentStoreId);
                setAllProducts(prods);
            }
        } catch (err) {
            console.error('PosPage.loadAllProducts error:', err);
        } finally {
            setLoadingAllProducts(false);
        }
    }, [currentStoreId, isOnline]);

    useEffect(() => {
        loadAllProducts();
    }, [loadAllProducts]);

    // Check for saved cart draft on POS entry
    useEffect(() => {
        if (recoveryCheckedRef.current) return;
        if (!currentStoreId || !user?.id) return;
        if (loadingAllProducts) return; // Wait until catalog products are loaded

        const ctx: CartDraftContext = {
            storeId: currentStoreId,
            profileId: user.id,
        };

        if (hasPosCartDraft(ctx) && cart.length === 0) {
            const draft = loadPosCartDraft(ctx);
            if (draft && draft.items.length > 0) {
                setRecoveryDraft(draft);
                setShowRecoveryDialog(true);
            }
        }
        recoveryCheckedRef.current = true;
    }, [currentStoreId, user?.id, cart.length, loadingAllProducts]);

    const handleRestoreCart = useCallback(() => {
        if (!recoveryDraft) return;

        // Validate items against current products
        const { validItems, invalidCount, recalculated } = validateCartItems(
            recoveryDraft.items,
            allProducts.map(p => ({
                id: p.id,
                name: p.name,
                priceSale: p.priceSale,
                stockMagazin: p.stockMagazin,
                sgrEnabled: p.sgrEnabled,
                sgrType: p.sgrType,
                status: 'active',
            }))
        );

        if (validItems.length > 0) {
            restoreCartFromDraft(validItems);
            toast.success(`Coșul a fost restaurat cu ${validItems.length} produse.`);
        }

        if (invalidCount > 0) {
            toast.error(`${invalidCount} produse din coșul salvat nu mai sunt disponibile și nu au fost restaurate.`);
        }

        if (recalculated) {
            toast('Unele produse au fost recalculate pe baza datelor curente.', { icon: 'ℹ️' });
        }

        if (validItems.length === 0) {
            toast.error('Niciun produs din coșul salvat nu mai este disponibil.');
        }

        // Clear draft after restore attempt
        if (currentStoreId && user?.id) {
            clearPosCartDraft({ storeId: currentStoreId, profileId: user.id });
        }

        setShowRecoveryDialog(false);
        setRecoveryDraft(null);
    }, [recoveryDraft, allProducts, restoreCartFromDraft, currentStoreId, user?.id]);

    const handleDiscardDraft = useCallback(() => {
        if (recoveryDraft && currentStoreId && user?.id) {
            logCartEvent({
                storeId: currentStoreId,
                cashierProfileId: user.id,
                eventType: 'cart_discarded',
                quantityBefore: recoveryDraft.items.reduce((acc, i) => acc + i.quantity, 0),
                quantityAfter: 0
            });
        }
        if (currentStoreId && user?.id) {
            clearPosCartDraft({ storeId: currentStoreId, profileId: user.id });
        }
        toast.success('Coșul salvat a fost șters.');
        setShowRecoveryDialog(false);
        setRecoveryDraft(null);
    }, [recoveryDraft, currentStoreId, user?.id]);

    const handleDraftLater = useCallback(() => {
        setShowRecoveryDialog(false);
    }, []);

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

    // Scanner Focus Mode: auto-focus management with modal protection
    const { isScannerReady } = useScannerFocus(inputRef, {
        isModalOpen: isOpenModalOpen || isCloseModalOpen || showRecoveryDialog,
        enabled: !!activeShift && !shiftLoading,
        refocusDelay: 200
    });

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

            const found = await handleBarcodeEnter(val);
            if (!found && searchResults.length > 0) {
                addToCart(searchResults[0]);
            }
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else if (e.key === 'Escape') {
            setQuery('');
            setBarcodeNotFound(null);
        }
    };

    // Dacă query e gol, afișăm browser; altfel rezultatele de căutare
    const showBrowser = !query.trim();

    return (
        <div data-testid="pos-layout-root" className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
            {/* Cart Recovery Dialog */}
            {showRecoveryDialog && recoveryDraft && (
                <PosCartRecoveryDialog
                    draft={recoveryDraft}
                    onRestore={handleRestoreCart}
                    onDiscard={handleDiscardDraft}
                    onLater={handleDraftLater}
                />
            )}

            {/* Offline Sale Confirm Dialog */}
            <OfflineSaleConfirmModal
                isOpen={isOfflineConfirmOpen}
                onClose={() => setIsOfflineConfirmOpen(false)}
                onConfirm={handleOfflineConfirm}
            />

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
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                {isKioskActive && (
                    <span 
                        data-testid="pos-kiosk-active-indicator" 
                        className="px-3 py-1.5 bg-rose-600 border border-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md animate-pulse"
                    >
                        🔒 Kiosk Activ
                    </span>
                )}
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
                {!isOnline && (
                    <div data-testid="pos-offline-cache-badge" className="mb-4 p-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-300">
                        <span>⚠️ Mod Offline Activ. Vânzările sunt salvate local.</span>
                    </div>
                )}

                {queuedCount > 0 && (
                    <div 
                        data-testid="pos-offline-queued-badge" 
                        className="mb-4 p-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-amber-100 animate-in slide-in-from-top duration-300"
                    >
                        <span>📦 Vânzări offline în așteptare: {queuedCount}</span>
                    </div>
                )}

                <PosHeader
                    isOnline={isOnline}
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
                    isScannerReady={isScannerReady}
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
                            searchTerm={query}
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
                    productsSubtotal={productsSubtotal}
                    sgrTotal={cartSgrTotal}
                    vatTotal={cartVatTotal}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    cashAmount={cashAmount}
                    onCashAmountChange={setCashAmount}
                    cardAmount={cardAmount}
                    onCardAmountChange={setCardAmount}
                    onCashBlur={onCashBlur}
                    onCardBlur={onCardBlur}
                    onFinalize={handleFinalizeClick}
                    onClearCart={clearCart}
                    loading={submitting}
                    disabled={cart.length === 0 || !activeShift || isSgrBlocked}
                />
            </div>
        </div>
    );
};

export default PosPage;
