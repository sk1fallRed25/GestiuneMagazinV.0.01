import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    LossProduct, 
    CreateLossPayload
} from '../types';

/**
 * Helper pentru conversie numerică sigură în scop de afișare/agregare.
 */
const toNumberSafe = (value: unknown, fallback = 0): number => {
    const n = Number(value);
    return isNaN(n) ? fallback : n;
};

type WasteRpcResult = string | null;

export const lossService = {
    /**
     * Listează produsele cu stocuri agregate pentru casare.
     */
    async listLossProducts(storeId: string): Promise<LossProduct[]> {
        if (!storeId) return [];

        const { data: products, error: pError } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .neq('status', 'deleted');

        if (pError) throw pError;
        if (!products || products.length === 0) return [];

        const { data: batches, error: bError } = await supabase
            .from('stock_batches')
            .select('*')
            .eq('store_id', storeId);

        if (bError) throw bError;

        return products.map(p => {
            const productBatches = batches?.filter(b => b.product_id === p.id) || [];
            const stoc_depozit = productBatches
                .filter(b => b.zone === 'depozit')
                .reduce((acc, b) => acc + toNumberSafe(b.quantity), 0);
            const stoc_magazin = productBatches
                .filter(b => b.zone === 'magazin')
                .reduce((acc, b) => acc + toNumberSafe(b.quantity), 0);
            
            return {
                id: p.id,
                nume: p.name,
                cod_bare: p.barcode,
                um: p.unit,
                stoc_depozit,
                stoc_magazin,
                stoc_total: stoc_depozit + stoc_magazin
            };
        });
    },

    /**
     * Raportează o pierdere/casare apelând procedura atomică RPC 'record_waste'.
     */
    async createLoss(payload: CreateLossPayload): Promise<string> {
        const { storeId, profileId, productId, quantity, reason, description, source } = payload;

        if (!storeId || !profileId || !productId || quantity <= 0 || !reason) {
            throw new Error("Date casare incomplete.");
        }

        if (source !== 'magazin' && source !== 'depozit' && source !== 'auto') {
            throw new Error("Sursă pierdere invalidă.");
        }

        const { data, error } = await supabase.rpc('record_waste', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_product_id: productId,
            p_quantity: quantity,
            p_source_zone: source,
            p_reason: reason,
            p_description: description || null,
        });

        if (error) {
            console.error("RPC record_waste error:", error);
            const msg = error.message || "";
            if (msg.includes("Stoc insuficient")) {
                throw new Error("Stoc insuficient pentru casare.");
            }
            if (msg.includes("Acces interzis") || msg.includes("Acces refuzat")) {
                throw new Error("Acces refuzat pentru înregistrarea pierderii.");
            }
            throw new Error(error.message || "Pierderea nu a putut fi înregistrată.");
        }

        const wasteId = data as WasteRpcResult;
        if (!wasteId || typeof wasteId !== 'string' || wasteId.trim() === '') {
            throw new Error("Pierderea nu a putut fi înregistrată.");
        }

        return wasteId;
    }
};
