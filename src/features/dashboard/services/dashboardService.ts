import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    DashboardData, 
    DashboardStats, 
    RecentSale, 
    LowStockProduct, 
    ExpirationAlert, 
    SalesChartPoint, 
    WasteSummary,
    TopSellerProduct,
    SlowMoverProduct
} from '../types';

/**
 * Tipurile locale DB Row
 */
interface ProductJoin {
    name: string | null;
    barcode: string | null;
    unit: string | null;
    status: string | null;
}

interface StockBatchDashboardRow {
    id: string;
    product_id: string;
    quantity: number | string;
    purchase_price: number | string | null;
    zone: 'depozit' | 'magazin';
    batch_number: string | null;
    expiry_date: string | null;
    products: ProductJoin | ProductJoin[] | null;
}

interface RecentSaleRow {
    id: string;
    created_at: string;
    total: number | string;
    payment_method: string;
    status: string;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface SimpleSaleTotalRow {
    total: number | string;
}

interface ChartSaleRow {
    created_at: string;
    total: number | string;
}

interface WasteReasonRow {
    reason: string;
}

/**
 * Helpers
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

const normalizeZone = (value: unknown): 'depozit' | 'magazin' | null => {
    return value === 'depozit' || value === 'magazin' ? (value as 'depozit' | 'magazin') : null;
};

export const dashboardService = {
    async getDashboardData(storeId: string): Promise<DashboardData> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // A. Vânzări Azi & Profit Azi
        const { data: todaySalesRaw, error: tsError } = await supabase
            .from('sales')
            .select(`
                total,
                sale_items (
                    quantity,
                    total_item,
                    stock_batches (
                        purchase_price
                    ),
                    products (
                        product_prices (
                            store_id,
                            price_purchase
                        )
                    )
                )
            `)
            .eq('store_id', storeId)
            .eq('status', 'finalized')
            .gte('created_at', todayStart)
            .lte('created_at', todayEnd);

        if (tsError) throw tsError;
        const todaySales = (todaySalesRaw as any[]) || [];
        const todaySalesTotal = todaySales.reduce((acc, s) => acc + toNumberSafe(s.total, 0), 0);
        const todaySalesCount = todaySales.length;

        let todayProfitTotal = 0;
        todaySales.forEach(s => {
            const items = s.sale_items || [];
            items.forEach((item: any) => {
                const qty = toNumberSafe(item.quantity, 0);
                const totalItem = toNumberSafe(item.total_item, 0);
                
                let purchasePrice = 0;
                const batch = pickFirst(item.stock_batches);
                if (batch && batch.purchase_price !== null) {
                    purchasePrice = toNumberSafe(batch.purchase_price, 0);
                } else {
                    const prod = pickFirst(item.products);
                    const prices = prod ? (Array.isArray(prod.product_prices) ? prod.product_prices : [prod.product_prices]) : [];
                    const prodPrice = prices.find((pr: any) => pr && pr.store_id === storeId) || prices[0];
                    if (prodPrice && prodPrice.price_purchase !== null) {
                        purchasePrice = toNumberSafe(prodPrice.price_purchase, 0);
                    }
                }
                const cost = purchasePrice * qty;
                todayProfitTotal += (totalItem - cost);
            });
        });

        // B. Vânzări Lună
        const { data: monthSalesRaw, error: msError } = await supabase
            .from('sales')
            .select(`
                total,
                sale_items (
                    product_id,
                    quantity,
                    total_item,
                    stock_batches (
                        purchase_price
                    ),
                    products (
                        id,
                        name,
                        unit,
                        product_prices (
                            store_id,
                            price_purchase
                        )
                    )
                )
            `)
            .eq('store_id', storeId)
            .eq('status', 'finalized')
            .gte('created_at', monthStart);

        if (msError) throw msError;
        const monthSales = (monthSalesRaw as any[]) || [];
        const monthSalesTotal = monthSales.reduce((acc, s) => acc + toNumberSafe(s.total, 0), 0);

        // C. Produse Active
        const { count: activeProductsCount, error: apError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('status', 'active');

        if (apError) throw apError;

        // D. Agregare Stoc și Alerte
        const { data: allBatchesRaw, error: bError } = await supabase
            .from('stock_batches')
            .select(`
                id,
                product_id,
                quantity,
                purchase_price,
                zone,
                batch_number,
                expiry_date,
                products (name, barcode, unit, status)
            `)
            .eq('store_id', storeId)
            .gt('quantity', 0);

        if (bError) throw bError;
        const allBatches = (allBatchesRaw as unknown as StockBatchDashboardRow[]) || [];

        const stockValueEstimate = allBatches.reduce((acc, b) => {
            const price = toNumberSafe(b.purchase_price, 0);
            const qty = toNumberSafe(b.quantity, 0);
            return acc + (price * qty);
        }, 0);

        const productStockMap: Record<string, { 
            name: string; 
            barcode: string; 
            unit: string; 
            magazin: number; 
            depozit: number; 
            total: number;
            status: string;
        }> = {};

        const expirationAlerts: ExpirationAlert[] = [];
        let expiredCount = 0;
        let criticalCount = 0;

        allBatches.forEach(b => {
            const prod = pickFirst(b.products);
            const productId = b.product_id;
            const qty = toNumberSafe(b.quantity, 0);
            const zone = normalizeZone(b.zone);

            if (!zone) return; // Ignorăm zonele invalide

            if (prod && prod.status === 'active') {
                if (!productStockMap[productId]) {
                    productStockMap[productId] = {
                        name: prod.name || 'N/A',
                        barcode: prod.barcode || '',
                        unit: prod.unit || 'buc',
                        magazin: 0,
                        depozit: 0,
                        total: 0,
                        status: prod.status
                    };
                }
                if (zone === 'magazin') productStockMap[productId].magazin += qty;
                else productStockMap[productId].depozit += qty;
                productStockMap[productId].total += qty;
            }

            // Alerte expirare
            if (b.expiry_date) {
                const expDate = new Date(b.expiry_date);
                const diffTime = expDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let status: 'expired' | 'critical' | 'warning' | null = null;
                if (diffDays < 0) {
                    status = 'expired';
                    expiredCount++;
                } else if (diffDays <= 7) {
                    status = 'critical';
                    criticalCount++;
                } else if (diffDays <= 30) {
                    status = 'warning';
                }

                if (status) {
                    expirationAlerts.push({
                        batchId: b.id,
                        productId: b.product_id,
                        productName: prod?.name || 'N/A',
                        batchNumber: b.batch_number,
                        zone: zone,
                        quantity: qty,
                        expiryDate: b.expiry_date,
                        daysUntilExpiry: diffDays,
                        status
                    });
                }
            }
        });

        const lowStockProducts: LowStockProduct[] = Object.entries(productStockMap)
            .map(([id, p]) => ({
                productId: id,
                name: p.name,
                barcode: p.barcode,
                unit: p.unit,
                stockMagazin: p.magazin,
                stockDepozit: p.depozit,
                stockTotal: p.total
            }))
            .filter(p => p.stockTotal <= 5)
            .sort((a, b) => a.stockTotal - b.stockTotal)
            .slice(0, 10);

        // F. Waste Summary
        const { data: wasteEventsRaw, error: wError } = await supabase
            .from('waste_events')
            .select('reason')
            .eq('store_id', storeId)
            .gte('created_at', monthStart);

        if (wError) throw wError;
        const wasteEvents = (wasteEventsRaw as unknown as WasteReasonRow[]) || [];
        const wasteCount = wasteEvents.length;
        const reasonsMap: Record<string, number> = {};
        wasteEvents.forEach(e => {
            reasonsMap[e.reason] = (reasonsMap[e.reason] || 0) + 1;
        });
        const topReasons = Object.entries(reasonsMap)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // G. Recent Sales
        const { data: recentSalesRaw, error: rsError } = await supabase
            .from('sales')
            .select(`
                id,
                created_at,
                total,
                payment_method,
                status,
                profiles (full_name)
            `)
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (rsError) throw rsError;
        const recentSalesRows = (recentSalesRaw as unknown as RecentSaleRow[]) || [];

        const recentSales: RecentSale[] = recentSalesRows.map((s) => ({
            id: s.id,
            createdAt: s.created_at,
            total: toNumberSafe(s.total, 0),
            paymentMethod: s.payment_method,
            status: s.status,
            cashierName: pickFirst(s.profiles)?.full_name || 'N/A'
        }));

        // I. Recent Receptions
        const { data: recentReceptionsRaw, error: rrError } = await supabase
            .from('receptions')
            .select(`
                id,
                created_at,
                document_number,
                supplier_text,
                status,
                reception_date
            `)
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (rrError) throw rrError;
        const recentReceptions = ((recentReceptionsRaw as any[]) || []).map(r => ({
            id: r.id,
            createdAt: r.created_at,
            documentNumber: r.document_number || 'N/A',
            supplierText: r.supplier_text || 'N/A',
            status: r.status,
            receptionDate: r.reception_date || 'N/A'
        }));

        // H. Sales Chart (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: chartSalesRaw, error: csError } = await supabase
            .from('sales')
            .select('created_at, total')
            .eq('store_id', storeId)
            .eq('status', 'finalized')
            .gte('created_at', sevenDaysAgo.toISOString());

        if (csError) throw csError;
        const chartSales = (chartSalesRaw as unknown as ChartSaleRow[]) || [];

        const chartPointsMap: Record<string, { total: number; count: number }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            chartPointsMap[dateStr] = { total: 0, count: 0 };
        }

        chartSales.forEach(s => {
            const dateStr = s.created_at.split('T')[0];
            if (chartPointsMap[dateStr]) {
                chartPointsMap[dateStr].total += toNumberSafe(s.total, 0);
                chartPointsMap[dateStr].count += 1;
            }
        });

        const salesChart: SalesChartPoint[] = Object.entries(chartPointsMap)
            .map(([date, data]) => ({
                date,
                total: data.total,
                count: data.count
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // D2. Toate produsele pentru health check
        const { data: allProductsRaw, error: prodErr } = await supabase
            .from('products')
            .select(`
                id,
                name,
                barcode,
                unit,
                category_id,
                status,
                product_prices (
                    price_sale,
                    price_purchase,
                    vat_group
                )
            `)
            .eq('store_id', storeId)
            .neq('status', 'deleted');

        if (prodErr) throw prodErr;
        const allProductsList = allProductsRaw || [];

        // D3. Intrări recepții pentru furnizori
        const { data: receptionItemsRaw, error: riErr } = await supabase
            .from('reception_items')
            .select('product_id')
            .eq('store_id', storeId);

        if (riErr) throw riErr;
        const receivedProductIds = new Set(receptionItemsRaw?.map(ri => ri.product_id) || []);

        // D4. Ultimele vânzări pentru rotație lentă
        const { data: lastSalesRaw, error: lsError } = await supabase
            .from('sales')
            .select(`
                created_at,
                sale_items (
                    product_id
                )
            `)
            .eq('store_id', storeId)
            .eq('status', 'finalized')
            .order('created_at', { ascending: false })
            .limit(200);

        if (lsError) throw lsError;

        // Top Sellers Helper
        const getTopSellers = (salesList: any[]): TopSellerProduct[] => {
            const productSalesMap: Record<string, {
                productName: string;
                unit: string;
                quantity: number;
                revenue: number;
                profit: number;
            }> = {};

            salesList.forEach(s => {
                const items = s.sale_items || [];
                items.forEach((item: any) => {
                    const prod = pickFirst(item.products);
                    if (!prod) return;

                    const productId = prod.id;
                    const qty = toNumberSafe(item.quantity, 0);
                    const val = toNumberSafe(item.total_item, 0);

                    // Compute purchase cost
                    let purchasePrice = 0;
                    const batch = pickFirst(item.stock_batches);
                    if (batch && batch.purchase_price !== null) {
                        purchasePrice = toNumberSafe(batch.purchase_price, 0);
                    } else {
                        const prices = prod.product_prices ? (Array.isArray(prod.product_prices) ? prod.product_prices : [prod.product_prices]) : [];
                        const prodPrice = prices.find((pr: any) => pr && pr.store_id === storeId) || prices[0];
                        if (prodPrice && prodPrice.price_purchase !== null) {
                            purchasePrice = toNumberSafe(prodPrice.price_purchase, 0);
                        }
                    }
                    const cost = purchasePrice * qty;
                    const profit = val - cost;

                    if (!productSalesMap[productId]) {
                        productSalesMap[productId] = {
                            productName: prod.name || 'N/A',
                            unit: prod.unit || 'buc',
                            quantity: 0,
                            revenue: 0,
                            profit: 0
                        };
                    }
                    productSalesMap[productId].quantity += qty;
                    productSalesMap[productId].revenue += val;
                    productSalesMap[productId].profit += profit;
                });
            });

            return Object.entries(productSalesMap)
                .map(([id, p]) => ({
                    productId: id,
                    productName: p.productName,
                    unit: p.unit,
                    quantity: p.quantity,
                    revenue: p.revenue,
                    profit: p.profit
                }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10);
        };

        const todayTopSellers = getTopSellers(todaySales);
        const monthTopSellers = getTopSellers(monthSales);

        // Stock Health Calculations
        let criticalStockCount = 0;
        let noPriceCount = 0;
        let noCategoryCount = 0;
        let noVatCount = 0;
        let noSupplierCount = 0;

        allProductsList.forEach((p: any) => {
            if (p.status !== 'active') return;

            // 1. Critical stock
            const stockTotal = productStockMap[p.id]?.total || 0;
            if (stockTotal <= 5) {
                criticalStockCount++;
            }

            // 2. Price
            const prices = p.product_prices ? (Array.isArray(p.product_prices) ? p.product_prices : [p.product_prices]) : [];
            const priceSale = prices[0] ? toNumberSafe(prices[0].price_sale, 0) : 0;
            if (priceSale <= 0) {
                noPriceCount++;
            }

            // 3. Category
            if (!p.category_id) {
                noCategoryCount++;
            }

            // 4. VAT
            const vatGroup = prices[0] ? prices[0].vat_group : null;
            if (!vatGroup) {
                noVatCount++;
            }

            // 5. Supplier
            if (!receivedProductIds.has(p.id)) {
                noSupplierCount++;
            }
        });

        // Slow Movers Calculations
        const productLastSaleMap: Record<string, string> = {};
        (lastSalesRaw || []).forEach(s => {
            const items = s.sale_items || [];
            items.forEach((item: any) => {
                if (!productLastSaleMap[item.product_id]) {
                    productLastSaleMap[item.product_id] = s.created_at;
                }
            });
        });

        const slowMovers: SlowMoverProduct[] = [];
        allProductsList.forEach((p: any) => {
            if (p.status !== 'active') return;

            // Must have stock > 0
            const stockTotal = productStockMap[p.id]?.total || 0;
            if (stockTotal <= 0) return;

            // Check when it was last sold
            const lastSaleDateStr = productLastSaleMap[p.id];
            const referenceDate = lastSaleDateStr ? new Date(lastSaleDateStr) : new Date(p.created_at);
            const diffDays = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays >= 30) {
                const prices = p.product_prices ? (Array.isArray(p.product_prices) ? p.product_prices : [p.product_prices]) : [];
                const purchasePrice = prices[0] ? toNumberSafe(prices[0].price_purchase, 0) : 0;
                const blockedValue = stockTotal * purchasePrice;

                slowMovers.push({
                    productId: p.id,
                    productName: p.name,
                    barcode: p.barcode,
                    unit: p.unit || 'buc',
                    daysWithoutSale: diffDays,
                    currentStock: stockTotal,
                    blockedValue
                });
            }
        });

        slowMovers.sort((a, b) => b.blockedValue - a.blockedValue);

        return {
            stats: {
                todaySalesTotal,
                todaySalesCount,
                todayProfitTotal,
                monthSalesTotal,
                activeProductsCount: activeProductsCount || 0,
                lowStockProductsCount: Object.values(productStockMap).filter(p => p.total <= 5).length,
                expiredBatchesCount: expiredCount,
                criticalExpiryBatchesCount: criticalCount,
                wasteEventsThisMonth: wasteCount,
                stockValueEstimate
            },
            recentSales,
            lowStockProducts,
            expirationAlerts: expirationAlerts.sort((a, b) => {
                const order = { expired: 0, critical: 1, warning: 2 };
                if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
                return a.expiryDate.localeCompare(b.expiryDate);
            }).slice(0, 10),
            salesChart,
            wasteSummary: {
                monthCount: wasteCount,
                topReasons
            },
            recentReceptions,
            stockHealth: {
                criticalStockCount,
                noPriceCount,
                noCategoryCount,
                noVatCount,
                noSupplierCount
            },
            topSellers: {
                today: todayTopSellers,
                month: monthTopSellers
            },
            slowMovers
        };
    }
};
