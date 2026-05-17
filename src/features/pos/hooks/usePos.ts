import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { posService } from '../services/posService';
import { PosProduct, CartItem, PaymentMethod } from '../types';

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

    const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Operațiunea nu a putut fi finalizată.';

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

    // Finalizare vânzare
    const finalizeSale = async () => {
        if (!currentStoreId || !user) {
            toast.error("Sesiune invalidă.");
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
                shiftId: null
            });

            toast.success("Vânzare finalizată cu succes!");
            clearCart();
            setQuery('');
            setSearchResults([]);
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
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        finalizeSale
    };
};
