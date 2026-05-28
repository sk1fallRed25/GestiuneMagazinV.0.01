import { supabase } from '../../../shared/supabase/supabaseClient';
import { FastAddProductPayload, FastAddResult } from '../types';
import { VatGroupKey } from '../../products/types';
import { generateInternalBarcodeCandidate, isValidEan13 } from '../../products/utils/barcodeGenerator';

const assertFiniteNonNegative = (value: number, fieldLabel: string) => {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${fieldLabel} trebuie să fie un număr valid, mai mare sau egal cu 0.`);
    }
};

/**
 * Verifică dacă există deja un produs activ cu barcode-ul dat în magazin.
 * Read-only — nu modifică DB.
 */
export async function barcodeExists(storeId: string, barcode: string): Promise<boolean> {
    if (!storeId || !barcode) return false;
    const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('barcode', barcode)
        .neq('status', 'deleted')
        .maybeSingle();
    if (error) {
        console.error('barcodeExists error:', error);
        return false; // fail-open: nu blocăm generarea
    }
    return data !== null;
}

/**
 * Generează un cod de bare intern EAN-13 unic în magazin, cu retry.
 * Încearcă de max `maxRetries` ori, aruncând eroare dacă nu reușește.
 */
export async function generateUniqueInternalBarcode(
    storeId: string,
    maxRetries: number = 5
): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const candidate = generateInternalBarcodeCandidate(attempt);
        if (!isValidEan13(candidate)) continue;
        const conflict = await barcodeExists(storeId, candidate);
        if (!conflict) return candidate;
        // Mică pauză între retry-uri pentru diversitate timestamp
        await new Promise(res => setTimeout(res, 2));
    }
    throw new Error('Nu s-a putut genera un cod unic. Încearcă din nou.');
}



export const fastAddService = {
    async createFastProduct(payload: FastAddProductPayload): Promise<FastAddResult> {
        // Validări
        if (!payload.storeId) throw new Error("Store ID lipsă.");
        if (!payload.name) throw new Error("Nume produs lipsă.");
        if (!payload.barcode) throw new Error("Cod de bare lipsă.");
        
        const unit = payload.unit || 'buc';
        assertFiniteNonNegative(payload.priceSale, 'Prețul de vânzare');
        assertFiniteNonNegative(payload.pricePurchase, 'Prețul de achiziție');
        assertFiniteNonNegative(payload.vatPercent, 'TVA');
        assertFiniteNonNegative(payload.initialStock, 'Stocul inițial');

        if (payload.stockZone !== 'depozit' && payload.stockZone !== 'magazin') {
            throw new Error("Zona de stoc trebuie să fie depozit sau magazin.");
        }

        let productId: string;
        let createdProduct = false;
        let createdPrice = false;
        let createdInitialStock = false;

        // 1. Verificare produs existent
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('id, name')
            .eq('store_id', payload.storeId)
            .eq('barcode', payload.barcode)
            .neq('status', 'deleted')
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingProduct) {
            productId = existingProduct.id;
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    sgr_enabled: payload.sgrEnabled ?? false,
                    sgr_type: payload.sgrType ?? null
                })
                .eq('id', productId);
            if (updateError) throw updateError;
        } else {
            // Inserare produs nou
            const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert([{
                    store_id: payload.storeId,
                    name: payload.name,
                    barcode: payload.barcode,
                    unit: unit,
                    status: 'active',
                    category_id: payload.categoryId ?? null,
                    sgr_enabled: payload.sgrEnabled ?? false,
                    sgr_type: payload.sgrType ?? null
                }])
                .select('id')
                .single();

            if (insertError) throw insertError;
            if (!newProduct) throw new Error("Produsul nu a putut fi creat.");
            
            productId = newProduct.id;
            createdProduct = true;
        }

        // 2. Upsert prețuri
        let vatGroup = payload.vatGroup || 'A';
        const validGroups: VatGroupKey[] = ['A', 'B', 'C', 'D', 'E'];
        if (!validGroups.includes(vatGroup)) {
            vatGroup = 'A';
        }
        const rates: Record<VatGroupKey, number> = {
            A: 21,
            B: 11,
            C: 11,
            D: 0,
            E: 0
        };
        const vatPercent = rates[vatGroup] || 21;

        const { error: priceError } = await supabase
            .from('product_prices')
            .upsert([{
                store_id: payload.storeId,
                product_id: productId,
                price_sale: payload.priceSale,
                price_purchase: payload.pricePurchase,
                vat_percent: vatPercent,
                vat_group: vatGroup,
                updated_at: new Date().toISOString()
            }], { onConflict: 'store_id,product_id' });

        if (priceError) throw priceError;
        createdPrice = true;

        // 3. Adăugare stoc inițial (doar dacă > 0)
        if (payload.initialStock > 0) {
            const batchNum = payload.batchNumber?.trim() || 'fast-add';
            
            const { data: newBatch, error: batchError } = await supabase
                .from('stock_batches')
                .insert([{
                    store_id: payload.storeId,
                    product_id: productId,
                    batch_number: batchNum,
                    expiry_date: payload.expiryDate || null,
                    zone: payload.stockZone,
                    quantity: payload.initialStock,
                    purchase_price: payload.pricePurchase
                }])
                .select('id')
                .single();

            if (batchError) throw batchError;
            if (!newBatch) throw new Error("Lotul de stoc nu a putut fi creat.");

            const { error: moveError } = await supabase
                .from('stock_movements')
                .insert([{
                    store_id: payload.storeId,
                    product_id: productId,
                    batch_id: newBatch.id,
                    type: 'inventory_adjustment',
                    quantity: payload.initialStock,
                    source_zone: 'external',
                    target_zone: payload.stockZone,
                    reference_id: null,
                    created_by: payload.profileId || null
                }]);

            if (moveError) throw moveError;
            createdInitialStock = true;
        }

        return {
            productId,
            createdProduct,
            createdPrice,
            createdInitialStock
        };
    }
};
