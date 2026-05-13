export type ExpirationStatus = 'expired' | 'critical' | 'warning' | 'ok';

export interface ExpirationItem {
    batchId: string;
    productId: string;
    productName: string;
    barcode: string;
    unit: string;
    zone: 'depozit' | 'magazin';
    quantity: number;
    batchNumber: string | null;
    expiryDate: string;
    daysUntilExpiry: number;
    status: ExpirationStatus;
    purchasePrice: number | null;
    estimatedValue: number;
}

export interface ExpirationFilter {
    status: 'all' | ExpirationStatus;
    zone: 'all' | 'depozit' | 'magazin';
    search: string;
}

export interface ExpirationSummary {
    expiredCount: number;
    criticalCount: number;
    warningCount: number;
    totalValueAtRisk: number;
}
