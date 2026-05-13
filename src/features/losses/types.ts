export interface LossProduct {
    id: string;
    nume: string;
    cod_bare: string;
    um: string;
    stoc_depozit: number;
    stoc_magazin: number;
    stoc_total: number;
}

export type LossStockSource = 'magazin' | 'depozit' | 'auto';

export interface CreateLossPayload {
    storeId: string;
    profileId: string;
    productId: string;
    quantity: number;
    reason: string;
    description?: string;
    source: LossStockSource;
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

export interface LossLocationState {
    preSelectedId?: string;
}
