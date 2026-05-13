import { supabase } from '../../../shared/supabase/supabaseClient';
import { PosProduct, CreateSalePayload, StockBatch } from '../types';

const toNumberStrict = (value: unknown, fieldName: string): number => {
    const n = Number(value);
    if (isNaN(n)) {
        throw new Error(`Valoare numerică invalidă pentru ${fieldName}.`);
    }
    return n;
};

export const posService = {
    /**
     * Caută produse active în gestiune, incluzând preț și stoc magazin.
     */
    async searchProducts(storeId: string, query: string): Promise<PosProduct[]> {
        if (!storeId || query.length < 2) return [];

        // 1. Căutare produse
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id, name, barcode, unit')
            .eq('store_id', storeId)
            .eq('status', 'active')
            .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
            .limit(20);

        if (pError) throw pError;
        if (!products || products.length === 0) return [];

        const productIds = products.map(p => p.id);

        // 2. Citește prețuri
        const { data: prices, error: prError } = await supabase
            .from('product_prices')
            .select('product_id, price_sale, vat_percent')
            .in('product_id', productIds);

        if (prError) throw prError;

        // 3. Citește stoc magazin (sumă pe loturi)
        const { data: batches, error: bError } = await supabase
            .from('stock_batches')
            .select('product_id, quantity')
            .eq('store_id', storeId)
            .eq('zone', 'magazin')
            .gt('quantity', 0)
            .in('product_id', productIds);

        if (bError) throw bError;

        // Mapare rezultate
        return products.map(p => {
            const price = prices?.find(pr => pr.product_id === p.id);
            const productBatches = batches?.filter(b => b.product_id === p.id) || [];
            const stockMagazin = productBatches.reduce((acc, b) => acc + toNumberStrict(b.quantity, 'stoc lot'), 0);

            return {
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                unit: p.unit,
                priceSale: price ? toNumberStrict(price.price_sale, 'preț vânzare') : 0,
                vatPercent: price ? toNumberStrict(price.vat_percent, 'TVA') : 19,
                stockMagazin
            };
        });
    },

    /**
     * Caută un produs exact după cod de bare.
     */
    async getProductByBarcode(storeId: string, barcode: string): Promise<PosProduct | null> {
        if (!storeId || !barcode) return null;

        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id, name, barcode, unit')
            .eq('store_id', storeId)
            .eq('barcode', barcode)
            .eq('status', 'active')
            .single();

        if (pError) {
            if (pError.code === 'PGRST116') return null; // Not found
            throw pError;
        }

        const productIds = [products.id];

        // Preț
        const { data: price, error: prError } = await supabase
            .from('product_prices')
            .select('price_sale, vat_percent')
            .eq('product_id', products.id)
            .single();

        if (prError && prError.code !== 'PGRST116') throw prError;

        // Stoc magazin
        const { data: batches, error: bError } = await supabase
            .from('stock_batches')
            .select('quantity')
            .eq('store_id', storeId)
            .eq('zone', 'magazin')
            .gt('quantity', 0)
            .eq('product_id', products.id);

        if (bError) throw bError;

        const stockMagazin = (batches || []).reduce((acc, b) => acc + toNumberStrict(b.quantity, 'stoc lot'), 0);

        return {
            id: products.id,
            name: products.name,
            barcode: products.barcode,
            unit: products.unit,
            priceSale: price ? toNumberStrict(price.price_sale, 'preț vânzare') : 0,
            vatPercent: price ? toNumberStrict(price.vat_percent, 'TVA') : 19,
            stockMagazin
        };
    },

    /**
     * Finalizează o vânzare.
     * IMPORTANT: Acest flux ar trebui mutat ulterior într-un RPC atomic 'finalize_sale'.
     */
    async createSale(payload: CreateSalePayload): Promise<string> {
        const { storeId, profileId, items, paymentMethod, cashAmount, cardAmount, shiftId } = payload;

        if (!storeId || !profileId || items.length === 0) {
            throw new Error("Date vânzare incomplete.");
        }

        const totalSale = items.reduce((acc, item) => acc + item.total, 0);

        // Validare plată mixtă
        if (paymentMethod === 'mixed') {
            const paid = (cashAmount || 0) + (cardAmount || 0);
            if (Math.abs(paid - totalSale) > 0.01) {
                throw new Error(`Suma plătită (${paid.toFixed(2)}) nu coincide cu totalul (${totalSale.toFixed(2)}).`);
            }
        }

        // 1. Pre-verificare stoc pentru toate produsele
        for (const item of items) {
            const { data: batches, error: bError } = await supabase
                .from('stock_batches')
                .select('quantity')
                .eq('store_id', storeId)
                .eq('product_id', item.productId)
                .eq('zone', 'magazin')
                .gt('quantity', 0);

            if (bError) throw bError;
            const available = (batches || []).reduce((acc, b) => acc + toNumberStrict(b.quantity, 'stoc lot'), 0);

            if (available < item.quantity) {
                throw new Error(`Stoc insuficient pentru ${item.name}. Disponibil: ${available} ${item.unit}.`);
            }
        }

        // 2. Creare vânzare (Header)
        const { data: sale, error: sError } = await supabase
            .from('sales')
            .insert({
                store_id: storeId,
                profile_id: profileId,
                shift_id: shiftId || null,
                total: totalSale,
                payment_method: paymentMethod,
                status: 'finalized'
            })
            .select()
            .single();

        if (sError) throw sError;

        // 3. Procesare produse și consum loturi (FEFO/FIFO)
        for (const item of items) {
            let remainingToConsume = item.quantity;

            // Citim loturile ordonate: expiry_date asc nulls last, created_at asc
            const { data: batches, error: bError } = await supabase
                .from('stock_batches')
                .select('*')
                .eq('store_id', storeId)
                .eq('product_id', item.productId)
                .eq('zone', 'magazin')
                .gt('quantity', 0)
                .order('expiry_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true });

            if (bError) throw bError;
            if (!batches || batches.length === 0) {
                throw new Error(`Stocul a expirat sau a fost modificat pentru ${item.name} în timpul procesării.`);
            }

            for (const batch of (batches as StockBatch[])) {
                if (remainingToConsume <= 0) break;

                const batchQty = toNumberStrict(batch.quantity, 'cantitate lot');
                const toTake = Math.min(batchQty, remainingToConsume);

                // Update stock_batches
                const { error: uError } = await supabase
                    .from('stock_batches')
                    .update({ quantity: batchQty - toTake })
                    .eq('id', batch.id);

                if (uError) throw uError;

                // Insert sale_items
                const { error: siError } = await supabase
                    .from('sale_items')
                    .insert({
                        store_id: storeId,
                        sale_id: sale.id,
                        product_id: item.productId,
                        batch_id: batch.id,
                        quantity: toTake,
                        unit_price: item.price,
                        total_item: toTake * item.price
                    });

                if (siError) throw siError;

                // Insert stock_movements
                const { error: smError } = await supabase
                    .from('stock_movements')
                    .insert({
                        store_id: storeId,
                        product_id: item.productId,
                        batch_id: batch.id,
                        type: 'sale',
                        quantity: toTake,
                        source_zone: 'magazin',
                        target_zone: 'customer',
                        reference_id: sale.id,
                        created_by: profileId
                    });

                if (smError) throw smError;

                remainingToConsume -= toTake;
            }

            if (remainingToConsume > 0.0001) {
                throw new Error(`Nu s-a putut consuma întreaga cantitate pentru ${item.name}.`);
            }
        }

        // 4. Creare plăți
        if (paymentMethod === 'cash') {
            await supabase.from('payments').insert({
                store_id: storeId,
                sale_id: sale.id,
                method: 'cash',
                amount: totalSale
            });
        } else if (paymentMethod === 'card') {
            await supabase.from('payments').insert({
                store_id: storeId,
                sale_id: sale.id,
                method: 'card',
                amount: totalSale
            });
        } else if (paymentMethod === 'mixed') {
            if (cashAmount && cashAmount > 0) {
                await supabase.from('payments').insert({
                    store_id: storeId,
                    sale_id: sale.id,
                    method: 'cash',
                    amount: cashAmount
                });
            }
            if (cardAmount && cardAmount > 0) {
                await supabase.from('payments').insert({
                    store_id: storeId,
                    sale_id: sale.id,
                    method: 'card',
                    amount: cardAmount
                });
            }
        }

        return sale.id;
    }
};
