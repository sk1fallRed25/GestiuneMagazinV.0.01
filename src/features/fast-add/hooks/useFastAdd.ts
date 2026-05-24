import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { fastAddService } from '../services/fastAddService';
import { productService } from '../../products/services/productService';
import { ProductVatConfig, VatGroupKey } from '../../products/types';
import { FastAddForm, FastAddProductPayload } from '../types';
import toast from 'react-hot-toast';

const initialForm: FastAddForm = {
    barcode: '',
    name: '',
    unit: '',
    priceSale: '',
    pricePurchase: '',
    vatPercent: '21',
    vatGroup: 'A' as VatGroupKey,
    initialStock: '',
    stockZone: 'magazin',
    batchNumber: '',
    expiryDate: ''
};

const parseNonNegativeNumber = (value: string, fieldLabel: string): number => {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${fieldLabel} trebuie să fie un număr valid, mai mare sau egal cu 0.`);
    }
    return parsed;
};

export const useFastAdd = () => {
    const { currentStoreId, user } = useAuth();
    const [form, setForm] = useState<FastAddForm>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vatConfig, setVatConfig] = useState<ProductVatConfig | null>(null);
    const [vatLoading, setVatLoading] = useState(false);

    const loadVatConfig = useCallback(async () => {
        if (!currentStoreId) {
            setVatConfig(null);
            return;
        }
        setVatLoading(true);
        try {
            const config = await productService.getProductVatConfig(currentStoreId);
            setVatConfig(config);
            setForm(prev => ({
                ...prev,
                vatGroup: config.defaultVatGroup
            }));
        } catch (error) {
            console.error("Eroare la încărcarea configurației TVA:", error);
        } finally {
            setVatLoading(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        loadVatConfig();
    }, [loadVatConfig]);

    const updateField = (field: keyof FastAddForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm({ 
            ...initialForm, 
            stockZone: form.stockZone, 
            vatGroup: vatConfig?.defaultVatGroup || 'A' 
        });
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

        let priceSale: number;
        let pricePurchase: number;
        let initialStock: number;

        try {
            priceSale = parseNonNegativeNumber(form.priceSale, 'Preț vânzare');
            pricePurchase = parseNonNegativeNumber(form.pricePurchase, 'Preț achiziție');
            initialStock = parseNonNegativeNumber(form.initialStock, 'Stoc inițial');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Valori invalide.";
            setError(msg);
            toast.error(msg);
            return false;
        }

        const vatGroup = form.vatGroup;
        const rates: Record<VatGroupKey, number> = {
            A: 21,
            B: 11,
            C: 11,
            D: 0,
            E: 0
        };
        const vatPercent = rates[vatGroup] || 21;

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
                vatGroup,
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
            const msg = err instanceof Error ? err.message : "Operațiunea nu a putut fi finalizată.";
            setError(msg);
            toast.error(msg);
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        form,
        submitting: submitting || vatLoading,
        error,
        updateField,
        submit,
        resetForm,
        vatConfig
    };
};
