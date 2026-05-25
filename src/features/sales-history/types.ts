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
    // VAT snapshot properties
    vatGroup?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    vatRate?: number | null;
    priceIncludesVat?: boolean | null;
    priceWithoutVat?: number | null;
    vatAmount?: number | null;
    totalWithoutVat?: number | null;
    vatSnapshotAvailable?: boolean;
    vatIsFallback?: boolean;
    vatDisplayLabel?: string;
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

export interface ReturnEligibilityItem {
    saleItemId: string;
    productId: string;
    productName: string;
    barcode: string | null;
    batchId: string | null;
    quantitySold: number;
    quantityReturned: number;
    quantityAvailableToReturn: number;
    unitPrice: number;
    totalItem: number;
}

export interface ReturnPreviousEntry {
    id: string;
    createdAt: string;
    totalRefund: number;
    refundMethod: 'cash' | 'card' | 'voucher' | 'mixed';
    reason: string;
}

export interface ReturnPaymentSummary {
    id?: string;
    method: string;
    amount: number;
}

export interface ReturnEligibility {
    saleId: string;
    status: SaleStatus;
    total: number;
    paymentMethod: string | null;
    canReturn: boolean;
    reasonIfNot: string | null;
    items: ReturnEligibilityItem[];
    payments: ReturnPaymentSummary[];
    previousReturns: ReturnPreviousEntry[];
    allowedRefundMethods: Array<'cash' | 'card' | 'voucher'>;
}

export interface ReturnSaleItemInput {
    saleItemId: string;
    quantity: number;
}

export interface ReturnSalePayload {
    storeId: string;
    profileId: string;
    saleId: string;
    items: ReturnSaleItemInput[];
    reason: string;
    refundMethod: 'cash' | 'card' | 'voucher';
    notes?: string | null;
}

export interface ReturnSaleResult {
    returnId: string;
}

