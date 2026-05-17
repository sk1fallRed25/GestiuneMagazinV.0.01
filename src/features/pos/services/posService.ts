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

        // Validare items frontend și construire payload items pentru RPC
        let totalSaleUI = 0;
        const itemsForRpc: { product_id: string; quantity: number }[] = [];

        for (const item of items) {
            if (!item.productId || item.quantity <= 0 || item.price < 0) {
                throw new Error(`Produs invalid în coș: ${item.name || 'ID ' + item.productId}`);
            }
            const itemQty = toNumberStrict(item.quantity, `cantitate ${item.name}`);
            const itemPrice = toNumberStrict(item.price, `preț ${item.name}`);
            totalSaleUI += itemQty * itemPrice;

            itemsForRpc.push({
                product_id: item.productId,
                quantity: itemQty
            });
        }

        if (totalSaleUI <= 0) {
            throw new Error("Totalul vânzării trebuie să fie pozitiv.");
        }

        // Validare runtime paymentMethod și construire payload plăți pentru RPC
        const validMethods = ['cash', 'card', 'mixed'];
        if (!validMethods.includes(paymentMethod)) {
            throw new Error("Metodă de plată invalidă.");
        }

        const paymentsForRpc: { method: string; amount: number }[] = [];

        if (paymentMethod === 'mixed') {
            const cAmount = toNumberStrict(cashAmount || 0, 'sumă cash');
            const cdAmount = toNumberStrict(cardAmount || 0, 'sumă card');
            const paid = cAmount + cdAmount;
            
            if (Math.abs(paid - totalSaleUI) > 0.01) {
                throw new Error(`Suma plătită (${paid.toFixed(2)}) nu coincide cu totalul (${totalSaleUI.toFixed(2)}).`);
            }
            if (paid <= 0) {
                throw new Error("Suma plătită trebuie să fie pozitivă.");
            }
            if (cAmount > 0) paymentsForRpc.push({ method: 'cash', amount: cAmount });
            if (cdAmount > 0) paymentsForRpc.push({ method: 'card', amount: cdAmount });
        } else {
            paymentsForRpc.push({ method: paymentMethod, amount: totalSaleUI });
        }

        // Apelare RPC atomic
        const { data, error } = await supabase.rpc('finalize_sale', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_items: itemsForRpc,
            p_payments: paymentsForRpc,
            p_shift_id: shiftId || null
        });

        if (error) {
            console.error("RPC finalize_sale error:", error);
            const msg = error.message || "";
            if (msg.includes("Stoc insuficient")) {
                throw new Error("Stoc insuficient pentru finalizarea vânzării.");
            }
            if (msg.includes("Acces refuzat") || msg.includes("Acces interzis") || msg.includes("permisiuni")) {
                throw new Error("Acces refuzat pentru finalizarea vânzării.");
            }
            if (msg.includes("Plăți") || msg.includes("plată") || msg.includes("total")) {
                throw new Error("Totalul plății nu corespunde cu prețurile actuale. Reîncarcă produsele și încearcă din nou.");
            }
            if (msg.includes("preț") || msg.includes("pret") || msg.includes("price")) {
                throw new Error("Prețul produsului nu este configurat corect.");
            }
            throw new Error(msg || "Vânzarea nu a putut fi finalizată.");
        }

        type FinalizeSaleRpcResult = {
          sale_id?: unknown;
          total?: unknown;
        };

        const result = data as FinalizeSaleRpcResult | string | null;

        if (typeof result === 'string') {
          if (!result.trim()) throw new Error("Vânzarea nu a putut fi finalizată.");
          return result;
        }

        if (result && typeof result === 'object' && typeof result.sale_id === 'string') {
          return result.sale_id;
        }

        throw new Error("Vânzarea nu a putut fi finalizată.");
    }
};
