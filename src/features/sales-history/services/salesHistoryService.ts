import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    SaleSummary, 
    SaleDetails, 
    SalesHistoryFilters, 
    SalesHistorySummary, 
    SaleItemDetails, 
    SalePaymentDetails, 
    SaleStatus, 
    VoidEligibility, 
    VoidSalePayload, 
    VoidSaleResult,
    ReturnEligibility,
    ReturnSalePayload,
    ReturnSaleResult,
    ReturnEligibilityItem,
    ReturnPaymentSummary,
    ReturnPreviousEntry
} from '../types';

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

interface ProductPriceJoin {
    store_id: string;
    vat_group: string | null;
    vat_percent: number | string | null;
}

interface ProductJoin {
    name: string | null;
    barcode: string | null;
    product_prices?: ProductPriceJoin | ProductPriceJoin[] | null;
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
    vat_group: string | null;
    vat_rate: number | string | null;
    price_includes_vat: boolean | null;
    price_without_vat: number | string | null;
    vat_amount: number | string | null;
    total_without_vat: number | string | null;
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
                vat_group,
                vat_rate,
                price_includes_vat,
                price_without_vat,
                vat_amount,
                total_without_vat,
                products (
                    name, 
                    barcode,
                    product_prices (
                        store_id,
                        vat_group,
                        vat_percent
                    )
                ),
                stock_batches (batch_number, expiry_date, purchase_price)
            `)
            .eq('sale_id', saleId)
            .eq('store_id', storeId);

        if (iError) throw iError;
        const itemsData = (itemsDataRaw as unknown as SaleItemDetailsRow[]) || [];

        const items: SaleItemDetails[] = itemsData.map((i) => {
            const product = pickFirst(i.products);
            const batch = pickFirst(i.stock_batches);

            const vatGroup = (i.vat_group as 'A' | 'B' | 'C' | 'D' | 'E' | null) || null;
            const vatRate = i.vat_rate !== null && i.vat_rate !== undefined ? Number(i.vat_rate) : null;
            const priceIncludesVat = i.price_includes_vat !== null && i.price_includes_vat !== undefined ? Boolean(i.price_includes_vat) : null;
            const priceWithoutVatRaw = i.price_without_vat !== null && i.price_without_vat !== undefined ? Number(i.price_without_vat) : null;
            const vatAmountRaw = i.vat_amount !== null && i.vat_amount !== undefined ? Number(i.vat_amount) : null;
            const totalWithoutVatRaw = i.total_without_vat !== null && i.total_without_vat !== undefined ? Number(i.total_without_vat) : null;

            const hasVatSnapshot = vatGroup !== null && vatRate !== null;

            let finalVatGroup = vatGroup;
            let finalVatRate = vatRate;
            let finalPriceIncludesVat = priceIncludesVat;
            let finalPriceWithoutVat = priceWithoutVatRaw;
            let finalVatAmount = vatAmountRaw;
            let finalTotalWithoutVat = totalWithoutVatRaw;
            let vatSnapshotAvailable = false;
            let vatIsFallback = false;
            let vatDisplayLabel = 'TVA indisponibil';

            const unitPrice = toNumberStrict(i.unit_price, 'pret');
            const totalItem = toNumberStrict(i.total_item, 'total linie');

            if (hasVatSnapshot) {
                vatSnapshotAvailable = true;
                vatIsFallback = false;
                vatDisplayLabel = `${finalVatGroup} — ${finalVatRate}%`;
            } else {
                // Legacy fallback: locate current product price configuration for this store
                const prices = product?.product_prices;
                const pricesArray = Array.isArray(prices) ? prices : (prices ? [prices] : []);
                const storePrice = pricesArray.find((p: any) => p.store_id === storeId) || pricesArray[0];
                const fallbackVatGroup = (storePrice?.vat_group as 'A' | 'B' | 'C' | 'D' | 'E' | null) || null;
                const fallbackVatRate = storePrice?.vat_percent !== undefined && storePrice?.vat_percent !== null ? Number(storePrice.vat_percent) : null;

                if (fallbackVatGroup !== null && fallbackVatRate !== null) {
                    vatSnapshotAvailable = false;
                    vatIsFallback = true;
                    finalVatGroup = fallbackVatGroup;
                    finalVatRate = fallbackVatRate;
                    finalPriceIncludesVat = true; // Legacy sales are assumed price-inclusive
                    
                    const rateDivisor = 1 + (fallbackVatRate / 100);
                    finalTotalWithoutVat = Number((totalItem / rateDivisor).toFixed(2));
                    finalVatAmount = Number((totalItem - finalTotalWithoutVat).toFixed(2));
                    finalPriceWithoutVat = Number((unitPrice / rateDivisor).toFixed(2));
                    vatDisplayLabel = `Estimativ (${fallbackVatGroup} — ${fallbackVatRate}%)`;
                } else {
                    vatSnapshotAvailable = false;
                    vatIsFallback = false;
                    vatDisplayLabel = 'TVA indisponibil';
                }
            }

            return {
                id: i.id,
                productId: i.product_id,
                productName: product?.name || 'Produs Șters',
                barcode: product?.barcode || '',
                quantity: toNumberStrict(i.quantity, 'cantitate'),
                unitPrice,
                totalItem,
                batchId: i.batch_id,
                batchNumber: batch?.batch_number || null,
                expiryDate: batch?.expiry_date || null,
                purchasePrice: batch?.purchase_price ? toNumberStrict(batch.purchase_price, 'achizitie') : null,
                // Extended VAT fields
                vatGroup: finalVatGroup,
                vatRate: finalVatRate,
                priceIncludesVat: finalPriceIncludesVat,
                priceWithoutVat: finalPriceWithoutVat,
                vatAmount: finalVatAmount,
                totalWithoutVat: finalTotalWithoutVat,
                vatSnapshotAvailable,
                vatIsFallback,
                vatDisplayLabel
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
    },

    async getSaleVoidEligibility(storeId: string, profileId: string, saleId: string): Promise<VoidEligibility> {
        const { data, error } = await supabase.rpc('get_sale_void_eligibility', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_sale_id: saleId
        });

        if (error) throw error;

        const raw = data as any;
        if (!raw || typeof raw !== 'object') {
            throw new Error('Răspuns invalid de la server la verificarea eligibilității.');
        }

        // Defensive parsing for items summary
        const rawItems = Array.isArray(raw.items_summary) ? raw.items_summary : [];
        const itemsSummary = rawItems.map((item: any) => ({
            productId: String(item?.product_id || ''),
            productName: String(item?.product_name || 'Produs necunoscut'),
            quantity: toNumberSafe(item?.quantity, 0),
            unitPrice: toNumberSafe(item?.unit_price, 0),
            totalItem: toNumberSafe(item?.total_item, 0)
        }));

        // Defensive parsing for payments summary
        const rawPayments = Array.isArray(raw.payments_summary) ? raw.payments_summary : [];
        const paymentsSummary = rawPayments.map((p: any) => ({
            method: String(p?.method || 'unknown'),
            amount: toNumberSafe(p?.amount, 0)
        }));

        return {
            saleId: String(raw.sale_id || saleId),
            status: (raw.status || 'finalized') as SaleStatus,
            total: toNumberSafe(raw.total, 0),
            shiftId: raw.shift_id ? String(raw.shift_id) : null,
            shiftStatus: raw.shift_status ? String(raw.shift_status) : null,
            canVoid: Boolean(raw.can_void),
            reasonIfNot: raw.reason_if_not ? String(raw.reason_if_not) : null,
            itemsSummary,
            paymentsSummary
        };
    },

    async voidSale(payload: VoidSalePayload): Promise<VoidSaleResult> {
        const reasonClean = payload.reason?.trim();
        if (!reasonClean) {
            throw new Error('Motivul anulării este obligatoriu.');
        }
        if (!payload.storeId || !payload.profileId || !payload.saleId) {
            throw new Error('Informații de identificare lipsă.');
        }

        try {
            const { data, error } = await supabase.rpc('void_sale', {
                p_store_id: payload.storeId,
                p_profile_id: payload.profileId,
                p_sale_id: payload.saleId,
                p_reason: reasonClean,
                p_notes: payload.notes || null
            });

            if (error) {
                throw error;
            }

            return {
                returnId: String(data)
            };
        } catch (err: any) {
            const errMsg = String(err?.message || '').toLowerCase();
            if (errMsg.includes('motivul') || errMsg.includes('nu poate fi gol')) {
                throw new Error('Motivul anulării este obligatoriu.');
            }
            if (errMsg.includes('tura închisă') || errMsg.includes('tura în care s-a emis bonul este închisă') || (errMsg.includes('tura') && (errMsg.includes('closed') || errMsg.includes('închisă') || errMsg.includes('anulată')))) {
                throw new Error('Bonul poate fi anulat doar cât timp tura aferentă este deschisă.');
            }
            if (errMsg.includes('finalizate') || errMsg.includes('status curent') || errMsg.includes('finalized')) {
                throw new Error('Doar bonurile finalizate pot fi anulate.');
            }
            if (errMsg.includes('există deja') || errMsg.includes('retur sau anulare finalizată') || errMsg.includes('completed')) {
                throw new Error('Există deja o anulare sau un retur pentru acest bon.');
            }
            throw new Error('Bonul nu a putut fi anulat.');
        }
    },

    async getSaleReturnEligibility(storeId: string, profileId: string, saleId: string): Promise<ReturnEligibility> {
        if (!storeId || !profileId || !saleId) {
            throw new Error('Informații de identificare lipsă.');
        }

        const { data, error } = await supabase.rpc('get_sale_return_eligibility', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_sale_id: saleId
        });

        if (error) throw error;

        const raw = data as unknown;
        if (!raw || typeof raw !== 'object') {
            throw new Error('Răspuns invalid de la server la verificarea eligibilității returului.');
        }

        const record = raw as Record<string, unknown>;

        // Parse items
        const rawItems = Array.isArray(record.items) ? record.items : [];
        const items: ReturnEligibilityItem[] = rawItems.map((item: unknown) => {
            const i = item as Record<string, unknown>;
            return {
                saleItemId: String(i.sale_item_id || ''),
                productId: String(i.product_id || ''),
                productName: String(i.product_name || 'Produs necunoscut'),
                barcode: i.barcode ? String(i.barcode) : null,
                batchId: i.batch_id ? String(i.batch_id) : null,
                quantitySold: toNumberSafe(i.quantity_sold, 0),
                quantityReturned: toNumberSafe(i.quantity_returned, 0),
                quantityAvailableToReturn: toNumberSafe(i.quantity_available_to_return, 0),
                unitPrice: toNumberSafe(i.unit_price, 0),
                totalItem: toNumberSafe(i.total_item, 0)
            };
        });

        // Parse payments
        const rawPayments = Array.isArray(record.payments) ? record.payments : [];
        const payments: ReturnPaymentSummary[] = rawPayments.map((p: unknown) => {
            const pay = p as Record<string, unknown>;
            return {
                id: pay.id ? String(pay.id) : undefined,
                method: String(pay.method || 'unknown'),
                amount: toNumberSafe(pay.amount, 0)
            };
        });

        // Parse previous returns
        const rawPrevReturns = Array.isArray(record.previous_returns) ? record.previous_returns : [];
        const previousReturns: ReturnPreviousEntry[] = rawPrevReturns.map((r: unknown) => {
            const ret = r as Record<string, unknown>;
            const refundMethod = String(ret.refund_method || 'cash');
            return {
                id: String(ret.id || ''),
                createdAt: String(ret.created_at || ''),
                totalRefund: toNumberSafe(ret.total_refund, 0),
                refundMethod: (['cash', 'card', 'voucher', 'mixed'].includes(refundMethod) ? refundMethod : 'cash') as 'cash' | 'card' | 'voucher' | 'mixed',
                reason: String(ret.reason || '')
            };
        });

        // Parse allowed refund methods
        const rawAllowedRefundMethods = Array.isArray(record.allowed_refund_methods) ? record.allowed_refund_methods : [];
        const allowedRefundMethods = rawAllowedRefundMethods
            .map((m: unknown) => String(m))
            .filter((m): m is 'cash' | 'card' | 'voucher' => ['cash', 'card', 'voucher'].includes(m));

        return {
            saleId: String(record.sale_id || saleId),
            status: (record.status || 'finalized') as SaleStatus,
            total: toNumberSafe(record.total, 0),
            paymentMethod: record.payment_method ? String(record.payment_method) : null,
            canReturn: Boolean(record.can_return),
            reasonIfNot: record.reason_if_not ? String(record.reason_if_not) : null,
            items,
            payments,
            previousReturns,
            allowedRefundMethods
        };
    },

    async returnSaleItems(payload: ReturnSalePayload): Promise<ReturnSaleResult> {
        const reasonClean = payload.reason?.trim();
        if (!reasonClean || reasonClean.length < 3) {
            throw new Error('Motivul returului este obligatoriu și trebuie să aibă cel puțin 3 caractere.');
        }
        if (!payload.items || payload.items.length === 0) {
            throw new Error('Trebuie să selectați cel puțin un produs pentru retur.');
        }
        payload.items.forEach(item => {
            if (item.quantity <= 0) {
                throw new Error('Cantitatea returnată trebuie să fie mai mare decât 0.');
            }
        });
        if (!['cash', 'card', 'voucher'].includes(payload.refundMethod)) {
            throw new Error('Metoda de rambursare selectată este invalidă.');
        }
        if (!payload.storeId || !payload.profileId || !payload.saleId) {
            throw new Error('Informații de identificare lipsă.');
        }

        try {
            const { data, error } = await supabase.rpc('return_sale_items', {
                p_store_id: payload.storeId,
                p_profile_id: payload.profileId,
                p_sale_id: payload.saleId,
                p_items: payload.items.map(i => ({
                    sale_item_id: i.saleItemId,
                    quantity: i.quantity
                })),
                p_reason: reasonClean,
                p_refund_method: payload.refundMethod,
                p_notes: payload.notes ?? null
            });

            if (error) throw error;

            return {
                returnId: String(data)
            };
        } catch (err: unknown) {
            const errMsg = String((err as any)?.message || '').toLowerCase();
            if (errMsg.includes('tură') || errMsg.includes('tura') || errMsg.includes('shift')) {
                throw new Error('Deschide o tură înainte de a procesa returul.');
            }
            if (errMsg.includes('acces') || errMsg.includes('permisiuni') || errMsg.includes('role') || errMsg.includes('permission')) {
                throw new Error('Doar managerii sau administratorii pot procesa retururi.');
            }
            if (errMsg.includes('cantitate') || errMsg.includes('available') || errMsg.includes('quantity')) {
                throw new Error('Cantitatea returnată depășește cantitatea disponibilă.');
            }
            if (errMsg.includes('lot') || errMsg.includes('batch')) {
                throw new Error('Returul nu poate fi procesat deoarece lipsește lotul original.');
            }
            if (errMsg.includes('eligibil') || errMsg.includes('status')) {
                throw new Error('Bonul nu este eligibil pentru retur.');
            }
            throw new Error('Returul nu a putut fi procesat.');
        }
    }
};
