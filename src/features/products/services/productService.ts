import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    Product, 
    ProductUpdateInput, 
    ProductDbRow, 
    VatGroupKey,
    ProductVatGroup,
    ProductVatConfig
} from '../types';


type ProductCoreUpdate = Partial<Pick<ProductDbRow, 'name' | 'barcode' | 'unit' | 'status'>>;

const vatGroupToLegacyPercent = (group: VatGroupKey): number => {
    const rates: Record<VatGroupKey, number> = {
        A: 21,
        B: 11,
        C: 11,
        D: 0,
        E: 0
    };
    return rates[group] || 21;
};

export const productService = {
    /**
     * Încarcă configurația fiscală de TVA a magazinului.
     */
    async getProductVatConfig(storeId: string): Promise<ProductVatConfig> {
        if (!storeId) {
            throw new Error("Selectează un magazin pentru a configura produsele.");
        }

        const { data, error } = await supabase.rpc('get_product_vat_config', {
            p_store_id: storeId
        });

        if (error) {
            console.error("Error get_product_vat_config:", error);
            throw new Error(error.message || "Nu s-a putut încărca configurația TVA.");
        }

        if (!data) {
            throw new Error("Configurația TVA nu a fost returnată de server.");
        }

        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const vatPayer = !!parsed.vat_payer;
            let defaultVatGroup = (parsed.default_vat_group || 'A') as VatGroupKey;
            const priceTaxPolicy = parsed.price_tax_policy || 'inclusive';

            const rawGroups = parsed.vat_groups || {};
            const vatGroups: Record<VatGroupKey, ProductVatGroup> = {
                A: { rate: 21, label: 'TVA standard', fiscalCode: 'A', active: true },
                B: { rate: 11, label: 'TVA redus', fiscalCode: 'B', active: true },
                C: { rate: 11, label: 'TVA redus', fiscalCode: 'C', active: true },
                D: { rate: 0, label: 'TVA zero', fiscalCode: 'D', active: true },
                E: { rate: 0, label: 'Neplătitor TVA', fiscalCode: 'E', active: true }
            };

            const keys: VatGroupKey[] = ['A', 'B', 'C', 'D', 'E'];
            keys.forEach(k => {
                const g = rawGroups[k];
                if (g) {
                    vatGroups[k] = {
                        rate: typeof g.rate === 'number' ? g.rate : Number(g.rate) || 0,
                        label: g.label || vatGroups[k].label,
                        fiscalCode: k,
                        active: g.active !== undefined ? !!g.active : true
                    };
                }
            });

            if (!vatPayer) {
                defaultVatGroup = 'E';
            } else if (defaultVatGroup === 'E') {
                defaultVatGroup = 'A';
            }

            return {
                vatPayer,
                defaultVatGroup,
                priceTaxPolicy,
                vatGroups
            };
        } catch (e) {
            console.error("Parsing error in getProductVatConfig:", e);
            throw new Error("Format invalid pentru configurația TVA.");
        }
    },

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

        // 3. Luăm loturile de stoc - filtrat per magazin
        const { data: stocksData, error: sError } = await supabase
            .from('stock_batches')
            .select('*')
            .eq('store_id', storeId)
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
                status: p.status,
                vatGroup: (price?.vat_group as VatGroupKey) || 'A',
                vatPercent: price?.vat_percent !== undefined ? Number(price.vat_percent) : 21
            };
        });
    },

    /**
     * Actualizează un produs și datele asociate (preț, stoc).
     */
    async updateProduct(storeId: string, productId: string, input: ProductUpdateInput, userId?: string): Promise<void> {
        if (!storeId || !productId) throw new Error("Store ID și Product ID sunt obligatorii.");

        // 1. Update Product core (fără any)
        const productUpdates: ProductCoreUpdate = {};
        if (input.nume !== undefined) productUpdates.name = input.nume;
        if (input.cod_bare !== undefined) productUpdates.barcode = input.cod_bare;
        if (input.um !== undefined) productUpdates.unit = input.um;
        if (input.unitate_masura !== undefined && !input.um) productUpdates.unit = input.unitate_masura;
        if (input.status !== undefined) productUpdates.status = input.status;

        if (Object.keys(productUpdates).length > 0) {
            const { error: pError } = await supabase
                .from('products')
                .update(productUpdates)
                .eq('id', productId)
                .eq('store_id', storeId);
            if (pError) throw pError;
        }

        // 2. Update/Upsert Preț cu protecție contra suprascrierii
        if (input.pret_vanzare !== undefined || input.pret_achizitie !== undefined || input.vatGroup !== undefined) {
            // Citim prețul existent
            const { data: existingPrice } = await supabase
                .from('product_prices')
                .select('*')
                .eq('store_id', storeId)
                .eq('product_id', productId)
                .maybeSingle();

            const priceSale = input.pret_vanzare !== undefined ? input.pret_vanzare : (Number(existingPrice?.price_sale) || 0);
            const pricePurchase = input.pret_achizitie !== undefined ? input.pret_achizitie : (Number(existingPrice?.price_purchase) || 0);
            
            const vatGroup = input.vatGroup || (existingPrice?.vat_group as VatGroupKey) || 'A';
            const vatPercent = input.vatGroup ? vatGroupToLegacyPercent(input.vatGroup) : (Number(existingPrice?.vat_percent) || 21);

            const { error: prError } = await supabase
                .from('product_prices')
                .upsert({
                    store_id: storeId,
                    product_id: productId,
                    price_sale: priceSale,
                    price_purchase: pricePurchase,
                    vat_percent: vatPercent,
                    vat_group: vatGroup,
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

        // 1. Verificăm toate loturile existente în această zonă
        const { data: allBatches } = await supabase
            .from('stock_batches')
            .select('*')
            .eq('store_id', storeId)
            .eq('product_id', productId)
            .eq('zone', zone);
        
        const otherBatches = allBatches?.filter(b => b.batch_number !== 'compat-default') || [];
        
        if (otherBatches.length > 0) {
            throw new Error("Stocul acestui produs este gestionat pe loturi reale. Modifică stocul prin Recepție/Transfer, nu direct din Produse.");
        }

        const compatBatch = allBatches?.find(b => b.batch_number === 'compat-default');
        const currentQty = compatBatch ? (Number(compatBatch.quantity) || 0) : 0;
        const diff = targetQty - currentQty;

        if (diff === 0) return;

        if (compatBatch) {
            // Actualizăm lotul existent
            const { error: bError } = await supabase
                .from('stock_batches')
                .update({ quantity: targetQty })
                .eq('id', compatBatch.id)
                .eq('store_id', storeId);
            if (bError) throw bError;
        } else {
            // Creăm un lot nou compat-default
            const { error: iError } = await supabase
                .from('stock_batches')
                .insert({
                    store_id: storeId,
                    product_id: productId,
                    zone,
                    quantity: targetQty,
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
        const { error } = await supabase
            .from('products')
            .update({ status: 'deleted' })
            .eq('id', productId);

        if (error) throw error;
    }
};
