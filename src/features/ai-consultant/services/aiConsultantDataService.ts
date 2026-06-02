import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    AiConsultantData, AiProductInsight, AiStoreSnapshot, AiRecommendation,
    ProductRow, ProductPriceRow, StockBatchRow, SaleRow, SaleItemRow, WasteEventRow, WasteItemRow 
} from '../types';

const toNumberStrict = (value: unknown, fieldLabel: string): number => {
    const num = Number(value);
    if (value === null || value === undefined || isNaN(num) || !Number.isFinite(num)) {
        console.warn(`[AI Consultant] ${fieldLabel} nu este un număr valid (valoare: ${String(value)}). Se folosește 0.`);
        return 0;
    }
    return num;
};

const toNumberSafe = (value: unknown, fallback = 0): number => {
    const num = Number(value);
    return (value === null || value === undefined || isNaN(num) || !Number.isFinite(num)) ? fallback : num;
};

const normalizeZone = (value: unknown): 'depozit' | 'magazin' | null => {
    return value === 'depozit' || value === 'magazin' ? value : null;
};


export const aiConsultantDataService = {
    async getAiConsultantData(storeId: string): Promise<AiConsultantData> {
        if (!storeId) throw new Error("Store ID lipsă.");

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Fetch Products
        const { data: products, error: prodErr } = await supabase
            .from('products')
            .select('id, name, barcode, unit')
            .eq('store_id', storeId)
            .eq('status', 'active');
        if (prodErr) throw prodErr;
        const productRows = (products || []) as ProductRow[];
        if (productRows.length === 0) return this.getEmptyData();

        const productIds = productRows.map(p => p.id);

        const chunkSize = 100;

        // 2. Fetch Prices in chunks
        const pricePromises = [];
        for (let i = 0; i < productIds.length; i += chunkSize) {
            const chunk = productIds.slice(i, i + chunkSize);
            pricePromises.push(
                supabase
                    .from('product_prices')
                    .select('product_id, price_sale, price_purchase')
                    .eq('store_id', storeId)
                    .in('product_id', chunk)
            );
        }
        const priceResults = await Promise.all(pricePromises);
        const priceRows: ProductPriceRow[] = [];
        for (const res of priceResults) {
            if (res.error) throw res.error;
            if (res.data) priceRows.push(...(res.data as ProductPriceRow[]));
        }

        // 3. Fetch Batches in chunks
        const batchPromises = [];
        for (let i = 0; i < productIds.length; i += chunkSize) {
            const chunk = productIds.slice(i, i + chunkSize);
            batchPromises.push(
                supabase
                    .from('stock_batches')
                    .select('product_id, quantity, purchase_price, zone, expiry_date')
                    .eq('store_id', storeId)
                    .in('product_id', chunk)
            );
        }
        const batchResults = await Promise.all(batchPromises);
        const batchRows: StockBatchRow[] = [];
        for (const res of batchResults) {
            if (res.error) throw res.error;
            if (res.data) batchRows.push(...(res.data as StockBatchRow[]));
        }

        // 4. Fetch Sales (30 days)
        const { data: sales, error: saleErr } = await supabase
            .from('sales')
            .select('id, created_at, total')
            .eq('store_id', storeId)
            .eq('status', 'finalized')
            .gte('created_at', thirtyDaysAgo);
        if (saleErr) throw saleErr;
        const saleRows = (sales || []) as SaleRow[];

        let saleItemRows: SaleItemRow[] = [];
        if (saleRows.length > 0) {
            const saleIds = saleRows.map(s => s.id);
            const saleItemPromises = [];
            for (let i = 0; i < saleIds.length; i += chunkSize) {
                const chunk = saleIds.slice(i, i + chunkSize);
                saleItemPromises.push(
                    supabase
                        .from('sale_items')
                        .select('sale_id, product_id, quantity, total_item')
                        .eq('store_id', storeId)
                        .in('sale_id', chunk)
                );
            }
            const saleItemResults = await Promise.all(saleItemPromises);
            for (const res of saleItemResults) {
                if (res.error) throw res.error;
                if (res.data) saleItemRows.push(...(res.data as SaleItemRow[]));
            }
        }

        // 5. Fetch Waste (30 days)
        const { data: wasteEvents, error: weErr } = await supabase
            .from('waste_events')
            .select('id')
            .eq('store_id', storeId)
            .gte('created_at', thirtyDaysAgo);
        if (weErr) throw weErr;
        const wasteEventRows = (wasteEvents || []) as WasteEventRow[];

        let wasteItemRows: WasteItemRow[] = [];
        if (wasteEventRows.length > 0) {
            const wasteIds = wasteEventRows.map(w => w.id);
            const wasteItemPromises = [];
            for (let i = 0; i < wasteIds.length; i += chunkSize) {
                const chunk = wasteIds.slice(i, i + chunkSize);
                wasteItemPromises.push(
                    supabase
                        .from('waste_items')
                        .select('waste_id, product_id, quantity')
                        .eq('store_id', storeId)
                        .in('waste_id', chunk)
                );
            }
            const wasteItemResults = await Promise.all(wasteItemPromises);
            for (const res of wasteItemResults) {
                if (res.error) throw res.error;
                if (res.data) wasteItemRows.push(...(res.data as WasteItemRow[]));
            }
        }

        // --- MAP DATA ---
        const priceMap = new Map(priceRows.map(p => [p.product_id, p]));
        const batchMapGroup = new Map<string, StockBatchRow[]>();
        batchRows.forEach(b => {
            const list = batchMapGroup.get(b.product_id) || [];
            list.push(b);
            batchMapGroup.set(b.product_id, list);
        });

        const saleItemMapGroup = new Map<string, SaleItemRow[]>();
        saleItemRows.forEach(si => {
            const list = saleItemMapGroup.get(si.product_id) || [];
            list.push(si);
            saleItemMapGroup.set(si.product_id, list);
        });

        const saleMap = new Map(saleRows.map(s => [s.id, s]));

        const wasteItemMapGroup = new Map<string, WasteItemRow[]>();
        wasteItemRows.forEach(wi => {
            const list = wasteItemMapGroup.get(wi.product_id) || [];
            list.push(wi);
            wasteItemMapGroup.set(wi.product_id, list);
        });

        const insights: AiProductInsight[] = productRows.map(p => {
            const prices = priceMap.get(p.id);
            const pBatches = batchMapGroup.get(p.id) || [];
            const pSales = saleItemMapGroup.get(p.id) || [];
            const pWaste = wasteItemMapGroup.get(p.id) || [];

            let stockMagazin = 0;
            let stockDepozit = 0;
            let stockValueEstimate = 0;
            let expiryRisk: AiProductInsight['expiryRisk'] = 'none';

            pBatches.forEach(b => {
                const qty = toNumberStrict(b.quantity, 'stock_batches.quantity');
                const zone = normalizeZone(b.zone);
                
                if (zone === 'magazin') stockMagazin += qty;
                else if (zone === 'depozit') stockDepozit += qty;
                else return; // Ignorăm batch-urile cu zonă invalidă pentru agregarea stocului pe zone

                const buyPrice = b.purchase_price != null 
                    ? toNumberStrict(b.purchase_price, 'stock_batches.purchase_price') 
                    : (prices?.price_purchase != null ? toNumberStrict(prices.price_purchase, 'product_prices.price_purchase') : 0);
                
                stockValueEstimate += qty * buyPrice;

                if (qty > 0 && b.expiry_date) {
                    const exp = new Date(b.expiry_date);
                    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                        if (expiryRisk !== 'expired') expiryRisk = 'expired';
                    } else if (diffDays <= 7) {
                        if (expiryRisk !== 'expired') expiryRisk = 'critical';
                    } else if (diffDays <= 30) {
                        if (expiryRisk !== 'expired' && expiryRisk !== 'critical') expiryRisk = 'warning';
                    }
                }
            });

            const stockTotal = stockMagazin + stockDepozit;
            const soldQuantity30d = pSales.reduce((acc, s) => acc + toNumberStrict(s.quantity, 'sale_items.quantity'), 0);
            const soldValue30d = pSales.reduce((acc, s) => acc + toNumberStrict(s.total_item, 'sale_items.total_item'), 0);
            const wasteQuantity30d = pWaste.reduce((acc, w) => acc + toNumberStrict(w.quantity, 'waste_items.quantity'), 0);


            let lastSaleAt: string | null = null;
            if (pSales.length > 0) {
                const saleDates = pSales.map(si => saleMap.get(si.sale_id)?.created_at).filter(Boolean) as string[];
                if (saleDates.length > 0) {
                    lastSaleAt = saleDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                }
            }

            return {
                productId: p.id,
                name: p.name || 'Fără nume',
                barcode: p.barcode || '-',
                unit: p.unit || 'buc',
                stockMagazin,
                stockDepozit,
                stockTotal,
                priceSale: prices ? toNumberStrict(prices.price_sale, 'product_prices.price_sale') : 0,
                pricePurchase: prices?.price_purchase != null ? toNumberStrict(prices.price_purchase, 'product_prices.price_purchase') : null,

                stockValueEstimate,
                soldQuantity30d,
                soldValue30d,
                wasteQuantity30d,
                lastSaleAt,
                expiryRisk
            };
        });

        // --- SNAPSHOT AGGREGATION ---
        const totalStockValue = insights.reduce((acc, i) => acc + i.stockValueEstimate, 0);
        const lowStockCount = insights.filter(i => i.stockTotal > 0 && i.stockTotal <= 5).length;
        const noStockCount = insights.filter(i => i.stockTotal === 0).length;
        const expiryRiskCount = insights.filter(i => i.expiryRisk !== 'none').length;
        const sales30dTotal = saleRows.reduce((acc, s) => acc + toNumberStrict(s.total, 'sales.total'), 0);


        const topSellingProducts = [...insights]
            .filter(i => i.soldQuantity30d > 0)
            .sort((a, b) => b.soldQuantity30d - a.soldQuantity30d)
            .slice(0, 5);

        const lowStockProducts = insights
            .filter(i => i.stockTotal > 0 && i.stockTotal <= 5)
            .sort((a, b) => a.stockTotal - b.stockTotal)
            .slice(0, 5);


        const riskOrder = { 'expired': 3, 'critical': 2, 'warning': 1, 'none': 0 };
        const expiryRiskProducts = insights
            .filter(i => i.expiryRisk !== 'none')
            .sort((a, b) => riskOrder[b.expiryRisk] - riskOrder[a.expiryRisk])
            .slice(0, 5);

        const deadStockProducts = insights
            .filter(i => i.stockTotal > 0 && i.soldQuantity30d === 0)
            .sort((a, b) => b.stockValueEstimate - a.stockValueEstimate)
            .slice(0, 5);

        const snapshot: AiStoreSnapshot = {
            generatedAt: now.toISOString(),
            activeProductsCount: productRows.length,
            totalStockValue,
            lowStockCount,
            noStockCount,
            expiryRiskCount,
            sales30dTotal,
            sales30dCount: saleRows.length,
            waste30dCount: wasteEventRows.length,
            topSellingProducts,
            lowStockProducts,
            expiryRiskProducts,
            deadStockProducts
        };

        // --- RECOMMENDATIONS ---
        const recommendations: AiRecommendation[] = [];

        if (lowStockCount > 0) {
            recommendations.push({
                id: 'low-stock',
                severity: 'warning',
                title: 'Stoc scăzut la produse active',
                description: `Ai ${lowStockCount} produse cu stoc sub pragul de siguranță (5 buc).`,
                actionLabel: 'Vezi stocuri'
            });
        }

        if (noStockCount > 0) {
            recommendations.push({
                id: 'no-stock',
                severity: 'critical',
                title: 'Produse cu stoc zero',
                description: `Există ${noStockCount} produse care au stoc epuizat și ar putea cauza pierderi de vânzări.`,
                actionLabel: 'Refă stocul'
            });
        }

        if (expiryRiskCount > 0) {
            const criticalCount = insights.filter(i => i.expiryRisk === 'critical' || i.expiryRisk === 'expired').length;
            recommendations.push({
                id: 'expiry-risk',
                severity: criticalCount > 0 ? 'critical' : 'warning',
                title: 'Risc expirare detectat',
                description: `Există ${expiryRiskCount} produse cu loturi care necesită atenție (expirate sau sub 30 zile).`,

                actionLabel: 'Vezi expirări'
            });
        }

        if (deadStockProducts.length > 0) {
            recommendations.push({
                id: 'dead-stock',
                severity: 'info',
                title: 'Produse fără mișcare (Dead Stock)',
                description: `Ai ${deadStockProducts.length} produse cu stoc care nu s-au vândut deloc în ultimele 30 zile.`,
                actionLabel: 'Promoții'
            });
        }

        if (sales30dTotal === 0) {
            recommendations.push({
                id: 'no-sales',
                severity: 'warning',
                title: 'Inactivitate vânzări',
                description: 'Nu s-au înregistrat vânzări finalizate în ultimele 30 de zile.',
            });
        }

        return { snapshot, recommendations };
    },

    getEmptyData(): AiConsultantData {
        return {
            snapshot: {
                generatedAt: new Date().toISOString(),
                activeProductsCount: 0,
                totalStockValue: 0,
                lowStockCount: 0,
                noStockCount: 0,
                expiryRiskCount: 0,
                sales30dTotal: 0,
                sales30dCount: 0,
                waste30dCount: 0,
                topSellingProducts: [],
                lowStockProducts: [],
                expiryRiskProducts: [],
                deadStockProducts: []
            },
            recommendations: []
        };
    }
};
