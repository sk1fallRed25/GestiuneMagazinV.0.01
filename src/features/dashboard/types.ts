export interface DashboardStats {
    todaySalesTotal: number;
    todaySalesCount: number;
    todayProfitTotal: number;
    monthSalesTotal: number;
    monthSalesCount: number;
    monthProfitTotal: number;
    todayMarginPercent: number;
    monthMarginPercent: number;
    todayReceiptAverage: number;
    monthReceiptAverage: number;
    todayItemsSold: number;
    monthItemsSold: number;
    activeProductsCount: number;
    lowStockProductsCount: number;
    expiredBatchesCount: number;
    criticalExpiryBatchesCount: number;
    wasteEventsThisMonth: number;
    stockValueEstimate: number;

    // Alerte Manageriale
    draftReceptionsCount: number;
    unconfirmedTransfersCount: number;
    noStockProductsCount: number;
    noPriceProductsCount: number;
    expiredProductsCount: number;
    almostExpiredProductsCount: number;
}

export interface RecentSale {
    id: string;
    createdAt: string;
    total: number;
    paymentMethod: string;
    status: string;
    cashierName: string | null;
}

export interface LowStockProduct {
    productId: string;
    name: string;
    barcode: string;
    unit: string;
    stockMagazin: number;
    stockDepozit: number;
    stockTotal: number;
}

export interface ExpirationAlert {
    batchId: string;
    productId: string;
    productName: string;
    batchNumber: string | null;
    zone: 'depozit' | 'magazin';
    quantity: number;
    expiryDate: string;
    daysUntilExpiry: number;
    status: 'expired' | 'critical' | 'warning';
}

export interface RecentReception {
    id: string;
    createdAt: string;
    documentNumber: string;
    supplierText: string;
    status: string;
    receptionDate: string;
}

export interface SalesChartPoint {
    date: string;
    total: number;
    count: number;
}

export interface WasteSummary {
    monthCount: number;
    topReasons: Array<{ reason: string; count: number }>;
}

export interface StockHealthStats {
    criticalStockCount: number;
    noPriceCount: number;
    noCategoryCount: number;
    noVatCount: number;
    noSupplierCount: number;
}

export interface TopSellerProduct {
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    revenue: number;
    profit: number;
}

export interface SlowMoverProduct {
    productId: string;
    productName: string;
    barcode: string;
    unit: string;
    daysWithoutSale: number;
    currentStock: number;
    blockedValue: number;
}

export interface HighMarginProduct {
    productId: string;
    productName: string;
    barcode: string;
    priceSale: number;
    pricePurchase: number;
    margin: number;
}

export interface NegativeProfitProduct {
    productId: string;
    productName: string;
    barcode: string;
    priceSale: number;
    pricePurchase: number;
    lossPerUnit: number;
}

export interface ProfitabilityProduct {
    productId: string;
    productName: string;
    barcode: string;
    priceSale: number;
    pricePurchase: number;
    margin: number;
    profitClass: 'A' | 'B' | 'C';
}

export interface RestockRecommendation {
    productId: string;
    productName: string;
    barcode: string;
    unit: string;
    currentStock: number;
    dailySalesAverage: number;
    daysUntilDepletion: number;
    recommendedQty: number;
}

export interface OverstockItem {
    productId: string;
    productName: string;
    barcode: string;
    unit: string;
    currentStock: number;
    blockedValue: number;
    daysWithoutSale: number;
    excessQuantity: number;
}

export interface BusinessInsight {
    type: 'warning' | 'success' | 'info' | 'danger';
    title: string;
    message: string;
    actionText: string;
    actionLink?: string;
}

export interface TopOpportunity {
    productId: string;
    productName: string;
    metricType: 'sales' | 'profit' | 'margin';
    growthPercent: number;
    extraProfitPotential: number;
}

export interface BusinessHealthScore {
    globalScore: number;
    profitability: number;
    stockRotation: number;
    stockAvailability: number;
    priceCompleteness: number;
    expirationScore: number;
}

export interface DashboardData {
    stats: DashboardStats;
    recentSales: RecentSale[];
    lowStockProducts: LowStockProduct[];
    expirationAlerts: ExpirationAlert[];
    salesChart: SalesChartPoint[];
    wasteSummary: WasteSummary;
    recentReceptions: RecentReception[];
    stockHealth: StockHealthStats;
    topSellers: {
        today: TopSellerProduct[];
        month: TopSellerProduct[];
    };
    slowMovers: SlowMoverProduct[];
    highMarginProducts: HighMarginProduct[];
    negativeProfitProducts: NegativeProfitProduct[];
    profitabilityProducts: ProfitabilityProduct[];
    healthScore: BusinessHealthScore;
    restockRecommendations: RestockRecommendation[];
    overstockItems: OverstockItem[];
    smartInsights: BusinessInsight[];
    topOpportunities: TopOpportunity[];
}
