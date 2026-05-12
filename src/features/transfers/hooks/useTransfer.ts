import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { 
    TransferProduct, 
    TransferDirection, 
    TransferPayload 
} from '../types';
import { transferService } from '../services/transferService';

export const useTransfer = () => {
    const { currentStoreId, user } = useAuth();

    const [products, setProducts] = useState<TransferProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [search, setSearch] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [direction, setDirection] = useState<TransferDirection>('depozit_spre_magazin');

    const loadProducts = useCallback(async () => {
        if (!currentStoreId) return;
        setLoading(true);
        try {
            const data = await transferService.listTransferProducts(currentStoreId);
            setProducts(data);
        } catch (error: unknown) {
            console.error(error);
            toast.error("Eroare la încărcarea produselor.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filteredProducts = useMemo(() => {
        if (search.length < 2) return [];
        return products.filter(p => 
            p.nume.toLowerCase().includes(search.toLowerCase()) || 
            p.cod_bare.includes(search)
        ).slice(0, 10);
    }, [products, search]);

    const selectedProduct = useMemo(() => 
        products.find(p => p.id === selectedProductId) || null
    , [products, selectedProductId]);

    const submitTransfer = async () => {
        if (!currentStoreId || !user) {
            return toast.error("Sesiune invalidă.");
        }
        if (!selectedProductId) {
            return toast.error("Selectează un produs.");
        }
        const qtyNum = parseFloat(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            return toast.error("Introdu o cantitate validă.");
        }

        setSubmitting(true);
        try {
            const payload: TransferPayload = {
                storeId: currentStoreId,
                productId: selectedProductId,
                quantity: qtyNum,
                direction,
                profileId: user.id
            };

            await transferService.executeTransfer(payload);
            toast.success("Transfer realizat cu succes!");
            
            setQuantity('');
            setSelectedProductId('');
            setSearch('');
            await loadProducts(); // Refresh stocks
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Eroare la transfer.";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        products,
        loading,
        submitting,
        search, setSearch,
        filteredProducts,
        selectedProductId, setSelectedProductId,
        selectedProduct,
        quantity, setQuantity,
        direction, setDirection,
        submitTransfer,
        refreshProducts: loadProducts
    };
};
