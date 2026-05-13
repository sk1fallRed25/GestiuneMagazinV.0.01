import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { fastAddService } from '../services/fastAddService';
import { FastAddForm, FastAddProductPayload } from '../types';
import toast from 'react-hot-toast';

const initialForm: FastAddForm = {
    barcode: '',
    name: '',
    unit: 'buc',
    priceSale: '',
    pricePurchase: '',
    vatPercent: '19',
    initialStock: '',
    stockZone: 'magazin',
    batchNumber: '',
    expiryDate: ''
};

export const useFastAdd = () => {
    const { currentStoreId, user } = useAuth();
    const [form, setForm] = useState<FastAddForm>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateField = (field: keyof FastAddForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm({ ...initialForm, stockZone: form.stockZone, vatPercent: form.vatPercent });
        setError(null);
    };

    const submit = async () => {
        if (!currentStoreId) {
            setError("Selectează un magazin mai întâi.");
            toast.error("Magazin neselectat.");
            return;
        }

        if (!form.barcode.trim()) {
            setError("Codul de bare este obligatoriu.");
            return;
        }

        if (!form.name.trim()) {
            setError("Numele produsului este obligatoriu.");
            return;
        }

        const priceSale = Number(form.priceSale) || 0;
        const pricePurchase = Number(form.pricePurchase) || 0;
        const vatPercent = Number(form.vatPercent) || 0;
        const initialStock = Number(form.initialStock) || 0;

        if (priceSale < 0 || pricePurchase < 0 || vatPercent < 0 || initialStock < 0) {
            setError("Valorile numerice trebuie să fie pozitive.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload: FastAddProductPayload = {
                storeId: currentStoreId,
                profileId: user?.id,
                barcode: form.barcode.trim(),
                name: form.name.trim(),
                unit: form.unit.trim() || 'buc',
                priceSale,
                pricePurchase,
                vatPercent,
                initialStock,
                stockZone: form.stockZone,
                batchNumber: form.batchNumber?.trim() || null,
                expiryDate: form.expiryDate || null
            };

            const result = await fastAddService.createFastProduct(payload);

            if (result.createdProduct) {
                toast.success(`Produs adăugat cu succes: ${payload.name}`);
            } else {
                let msg = `Produsul exista deja.`;
                if (result.createdPrice) msg += ` Prețul a fost actualizat.`;
                if (result.createdInitialStock) msg += ` S-a adăugat stoc.`;
                toast.success(msg);
            }

            resetForm();
            return true;
        } catch (err: unknown) {
            console.error("FastAdd Error:", err);
            const msg = err instanceof Error ? err.message : "Eroare necunoscută la adăugarea produsului.";
            setError(msg);
            toast.error(msg);
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        form,
        submitting,
        error,
        updateField,
        submit,
        resetForm
    };
};
