import { supabase } from '../../../shared/supabase/supabaseClient';
import { PosProduct, CreateSalePayload, StockBatch } from '../types';

const toNumberStrict = (value: unknown, fieldName: string): number => {
    const n = Number(value);
    if (isNaN(n) || !isFinite(n)) {
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

        // 2. Citește prețuri filtrat după store_id
        const { data: prices, error: prError } = await supabase
            .from('product_prices')
            .select('product_id, price_sale, vat_percent')
            .eq('store_id', storeId)
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

        // Preț filtrat după store_id
        const { data: price, error: prError } = await supabase
            .from('product_prices')
            .select('price_sale, vat_percent')
            .eq('store_id', storeId)
            .eq('product_id', products.id)
            .maybeSingle();

        if (prError) throw prError;

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
     */
    async createSale(payload: CreateSalePayload): Promise<string> {
        const { storeId, profileId, items, paymentMethod, cashAmount, cardAmount, shiftId } = payload;

        if (!storeId || !profileId || items.length === 0) {
            throw new Error("Date vânzare incomplete.");
        }

        // Validare items și recalculare totalSale
        let totalSale = 0;
        for (const item of items) {
            if (!item.productId || item.quantity <= 0 || item.price < 0) {
                throw new Error(`Produs invalid în coș: ${item.name || 'ID ' + item.productId}`);
            }
            const itemQty = toNumberStrict(item.quantity, `cantitate ${item.name}`);
            const itemPrice = toNumberStrict(item.price, `preț ${item.name}`);
            totalSale += itemQty * itemPrice;
        }

        if (totalSale <= 0) {
            throw new Error("Totalul vânzării trebuie să fie pozitiv.");
        }

        // Validare runtime paymentMethod
        const validMethods = ['cash', 'card', 'mixed'];
        if (!validMethods.includes(paymentMethod)) {
            throw new Error("Metodă de plată invalidă.");
        }

        // Validare sume plată pentru mixed
        if (paymentMethod === 'mixed') {
            const cAmount = toNumberStrict(cashAmount || 0, 'sumă cash');
            const cdAmount = toNumberStrict(cardAmount || 0, 'sumă card');
            const paid = cAmount + cdAmount;
            
            if (Math.abs(paid - totalSale) > 0.01) {
                throw new Error(`Suma plătită (${paid.toFixed(2)}) nu coincide cu totalul (${totalSale.toFixed(2)}).`);
            }
            if (paid <= 0) {
                throw new Error("Suma plătită trebuie să fie pozitivă.");
            }
        }

        // 1. Pre-verificare stoc
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

        // 3. Consum loturi (FEFO/FIFO)
        for (const item of items) {
            let remainingToConsume = item.quantity;

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
                throw new Error(`Stoc epuizat pentru ${item.name} în timpul procesării.`);
            }

            for (const batch of (batches as StockBatch[])) {
                if (remainingToConsume <= 0) break;

                const batchQty = toNumberStrict(batch.quantity, 'cantitate lot');
                if (batchQty <= 0) continue;

                const toTake = Math.min(batchQty, remainingToConsume);
                const newQty = batchQty - toTake;
                
                if (newQty < 0) throw new Error("Vânzare invalidă: stoc sursă negativ detected.");

                // Update stock_batches cu store_id filter
                const { error: uError } = await supabase
                    .from('stock_batches')
                    .update({ quantity: newQty })
                    .eq('id', batch.id)
                    .eq('store_id', storeId);

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

        // 4. Creare plăți cu error handling
        if (paymentMethod === 'cash') {
            const { error: pError } = await supabase.from('payments').insert({
                store_id: storeId,
                sale_id: sale.id,
                method: 'cash',
                amount: totalSale
            });
            if (pError) throw pError;
        } else if (paymentMethod === 'card') {
            const { error: pError } = await supabase.from('payments').insert({
                store_id: storeId,
                sale_id: sale.id,
                method: 'card',
                amount: totalSale
            });
            if (pError) throw pError;
        } else if (paymentMethod === 'mixed') {
            if (cashAmount && cashAmount > 0) {
                const { error: pError } = await supabase.from('payments').insert({
                    store_id: storeId,
                    sale_id: sale.id,
                    method: 'cash',
                    amount: cashAmount
                });
                if (pError) throw pError;
            }
            if (cardAmount && cardAmount > 0) {
                const { error: pError } = await supabase.from('payments').insert({
                    store_id: storeId,
                    sale_id: sale.id,
                    method: 'card',
                    amount: cardAmount
                });
                if (pError) throw pError;
            }
        }

        return sale.id;
    }
};
