import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    TransferProduct, 
    TransferPayload, 
    StockBatch,
    TransferDirection
} from '../types';

export const transferService = {
    /**
     * Listează produsele cu stocuri agregate (Depozit vs Magazin).
     */
    async listTransferProducts(storeId: string): Promise<TransferProduct[]> {
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
                .reduce((acc, b) => acc + Number(b.quantity), 0);
            const stoc_magazin = productBatches
                .filter(b => b.zone === 'magazin')
                .reduce((acc, b) => acc + Number(b.quantity), 0);

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
            .reduce((acc, b) => acc + Number(b.quantity), 0) || 0;
        
        const magazin = batches
            ?.filter(b => b.zone === 'magazin')
            .reduce((acc, b) => acc + Number(b.quantity), 0) || 0;

        return { depozit, magazin };
    },

    /**
     * Execută transferul între zone folosind algoritmul FIFO/FEFO pe loturi.
     * NOTĂ: Acest flux ar trebui mutat ulterior într-un RPC atomic 'transfer_stock'.
     */
    async executeTransfer(payload: TransferPayload): Promise<void> {
        const { storeId, productId, quantity, direction, profileId } = payload;

        if (!storeId || !productId || quantity <= 0) {
            throw new Error("Date transfer invalide.");
        }

        const sourceZone = direction === 'depozit_spre_magazin' ? 'depozit' : 'magazin';
        const targetZone = direction === 'depozit_spre_magazin' ? 'magazin' : 'depozit';

        // 1. Verifică stoc disponibil
        const stocks = await this.getProductStock(storeId, productId);
        const available = sourceZone === 'depozit' ? stocks.depozit : stocks.magazin;

        if (available < quantity) {
            throw new Error(`Stoc insuficient în ${sourceZone === 'depozit' ? 'depozit' : 'magazin'}. (Disponibil: ${available})`);
        }

        // 2. Citește loturile sursă (FEFO: expiry_date ASC, FIFO: created_at ASC)
        const { data: sourceBatches, error: sbError } = await supabase
            .from('stock_batches')
            .select('*')
            .eq('store_id', storeId)
            .eq('product_id', productId)
            .eq('zone', sourceZone)
            .gt('quantity', 0)
            .order('expiry_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

        if (sbError) throw sbError;
        if (!sourceBatches || sourceBatches.length === 0) {
            throw new Error(`Nu s-au găsit loturi cu stoc în ${sourceZone}.`);
        }

        let remainingToTransfer = quantity;

        for (const sBatch of sourceBatches) {
            if (remainingToTransfer <= 0) break;

            const qtyToTake = Math.min(Number(sBatch.quantity), remainingToTransfer);
            const newSourceQty = Number(sBatch.quantity) - qtyToTake;

            // A. Scade din lotul sursă
            const { error: updateSourceError } = await supabase
                .from('stock_batches')
                .update({ quantity: newSourceQty })
                .eq('id', sBatch.id)
                .eq('store_id', storeId); // Safety filter

            if (updateSourceError) throw updateSourceError;

            // B. Adaugă în lotul țintă (caută lot identic în zona țintă)
            let query = supabase
                .from('stock_batches')
                .select('*')
                .eq('store_id', storeId)
                .eq('product_id', productId)
                .eq('zone', targetZone)
                .eq('batch_number', sBatch.batch_number || '') // Atenție la NULL
                .eq('purchase_price', sBatch.purchase_price || 0);

            if (sBatch.expiry_date) {
                query = query.eq('expiry_date', sBatch.expiry_date);
            } else {
                query = query.is('expiry_date', null);
            }

            const { data: existingTargetBatch, error: targetLookupError } = await query.maybeSingle();
            if (targetLookupError) throw targetLookupError;

            let targetBatchId: string;

            if (existingTargetBatch) {
                const newTargetQty = Number(existingTargetBatch.quantity) + qtyToTake;
                const { error: updateTargetError } = await supabase
                    .from('stock_batches')
                    .update({ quantity: newTargetQty })
                    .eq('id', existingTargetBatch.id)
                    .eq('store_id', storeId);
                
                if (updateTargetError) throw updateTargetError;
                targetBatchId = existingTargetBatch.id;
            } else {
                const { data: newTargetBatch, error: createTargetError } = await supabase
                    .from('stock_batches')
                    .insert({
                        store_id: storeId,
                        product_id: productId,
                        zone: targetZone,
                        quantity: qtyToTake,
                        batch_number: sBatch.batch_number,
                        expiry_date: sBatch.expiry_date,
                        purchase_price: sBatch.purchase_price
                    })
                    .select()
                    .single();
                
                if (createTargetError) throw createTargetError;
                targetBatchId = newTargetBatch.id;
            }

            // C. Jurnalizare mișcare
            const { error: movementError } = await supabase
                .from('stock_movements')
                .insert({
                    store_id: storeId,
                    product_id: productId,
                    batch_id: sBatch.id, // Referențiem lotul sursă pentru trasabilitate
                    type: 'transfer',
                    quantity: qtyToTake,
                    source_zone: sourceZone,
                    target_zone: targetZone,
                    created_by: profileId
                });

            if (movementError) throw movementError;

            remainingToTransfer -= qtyToTake;
        }

        if (remainingToTransfer > 0) {
            throw new Error(`Eroare critică: nu s-a putut transfera întreaga cantitate (${remainingToTransfer} rămas).`);
        }
    }
};
