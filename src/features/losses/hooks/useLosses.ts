import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/AuthContext';
import { lossService } from '../services/lossService';
import { LossProduct, LossLocationState, LossStockSource } from '../types';

export const useLosses = () => {
    const location = useLocation();
    const { user } = useAuth();
    
    const [products, setProducts] = useState<LossProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Stări Modal și Formular
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<LossProduct | null>(null);
    const [scrapQty, setScrapQty] = useState('');
    const [reason, setReason] = useState('');

    const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Eroare necunoscută';

    const refreshProducts = async (isInitial = false) => {
        setLoading(true);
        try {
            const fetchedProducts = await lossService.listLossProducts();
            setProducts(fetchedProducts);

            if (isInitial) {
                const state = location.state as LossLocationState;
                if (state?.preSelectedId) {
                    const preSelected = fetchedProducts.find(p => p.id === state.preSelectedId);
                    if (preSelected) {
                        openScrapModal(preSelected);
                        setReason("Produs Expirat");
                    }
                }
            }
        } catch (err) {
            toast.error("Eroare la sincronizarea nomenclatorului: " + getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProducts(true);
    }, []);

    const openScrapModal = (prod: LossProduct) => {
        setSelectedProduct(prod);
        setScrapQty('');
        setReason(''); // Reset or keep if pre-selected
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedProduct(null);
        setScrapQty('');
        setReason('');
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.nume.toLowerCase().includes(search.toLowerCase()) ||
            p.cod_bare.includes(search)
        );
    }, [products, search]);

    const submitLoss = async () => {
        const qty = parseFloat(scrapQty);
        
        // Prioritate AuthContext, fallback localStorage pentru legacy
        const allowLegacy = import.meta.env.VITE_ALLOW_LEGACY_LOGIN === 'true';
        const currentUserId = user?.id || (allowLegacy ? localStorage.getItem('magazin_agent_id') : null);

        if (!selectedProduct) return;
        if (!currentUserId) {
            toast.error("Eroare autentificare: ID utilizator lipsă. Autentifică-te din nou.");
            return;
        }
        if (!qty || qty <= 0) return toast.error("Specificați o cantitate validă.");
        if (!reason) return toast.error("Specificați motivul (ex: Expirat, Spart).");

        const totalStock = (selectedProduct.stoc_depozit || 0) + (selectedProduct.stoc_magazin || 0);
        if (qty > totalStock) {
            return toast.error(`Stoc insuficient. Disponibil total: ${totalStock} buc.`);
        }

        setLoading(true);
        try {
            // Algoritm Calcul Sursă Stoc și Decrementare (Prioritate Magazin)
            let remainingToScrap = qty;
            let newMagazin = selectedProduct.stoc_magazin || 0;
            let newDepozit = selectedProduct.stoc_depozit || 0;
            let sursaEfectiva: LossStockSource = 'Depozit';

            if (newMagazin >= remainingToScrap) {
                newMagazin -= remainingToScrap;
                remainingToScrap = 0;
                sursaEfectiva = 'Raft';
            } else {
                if (newMagazin > 0) {
                    remainingToScrap -= newMagazin;
                    newMagazin = 0;
                    sursaEfectiva = 'Mixt (Raft + Depozit)';
                }
                newDepozit -= remainingToScrap;
            }

            await lossService.createLossAndUpdateStock({
                produs_id: selectedProduct.id,
                user_id: currentUserId,
                cantitate: qty,
                motiv: reason,
                sursa_stoc: sursaEfectiva,
                new_stoc_magazin: newMagazin,
                new_stoc_depozit: newDepozit
            });

            toast.success("Pierdere înregistrată. Stoc actualizat.");
            closeModal();
            await refreshProducts();

        } catch (err) {
            toast.error("Eroare tranzacțională: " + getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return {
        products,
        loading,
        search,
        setSearch,
        selectedProduct,
        showModal,
        scrapQty,
        setScrapQty,
        reason,
        setReason,
        filteredProducts,
        openScrapModal,
        closeModal,
        submitLoss,
        refreshProducts
    };
};
