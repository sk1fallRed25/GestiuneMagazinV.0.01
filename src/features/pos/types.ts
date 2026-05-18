export interface PosProduct {
    id: string;
    name: string;
    barcode: string;
    unit: string;
    priceSale: number;
    vatPercent: number;
    stockMagazin: number;
}

export interface CartItem {
    productId: string;
    name: string;
    barcode: string;
    unit: string;
    price: number;
    vatPercent: number;
    quantity: number;
    stockAvailable: number;
    total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'mixed';

export interface CreateSalePayload {
    storeId: string;
    profileId: string;
    items: CartItem[];
    paymentMethod: PaymentMethod;
    cashAmount?: number;
    cardAmount?: number;
    shiftId?: string | null;
}

export interface StockBatch {
    id: string;
    store_id: string;
    product_id: string;
    zone: 'depozit' | 'magazin';
    quantity: number;
    batch_number: string | null;
    expiry_date: string | null;
    purchase_price: number | null;
    created_at?: string;
}

export interface PosLocationState {
    // momentan nu avem nevoie de state special la navigare POS, 
    // dar păstrăm tiparul pentru consistență
}

export interface CashRegister {
    id: string;
    storeId: string;
    name: string;
    code: string | null;
    active: boolean;
}

export interface ActiveShiftTotals {
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalMixed: number;
    expectedCash: number;
    transactionsCount: number;
}

export interface ActiveShift {
    shiftId: string;
    status: 'open' | 'closed' | 'cancelled';
    openingCash: number;
    openedAt: string;
    cashRegisterId: string | null;
    cashRegisterName: string | null;
    currentTotals: ActiveShiftTotals;
}

export interface OpenShiftPayload {
    storeId: string;
    profileId: string;
    cashRegisterId: string | null;
    openingCash: number;
    notes?: string | null;
}

export interface CloseShiftPayload {
    storeId: string;
    profileId: string;
    shiftId: string;
    declaredCash: number;
    closingNotes?: string | null;
}

export interface ShiftCloseResultSummary {
    openingCash: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalMixed: number;
    expectedCash: number;
    declaredCash: number;
    cashDifference: number;
    transactionsCount: number;
}

export interface ShiftCloseResult {
    shiftId: string;
    status: string;
    closedAt: string;
    summary: ShiftCloseResultSummary;
}
