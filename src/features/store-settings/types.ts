// ─────────────────────────────────────────────────────────────
// Store Settings Types — Etapa 6D.3
// ─────────────────────────────────────────────────────────────

export type VatGroupKey = 'A' | 'B' | 'C' | 'D' | 'E';

export const VAT_GROUP_KEYS: VatGroupKey[] = ['A', 'B', 'C', 'D', 'E'];

export interface VatGroup {
  rate: number;
  label: string;
  fiscalCode: VatGroupKey;
  active: boolean;
}

export interface StoreTaxSettings {
  defaultVatGroup: VatGroupKey;
  vatPayer: boolean;
  priceTaxPolicy: 'inclusive' | 'exclusive';
  vatGroups: Record<VatGroupKey, VatGroup>;
}

export interface StoreFiscalSettings {
  workpointNumber: number;
  workpointName: string;
  companyName: string;
  displayCode: string;
  regNumber?: string;
  phone?: string;
  email?: string;
  city?: string;
  county?: string;
  addressFull?: string;
  notes?: string;
}

export interface StoreStockSettings {
  stockMinDefault: number;
  allowNegativeStock: boolean;
  expiryWarningDays: number;
}

export interface StorePosSettings {
  defaultPaymentMethod: 'cash' | 'card' | 'mixed';
  allowMixedPayment: boolean;
  requireActiveShift: boolean;
  requireManagerForVoid: boolean;
  requireManagerForReturn: boolean;
}

export interface StoreDocumentsSettings {
  posReceiptPrefix: string;
  returnPrefix: string;
  receptionPrefix: string;
  wastePrefix: string;
  transferPrefix: string;
}

export interface StoreReportsSettings {
  businessDayStartHour: number;
  timezone: string;
}

export interface StoreAlertsSettings {
  alertLowStockEnabled: boolean;
  alertExpiryEnabled: boolean;
  alertCashDifferenceLimit: number;
}

export interface StoreSettings {
  fiscal: StoreFiscalSettings;
  tax: StoreTaxSettings;
  stock: StoreStockSettings;
  pos: StorePosSettings;
  documents: StoreDocumentsSettings;
  reports: StoreReportsSettings;
  alerts: StoreAlertsSettings;
}

export interface StoreSettingsResponse {
  storeId: string;
  storeName: string;
  fiscalCode: string | null;
  active: boolean;
  settings: StoreSettings;
}

// Default VAT groups for Romania
export const DEFAULT_ROMANIA_VAT_GROUPS: Record<VatGroupKey, VatGroup> = {
  A: { rate: 21, label: 'TVA Standard 21%', fiscalCode: 'A', active: true },
  B: { rate: 11, label: 'TVA Redusă 11%', fiscalCode: 'B', active: true },
  C: { rate: 11, label: 'TVA Redusă 11%', fiscalCode: 'C', active: true },
  D: { rate: 0, label: 'Scutit TVA 0%', fiscalCode: 'D', active: true },
  E: { rate: 0, label: 'Neplătitor TVA 0%', fiscalCode: 'E', active: true },
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  fiscal: {
    workpointNumber: 1,
    workpointName: '',
    companyName: '',
    displayCode: '',
    regNumber: '',
    phone: '',
    email: '',
    city: '',
    county: '',
    addressFull: '',
    notes: '',
  },
  tax: {
    defaultVatGroup: 'A',
    vatPayer: true,
    priceTaxPolicy: 'inclusive',
    vatGroups: { ...DEFAULT_ROMANIA_VAT_GROUPS },
  },
  stock: {
    stockMinDefault: 5,
    allowNegativeStock: false,
    expiryWarningDays: 7,
  },
  pos: {
    defaultPaymentMethod: 'cash',
    allowMixedPayment: true,
    requireActiveShift: true,
    requireManagerForVoid: true,
    requireManagerForReturn: true,
  },
  documents: {
    posReceiptPrefix: 'BON',
    returnPrefix: 'RET',
    receptionPrefix: 'REC',
    wastePrefix: 'PD',
    transferPrefix: 'TRF',
  },
  reports: {
    businessDayStartHour: 6,
    timezone: 'Europe/Bucharest',
  },
  alerts: {
    alertLowStockEnabled: true,
    alertExpiryEnabled: true,
    alertCashDifferenceLimit: 10,
  },
};
