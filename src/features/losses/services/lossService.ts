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

/**
 * Helper pentru citirea loturilor disponibile într-o zonă specifică.
 */
const getAvailableBatches = async (storeId: string, productId: string, zone: 'magazin' | 'depozit') => {
    const { data, error } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('store_id', storeId)
        .eq('product_id', productId)
        .eq('zone', zone)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
};

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
     * Raportează o pierdere/casare consumând din loturi.
     * NOTĂ: Acest flux ar trebui mutat ulterior într-un RPC atomic 'scrap_stock' sau 'create_waste_event'.
     */
    async createLoss(payload: CreateLossPayload): Promise<string> {
        const { storeId, profileId, productId, quantity, reason, description, source } = payload;

        // 1. Validări inițiale
        if (!storeId || !profileId || !productId || quantity <= 0 || !reason) {
            throw new Error("Date casare incomplete.");
        }

        if (source !== 'magazin' && source !== 'depozit' && source !== 'auto') {
            throw new Error("Sursă casare invalidă.");
        }

        // 2. Determină zonele și pre-verifică stocul
        const zonesToSearch: ('magazin' | 'depozit')[] = [];
        if (source === 'magazin') zonesToSearch.push('magazin');
        else if (source === 'depozit') zonesToSearch.push('depozit');
        else {
            zonesToSearch.push('magazin');
            zonesToSearch.push('depozit');
        }

        let totalAvailable = 0;
        const batchesByZone: Record<string, any[]> = {};

        for (const zone of zonesToSearch) {
            const zoneBatches = await getAvailableBatches(storeId, productId, zone);
            batchesByZone[zone] = zoneBatches;
            totalAvailable += zoneBatches.reduce((acc, b) => acc + toNumberSafe(b.quantity), 0);
        }

        if (totalAvailable < quantity) {
            throw new Error(`Stoc insuficient pentru casare. Disponibil: ${totalAvailable}`);
        }

        // 3. Creează Evenimentul de Pierdere (doar după ce știm că avem stoc)
        const { data: wasteEvent, error: eventError } = await supabase
            .from('waste_events')
            .insert({
                store_id: storeId,
                profile_id: profileId,
                reason: reason,
                description: description
            })
            .select()
            .single();

        if (eventError) throw eventError;

        // 4. Consumă loturile
        let remainingToScrap = quantity;

        for (const zone of zonesToSearch) {
            if (remainingToScrap <= 0) break;

            const batches = batchesByZone[zone];

            for (const batch of batches) {
                if (remainingToScrap <= 0) break;

                const currentQty = Number(batch.quantity);
                if (isNaN(currentQty)) {
                    throw new Error("Lot invalid: cantitate numerică incorectă.");
                }
                if (currentQty <= 0) continue;

                const qtyToTake = Math.min(currentQty, remainingToScrap);
                const newQty = currentQty - qtyToTake;

                if (newQty < 0) {
                    throw new Error("Casare invalidă: stoc sursă negativ.");
                }

                // A. Update Lot
                const { error: updateError } = await supabase
                    .from('stock_batches')
                    .update({ quantity: newQty })
                    .eq('id', batch.id)
                    .eq('store_id', storeId);

                if (updateError) throw updateError;

                // B. Insert Waste Item
                const { error: itemError } = await supabase
                    .from('waste_items')
                    .insert({
                        store_id: storeId,
                        waste_id: wasteEvent.id,
                        product_id: productId,
                        batch_id: batch.id,
                        quantity: qtyToTake
                    });

                if (itemError) throw itemError;

                // C. Insert Movement
                const { error: movementError } = await supabase
                    .from('stock_movements')
                    .insert({
                        store_id: storeId,
                        product_id: productId,
                        batch_id: batch.id,
                        type: 'waste',
                        quantity: qtyToTake,
                        source_zone: zone,
                        target_zone: 'external',
                        reference_id: wasteEvent.id,
                        created_by: profileId
                    });

                if (movementError) throw movementError;

                remainingToScrap -= qtyToTake;
            }
        }

        if (remainingToScrap > 0) {
            // Rollback manual nu e posibil ușor fără tranzacții SQL/RPC
            throw new Error(`Eroare critică: stocul a devenit indisponibil în timpul procesării (${remainingToScrap} rămas).`);
        }

        return wasteEvent.id;
    }
};
