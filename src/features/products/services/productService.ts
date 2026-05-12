import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    Product, 
    ProductUpdateInput, 
    ProductDbRow, 
    ProductPriceDbRow, 
    StockBatchDbRow 
} from '../types';

export const productService = {
    /**
     * Listează produsele unui magazin, agregând prețurile și stocurile.
     */
    async listProducts(storeId: string): Promise<Product[]> {
        if (!storeId) return [];

        // 1. Luăm produsele active
        const { data: productsData, error: pError } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .neq('status', 'deleted')
            .order('name', { ascending: true });

        if (pError) throw pError;
        if (!productsData || productsData.length === 0) return [];

        const productIds = productsData.map(p => p.id);

        // 2. Luăm prețurile (cele mai recente per produs)
        const { data: pricesData, error: prError } = await supabase
            .from('product_prices')
            .select('*')
            .in('product_id', productIds);

        if (prError) throw prError;

        // 3. Luăm loturile de stoc
        const { data: stocksData, error: sError } = await supabase
            .from('stock_batches')
            .select('*')
            .in('product_id', productIds);

        if (sError) throw sError;

        // 4. Mapăm totul către interfața legacy Product
        return productsData.map((p: ProductDbRow) => {
            const price = pricesData?.find(pr => pr.product_id === p.id);
            const productStocks = stocksData?.filter(s => s.product_id === p.id) || [];
            
            const stoc_depozit = productStocks
                .filter(s => s.zone === 'depozit')
                .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
                
            const stoc_magazin = productStocks
                .filter(s => s.zone === 'magazin')
                .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

            return {
                id: p.id,
                nume: p.name,
                cod_bare: p.barcode,
                pret_vanzare: Number(price?.price_sale) || 0,
                pret_achizitie: Number(price?.price_purchase) || 0,
                stoc_depozit,
                stoc_magazin,
                um: p.unit,
                unitate_masura: p.unit,
                active: p.status === 'active',
                status: p.status
            };
        });
    },

    /**
     * Actualizează un produs și datele asociate (preț, stoc).
     */
    async updateProduct(storeId: string, productId: string, input: ProductUpdateInput, userId?: string): Promise<void> {
        if (!storeId || !productId) throw new Error("Store ID și Product ID sunt obligatorii.");

        // 1. Update Product core
        const productUpdates: any = {};
        if (input.nume !== undefined) productUpdates.name = input.nume;
        if (input.cod_bare !== undefined) productUpdates.barcode = input.cod_bare;
        if (input.um !== undefined) productUpdates.unit = input.um;
        if (input.unitate_masura !== undefined && !input.um) productUpdates.unit = input.unitate_masura;
        if (input.status !== undefined) productUpdates.status = input.status;

        if (Object.keys(productUpdates).length > 0) {
            const { error: pError } = await supabase
                .from('products')
                .update(productUpdates)
                .eq('id', productId);
            if (pError) throw pError;
        }

        // 2. Update/Upsert Preț
        if (input.pret_vanzare !== undefined || input.pret_achizitie !== undefined) {
            const { error: prError } = await supabase
                .from('product_prices')
                .upsert({
                    store_id: storeId,
                    product_id: productId,
                    price_sale: input.pret_vanzare || 0,
                    price_purchase: input.pret_achizitie || 0,
                    vat_percent: 19, // Default logic
                    updated_at: new Date().toISOString()
                }, { onConflict: 'store_id,product_id' });
            if (prError) throw prError;
        }

        // 3. Update Stoc (Legacy Compatibility Mode)
        if (input.stoc_depozit !== undefined) {
            await this.adjustStock(storeId, productId, 'depozit', input.stoc_depozit, userId);
        }
        if (input.stoc_magazin !== undefined) {
            await this.adjustStock(storeId, productId, 'magazin', input.stoc_magazin, userId);
        }
    },

    /**
     * Helper pentru ajustare stoc prin loturi compatibile.
     */
    async adjustStock(storeId: string, productId: string, zone: 'depozit' | 'magazin', targetQty: number, userId?: string) {
        if (targetQty < 0) throw new Error("Stocul nu poate fi negativ.");

        // Calculăm stocul curent în zonă
        const { data: currentBatches } = await supabase
            .from('stock_batches')
            .select('quantity')
            .eq('product_id', productId)
            .eq('zone', zone);
        
        const currentQty = currentBatches?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;
        const diff = targetQty - currentQty;

        if (diff === 0) return;

        // Găsim sau creăm un lot "compat-default" pentru această zonă
        const { data: batch } = await supabase
            .from('stock_batches')
            .select('id, quantity')
            .eq('product_id', productId)
            .eq('zone', zone)
            .eq('batch_number', 'compat-default')
            .maybeSingle();

        if (batch) {
            // Actualizăm lotul existent
            const newBatchQty = (Number(batch.quantity) || 0) + diff;
            const { error: bError } = await supabase
                .from('stock_batches')
                .update({ quantity: newBatchQty })
                .eq('id', batch.id);
            if (bError) throw bError;
        } else {
            // Creăm un lot nou dacă nu există (sau dacă diferența trebuie pusă undeva)
            const { error: iError } = await supabase
                .from('stock_batches')
                .insert({
                    store_id: storeId,
                    product_id: productId,
                    zone,
                    quantity: targetQty, // Dacă nu exista deloc, punem direct target-ul
                    batch_number: 'compat-default'
                });
            if (iError) throw iError;
        }

        // Înregistrăm mișcarea de stoc pentru trasabilitate
        const { error: mError } = await supabase
            .from('stock_movements')
            .insert({
                store_id: storeId,
                product_id: productId,
                type: 'inventory_adjustment',
                quantity: diff,
                target_zone: zone,
                created_by: userId
            });
        if (mError) throw mError;
    },

    /**
     * Arhivează un produs (soft delete).
     */
    async archiveProduct(storeId: string, productId: string): Promise<void> {
        const { error } = await supabase
            .from('products')
            .update({ status: 'deleted' })
            .eq('id', productId)
            .eq('store_id', storeId);

        if (error) throw error;
    },

    /**
     * Wrapper pentru compatibilitate legacy.
     */
    async deleteProductUnsafe(productId: string): Promise<void> {
        // În v2, forțăm arhivarea. Metoda primește doar id-ul în semnătura veche.
        // Încercăm să deducem store_id sau lăsăm RLS să protejeze dacă lipsește (va eșua).
        const { error } = await supabase
            .from('products')
            .update({ status: 'deleted' })
            .eq('id', productId);

        if (error) throw error;
    }
};
