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

export interface SalesHistoryFilters {
    search: string;
    paymentMethod: 'all' | 'cash' | 'card' | 'mixed';
    status: 'all' | 'finalized' | 'cancelled' | 'returned' | 'partially_returned';
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
