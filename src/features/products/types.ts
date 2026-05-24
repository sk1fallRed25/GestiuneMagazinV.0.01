export type VatGroupKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ProductVatGroup {
  rate: number;
  label: string;
  fiscalCode: VatGroupKey;
  active: boolean;
}

export interface ProductVatConfig {
  vatPayer: boolean;
  defaultVatGroup: VatGroupKey;
  priceTaxPolicy: 'inclusive' | 'exclusive';
  vatGroups: Record<VatGroupKey, ProductVatGroup>;
}

export interface Product {
  id: string; // UUID in v2
  nume: string;
  cod_bare: string;
  pret_vanzare: number;
  pret_achizitie?: number;
  stoc_depozit: number;
  stoc_magazin: number;
  um: string;             // UI legacy
  unitate_masura: string; // Alias legacy
  active?: boolean;
  status?: 'active' | 'archived' | 'deleted';
  vatGroup?: VatGroupKey;
  vatPercent?: number;
}

/**
 * Tabel public.products (v2)
 */
export interface ProductDbRow {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  barcode: string;
  unit: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

/**
 * Tabel public.product_prices (v2)
 */
export interface ProductPriceDbRow {
  id: string;
  store_id: string;
  product_id: string;
  price_sale: number;
  price_purchase: number;
  vat_percent: number;
  vat_group?: VatGroupKey;
  updated_at: string;
}


/**
 * Tabel public.stock_batches (v2)
 */
export interface StockBatchDbRow {
  id: string;
  store_id: string;
  product_id: string;
  batch_number: string | null;
  expiry_date: string | null;
  zone: 'depozit' | 'magazin';
  quantity: number;
  purchase_price: number | null;
  created_at: string;
}

/**
 * Tipul de date pentru update din UI
 */
export interface ProductUpdateInput {
  nume?: string;
  cod_bare?: string;
  pret_vanzare?: number;
  pret_achizitie?: number;
  stoc_depozit?: number;
  stoc_magazin?: number;
  um?: string;
  unitate_masura?: string;
  status?: 'active' | 'archived' | 'deleted';
  vatGroup?: VatGroupKey;
  vatPercent?: number;
}


export interface ProductsPageProps {
    userRole?: string;
}
