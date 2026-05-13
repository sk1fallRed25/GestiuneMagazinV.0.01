import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { lossService } from '../services/lossService';
import { LossProduct, LossLocationState, LossStockSource } from '../types';

export const useLosses = () => {
    const location = useLocation();
    const { user, currentStoreId } = useAuth();
    
    const [products, setProducts] = useState<LossProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    // Stări Modal și Formular
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<LossProduct | null>(null);
    const [scrapQty, setScrapQty] = useState('');
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [source, setSource] = useState<LossStockSource>('auto');

    const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Eroare necunoscută';

    const refreshProducts = useCallback(async (isInitial = false) => {
        if (!currentStoreId) return;
        setLoading(true);
        try {
            const fetchedProducts = await lossService.listLossProducts(currentStoreId);
            setProducts(fetchedProducts);

            if (isInitial) {
                const state = location.state as LossLocationState;
                if (state?.preSelectedId) {
                    const preSelected = fetchedProducts.find(p => p.id === state.preSelectedId);
                    if (preSelected) {
                        setSelectedProduct(preSelected);
                        setReason("Produs Expirat");
                        setShowModal(true);
                    }
                }
            }
        } catch (err: unknown) {
            toast.error("Eroare la încărcarea produselor: " + getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [currentStoreId, location.state]);

    useEffect(() => {
        refreshProducts(true);
    }, [refreshProducts]);

    const openScrapModal = (prod: LossProduct) => {
        setSelectedProduct(prod);
        setScrapQty('');
        setReason('');
        setDescription('');
        setSource('auto');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedProduct(null);
        setScrapQty('');
        setReason('');
        setDescription('');
        setSubmitting(false);
    };

    const filteredProducts = useMemo(() => {
        const query = search.toLowerCase();
        return products.filter(p =>
            p.nume.toLowerCase().includes(query) ||
            p.cod_bare.includes(query)
        );
    }, [products, search]);

    const submitLoss = async () => {
        if (!currentStoreId || !user) {
            toast.error("Sesiune invalidă.");
            return;
        }

        const qty = parseFloat(scrapQty);
        
        if (!selectedProduct) return;
        if (!qty || qty <= 0) return toast.error("Specificați o cantitate validă.");
        if (!reason) return toast.error("Selectați motivul casării.");

        // Validare stoc în funcție de sursă
        let available = 0;
        if (source === 'magazin') available = selectedProduct.stoc_magazin;
        else if (source === 'depozit') available = selectedProduct.stoc_depozit;
        else available = selectedProduct.stoc_total;

        if (qty > available) {
            return toast.error(`Stoc insuficient în sursa aleasă. Disponibil: ${available} ${selectedProduct.um}`);
        }

        setSubmitting(true);
        try {
            await lossService.createLoss({
                storeId: currentStoreId,
                profileId: user.id,
                productId: selectedProduct.id,
                quantity: qty,
                reason,
                description,
                source
            });

            toast.success("Casare înregistrată cu succes!");
            closeModal();
            await refreshProducts();

        } catch (err: unknown) {
            toast.error("Eroare la raportare: " + getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return {
        products,
        loading,
        submitting,
        search,
        setSearch,
        selectedProduct,
        showModal,
        scrapQty,
        setScrapQty,
        reason,
        setReason,
        description,
        setDescription,
        source,
        setSource,
        filteredProducts,
        openScrapModal,
        closeModal,
        submitLoss,
        refreshProducts
    };
};
