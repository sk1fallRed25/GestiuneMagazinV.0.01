import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { transferService } from '../services/transferService';
import { TransferProduct, TransferDirection } from '../types';

export const useTransfer = () => {
    const [products, setProducts] = useState<TransferProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [direction, setDirection] = useState<TransferDirection>('depozit_spre_magazin');
    const [submitting, setSubmitting] = useState(false);

    const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Eroare necunoscută';

    const refreshProducts = async () => {
        setLoading(true);
        try {
            const data = await transferService.listTransferProducts();
            setProducts(data);
        } catch (error) {
            toast.error('Eroare la încărcare: ' + getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProducts();
    }, []);

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id.toString() === selectedProductId) || null;
    }, [products, selectedProductId]);

    const submitTransfer = async () => {
        if (!selectedProduct) {
            toast.error("Selectează un produs!");
            return;
        }

        const cant = parseInt(quantity);
        if (isNaN(cant) || cant <= 0) {
            toast.error("Cantitatea trebuie să fie un număr pozitiv.");
            return;
        }

        setSubmitting(true);

        try {
            // 1. RE-VERIFICARE STOC (Critic pentru concurență)
            const currentStock = await transferService.getCurrentStock(selectedProduct.id);

            // 2. Validare Stoc Real
            if (direction === 'depozit_spre_magazin' && currentStock.stoc_depozit < cant) {
                throw new Error(`Stoc insuficient în Depozit! Disponibil: ${currentStock.stoc_depozit}`);
            }
            if (direction === 'magazin_spre_depozit' && currentStock.stoc_magazin < cant) {
                throw new Error(`Stoc insuficient în Magazin! Disponibil: ${currentStock.stoc_magazin}`);
            }

            // 3. Calcul Valori Noi
            let nouStocDepozit = currentStock.stoc_depozit;
            let nouStocMagazin = currentStock.stoc_magazin;

            if (direction === 'depozit_spre_magazin') {
                nouStocDepozit -= cant;
                nouStocMagazin += cant;
            } else {
                nouStocMagazin -= cant;
                nouStocDepozit += cant;
            }

            // 4. Executare Update
            await transferService.updateTransferStock({
                produs_id: selectedProduct.id,
                cantitate: cant,
                directie: direction,
                nou_stoc_depozit: nouStocDepozit,
                nou_stoc_magazin: nouStocMagazin
            });

            toast.success("Transfer realizat cu succes!");
            setQuantity('');
            await refreshProducts(); // Refresh UI

        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return {
        products,
        loading,
        selectedProductId,
        selectedProduct,
        quantity,
        direction,
        submitting,
        setSelectedProductId,
        setQuantity,
        setDirection,
        submitTransfer,
        refreshProducts
    };
};
