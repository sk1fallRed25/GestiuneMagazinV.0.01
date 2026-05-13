import { supabase } from '../../../shared/supabase/supabaseClient';
import { ExpirationItem, ExpirationStatus } from '../types';

export const expirationService = {
    /**
     * Listează loturile cu dată de expirare din gestiune.
     */
    async listExpirations(storeId: string): Promise<ExpirationItem[]> {
        if (!storeId) return [];

        // 1. Citește loturile cu stoc și dată expirare
        const { data: batches, error: bError } = await supabase
            .from('stock_batches')
            .select('*')
            .eq('store_id', storeId)
            .gt('quantity', 0)
            .not('expiry_date', 'is', null);

        if (bError) throw bError;
        if (!batches || batches.length === 0) return [];

        // 2. Citește produsele pentru denumiri
        const productIds = Array.from(new Set(batches.map(b => b.product_id)));
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id, name, barcode, unit')
            .in('id', productIds);

        if (pError) throw pError;

        const productMap = (products || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {} as Record<string, any>);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items: ExpirationItem[] = batches.map(batch => {
            const product = productMap[batch.product_id] || { name: 'Produs Necunoscut', barcode: '-', unit: 'buc' };
            const expDate = new Date(batch.expiry_date);
            expDate.setHours(0, 0, 0, 0);

            const diffTime = expDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status: ExpirationStatus = 'ok';
            if (daysUntilExpiry < 0) status = 'expired';
            else if (daysUntilExpiry <= 7) status = 'critical';
            else if (daysUntilExpiry <= 30) status = 'warning';

            const purchasePrice = batch.purchase_price ? Number(batch.purchase_price) : null;
            const quantity = Number(batch.quantity);
            const estimatedValue = purchasePrice ? quantity * purchasePrice : 0;

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
