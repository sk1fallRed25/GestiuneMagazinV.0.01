import { VatGroupKey } from '../products/types';

export interface FastAddForm {
    barcode: string;
    name: string;
    unit: string;
    priceSale: string;
    pricePurchase: string;
    vatPercent: string;
    vatGroup: VatGroupKey;
    initialStock: string;
    stockZone: 'depozit' | 'magazin';
    batchNumber?: string;
    expiryDate?: string;
}

export interface FastAddProductPayload {
    storeId: string;
    profileId?: string;
    barcode: string;
    name: string;
    unit: string;
    priceSale: number;
    pricePurchase: number;
    vatPercent: number;
    vatGroup: VatGroupKey;
    initialStock: number;
    stockZone: 'depozit' | 'magazin';
    batchNumber?: string | null;
    expiryDate?: string | null;
}

export interface FastAddResult {
    productId: string;
    createdProduct: boolean;
    createdPrice: boolean;
    createdInitialStock: boolean;
}

