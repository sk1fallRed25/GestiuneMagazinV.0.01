export interface TransferProduct {
    id: string;
    nume: string;
    cod_bare: string;
    um: string;
    stoc_depozit: number;
    stoc_magazin: number;
}

export type TransferDirection = 'depozit_spre_magazin' | 'magazin_spre_depozit';

export interface TransferPayload {
    storeId: string;
    productId: string;
    quantity: number;
    direction: TransferDirection;
    profileId?: string;
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
