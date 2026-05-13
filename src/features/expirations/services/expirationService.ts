import { supabase } from '../../../shared/supabase/supabaseClient';
import { ExpirationItem, ExpirationStatus } from '../types';

/**
 * Interfețe locale pentru maparea corectă a datelor din DB
 */
interface ProductLookupRow {
    id: string;
    name: string;
    barcode: string;
    unit: string;
}

interface StockBatchExpirationRow {
    id: string;
    product_id: string;
    zone: 'depozit' | 'magazin';
    quantity: number | string;
    batch_number: string | null;
    expiry_date: string;
    purchase_price: number | string | null;
    created_at?: string;
}

type ProductMap = Record<string, ProductLookupRow>;

/**
 * Helper pentru conversie numerică strictă.
 */
const toNumberStrict = (value: unknown, fieldName: string): number => {
    const n = Number(value);
    if (isNaN(n)) {
        throw new Error(`Valoare numerică invalidă pentru ${fieldName}.`);
    }
    return n;
};

export const expirationService = {
    /**
     * Listează loturile cu dată de expirare din gestiune.
     */
    async listExpirations(storeId: string): Promise<ExpirationItem[]> {
        if (!storeId) return [];

        // 1. Citește loturile cu stoc și dată expirare
        const { data: batchesRaw, error: bError } = await supabase
            .from('stock_batches')
            .select('id, product_id, zone, quantity, batch_number, expiry_date, purchase_price, created_at')
            .eq('store_id', storeId)
            .gt('quantity', 0)
            .not('expiry_date', 'is', null);

        if (bError) throw bError;
        
        const batches = (batchesRaw || []) as StockBatchExpirationRow[];
        if (batches.length === 0) return [];

        // 2. Citește produsele pentru denumiri
        const productIds = Array.from(new Set(batches.map(b => b.product_id)));
        const { data: productsRaw, error: pError } = await supabase
            .from('products')
            .select('id, name, barcode, unit')
            .in('id', productIds);

        if (pError) throw pError;

        const productMap: ProductMap = (productsRaw || []).reduce((acc, p: ProductLookupRow) => {
            acc[p.id] = p;
            return acc;
        }, {} as ProductMap);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items: ExpirationItem[] = batches.map(batch => {
            // Fallback sigur pentru produs lipsă
            const product = productMap[batch.product_id] || { 
                id: batch.product_id,
                name: 'Produs necunoscut', 
                barcode: '-', 
                unit: 'buc' 
            };

            const expDate = new Date(batch.expiry_date);
            expDate.setHours(0, 0, 0, 0);

            const diffTime = expDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status: ExpirationStatus = 'ok';
            if (daysUntilExpiry < 0) status = 'expired';
            else if (daysUntilExpiry <= 7) status = 'critical';
            else if (daysUntilExpiry <= 30) status = 'warning';

            // Validări numerice defensive
            const quantity = toNumberStrict(batch.quantity, 'cantitate lot');
            const purchasePrice = batch.purchase_price !== null 
                ? toNumberStrict(batch.purchase_price, 'preț achiziție lot') 
                : null;
            
            const estimatedValue = purchasePrice !== null ? quantity * purchasePrice : 0;

            return {
                batchId: batch.id,
                productId: batch.product_id,
                productName: product.name,
                barcode: product.barcode,
                unit: product.unit,
                zone: batch.zone,
                quantity,
                batchNumber: batch.batch_number,
                expiryDate: batch.expiry_date,
                daysUntilExpiry,
                status,
                purchasePrice,
                estimatedValue
            };
        });

        // Sortare: expired -> critical -> warning -> ok -> expiryDate asc
        const statusOrder: Record<ExpirationStatus, number> = {
            'expired': 0,
            'critical': 1,
            'warning': 2,
            'ok': 3
        };

        return items.sort((a, b) => {
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });
    }
};
