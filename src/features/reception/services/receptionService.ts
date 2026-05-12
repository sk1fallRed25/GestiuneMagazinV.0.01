import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    ReceptionProduct, 
    CreateReceptionPayload,
    ReceptionLine
} from '../types';

export const receptionService = {
    /**
     * Listează produsele active pentru a fi selectate în recepție.
     */
    async listReceptionProducts(storeId: string): Promise<ReceptionProduct[]> {
        if (!storeId) return [];

        const { data: products, error: pError } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .neq('status', 'deleted');

        if (pError) throw pError;
        if (!products || products.length === 0) return [];

        const { data: prices, error: prError } = await supabase
            .from('product_prices')
            .select('*')
            .eq('store_id', storeId)
            .in('product_id', products.map(p => p.id));

        if (prError) throw prError;

        return products.map(p => {
            const price = prices?.find(pr => pr.product_id === p.id);
            return {
                id: p.id,
                nume: p.name,
                cod_bare: p.barcode,
                um: p.unit,
                pret_vanzare: Number(price?.price_sale) || 0,
                pret_achizitie: Number(price?.price_purchase) || 0
            };
        });
    },

    /**
     * Creează o recepție completă (receptions, items, stocks, prices, movements).
     * NOTĂ: Ideal, acest flux ar trebui mutat într-un RPC (funcție PostgreSQL) pentru atomicitate.
     */
    async createReception(payload: CreateReceptionPayload): Promise<string> {
        const { storeId, profileId, document, lines } = payload;

        // 1. Validări de bază
        if (!storeId || !profileId) throw new Error("Informații magazin/utilizator lipsă.");
        if (!document.documentNumber) throw new Error("Numărul documentului este obligatoriu.");
        if (lines.length === 0) throw new Error("Recepția trebuie să conțină cel puțin o linie.");

        const totalValue = lines.reduce((acc, l) => acc + (l.quantity * l.purchasePrice), 0);

        // 2. Inserare Header Recepție
        const { data: reception, error: rError } = await supabase
            .from('receptions')
            .insert({
                store_id: storeId,
                profile_id: profileId,
                document_number: document.documentNumber,
                document_date: document.documentDate,
                total_value: totalValue,
                supplier_text: document.supplierText,
                supplier_cui: document.supplierCui,
                observations: document.observations
            })
            .select()
            .single();

        if (rError) throw rError;

        // 3. Procesare Linii
        for (const line of lines) {
            if (line.quantity <= 0) throw new Error(`Cantitate invalidă pentru produsul ${line.productName}`);

            // A. Inserare Reception Item
            const { error: riError } = await supabase
                .from('reception_items')
                .insert({
                    store_id: storeId,
                    reception_id: reception.id,
                    product_id: line.productId,
                    quantity: line.quantity,
                    purchase_price: line.purchasePrice,
                    sale_price_new: line.salePrice,
                    vat_percent: line.vatPercent,
                    batch_number: line.batchNumber || document.documentNumber,
                    expiry_date: line.expiryDate || null
                });
            if (riError) throw riError;

            // B. Gestionare Stock Batch
            // Căutăm dacă există deja un batch identic (store + product + zone + batch_num + expiry)
            const batchNum = line.batchNumber || document.documentNumber;
            const expiryDate = line.expiryDate || null;

            let query = supabase
                .from('stock_batches')
                .select('*')
                .eq('store_id', storeId)
                .eq('product_id', line.productId)
                .eq('zone', 'depozit')
                .eq('batch_number', batchNum);
            
            if (expiryDate) {
                query = query.eq('expiry_date', expiryDate);
            } else {
                query = query.is('expiry_date', null);
            }

            const { data: existingBatch } = await query.maybeSingle();

            let batchId: string;

            if (existingBatch) {
                const newQty = Number(existingBatch.quantity) + line.quantity;
                const { error: ubError } = await supabase
                    .from('stock_batches')
                    .update({ quantity: newQty, purchase_price: line.purchasePrice })
                    .eq('id', existingBatch.id);
                if (ubError) throw ubError;
                batchId = existingBatch.id;
            } else {
                const { data: newBatch, error: ibError } = await supabase
                    .from('stock_batches')
                    .insert({
                        store_id: storeId,
                        product_id: line.productId,
                        zone: 'depozit',
                        quantity: line.quantity,
                        batch_number: batchNum,
                        expiry_date: expiryDate,
                        purchase_price: line.purchasePrice
                    })
                    .select()
                    .single();
                if (ibError) throw ibError;
                batchId = newBatch.id;
            }

            // C. Inserare Stock Movement
            const { error: mError } = await supabase
                .from('stock_movements')
                .insert({
                    store_id: storeId,
                    product_id: line.productId,
                    batch_id: batchId,
                    type: 'reception',
                    quantity: line.quantity,
                    source_zone: 'external',
                    target_zone: 'depozit',
                    reference_id: reception.id,
                    created_by: profileId
                });
            if (mError) throw mError;

            // D. Upsert Product Price
            const { error: prError } = await supabase
                .from('product_prices')
                .upsert({
                    store_id: storeId,
                    product_id: line.productId,
                    price_sale: line.salePrice,
                    price_purchase: line.purchasePrice,
                    vat_percent: line.vatPercent,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'store_id,product_id' });
            if (prError) throw prError;
        }

        return reception.id;
    }
};
