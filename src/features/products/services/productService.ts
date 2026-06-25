import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    Product, 
    ProductUpdateInput, 
    ProductDbRow, 
    VatGroupKey,
    ProductVatGroup,
    ProductVatConfig
} from '../types';


import { normalizeSgrType, SgrType } from '../utils/sgr';

type ProductCoreUpdate = Partial<Pick<ProductDbRow, 'name' | 'barcode' | 'unit' | 'status' | 'category_id'>> & {
    sgr_enabled?: boolean;
    sgr_type?: SgrType | null;
};

export const getStandardVatRate = (group: VatGroupKey): number => {
    const rates: Record<VatGroupKey, number> = {
        A: 21,
        B: 11,
        C: 11,
        D: 0,
        E: 0
    };
    return rates[group] ?? 21;
};

const vatGroupToLegacyPercent = (group: VatGroupKey): number => {
    return getStandardVatRate(group);
};

export const normalizeVatGroupForStore = (
    input: unknown,
    config: ProductVatConfig | null
): VatGroupKey => {
    if (config?.vatPayer === false) {
        return 'E';
    }

    const validGroups: VatGroupKey[] = ['A', 'B', 'C', 'D', 'E'];
    const isValid = (g: string): g is VatGroupKey => validGroups.includes(g as VatGroupKey);

    const inputStr = typeof input === 'string' ? input.trim().toUpperCase() : '';

    if (inputStr && isValid(inputStr)) {
        return inputStr;
    }

    const fallback = config?.defaultVatGroup;
    if (fallback && isValid(fallback)) {
        if (fallback === 'E') {
            return 'A';
        }
        return fallback;
    }

    return 'A';
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
            const parsed = (typeof data === 'string' ? JSON.parse(data) : data) as Record<string, unknown>;
            const vatPayer = !!(parsed.vatPayer ?? parsed.vat_payer ?? true);
            let defaultVatGroup = ((parsed.defaultVatGroup ?? parsed.default_vat_group ?? 'A') as string) as VatGroupKey;
            const priceTaxPolicy = ((parsed.priceTaxPolicy ?? parsed.price_tax_policy ?? 'inclusive') as 'inclusive' | 'exclusive');

            const rawGroups = (parsed.vatGroups ?? parsed.vat_groups ?? {}) as Record<string, unknown>;
            const vatGroups: Record<VatGroupKey, ProductVatGroup> = {
                A: { rate: 21, label: 'TVA standard', fiscalCode: 'A', active: true },
                B: { rate: 11, label: 'TVA redus', fiscalCode: 'B', active: true },
                C: { rate: 11, label: 'TVA redus', fiscalCode: 'C', active: true },
                D: { rate: 0, label: 'TVA zero', fiscalCode: 'D', active: true },
                E: { rate: 0, label: 'Neplătitor TVA', fiscalCode: 'E', active: true }
            };

            const keys: VatGroupKey[] = ['A', 'B', 'C', 'D', 'E'];
            keys.forEach(k => {
                const g = rawGroups[k] as Record<string, unknown> | undefined;
                if (g) {
                    const labelVal = (g.label as string) || vatGroups[k].label;
                    const fiscalCodeVal = ((g.fiscalCode ?? g.fiscal_code ?? k) as string) as VatGroupKey;
                    const activeVal = g.active !== undefined ? !!g.active : true;
                    
                    vatGroups[k] = {
                        rate: getStandardVatRate(k),
                        label: labelVal,
                        fiscalCode: fiscalCodeVal,
                        active: activeVal
                    };
                } else {
                    vatGroups[k].rate = getStandardVatRate(k);
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

        // 2. Luăm prețurile (cele mai recente per produs) în chunks pentru a evita limita URL
        const chunkSize = 100;
        const pricePromises = [];
        for (let i = 0; i < productIds.length; i += chunkSize) {
            const chunk = productIds.slice(i, i + chunkSize);
            pricePromises.push(
                supabase
                    .from('product_prices')
                    .select('*')
                    .in('product_id', chunk)
            );
        }
        const priceResults = await Promise.all(pricePromises);
        const pricesData: any[] = [];
        for (const res of priceResults) {
            if (res.error) throw res.error;
            if (res.data) pricesData.push(...res.data);
        }

        // 3. Luăm loturile de stoc - filtrat per magazin în chunks pentru a evita limita URL
        const stockPromises = [];
        for (let i = 0; i < productIds.length; i += chunkSize) {
            const chunk = productIds.slice(i, i + chunkSize);
            stockPromises.push(
                supabase
                    .from('stock_batches')
                    .select('*')
                    .eq('store_id', storeId)
                    .in('product_id', chunk)
            );
        }
        const stockResults = await Promise.all(stockPromises);
        const stocksData: any[] = [];
        for (const res of stockResults) {
            if (res.error) throw res.error;
            if (res.data) stocksData.push(...res.data);
        }

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
                vatGroup: price?.vat_group ? (price.vat_group as VatGroupKey) : undefined,
                vatPercent: price?.vat_percent !== undefined ? Number(price.vat_percent) : 21,
                sgrEnabled: !!p.sgr_enabled,
                sgrType: normalizeSgrType(p.sgr_type),
                category_id: p.category_id ?? null
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

        // SGR config logic
        if (input.sgrEnabled !== undefined || input.sgrType !== undefined) {
            const normType = normalizeSgrType(input.sgrType);
            const isEnabled = input.sgrEnabled !== undefined ? !!input.sgrEnabled : !!normType;
            productUpdates.sgr_enabled = isEnabled && normType !== null;
            productUpdates.sgr_type = productUpdates.sgr_enabled ? normType : null;
        }

        if (Object.keys(productUpdates).length > 0) {
            const { error: pError } = await supabase
                .from('products')
                .update(productUpdates)
                .eq('id', productId)
                .eq('store_id', storeId);
            if (pError) throw pError;
        }

        // 1b. Update category_id if provided
        if (input.category_id !== undefined) {
            const { error: catError } = await supabase
                .from('products')
                .update({ category_id: input.category_id })
                .eq('id', productId)
                .eq('store_id', storeId);
            if (catError) throw catError;
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
            
            let vatGroup = input.vatGroup || (existingPrice?.vat_group as VatGroupKey) || 'A';
            const validGroups: VatGroupKey[] = ['A', 'B', 'C', 'D', 'E'];
            if (!validGroups.includes(vatGroup)) {
                vatGroup = 'A';
            }
            const vatPercent = vatGroupToLegacyPercent(vatGroup);

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
        
        const currentQty = allBatches?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;
        const diff = targetQty - currentQty;

        if (Math.abs(diff) < 0.0001) return;
        
        const otherBatches = allBatches?.filter(b => b.batch_number !== 'compat-default') || [];
        
        if (otherBatches.length > 0) {
            throw new Error("Stocul acestui produs este gestionat pe loturi reale. Modifică stocul prin Recepție/Transfer, nu direct din Produse.");
        }

        const compatBatch = allBatches?.find(b => b.batch_number === 'compat-default');

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
     * Verifică dacă un produs are loturi reale (diferite de compat-default).
     */
    async hasRealBatches(storeId: string, productId: string): Promise<boolean> {
        if (!storeId || !productId) return false;
        const { data, error } = await supabase
            .from('stock_batches')
            .select('id')
            .eq('store_id', storeId)
            .eq('product_id', productId)
            .neq('batch_number', 'compat-default')
            .limit(1);
        if (error) {
            console.error("Eroare hasRealBatches check:", error);
            return false;
        }
        return !!(data && data.length > 0);
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
    },

    /**
     * Actualizează category_id pentru mai multe produse simultan (bulk move).
     */
    async bulkUpdateCategory(storeId: string, productIds: string[], categoryId: string | null): Promise<void> {
        if (!storeId || productIds.length === 0) return;

        const { error } = await supabase
            .from('products')
            .update({ category_id: categoryId })
            .eq('store_id', storeId)
            .in('id', productIds);

        if (error) throw error;
    }
};
