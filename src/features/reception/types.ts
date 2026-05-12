
export interface ReceptionProduct {
    id: string;
    nume: string;
    cod_bare: string;
    um: string;
    pret_vanzare: number;
    pret_achizitie?: number;
}

export interface ReceptionLine {
    tempId: string;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    vatPercent: number;
    batchNumber?: string | null;
    expiryDate?: string | null;
    isBax?: boolean;
    cantitateBaxuri?: number;
    bucatiPerBax?: number;
}

export interface ReceptionDocument {
    documentNumber: string;
    documentDate: string;
    supplierText?: string;
    supplierCui?: string;
    observations?: string;
}

export interface CreateReceptionPayload {
    storeId: string;
    profileId: string;
    document: ReceptionDocument;
    lines: ReceptionLine[];
}

export interface ReceptionDbRow {
    id: string;
    store_id: string;
    profile_id: string;
    document_number: string;
    document_date: string;
    total_value: number;
    supplier_text?: string;
    supplier_cui?: string;
    observations?: string;
    created_at: string;
}

export interface ReceptionItemDbRow {
    id: string;
    store_id: string;
    reception_id: string;
    product_id: string;
    quantity: number;
    purchase_price: number;
    sale_price_new?: number;
    vat_percent: number;
    batch_number?: string;
    expiry_date?: string;
    created_at: string;
}
