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

        // Helper pentru fetch complet cu paginare (depășește limita max-rows de 1000 a PostgREST)
        const fetchAll = async (table: string, filterCol: string, filterVal: string, extraFilter?: { col: string; val: string }) => {
            let allRows: any[] = [];
            let from = 0;
            const step = 1000;
            while (true) {
                let query = supabase.from(table).select('*').eq(filterCol, filterVal);
                if (extraFilter) {
                    query = query.neq(extraFilter.col, extraFilter.val);
                }
                const { data, error } = await query.range(from, from + step - 1);
                if (error) throw error;
                if (!data || data.length === 0) break;
                allRows = allRows.concat(data);
                if (data.length < step) break;
                from += step;
            }
            return allRows;
        };

        const products = await fetchAll('products', 'store_id', storeId, { col: 'status', val: 'deleted' });
        if (!products || products.length === 0) return [];

        const batches = await fetchAll('stock_batches', 'store_id', storeId);

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
