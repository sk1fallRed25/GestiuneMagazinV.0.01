import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    TransferProduct, 
    TransferDirection, 
    TransferPayload 
} from '../types';
import { transferService } from '../services/transferService';

export const useTransfer = () => {
    const { currentStoreId, availableStores, user } = useAuth();

    const [products, setProducts] = useState<TransferProduct[]>([]);
    const [allStores, setAllStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [search, setSearch] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [direction, setDirection] = useState<TransferDirection>('depozit_spre_magazin');
    
    // Multi-store source and destination states
    const [sourceStoreId, setSourceStoreId] = useState<string>('');
    const [destinationStoreId, setDestinationStoreId] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Fetch all stores in network
    useEffect(() => {
        const fetchStores = async () => {
            if (user) {
                try {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    
                    if (profileData?.role === 'platform_owner') {
                        const { data, error } = await supabase
                            .from('stores')
                            .select('id, name, active, fiscal_code, lifecycle_status');
                        if (!error && data) {
                            setAllStores(data);
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Error loading profile or stores:", err);
                }
            }
            
            // Fallback for store members: use availableStores
            const mapped = availableStores.map(m => ({
                id: m.store_id,
                name: m.storeName || m.store?.name || '',
                active: m.store?.active ?? m.active,
                fiscal_code: m.fiscalCode || '',
                lifecycle_status: m.lifecycleStatus || (m.store?.active ? 'active' : 'suspended')
            }));
            setAllStores(mapped);
        };
        fetchStores();
    }, [availableStores, user]);

    // Lock sourceStoreId for single-store users
    useEffect(() => {
        if (availableStores.length <= 1 && currentStoreId) {
            setSourceStoreId(currentStoreId);
        }
    }, [availableStores.length, currentStoreId]);

    // Validation handler
    useEffect(() => {
        setValidationError(null);
        if (!sourceStoreId) {
            setValidationError("Selectați punctul de lucru sursă.");
            return;
        }
        if (!destinationStoreId) {
            setValidationError("Selectați punctul de lucru destinație.");
            return;
        }
        if (sourceStoreId === destinationStoreId) {
            setValidationError("Punctul de lucru sursă și cel destinație nu pot fi identice.");
            return;
        }
        const srcStore = allStores.find(s => s.id === sourceStoreId);
        const destStore = allStores.find(s => s.id === destinationStoreId);
        
        if (srcStore && (srcStore.active === false || srcStore.lifecycle_status === 'archived')) {
            setValidationError("Punctul de lucru sursă este inactiv sau arhivat.");
            return;
        }
        if (destStore && (destStore.active === false || destStore.lifecycle_status === 'archived')) {
            setValidationError("Punctul de lucru destinație este inactiv sau arhivat.");
            return;
        }
    }, [sourceStoreId, destinationStoreId, allStores]);

    const loadProducts = useCallback(async () => {
        const activeStoreId = sourceStoreId || currentStoreId;
        if (!activeStoreId) return;
        setLoading(true);
        try {
            const data = await transferService.listTransferProducts(activeStoreId);
            setProducts(data);
        } catch (error: unknown) {
            console.error(error);
            toast.error("Nu s-au putut încărca datele stocurilor.");
        } finally {
            setLoading(false);
        }
    }, [sourceStoreId, currentStoreId]);

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
        if (!sourceStoreId || !user) {
            return toast.error("Sesiune invalidă.");
        }
        if (validationError) {
            return toast.error(validationError);
        }
        if (!selectedProductId) {
            return toast.error("Selectați un produs.");
        }
        const qtyNum = parseFloat(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            return toast.error("Introduceți o cantitate validă.");
        }

        const srcStore = allStores.find(s => s.id === sourceStoreId);
        const destStore = allStores.find(s => s.id === destinationStoreId);

        const confirmMsg = `Confirmați transferul a ${qtyNum} ${selectedProduct?.um || 'buc'} din "${srcStore?.name || ''}" în "${destStore?.name || ''}" pentru produsul "${selectedProduct?.nume || ''}"?`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setSubmitting(true);
        try {
            const payload: TransferPayload = {
                storeId: sourceStoreId,
                productId: selectedProductId,
                quantity: qtyNum,
                direction,
                profileId: user.id
            };

            await transferService.executeTransfer(payload);
            toast.success("Transfer înregistrat cu succes!");
            
            setQuantity('');
            setSelectedProductId('');
            setSearch('');
            await loadProducts(); // Refresh stocks
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Operațiunea nu a putut fi finalizată.";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        products,
        allStores,
        availableStores,
        sourceStoreId,
        setSourceStoreId,
        destinationStoreId,
        setDestinationStoreId,
        validationError,
        loading,
        submitting,
        search,
        setSearch,
        filteredProducts,
        selectedProductId,
        setSelectedProductId,
        selectedProduct,
        quantity,
        setQuantity,
        direction,
        setDirection,
        submitTransfer,
        refreshProducts: loadProducts
    };
};
