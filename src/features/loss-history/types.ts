export interface LossHistorySummary {
    eventsCount: number;
    totalQuantity: number;
    estimatedValue: number;
    topReasons: Array<{ reason: string; count: number }>;
}

export interface LossHistoryItem {
    eventId: string;
    itemId: string;
    createdAt: string;
    reason: string;
    description: string | null;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    unit: string;
    zone: 'depozit' | 'magazin' | null;
    batchId: string | null;
    batchNumber: string | null;
    expiryDate: string | null;
    purchasePrice: number | null;
    estimatedValue: number;
    operatorName: string | null;
}

export interface LossHistoryFilters {
    search: string;
    reason: string;
    dateFrom: string;
    dateTo: string;
    zone: 'all' | 'depozit' | 'magazin';
}

export interface LossDetails {
    eventId: string;
    createdAt: string;
    reason: string;
    description: string | null;
    operatorName: string | null;
    items: LossHistoryItem[];
}

// Interfețe pentru mapping local (Supabase Row)
export interface WasteEventRow {
    id: string;
    store_id: string;
    profile_id: string;
    reason: string;
    description: string | null;
    created_at: string;
}

export interface WasteItemRow {
    id: string;
    store_id: string;
    waste_id: string;
    product_id: string;
    batch_id: string | null;
    quantity: number | string;
    created_at: string;
}

export interface ProductRow {
    id: string;
    name: string | null;
    barcode: string | null;
    unit: string | null;
}

export interface StockBatchRow {
    id: string;
    batch_number: string | null;
    expiry_date: string | null;
    zone: string | null;
    purchase_price: number | string | null;
}

export interface ProfileRow {
    id: string;
    full_name: string | null;
}
