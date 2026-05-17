import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    ReceptionProduct, 
    CreateReceptionPayload,
    ReceptionLine
} from '../types';

export const receptionService = {
    /**
     * Listează produsele active pentru a fi selectate în recepție.
     */
    async listReceptionProducts(storeId: string): Promise<ReceptionProduct[]> {
        if (!storeId) return [];

        const { data: products, error: pError } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .neq('status', 'deleted');

        if (pError) throw pError;
        if (!products || products.length === 0) return [];

        const { data: prices, error: prError } = await supabase
            .from('product_prices')
            .select('*')
            .eq('store_id', storeId)
            .in('product_id', products.map(p => p.id));

        if (prError) throw prError;

        return products.map(p => {
            const price = prices?.find(pr => pr.product_id === p.id);
            return {
                id: p.id,
                nume: p.name,
                cod_bare: p.barcode,
                um: p.unit,
                pret_vanzare: Number(price?.price_sale) || 0,
                pret_achizitie: Number(price?.price_purchase) || 0
            };
        });
    },

    /**
     * Creează o recepție completă (receptions, items, stocks, prices, movements).
     * NOTĂ: Ideal, acest flux ar trebui mutat într-un RPC (funcție PostgreSQL) pentru atomicitate.
     */
    async createReception(payload: CreateReceptionPayload): Promise<string> {
        const { storeId, profileId, document, lines } = payload;

        // 1. Validări de bază
        if (!storeId || !profileId) throw new Error("Informații magazin/utilizator lipsă.");
        if (!document.documentNumber) throw new Error("Numărul documentului este obligatoriu.");
        if (lines.length === 0) throw new Error("Recepția trebuie să conțină cel puțin un produs.");

        // 2. Mapare și validare linii pentru RPC
        const itemsForRpc = lines.map(line => {
            if (!line.productId || line.quantity <= 0 || line.purchasePrice < 0 || line.salePrice < 0 || line.vatPercent < 0) {
                throw new Error("Linia de recepție conține date invalide.");
            }
            return {
                product_id: line.productId,
                quantity: line.quantity,
                purchase_price: line.purchasePrice,
                sale_price: line.salePrice,
                vat_percent: line.vatPercent,
                batch_number: line.batchNumber || document.documentNumber,
                expiry_date: line.expiryDate || null,
                zone: 'depozit'
            };
        });

        // 3. Apel RPC atomic
        const { data, error } = await supabase.rpc('receive_stock', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_document_number: document.documentNumber,
            p_document_date: document.documentDate,
            p_supplier_name: document.supplierText || null,
            p_supplier_cui: document.supplierCui || null,
            p_observations: document.observations || null,
            p_items: itemsForRpc,
        });

        if (error) {
            console.error("RPC receive_stock error:", error);
            const msg = error.message || "";
            if (msg.includes("Acces refuzat") || msg.includes("Acces interzis")) {
                throw new Error("Acces refuzat pentru recepție.");
            }
            if (msg.includes("document")) {
                throw new Error("Documentul recepției este incomplet.");
            }
            if (msg.includes("produs") || msg.includes("linie")) {
                throw new Error("Linia de recepție conține date invalide.");
            }
            throw new Error(msg || "Recepția nu a putut fi salvată.");
        }

        if (!data) {
            throw new Error("Recepția nu a putut fi salvată.");
        }

        return data;
    }
};
