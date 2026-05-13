export interface DashboardStats {
    todaySalesTotal: number;
    todaySalesCount: number;
    monthSalesTotal: number;
    activeProductsCount: number;
    lowStockProductsCount: number;
    expiredBatchesCount: number;
    criticalExpiryBatchesCount: number;
    wasteEventsThisMonth: number;
    stockValueEstimate: number;
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

export interface SalesChartPoint {
    date: string;
    total: number;
    count: number;
}

export interface WasteSummary {
    monthCount: number;
    topReasons: Array<{ reason: string; count: number }>;
}

export interface DashboardData {
    stats: DashboardStats;
    recentSales: RecentSale[];
    lowStockProducts: LowStockProduct[];
    expirationAlerts: ExpirationAlert[];
    salesChart: SalesChartPoint[];
    wasteSummary: WasteSummary;
}
