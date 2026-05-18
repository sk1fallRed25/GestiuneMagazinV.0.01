import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { posService } from '../services/posService';
import { PosProduct, CartItem, PaymentMethod, ActiveShift, CashRegister } from '../types';

export const usePos = () => {
    const { user, currentStoreId } = useAuth();
    
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [cashAmount, setCashAmount] = useState<number>(0);
    const [cardAmount, setCardAmount] = useState<number>(0);

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
                        ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
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
                total: product.priceSale
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
                return { ...item, quantity: qty, total: qty * item.price };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCart([]);
        setCashAmount(0);
        setCardAmount(0);
        setPaymentMethod('cash');
    };

    const totalBon = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.total, 0);
    }, [cart]);

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
        if (totalBon <= 0) {
            toast.error("Totalul bonului trebuie să fie pozitiv.");
            return;
        }

        // Validare plăți mixte în frontend
        if (paymentMethod === 'mixed') {
            const paid = (Number(cashAmount) || 0) + (Number(cardAmount) || 0);
            if (Math.abs(paid - totalBon) > 0.01) {
                toast.error(`Suma plătită (${paid.toFixed(2)}) nu coincide cu totalul (${totalBon.toFixed(2)}).`);
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
            await posService.createSale({
                storeId: currentStoreId,
                profileId: user.id,
                items: cart,
                paymentMethod,
                cashAmount: paymentMethod === 'mixed' ? cashAmount : (paymentMethod === 'cash' ? totalBon : 0),
                cardAmount: paymentMethod === 'mixed' ? cardAmount : (paymentMethod === 'card' ? totalBon : 0),
                shiftId: activeShift.shiftId
            });

            toast.success("Vânzare finalizată cu succes!");
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
        setPaymentMethod,
        cashAmount,
        setCashAmount,
        cardAmount,
        setCardAmount,
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
        finalizeSale
    };
};
