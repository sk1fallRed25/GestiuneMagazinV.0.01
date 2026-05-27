export type FiscalNetPaymentMethod =
  | 'cash'
  | 'card'
  | 'credit'
  | 'meal_ticket'
  | 'voucher'
  | 'modern'
  | 'other';

export interface FiscalNetReceiptItem {
  name: string;
  unitPrice: number;
  quantity: number;
  unit?: string;
  vatGroup: 'A' | 'B' | 'C' | 'D' | 'E';
  departmentGroup?: number;
  barcode?: string | null;
  sgr?: {
    enabled: boolean;
    type: 'plastic' | 'metal' | 'glass';
    amount: number;
    vatGroup: 'D';
  } | null;
}

export interface FiscalNetPayment {
  method: FiscalNetPaymentMethod;
  amount: number;
}

export interface FiscalNetReceiptPayload {
  saleId: string;
  fiscalCode?: string | null;
  items: FiscalNetReceiptItem[];
  payments: FiscalNetPayment[];
  totals: {
    productsTotal: number;
    sgrTotal: number;
    grandTotal: number;
  };
  noteLines?: string[];
}

export interface FiscalNetConfig {
  enabled: boolean;
  bonuriPath: string;
  raspunsPath: string;
  realWriteEnabled: boolean;
  requireConfirmation: boolean;
  lastValidatedAt?: string;
}
