import { supabase } from '../../../shared/supabase/supabaseClient';
import { SaleSummary, SaleDetails, SalesHistoryFilters, SalesHistorySummary, SaleItemDetails, SalePaymentDetails } from '../types';

const toNumberStrict = (value: unknown, fieldName: string): number => {
    const n = Number(value);
    if (isNaN(n)) return 0;
    return n;
};

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

        let results: SaleSummary[] = (data || []).map((s: any) => {
            const salePayments = s.payments || [];
            const cashAmount = salePayments
                .filter((p: any) => p.method === 'cash')
                .reduce((acc: number, p: any) => acc + toNumberStrict(p.amount, 'cash'), 0);
            const cardAmount = salePayments
                .filter((p: any) => p.method === 'card')
                .reduce((acc: number, p: any) => acc + toNumberStrict(p.amount, 'card'), 0);

            // Handle profiles as object or array
            const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;

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
            } as any; // Cast as any for intermediate summary info
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
        const { data: sale, error: sError } = await supabase
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

        const { data: itemsData, error: iError } = await supabase
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

        const items: SaleItemDetails[] = (itemsData || []).map((i: any) => ({
            id: i.id,
            productId: i.product_id,
            productName: i.products?.name || 'Produs Șters',
            barcode: i.products?.barcode || '',
            quantity: toNumberStrict(i.quantity, 'cantitate'),
            unitPrice: toNumberStrict(i.unit_price, 'pret'),
            totalItem: toNumberStrict(i.total_item, 'total linie'),
            batchId: i.batch_id,
            batchNumber: i.stock_batches?.batch_number || null,
            expiryDate: i.stock_batches?.expiry_date || null,
            purchasePrice: i.stock_batches?.purchase_price ? toNumberStrict(i.stock_batches.purchase_price, 'achizitie') : null
        }));

        const { data: paymentsData, error: pError } = await supabase
            .from('payments')
            .select('*')
            .eq('sale_id', saleId)
            .eq('store_id', storeId);

        if (pError) throw pError;

        const payments: SalePaymentDetails[] = (paymentsData || []).map((p: any) => ({
            id: p.id,
            method: p.method,
            amount: toNumberStrict(p.amount, 'suma plata'),
            createdAt: p.created_at
        }));

        const profile = Array.isArray(sale.profiles) ? sale.profiles[0] : sale.profiles;

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

    async getSalesSummary(sales: any[]): Promise<SalesHistorySummary> {
        const salesCount = sales.length;
        const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
        const cashTotal = sales.reduce((acc, s) => acc + (s.cashPart || 0), 0);
        const cardTotal = sales.reduce((acc, s) => acc + (s.cardPart || 0), 0);
        
        return {
            salesCount,
            totalRevenue,
            cashTotal,
            cardTotal,
            averageSale: salesCount > 0 ? totalRevenue / salesCount : 0
        };
    }
};
