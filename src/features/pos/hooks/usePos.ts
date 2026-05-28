import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { posService } from '../services/posService';
import { PosProduct, CartItem, PaymentMethod, ActiveShift, CashRegister } from '../types';
import { tryWriteFiscalNetAfterCheckout, isFiscalNetDesktopRuntime } from '../../fiscal-net';


export const usePos = () => {
    const { user, currentStoreId } = useAuth();
    
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [cashAmount, setCashAmount] = useState<string>('0.00');
    const [cardAmount, setCardAmount] = useState<string>('0.00');
    const [lastEditedMixedField, setLastEditedMixedField] = useState<'cash' | 'card' | null>(null);

    // Shift Management State
    const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [shiftLoading, setShiftLoading] = useState(false);
    const [shiftError, setShiftError] = useState<string | null>(null);

    const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Operațiunea nu a putut fi finalizată.';

    // Încărcare date tură și case de marcat
    const loadShiftData = useCallback(async () => {
        if (!currentStoreId || !user) {
            setActiveShift(null);
            setCashRegisters([]);
            return;
        }

        setShiftLoading(true);
        setShiftError(null);
        try {
            const [shift, registers] = await Promise.all([
                posService.getActiveShift(currentStoreId, user.id),
                posService.listCashRegisters(currentStoreId)
            ]);
            setActiveShift(shift);
            setCashRegisters(registers);
        } catch (err: unknown) {
            console.error("loadShiftData error:", err);
            setShiftError(getErrorMessage(err));
        } finally {
            setShiftLoading(false);
        }
    }, [currentStoreId, user]);

    useEffect(() => {
        loadShiftData();
    }, [loadShiftData]);

    // Căutare produse
    const search = useCallback(async (q: string) => {
        if (!currentStoreId) return;
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }

        setLoadingSearch(true);
        try {
            const results = await posService.searchProducts(currentStoreId, q);
            setSearchResults(results);
        } catch (err: unknown) {
            console.error("Search error:", err);
        } finally {
            setLoadingSearch(false);
        }
    }, [currentStoreId]);

    // Debounce manual simplu pentru căutare
    useEffect(() => {
        const timer = setTimeout(() => {
            search(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    // Adăugare în coș
    const addToCart = (product: PosProduct) => {
        if (product.stockMagazin <= 0) {
            toast.error("Stoc epuizat la raft!");
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                if (existing.quantity + 1 > product.stockMagazin) {
                    toast.error(`Stoc insuficient! Maxim disponibil: ${product.stockMagazin}`);
                    return prev;
                }
                return prev.map(item => 
                    item.productId === product.id 
                        ? { 
                            ...item, 
                            quantity: item.quantity + 1, 
                            total: (item.quantity + 1) * item.price,
                            sgrTotalAmount: item.sgrEnabled ? (item.quantity + 1) * 0.50 : 0
                          } 
                        : item
                );
            }
            
            const newItem: CartItem = {
                productId: product.id,
                name: product.name,
                barcode: product.barcode,
                unit: product.unit,
                price: product.priceSale,
                vatPercent: product.vatPercent,
                quantity: 1,
                stockAvailable: product.stockMagazin,
                total: product.priceSale,
                sgrEnabled: product.sgrEnabled,
                sgrType: product.sgrType,
                sgrDepositAmount: product.sgrEnabled ? 0.50 : 0,
                sgrTotalAmount: product.sgrEnabled ? 0.50 : 0
            };
            return [...prev, newItem];
        });
        
        setQuery('');
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId: string, qty: number) => {
        if (isNaN(qty) || qty <= 0) return;
        
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                if (qty > item.stockAvailable) {
                    toast.error(`Stoc insuficient! Maxim disponibil: ${item.stockAvailable}`);
                    return item;
                }
                return { 
                    ...item, 
                    quantity: qty, 
                    total: qty * item.price,
                    sgrTotalAmount: item.sgrEnabled ? qty * 0.50 : 0
                };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCart([]);
        setCashAmount('0.00');
        setCardAmount('0.00');
        setPaymentMethod('cash');
        setLastEditedMixedField(null);
    };

    const SGR_CHECKOUT_BACKEND_ENABLED = typeof window !== 'undefined' && (window as any).SGR_CHECKOUT_BACKEND_ENABLED !== undefined
        ? (window as any).SGR_CHECKOUT_BACKEND_ENABLED
        : true;

    const calculateSgrLineAmount = useCallback((item: CartItem): number => {
        return item.sgrEnabled ? item.quantity * 0.50 : 0;
    }, []);

    const calculateCartProductsTotal = useCallback((items: CartItem[]): number => {
        return items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    }, []);

    const calculateCartSgrTotal = useCallback((items: CartItem[]): number => {
        return items.reduce((acc, item) => acc + (item.sgrEnabled ? item.quantity * 0.50 : 0), 0);
    }, []);

    const calculateCartGrandTotal = useCallback((items: CartItem[]): number => {
        return calculateCartProductsTotal(items) + calculateCartSgrTotal(items);
    }, [calculateCartProductsTotal, calculateCartSgrTotal]);

    const totalBon = useMemo(() => {
        return calculateCartGrandTotal(cart);
    }, [cart, calculateCartGrandTotal]);

    const productsSubtotal = useMemo(() => {
        return calculateCartProductsTotal(cart);
    }, [cart, calculateCartProductsTotal]);

    const cartSgrTotal = useMemo(() => {
        return calculateCartSgrTotal(cart);
    }, [cart, calculateCartSgrTotal]);

    const isSgrBlocked = useMemo(() => {
        return cartSgrTotal > 0 && !SGR_CHECKOUT_BACKEND_ENABLED;
    }, [cartSgrTotal]);

    // Operațiuni Ture
    const handleOpenShift = async (cashRegisterId: string | null, openingCash: number, notes?: string) => {
        if (!currentStoreId || !user) return false;
        setShiftLoading(true);
        setShiftError(null);
        try {
            await posService.openShift({
                storeId: currentStoreId,
                profileId: user.id,
                cashRegisterId,
                openingCash,
                notes
            });
            toast.success("Tura a fost deschisă cu succes!");
            await loadShiftData();
            return true;
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
            setShiftError(getErrorMessage(err));
            return false;
        } finally {
            setShiftLoading(false);
        }
    };

    const handleCloseShift = async (declaredCash: number, closingNotes?: string) => {
        if (!currentStoreId || !user || !activeShift) return null;
        setShiftLoading(true);
        setShiftError(null);
        try {
            const result = await posService.closeShift({
                storeId: currentStoreId,
                profileId: user.id,
                shiftId: activeShift.shiftId,
                declaredCash,
                closingNotes
            });
            toast.success("Tura a fost închisă cu succes!");
            await loadShiftData();
            return result;
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
            setShiftError(getErrorMessage(err));
            return null;
        } finally {
            setShiftLoading(false);
        }
    };

    const handleCancelShift = async (notes?: string) => {
        if (!currentStoreId || !user || !activeShift) return false;
        if (!window.confirm("Ești sigur că vrei să anulezi această tură? (Doar dacă a fost deschisă din greșeală și nu are tranzacții)")) {
            return false;
        }
        setShiftLoading(true);
        setShiftError(null);
        try {
            await posService.cancelShift(currentStoreId, user.id, activeShift.shiftId, notes);
            toast.success("Tura a fost anulată!");
            await loadShiftData();
            return true;
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
            setShiftError(getErrorMessage(err));
            return false;
        } finally {
            setShiftLoading(false);
        }
    };

    // Calcule monetare
    const roundMoney = (value: number): number =>
        Math.round((value + Number.EPSILON) * 100) / 100;

    const parseMoneyInput = (value: string | number): number => {
        if (typeof value === 'number') return value;
        const normalized = value.replace(',', '.');
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const handleMixedCashChange = (rawValue: string) => {
        setCashAmount(rawValue);
        setLastEditedMixedField('cash');

        const total = roundMoney(totalBon);
        const cash = parseMoneyInput(rawValue);
        const cappedCash = roundMoney(Math.min(Math.max(cash, 0), total));
        
        if (cash > total || cash < 0) {
            setCashAmount(cappedCash.toFixed(2));
        }

        const card = roundMoney(total - cappedCash);
        setCardAmount(card.toFixed(2));
    };

    const handleMixedCardChange = (rawValue: string) => {
        setCardAmount(rawValue);
        setLastEditedMixedField('card');

        const total = roundMoney(totalBon);
        const card = parseMoneyInput(rawValue);
        const cappedCard = roundMoney(Math.min(Math.max(card, 0), total));

        if (card > total || card < 0) {
            setCardAmount(cappedCard.toFixed(2));
        }

        const cash = roundMoney(total - cappedCard);
        setCashAmount(cash.toFixed(2));
    };

    const handleMixedCashBlur = () => {
        const total = roundMoney(totalBon);
        const cashNum = parseMoneyInput(cashAmount);
        const cappedCash = roundMoney(Math.min(Math.max(cashNum, 0), total));
        setCashAmount(cappedCash.toFixed(2));
        setCardAmount(roundMoney(total - cappedCash).toFixed(2));
    };

    const handleMixedCardBlur = () => {
        const total = roundMoney(totalBon);
        const cardNum = parseMoneyInput(cardAmount);
        const cappedCard = roundMoney(Math.min(Math.max(cardNum, 0), total));
        setCardAmount(cappedCard.toFixed(2));
        setCashAmount(roundMoney(total - cappedCard).toFixed(2));
    };

    const handlePaymentMethodChange = (method: PaymentMethod) => {
        setPaymentMethod(method);
        if (method === 'mixed') {
            const total = roundMoney(totalBon);
            setCashAmount(total.toFixed(2));
            setCardAmount('0.00');
            setLastEditedMixedField('cash');
        }
    };

    // Auto-balance if totalBon changes
    useEffect(() => {
        if (paymentMethod === 'mixed') {
            const total = roundMoney(totalBon);
            if (lastEditedMixedField === 'cash') {
                const cashNum = parseMoneyInput(cashAmount);
                const cappedCash = roundMoney(Math.min(cashNum, total));
                const card = roundMoney(total - cappedCash);
                
                if (Math.abs(cashNum - cappedCash) > 0.001 || cashAmount === '') {
                    setCashAmount(cappedCash.toFixed(2));
                }
                setCardAmount(card.toFixed(2));
            } else if (lastEditedMixedField === 'card') {
                const cardNum = parseMoneyInput(cardAmount);
                const cappedCard = roundMoney(Math.min(cardNum, total));
                const cash = roundMoney(total - cappedCard);
                
                if (Math.abs(cardNum - cappedCard) > 0.001 || cardAmount === '') {
                    setCardAmount(cappedCard.toFixed(2));
                }
                setCashAmount(cash.toFixed(2));
            } else {
                setCashAmount(total.toFixed(2));
                setCardAmount('0.00');
                setLastEditedMixedField('cash');
            }
        }
    }, [totalBon, paymentMethod]);

    // Finalizare vânzare
    const finalizeSale = async () => {
        if (!currentStoreId || !user) {
            toast.error("Sesiune invalidă.");
            return;
        }
        if (!activeShift) {
            toast.error("O tură activă este obligatorie pentru a finaliza vânzarea. Deschide tura înainte de a vinde.");
            return;
        }
        if (cart.length === 0) {
            toast.error("Coșul este gol.");
            return;
        }
        if (isSgrBlocked) {
            toast.error("Garanția SGR este activă în coș. Checkout-ul pentru produse cu SGR este blocat temporar până la actualizarea backend-ului (Rollout Preflight Guard).");
            return;
        }
        if (totalBon <= 0) {
            toast.error("Totalul bonului trebuie să fie pozitiv.");
            return;
        }

        // Validare plăți mixte în frontend
        if (paymentMethod === 'mixed') {
            const cashNum = parseMoneyInput(cashAmount);
            const cardNum = parseMoneyInput(cardAmount);
            if (cashNum < 0 || cardNum < 0) {
                toast.error("Sumele de plată nu pot fi negative.");
                return;
            }
            if (roundMoney(cashNum + cardNum) !== roundMoney(totalBon)) {
                toast.error("Suma cash + card trebuie să fie egală cu totalul de plată.");
                return;
            }
        }

        const methodStr = paymentMethod === 'cash' ? 'cash' : (paymentMethod === 'card' ? 'card' : 'mixt');
        const confirmMsg = `Finalizezi vânzarea în valoare de ${totalBon.toFixed(2)} lei? (Metodă: ${methodStr})`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setSubmitting(true);
        try {
            const saleId = await posService.createSale({
                storeId: currentStoreId,
                profileId: user.id,
                items: cart,
                paymentMethod,
                cashAmount: paymentMethod === 'mixed' ? parseMoneyInput(cashAmount) : (paymentMethod === 'cash' ? totalBon : 0),
                cardAmount: paymentMethod === 'mixed' ? parseMoneyInput(cardAmount) : (paymentMethod === 'card' ? totalBon : 0),
                shiftId: activeShift.shiftId
            });

            // Post-checkout FiscalNet Print
            try {
                const printResult = await tryWriteFiscalNetAfterCheckout({
                    saleId,
                    storeId: currentStoreId
                });
                
                if (printResult.success) {
                    toast.success("Vânzarea a fost înregistrată și fișierul FiscalNet a fost scris în Bonuri.");
                } else if (printResult.skipped) {
                    if (!isFiscalNetDesktopRuntime()) {
                        toast.success("Vânzarea a fost înregistrată. Scrierea FiscalNet este disponibilă doar în aplicația desktop.");
                    } else {
                        toast.success("Vânzarea a fost înregistrată. FiscalNet nu este configurat pe această stație. Bonul poate fi exportat ulterior din Istoric Vânzări.");
                    }
                } else {
                    toast.error("Vânzarea a fost înregistrată, dar fișierul FiscalNet nu a fost scris. Reîncearcă din Istoric Vânzări.");
                }
            } catch (printErr: any) {
                console.error("Eroare post-checkout FiscalNet:", printErr);
                toast.error("Vânzarea a fost înregistrată, dar fișierul FiscalNet nu a fost scris. Reîncearcă din Istoric Vânzări.");
            }

            clearCart();
            setQuery('');
            setSearchResults([]);
            await loadShiftData(); // Actualizează totalurile turei
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return {
        query,
        setQuery,
        searchResults,
        cart,
        loadingSearch,
        submitting,
        paymentMethod,
        setPaymentMethod: handlePaymentMethodChange,
        cashAmount,
        setCashAmount: handleMixedCashChange,
        cardAmount,
        setCardAmount: handleMixedCardChange,
        onCashBlur: handleMixedCashBlur,
        onCardBlur: handleMixedCardBlur,
        totalBon,
        activeShift,
        cashRegisters,
        shiftLoading,
        shiftError,
        handleOpenShift,
        handleCloseShift,
        handleCancelShift,
        loadShiftData,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        productsSubtotal,
        cartSgrTotal,
        isSgrBlocked,
        SGR_CHECKOUT_BACKEND_ENABLED,
        finalizeSale
    };
};
