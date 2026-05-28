import { VatGroupKey, SgrType, ProductSgrSelection } from '../products/types';

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
    sgrSelection: ProductSgrSelection;
    /** ID categorie principală selectată (null = fără categorie / General) */
    categoryId?: string;
    /** ID subcategorie selectată (subcategorie aparține categoriei cu categoryId) */
    subcategoryId?: string;
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
    sgrEnabled?: boolean;
    sgrType?: SgrType | null;
    /** ID efectiv de categorie trimis la products.category_id
     *  Logica: subcategoryId ?? categoryId ?? null */
    categoryId?: string | null;
}

export interface FastAddResult {
    productId: string;
    createdProduct: boolean;
    createdPrice: boolean;
    createdInitialStock: boolean;
}

