export interface ReceptionProduct {
    id: string;
    nume: string;
    cod_bare: string;
    um: string;
    pret_vanzare: number;
    pret_achizitie?: number;
    stoc?: number;
    // Categorie info from 6CAT.1
    category_id?: string | null;
    category_name?: string;
    parent_category_name?: string;
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
    receptionDate: string;
    nirNumber?: string | null;
    supplierText?: string;
    supplierCui?: string;
    observations?: string;
    status: 'draft' | 'posted' | 'cancelled';
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
    reception_date: string;
    nir_number?: string | null;
    total_value: number;
    supplier_text?: string;
    supplier_cui?: string;
    observations?: string;
    status: 'draft' | 'posted' | 'cancelled';
    created_at: string;
    // Profile of who created/confirmed
    profiles?: {
        email: string;
    };
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
    products?: {
        name: string;
        barcode: string;
        unit: string;
        category_id?: string | null;
    };
}
