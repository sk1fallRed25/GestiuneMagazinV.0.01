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
    SlowMoverProduct,
    HighMarginProduct,
    NegativeProfitProduct,
    ProfitabilityProduct,
    RestockRecommendation,
    OverstockItem,
    BusinessInsight,
    TopOpportunity
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
        let todayItemsSold = 0;
        todaySales.forEach(s => {
            const items = s.sale_items || [];
            items.forEach((item: any) => {
                const qty = toNumberSafe(item.quantity, 0);
                const totalItem = toNumberSafe(item.total_item, 0);
                todayItemsSold += qty;
                
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

        // B. Vânzări Lună & Profit Lună
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
        const monthSalesCount = monthSales.length;

        let monthProfitTotal = 0;
        let monthItemsSold = 0;
        monthSales.forEach(s => {
            const items = s.sale_items || [];
            items.forEach((item: any) => {
                const qty = toNumberSafe(item.quantity, 0);
                const totalItem = toNumberSafe(item.total_item, 0);
                monthItemsSold += qty;
                
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
                monthProfitTotal += (totalItem - cost);
            });
        });

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
                created_at,
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

        // D4. Vânzări 90 zile pentru calculul exact al stocului mort, recomandărilor de stoc și oportunităților
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const { data: salesHistory, error: shError } = await supabase
            .from('sales')
            .select(`
                created_at,
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
            .gte('created_at', ninetyDaysAgo.toISOString());

        if (shError) throw shError;

        // Fetch categories to resolve names for insights
        const { data: categoriesRaw } = await supabase
            .from('categories')
            .select('id, name')
            .eq('store_id', storeId);
        const categoryMap = new Map<string, string>();
        (categoriesRaw || []).forEach((c: any) => {
            categoryMap.set(c.id, c.name);
        });

        // Initialize historical maps
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const productSales30DaysQty: Record<string, number> = {};
        const productSales60To30DaysQty: Record<string, number> = {};
        const productSales30DaysRevenue: Record<string, number> = {};
        const productSales60To30DaysRevenue: Record<string, number> = {};
        const productSales30DaysProfit: Record<string, number> = {};
        const productSales60To30DaysProfit: Record<string, number> = {};
        const productLastSaleMap: Record<string, string> = {};

        (salesHistory || []).forEach((s: any) => {
            const saleDate = new Date(s.created_at);
            const items = s.sale_items || [];
            items.forEach((item: any) => {
                const productId = item.product_id;
                if (!productId) return;

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
                const profit = totalItem - cost;

                if (!productLastSaleMap[productId] || s.created_at > productLastSaleMap[productId]) {
                    productLastSaleMap[productId] = s.created_at;
                }

                if (saleDate >= thirtyDaysAgo) {
                    productSales30DaysQty[productId] = (productSales30DaysQty[productId] || 0) + qty;
                    productSales30DaysRevenue[productId] = (productSales30DaysRevenue[productId] || 0) + totalItem;
                    productSales30DaysProfit[productId] = (productSales30DaysProfit[productId] || 0) + profit;
                } else if (saleDate >= sixtyDaysAgo && saleDate < thirtyDaysAgo) {
                    productSales60To30DaysQty[productId] = (productSales60To30DaysQty[productId] || 0) + qty;
                    productSales60To30DaysRevenue[productId] = (productSales60To30DaysRevenue[productId] || 0) + totalItem;
                    productSales60To30DaysProfit[productId] = (productSales60To30DaysProfit[productId] || 0) + profit;
                }
            });
        });

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

        // Stock Health & Managerial Alerts Calculations
        let criticalStockCount = 0;
        let noPriceCount = 0;
        let noCategoryCount = 0;
        let noVatCount = 0;
        let noSupplierCount = 0;
        let noStockProductsCount = 0;

        const highMarginProducts: HighMarginProduct[] = [];
        const negativeProfitProducts: NegativeProfitProduct[] = [];

        allProductsList.forEach((p: any) => {
            if (p.status !== 'active') return;

            const stockTotal = productStockMap[p.id]?.total || 0;
            if (stockTotal <= 0) {
                noStockProductsCount++;
            }
            if (stockTotal <= 5) {
                criticalStockCount++;
            }

            const prices = p.product_prices ? (Array.isArray(p.product_prices) ? p.product_prices : [p.product_prices]) : [];
            const priceSale = prices[0] ? toNumberSafe(prices[0].price_sale, 0) : 0;
            const pricePurchase = prices[0] ? toNumberSafe(prices[0].price_purchase, 0) : 0;

            if (priceSale <= 0) {
                noPriceCount++;
            }

            const margin = priceSale > 0 ? ((priceSale - pricePurchase) / priceSale) * 100 : 0;

            if (priceSale > 0) {
                if (margin >= 30) {
                    highMarginProducts.push({
                        productId: p.id,
                        productName: p.name,
                        barcode: p.barcode,
                        priceSale,
                        pricePurchase,
                        margin
                    });
                }
                if (priceSale < pricePurchase) {
                    negativeProfitProducts.push({
                        productId: p.id,
                        productName: p.name,
                        barcode: p.barcode,
                        priceSale,
                        pricePurchase,
                        lossPerUnit: pricePurchase - priceSale
                    });
                }
            }

            if (!p.category_id) {
                noCategoryCount++;
            }

            const vatGroup = prices[0] ? prices[0].vat_group : null;
            if (!vatGroup) {
                noVatCount++;
            }

            if (!receivedProductIds.has(p.id)) {
                noSupplierCount++;
            }
        });

        highMarginProducts.sort((a, b) => b.margin - a.margin);
        negativeProfitProducts.sort((a, b) => b.lossPerUnit - a.lossPerUnit);

        const profitabilityProducts: ProfitabilityProduct[] = [];
        allProductsList.forEach((p: any) => {
            if (p.status !== 'active') return;
            const prices = p.product_prices ? (Array.isArray(p.product_prices) ? p.product_prices : [p.product_prices]) : [];
            const priceSale = prices[0] ? toNumberSafe(prices[0].price_sale, 0) : 0;
            const pricePurchase = prices[0] ? toNumberSafe(prices[0].price_purchase, 0) : 0;

            const margin = priceSale > 0 ? ((priceSale - pricePurchase) / priceSale) * 100 : 0;
            let profitClass: 'A' | 'B' | 'C' = 'C';
            if (margin >= 25) {
                profitClass = 'A';
            } else if (margin >= 10) {
                profitClass = 'B';
            }

            profitabilityProducts.push({
                productId: p.id,
                productName: p.name,
                barcode: p.barcode || '',
                priceSale,
                pricePurchase,
                margin,
                profitClass
            });
        });
        profitabilityProducts.sort((a, b) => b.margin - a.margin);

        // Fetch draft receptions
        const { count: draftReceptionsCount, error: drError } = await supabase
            .from('receptions')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('status', 'draft');

        const finalDraftReceptionsCount = drError ? 0 : (draftReceptionsCount || 0);

        // Slow Movers & Overstock Calculations
        const slowMovers: SlowMoverProduct[] = [];
        const overstockItems: OverstockItem[] = [];
        const restockRecommendations: RestockRecommendation[] = [];

        allProductsList.forEach((p: any) => {
            if (p.status !== 'active') return;

            const stockTotal = productStockMap[p.id]?.total || 0;
            const prices = p.product_prices ? (Array.isArray(p.product_prices) ? p.product_prices : [p.product_prices]) : [];
            const purchasePrice = prices[0] ? toNumberSafe(prices[0].price_purchase, 0) : 0;
            const blockedValue = stockTotal * purchasePrice;

            // Resolve last sale date
            const lastSaleDateStr = productLastSaleMap[p.id];
            const referenceDate = lastSaleDateStr ? new Date(lastSaleDateStr) : new Date(p.created_at);
            const diffDays = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

            const sales30d = productSales30DaysQty[p.id] || 0;
            const salesRateDaily = sales30d / 30;

            // 1. Slow Movers (stock > 0 and no sales >= 30 days)
            if (stockTotal > 0 && diffDays >= 30) {
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

            // 2. Overstock Detection (high stock, low rotation)
            if (stockTotal > 20) {
                if (salesRateDaily === 0 || (stockTotal / salesRateDaily > 90 && blockedValue > 100)) {
                    const excessQuantity = Math.max(0, Math.ceil(stockTotal - salesRateDaily * 30));
                    if (excessQuantity > 0) {
                        overstockItems.push({
                            productId: p.id,
                            productName: p.name,
                            barcode: p.barcode || '',
                            unit: p.unit || 'buc',
                            currentStock: stockTotal,
                            blockedValue,
                            daysWithoutSale: diffDays,
                            excessQuantity
                        });
                    }
                }
            }

            // 3. Restock Suggestions (sales in last 30d, low stock, or running out in <= 7 days)
            if (salesRateDaily > 0) {
                const daysUntilDepletion = stockTotal / salesRateDaily;
                if (stockTotal <= 5 || daysUntilDepletion <= 7) {
                    const recommendedQty = Math.max(10, Math.ceil(salesRateDaily * 30 - stockTotal));
                    restockRecommendations.push({
                        productId: p.id,
                        productName: p.name,
                        barcode: p.barcode || '',
                        unit: p.unit || 'buc',
                        currentStock: stockTotal,
                        dailySalesAverage: salesRateDaily,
                        daysUntilDepletion,
                        recommendedQty
                    });
                }
            }
        });

        slowMovers.sort((a, b) => b.blockedValue - a.blockedValue);
        overstockItems.sort((a, b) => b.blockedValue - a.blockedValue);
        restockRecommendations.sort((a, b) => a.daysUntilDepletion - b.daysUntilDepletion);

        // 4. Opportunities calculations (growth comparison)
        const topOpportunities: TopOpportunity[] = [];
        allProductsList.forEach((p: any) => {
            if (p.status !== 'active') return;
            const qtyCurrent = productSales30DaysQty[p.id] || 0;
            const qtyPrior = productSales60To30DaysQty[p.id] || 0;
            const profitCurrent = productSales30DaysProfit[p.id] || 0;
            const profitPrior = productSales60To30DaysProfit[p.id] || 0;
            const revenueCurrent = productSales30DaysRevenue[p.id] || 0;
            const revenuePrior = productSales60To30DaysRevenue[p.id] || 0;

            if (qtyCurrent > 0) {
                const qtyGrowthPercent = qtyPrior > 0 ? ((qtyCurrent - qtyPrior) / qtyPrior) * 100 : 100;
                const profitGrowthPercent = profitPrior > 0 ? ((profitCurrent - profitPrior) / profitPrior) * 100 : 100;
                
                const marginCurrent = revenueCurrent > 0 ? (profitCurrent / revenueCurrent) * 100 : 0;
                const marginPrior = revenuePrior > 0 ? (profitPrior / revenuePrior) * 100 : 0;
                const marginGrowthPercent = marginPrior > 0 ? ((marginCurrent - marginPrior) / marginPrior) * 100 : (marginCurrent > 0 ? 100 : 0);

                if (qtyGrowthPercent > 5 || profitGrowthPercent > 5) {
                    const extraProfitPotential = profitCurrent * 0.1;
                    
                    let bestMetric: 'sales' | 'profit' | 'margin' = 'sales';
                    let bestPercent = qtyGrowthPercent;
                    if (profitGrowthPercent > bestPercent) {
                        bestMetric = 'profit';
                        bestPercent = profitGrowthPercent;
                    }
                    if (marginGrowthPercent > bestPercent) {
                        bestMetric = 'margin';
                        bestPercent = marginGrowthPercent;
                    }

                    topOpportunities.push({
                        productId: p.id,
                        productName: p.name,
                        metricType: bestMetric,
                        growthPercent: bestPercent,
                        extraProfitPotential
                    });
                }
            }
        });
        topOpportunities.sort((a, b) => b.growthPercent - a.growthPercent);
        const limitedOpportunities = topOpportunities.slice(0, 5);

        // 5. Smart Insights Compilation
        const smartInsights: BusinessInsight[] = [];
        const formatCurrency = (val: number) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);

        // A. Overstock insight
        if (overstockItems.length > 0) {
            const topOverstock = overstockItems[0];
            smartInsights.push({
                type: 'danger',
                title: `Stoc excedentar: ${topOverstock.productName}`,
                message: `Reduceți stocul cu ${topOverstock.excessQuantity} unități. Stocul actual blochează ${formatCurrency(topOverstock.blockedValue)} fără vânzări active de ${topOverstock.daysWithoutSale} zile.`,
                actionText: 'Promovează lichidare',
                actionLink: '/produse'
            });
        }

        // B. Restock insight
        if (restockRecommendations.length > 0) {
            const topRestock = restockRecommendations[0];
            smartInsights.push({
                type: 'warning',
                title: `Reaprovizionare urgentă: ${topRestock.productName}`,
                message: `Stocul curent de ${topRestock.currentStock} se epuizează în ${topRestock.daysUntilDepletion.toFixed(1)} zile (vânzări medii: ${topRestock.dailySalesAverage.toFixed(1)} buc/zi).`,
                actionText: 'Creează recepție',
                actionLink: '/receptie'
            });
        }

        // C. Profit spotlight
        let topProfitProductId = '';
        let topProfitValue = 0;
        let topProfitMargin = 0;
        Object.entries(productSales30DaysProfit).forEach(([prodId, profit]) => {
            if (profit > topProfitValue) {
                topProfitValue = profit;
                topProfitProductId = prodId;
                const rev = productSales30DaysRevenue[prodId] || 0;
                topProfitMargin = rev > 0 ? (profit / rev) * 100 : 0;
            }
        });

        if (topProfitProductId) {
            const prod = allProductsList.find((p: any) => p.id === topProfitProductId);
            if (prod) {
                smartInsights.push({
                    type: 'success',
                    title: `Top Profit: ${prod.name}`,
                    message: `Acest produs generează profit ridicat: ${formatCurrency(topProfitValue)} profit brut în ultimele 30 zile, cu o marjă de ${topProfitMargin.toFixed(1)}%.`,
                    actionText: 'Vezi stocuri',
                    actionLink: '/produse'
                });
            }
        }

        // D. Category margin evaluation
        const categorySales: Record<string, { revenue: number; cost: number }> = {};
        allProductsList.forEach((p: any) => {
            const catId = p.category_id;
            if (!catId) return;

            const revenue = productSales30DaysRevenue[p.id] || 0;
            const profit = productSales30DaysProfit[p.id] || 0;
            const cost = revenue - profit;

            if (!categorySales[catId]) {
                categorySales[catId] = { revenue: 0, cost: 0 };
            }
            categorySales[catId].revenue += revenue;
            categorySales[catId].cost += cost;
        });

        let globalRevenue = 0;
        let globalCost = 0;
        Object.values(categorySales).forEach(cat => {
            globalRevenue += cat.revenue;
            globalCost += cat.cost;
        });
        const globalAvgMargin = globalRevenue > 0 ? ((globalRevenue - globalCost) / globalRevenue) * 100 : 15;

        Object.entries(categorySales).forEach(([catId, data]) => {
            if (data.revenue > 150) {
                const catMargin = ((data.revenue - data.cost) / data.revenue) * 100;
                const catName = categoryMap.get(catId) || 'Altele';
                if (catMargin < globalAvgMargin - 3) {
                    smartInsights.push({
                        type: 'warning',
                        title: `Marjă sub medie pe categoria ${catName}`,
                        message: `Categoria înregistrează o marjă de ${catMargin.toFixed(1)}%, sub media magazinului de ${globalAvgMargin.toFixed(1)}%.`,
                        actionText: 'Revizuiește prețuri',
                        actionLink: '/produse'
                    });
                }
            }
        });

        // 6. Business Health Score Calculation (0-100)
        // Profitability (30%): Scaled monthly margin against 20% target
        const todayMarginPercent = todaySalesTotal > 0 ? (todayProfitTotal / todaySalesTotal) * 100 : 0;
        const monthMarginPercent = monthSalesTotal > 0 ? (monthProfitTotal / monthSalesTotal) * 100 : 0;
        const todayReceiptAverage = todaySalesCount > 0 ? todaySalesTotal / todaySalesCount : 0;
        const monthReceiptAverage = monthSalesCount > 0 ? monthSalesTotal / monthSalesCount : 0;

        const activeProdsCount = activeProductsCount || 1;
        const profitabilityScore = Math.min(100, Math.max(0, (monthMarginPercent / 20) * 100));
        // Availability (25%): Percentage of active products with stock > 0
        const stockAvailabilityScore = Math.max(0, (1 - (noStockProductsCount / activeProdsCount)) * 100);
        // Rotation (20%): Percentage of active products without slow mover status
        const slowMoversCount = slowMovers.length;
        const stockRotationScore = Math.max(0, (1 - (slowMoversCount / activeProdsCount)) * 100);
        // Expirations (15%): Penalyzed based on active count and expired batches
        const expirationScore = Math.max(0, (1 - (expiredCount / activeProdsCount)) * 100);
        // Price completeness (10%): Percentage of active products with price configured
        const priceCompletenessScore = Math.max(0, (1 - (noPriceCount / activeProdsCount)) * 100);

        const globalScore = Math.round(
            0.3 * profitabilityScore +
            0.25 * stockAvailabilityScore +
            0.2 * stockRotationScore +
            0.15 * expirationScore +
            0.1 * priceCompletenessScore
        );

        const healthScore = {
            globalScore: Math.min(100, Math.max(0, globalScore)),
            profitability: Math.round(profitabilityScore),
            stockRotation: Math.round(stockRotationScore),
            stockAvailability: Math.round(stockAvailabilityScore),
            priceCompleteness: Math.round(priceCompletenessScore),
            expirationScore: Math.round(expirationScore)
        };

        return {
            stats: {
                todaySalesTotal,
                todaySalesCount,
                todayProfitTotal,
                monthSalesTotal,
                monthSalesCount,
                monthProfitTotal,
                todayMarginPercent,
                monthMarginPercent,
                todayReceiptAverage,
                monthReceiptAverage,
                todayItemsSold,
                monthItemsSold,
                activeProductsCount: activeProductsCount || 0,
                lowStockProductsCount: Object.values(productStockMap).filter(p => p.total <= 5).length,
                expiredBatchesCount: expiredCount,
                criticalExpiryBatchesCount: criticalCount,
                wasteEventsThisMonth: wasteCount,
                stockValueEstimate,

                // Alerte Manageriale
                draftReceptionsCount: finalDraftReceptionsCount,
                unconfirmedTransfersCount: 0,
                noStockProductsCount,
                noPriceProductsCount: noPriceCount,
                expiredProductsCount: expiredCount,
                almostExpiredProductsCount: criticalCount
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
            slowMovers,
            highMarginProducts,
            negativeProfitProducts,
            profitabilityProducts,
            healthScore,
            restockRecommendations,
            overstockItems,
            smartInsights,
            topOpportunities: limitedOpportunities
        };
    }
};

