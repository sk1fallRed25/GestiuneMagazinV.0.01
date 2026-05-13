export interface AiProductInsight {
    productId: string;
    name: string;
    barcode: string;
    unit: string;
    stockMagazin: number;
    stockDepozit: number;
    stockTotal: number;
    priceSale: number;
    pricePurchase: number | null;
    stockValueEstimate: number;
    soldQuantity30d: number;
    soldValue30d: number;
    wasteQuantity30d: number;
    lastSaleAt: string | null;
    expiryRisk: 'none' | 'warning' | 'critical' | 'expired';
}

export interface AiStoreSnapshot {
    generatedAt: string;
    activeProductsCount: number;
    totalStockValue: number;
    lowStockCount: number;
    noStockCount: number;
    expiryRiskCount: number;
    sales30dTotal: number;
    sales30dCount: number;
    waste30dCount: number;
    topSellingProducts: AiProductInsight[];
    lowStockProducts: AiProductInsight[];
    expiryRiskProducts: AiProductInsight[];
    deadStockProducts: AiProductInsight[];
}

export interface AiRecommendation {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    actionLabel?: string;
    productId?: string;
}

export interface AiConsultantData {
    snapshot: AiStoreSnapshot;
    recommendations: AiRecommendation[];
}

// Local DB Types for mapping
export interface ProductRow {
    id: string;
    name: string | null;
    barcode: string | null;
    unit: string | null;
}

export interface ProductPriceRow {
    product_id: string;
    price_sale: number | string;
    price_purchase: number | string | null;
}

export interface StockBatchRow {
    product_id: string;
    quantity: number | string;
    purchase_price: number | string | null;
    zone: string | null;
    expiry_date: string | null;
}

export interface SaleRow {
    id: string;
    created_at: string;
    total: number | string;
}

export interface SaleItemRow {
    sale_id: string;
    product_id: string;
    quantity: number | string;
    total_item: number | string;
}

export interface WasteEventRow {
    id: string;
}

export interface WasteItemRow {
    waste_id: string;
    product_id: string;
    quantity: number | string;
}
