import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    TransferProduct, 
    TransferPayload
} from '../types';

const toNumber = (value: unknown, fallback = 0): number => {
    const n = Number(value);
    return isNaN(n) ? fallback : n;
};

export const transferService = {
    /**
     * Listează produsele cu stocuri agregate (Depozit vs Magazin).
     */
    async listTransferProducts(storeId: string): Promise<TransferProduct[]> {
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
                .reduce((acc, b) => acc + toNumber(b.quantity), 0);
            const stoc_magazin = productBatches
                .filter(b => b.zone === 'magazin')
                .reduce((acc, b) => acc + toNumber(b.quantity), 0);

            return {
                id: p.id,
                nume: p.name,
                cod_bare: p.barcode,
                um: p.unit,
                stoc_depozit,
                stoc_magazin
            };
        });
    },

    /**
     * Returnează stocul agregat pentru un singur produs.
     */
    async getProductStock(storeId: string, productId: string) {
        const { data: batches, error } = await supabase
            .from('stock_batches')
            .select('zone, quantity')
            .eq('store_id', storeId)
            .eq('product_id', productId);
        
        if (error) throw error;

        const depozit = batches
            ?.filter(b => b.zone === 'depozit')
            .reduce((acc, b) => acc + toNumber(b.quantity), 0) || 0;
        
        const magazin = batches
            ?.filter(b => b.zone === 'magazin')
            .reduce((acc, b) => acc + toNumber(b.quantity), 0) || 0;

        return { depozit, magazin };
    },

    /**
     * Execută transferul între zone folosind RPC atomic 'transfer_stock'.
     */
    async executeTransfer(payload: TransferPayload): Promise<number> {
        const { storeId, productId, quantity, direction, profileId } = payload;

        if (!storeId || !productId || quantity <= 0) {
            throw new Error("Transferul nu a putut fi finalizat.");
        }

        if (!profileId) {
            throw new Error("Acces refuzat pentru transfer.");
        }

        let p_source_zone: string;
        let p_target_zone: string;

        if (direction === 'depozit_spre_magazin') {
            p_source_zone = 'depozit';
            p_target_zone = 'magazin';
        } else if (direction === 'magazin_spre_depozit') {
            p_source_zone = 'magazin';
            p_target_zone = 'depozit';
        } else {
            throw new Error("Direcție de transfer invalidă.");
        }

        const { data, error } = await supabase.rpc('transfer_stock', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_product_id: productId,
            p_quantity: quantity,
            p_source_zone,
            p_target_zone,
        });

        if (error) {
            console.error("RPC transfer_stock error:", error);
            if (error.message.includes("Stoc insuficient")) {
                throw new Error("Stoc insuficient pentru transfer.");
            }
            if (error.message.includes("Acces refuzat")) {
                throw new Error("Acces refuzat pentru transfer.");
            }
            throw new Error(error.message || 'Transferul nu a putut fi finalizat.');
        }

        const transferredQuantity = Number(data);
        if (!Number.isFinite(transferredQuantity)) {
            throw new Error('Transferul nu a putut fi finalizat.');
        }

        return transferredQuantity;
    }
};

