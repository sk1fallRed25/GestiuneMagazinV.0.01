export interface SaleSummary {
    id: string;
    createdAt: string;
    total: number;
    paymentMethod: string;
    status: string;
    cashierName: string | null;
    itemsCount: number;
    paymentsTotal: number;
    cashPart: number;
    cardPart: number;
}

export interface SaleItemDetails {
    id: string;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    totalItem: number;
    batchId: string | null;
    batchNumber: string | null;
    expiryDate: string | null;
    purchasePrice: number | null;
}

export interface SalePaymentDetails {
    id: string;
    method: string;
    amount: number;
    createdAt: string;
}

export interface SaleDetails {
    id: string;
    createdAt: string;
    total: number;
    paymentMethod: string;
    status: string;
    cashierName: string | null;
    items: SaleItemDetails[];
    payments: SalePaymentDetails[];
}

export type SaleStatus = 'finalized' | 'cancelled' | 'voided' | 'partially_returned' | 'returned';

export interface SalesHistoryFilters {
    search: string;
    paymentMethod: 'all' | 'cash' | 'card' | 'mixed';
    status: 'all' | SaleStatus;
    dateFrom: string;
    dateTo: string;
}

export interface SalesHistorySummary {
    salesCount: number;
    totalRevenue: number;
    cashTotal: number;
    cardTotal: number;
    averageSale: number;
}

export interface VoidEligibility {
    saleId: string;
    status: SaleStatus;
    total: number;
    shiftId: string | null;
    shiftStatus: string | null;
    canVoid: boolean;
    reasonIfNot: string | null;
    itemsSummary: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalItem: number;
    }>;
    paymentsSummary: Array<{
        method: string;
        amount: number;
    }>;
}

export interface VoidSalePayload {
    storeId: string;
    profileId: string;
    saleId: string;
    reason: string;
    notes?: string | null;
}

export interface VoidSaleResult {
    returnId: string;
}

