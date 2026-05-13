import { supabase } from '../../../shared/supabase/supabaseClient';
import { SaleSummary, SaleDetails, SalesHistoryFilters, SalesHistorySummary, SaleItemDetails, SalePaymentDetails } from '../types';

/**
 * Tipurile locale pentru răspunsurile Supabase (Joins)
 */
interface ProfileJoin {
    full_name: string | null;
}

interface PaymentJoin {
    id?: string;
    amount: number | string;
    method: string;
    created_at?: string;
}

interface SaleItemJoin {
    id: string;
}

interface SaleListRow {
    id: string;
    created_at: string;
    total: number | string;
    payment_method: string;
    status: string;
    profiles: ProfileJoin | ProfileJoin[] | null;
    sale_items: SaleItemJoin[] | null;
    payments: PaymentJoin[] | null;
}

interface ProductJoin {
    name: string | null;
    barcode: string | null;
}

interface BatchJoin {
    batch_number: string | null;
    expiry_date: string | null;
    purchase_price: number | string | null;
}

interface SaleItemDetailsRow {
    id: string;
    product_id: string;
    quantity: number | string;
    unit_price: number | string;
    total_item: number | string;
    batch_id: string | null;
    products: ProductJoin | ProductJoin[] | null;
    stock_batches: BatchJoin | BatchJoin[] | null;
}

interface SalePaymentRow {
    id: string;
    method: string;
    amount: number | string;
    created_at: string;
}

interface SaleDetailsRow {
    id: string;
    created_at: string;
    total: number | string;
    payment_method: string;
    status: string;
    profiles: ProfileJoin | ProfileJoin[] | null;
}

/**
 * Helperi numerici și de Join
 */
const toNumberStrict = (value: unknown, fieldName: string): number => {
    const n = Number(value);
    if (isNaN(n) || !isFinite(n)) {
        throw new Error(`Valoare numerică invalidă pentru ${fieldName}.`);
    }
    return n;
};

const toNumberSafe = (value: unknown, fallback: number = 0): number => {
    const n = Number(value);
    return isNaN(n) || !isFinite(n) ? fallback : n;
};

const pickFirst = <T>(value: T | T[] | null | undefined): T | null => 
    Array.isArray(value) ? value[0] ?? null : value ?? null;

export const salesHistoryService = {
    async listSales(storeId: string, filters?: SalesHistoryFilters): Promise<SaleSummary[]> {
        if (!storeId) return [];

        let query = supabase
            .from('sales')
            .select(`
                id,
                created_at,
                total,
                payment_method,
                status,
                profiles (full_name),
                sale_items (id),
                payments (amount, method)
            `)
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (filters) {
            if (filters.dateFrom) {
                query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', `${filters.dateTo}T23:59:59.999`);
            }
            if (filters.paymentMethod !== 'all' && filters.paymentMethod) {
                query = query.eq('payment_method', filters.paymentMethod);
            }
            if (filters.status !== 'all' && filters.status) {
                query = query.eq('status', filters.status);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        const rawData = (data as unknown as SaleListRow[]) || [];

        let results: SaleSummary[] = rawData.map((s) => {
            const salePayments = s.payments || [];
            const cashAmount = salePayments
                .filter((p) => p.method === 'cash')
                .reduce((acc: number, p) => acc + toNumberSafe(p.amount, 0), 0);
            
            const cardAmount = salePayments
                .filter((p) => p.method === 'card')
                .reduce((acc: number, p) => acc + toNumberSafe(p.amount, 0), 0);

            const profile = pickFirst(s.profiles);

            return {
                id: s.id,
                createdAt: s.created_at,
                total: toNumberStrict(s.total, 'total'),
                paymentMethod: s.payment_method,
                status: s.status,
                cashierName: profile?.full_name || 'N/A',
                itemsCount: s.sale_items?.length || 0,
                paymentsTotal: cashAmount + cardAmount,
                cashPart: cashAmount,
                cardPart: cardAmount
            };
        });

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            results = results.filter(r => 
                r.id.toLowerCase().includes(searchLower) || 
                (r.cashierName && r.cashierName.toLowerCase().includes(searchLower))
            );
        }

        return results;
    },

    async getSaleDetails(storeId: string, saleId: string): Promise<SaleDetails> {
        const { data: saleData, error: sError } = await supabase
            .from('sales')
            .select(`
                id,
                created_at,
                total,
                payment_method,
                status,
                profiles (full_name)
            `)
            .eq('id', saleId)
            .eq('store_id', storeId)
            .single();

        if (sError) throw sError;
        const sale = saleData as unknown as SaleDetailsRow;

        const { data: itemsDataRaw, error: iError } = await supabase
            .from('sale_items')
            .select(`
                id,
                product_id,
                quantity,
                unit_price,
                total_item,
                batch_id,
                products (name, barcode),
                stock_batches (batch_number, expiry_date, purchase_price)
            `)
            .eq('sale_id', saleId)
            .eq('store_id', storeId);

        if (iError) throw iError;
        const itemsData = (itemsDataRaw as unknown as SaleItemDetailsRow[]) || [];

        const items: SaleItemDetails[] = itemsData.map((i) => {
            const product = pickFirst(i.products);
            const batch = pickFirst(i.stock_batches);

            return {
                id: i.id,
                productId: i.product_id,
                productName: product?.name || 'Produs Șters',
                barcode: product?.barcode || '',
                quantity: toNumberStrict(i.quantity, 'cantitate'),
                unitPrice: toNumberStrict(i.unit_price, 'pret'),
                totalItem: toNumberStrict(i.total_item, 'total linie'),
                batchId: i.batch_id,
                batchNumber: batch?.batch_number || null,
                expiryDate: batch?.expiry_date || null,
                purchasePrice: batch?.purchase_price ? toNumberStrict(batch.purchase_price, 'achizitie') : null
            };
        });

        const { data: paymentsDataRaw, error: pError } = await supabase
            .from('payments')
            .select('*')
            .eq('sale_id', saleId)
            .eq('store_id', storeId);

        if (pError) throw pError;
        const paymentsData = (paymentsDataRaw as unknown as SalePaymentRow[]) || [];

        const payments: SalePaymentDetails[] = paymentsData.map((p) => ({
            id: p.id,
            method: p.method,
            amount: toNumberStrict(p.amount, 'suma plata'),
            createdAt: p.created_at
        }));

        const profile = pickFirst(sale.profiles);

        return {
            id: sale.id,
            createdAt: sale.created_at,
            total: toNumberStrict(sale.total, 'total sale'),
            paymentMethod: sale.payment_method,
            status: sale.status,
            cashierName: profile?.full_name || 'N/A',
            items,
            payments
        };
    },

    getSalesSummary(sales: SaleSummary[]): SalesHistorySummary {
        const salesCount = sales.length;
        const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
        const cashTotal = sales.reduce((acc, s) => acc + s.cashPart, 0);
        const cardTotal = sales.reduce((acc, s) => acc + s.cardPart, 0);
        
        return {
            salesCount,
            totalRevenue,
            cashTotal,
            cardTotal,
            averageSale: salesCount > 0 ? totalRevenue / salesCount : 0
        };
    }
};
