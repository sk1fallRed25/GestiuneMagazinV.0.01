// ─────────────────────────────────────────────────────────────
// Store Settings Service — Etapa 6D.3
// Apelează RPC-urile: get_store_settings, update_store_settings,
// get_store_operational_config
// ─────────────────────────────────────────────────────────────

import { supabase } from '../../../shared/supabase/supabaseClient';
import {
  StoreSettings,
  StoreSettingsResponse,
  StoreFiscalSettings,
  StoreTaxSettings,
  StoreStockSettings,
  StorePosSettings,
  StoreDocumentsSettings,
  StoreReportsSettings,
  StoreAlertsSettings,
  VatGroupKey,
  VatGroup,
  VAT_GROUP_KEYS,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_ROMANIA_VAT_GROUPS,
} from '../types';

// ─── Safe parsers ─────────────────────────────────────────────

const toNum = (v: unknown, fb = 0): number => {
  if (v === null || v === undefined) return fb;
  const n = Number(v);
  return isNaN(n) || !isFinite(n) ? fb : n;
};

const toStr = (v: unknown, fb = ''): string => {
  if (v === null || v === undefined) return fb;
  return String(v);
};

const toBool = (v: unknown, fb = false): boolean => {
  if (v === null || v === undefined) return fb;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true';
  return fb;
};

const toStrOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  return String(v);
};

// ─── JSONB → TypeScript parsers (snake_case → camelCase) ─────

const parseVatGroup = (key: VatGroupKey, raw: unknown): VatGroup => {
  const defaults = DEFAULT_ROMANIA_VAT_GROUPS[key];
  if (!raw || typeof raw !== 'object') return { ...defaults };
  const d = raw as Record<string, unknown>;
  return {
    rate: toNum(d.rate, defaults.rate),
    label: toStr(d.label, defaults.label),
    fiscalCode: key,
    active: toBool(d.active, defaults.active),
  };
};

const parseFiscalSettings = (raw: unknown): StoreFiscalSettings => {
  const def = DEFAULT_STORE_SETTINGS.fiscal;
  if (!raw || typeof raw !== 'object') return { ...def };
  const d = raw as Record<string, unknown>;
  return {
    workpointNumber: toNum(d.workpoint_number ?? d.workpointNumber, def.workpointNumber),
    workpointName: toStr(d.workpoint_name ?? d.workpointName, def.workpointName),
    companyName: toStr(d.company_name ?? d.companyName, def.companyName),
    displayCode: toStr(d.display_code ?? d.displayCode, def.displayCode),
    regNumber: toStr(d.reg_number ?? d.regNumber, def.regNumber ?? ''),
    phone: toStr(d.phone, def.phone ?? ''),
    email: toStr(d.email, def.email ?? ''),
    city: toStr(d.city, def.city ?? ''),
    county: toStr(d.county, def.county ?? ''),
    addressFull: toStr(d.address_full ?? d.addressFull, def.addressFull ?? ''),
    notes: toStr(d.notes, def.notes ?? ''),
  };
};

const parseTaxSettings = (raw: unknown): StoreTaxSettings => {
  const def = DEFAULT_STORE_SETTINGS.tax;
  if (!raw || typeof raw !== 'object') return { ...def, vatGroups: { ...DEFAULT_ROMANIA_VAT_GROUPS } };
  const d = raw as Record<string, unknown>;

  const rawGroups = d.vat_groups ?? d.vatGroups;
  const vatGroups = {} as Record<VatGroupKey, VatGroup>;
  for (const key of VAT_GROUP_KEYS) {
    const groupRaw = rawGroups && typeof rawGroups === 'object' ? (rawGroups as Record<string, unknown>)[key] : undefined;
    vatGroups[key] = parseVatGroup(key, groupRaw);
  }

  const rawDefault = toStr(d.default_vat_group ?? d.defaultVatGroup, def.defaultVatGroup);
  const defaultVatGroup: VatGroupKey = VAT_GROUP_KEYS.includes(rawDefault as VatGroupKey)
    ? (rawDefault as VatGroupKey)
    : def.defaultVatGroup;

  const rawPolicy = toStr(d.price_tax_policy ?? d.priceTaxPolicy, def.priceTaxPolicy);
  const priceTaxPolicy: 'inclusive' | 'exclusive' = rawPolicy === 'exclusive' ? 'exclusive' : 'inclusive';

  return {
    defaultVatGroup,
    vatPayer: toBool(d.vat_payer ?? d.vatPayer, def.vatPayer),
    priceTaxPolicy,
    vatGroups,
  };
};

const parseStockSettings = (raw: unknown): StoreStockSettings => {
  const def = DEFAULT_STORE_SETTINGS.stock;
  if (!raw || typeof raw !== 'object') return { ...def };
  const d = raw as Record<string, unknown>;
  return {
    stockMinDefault: toNum(d.stock_min_default ?? d.stockMinDefault, def.stockMinDefault),
    allowNegativeStock: toBool(d.allow_negative_stock ?? d.allowNegativeStock, def.allowNegativeStock),
    expiryWarningDays: toNum(d.expiry_warning_days ?? d.expiryWarningDays, def.expiryWarningDays),
  };
};

const parsePosSettings = (raw: unknown): StorePosSettings => {
  const def = DEFAULT_STORE_SETTINGS.pos;
  if (!raw || typeof raw !== 'object') return { ...def };
  const d = raw as Record<string, unknown>;

  const rawPm = toStr(d.default_payment_method ?? d.defaultPaymentMethod, def.defaultPaymentMethod);
  const defaultPaymentMethod: 'cash' | 'card' | 'mixed' =
    rawPm === 'card' ? 'card' : rawPm === 'mixed' ? 'mixed' : 'cash';

  return {
    defaultPaymentMethod,
    allowMixedPayment: toBool(d.allow_mixed_payment ?? d.allowMixedPayment, def.allowMixedPayment),
    requireActiveShift: toBool(d.require_active_shift ?? d.requireActiveShift, def.requireActiveShift),
    requireManagerForVoid: toBool(d.require_manager_for_void ?? d.requireManagerForVoid, def.requireManagerForVoid),
    requireManagerForReturn: toBool(d.require_manager_for_return ?? d.requireManagerForReturn, def.requireManagerForReturn),
  };
};

const parseDocumentsSettings = (raw: unknown): StoreDocumentsSettings => {
  const def = DEFAULT_STORE_SETTINGS.documents;
  if (!raw || typeof raw !== 'object') return { ...def };
  const d = raw as Record<string, unknown>;
  return {
    posReceiptPrefix: toStr(d.pos_receipt_prefix ?? d.posReceiptPrefix, def.posReceiptPrefix),
    returnPrefix: toStr(d.return_prefix ?? d.returnPrefix, def.returnPrefix),
    receptionPrefix: toStr(d.reception_prefix ?? d.receptionPrefix, def.receptionPrefix),
    wastePrefix: toStr(d.waste_prefix ?? d.wastePrefix, def.wastePrefix),
    transferPrefix: toStr(d.transfer_prefix ?? d.transferPrefix, def.transferPrefix),
  };
};

const parseReportsSettings = (raw: unknown): StoreReportsSettings => {
  const def = DEFAULT_STORE_SETTINGS.reports;
  if (!raw || typeof raw !== 'object') return { ...def };
  const d = raw as Record<string, unknown>;
  return {
    businessDayStartHour: toNum(d.business_day_start_hour ?? d.businessDayStartHour, def.businessDayStartHour),
    timezone: toStr(d.timezone, def.timezone),
  };
};

const parseAlertsSettings = (raw: unknown): StoreAlertsSettings => {
  const def = DEFAULT_STORE_SETTINGS.alerts;
  if (!raw || typeof raw !== 'object') return { ...def };
  const d = raw as Record<string, unknown>;
  return {
    alertLowStockEnabled: toBool(d.alert_low_stock_enabled ?? d.alertLowStockEnabled, def.alertLowStockEnabled),
    alertExpiryEnabled: toBool(d.alert_expiry_enabled ?? d.alertExpiryEnabled, def.alertExpiryEnabled),
    alertCashDifferenceLimit: toNum(d.alert_cash_difference_limit ?? d.alertCashDifferenceLimit, def.alertCashDifferenceLimit),
  };
};

const parseStoreSettings = (rawSettings: unknown): StoreSettings => {
  const s = (rawSettings && typeof rawSettings === 'object' ? rawSettings : {}) as Record<string, unknown>;
  return {
    fiscal: parseFiscalSettings(s.fiscal),
    tax: parseTaxSettings(s.tax),
    stock: parseStockSettings(s.stock),
    pos: parsePosSettings(s.pos),
    documents: parseDocumentsSettings(s.documents),
    reports: parseReportsSettings(s.reports),
    alerts: parseAlertsSettings(s.alerts),
  };
};

const parseStoreSettingsResponse = (data: unknown): StoreSettingsResponse => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    storeId: toStr(d.store_id ?? d.storeId),
    storeName: toStr(d.store_name ?? d.storeName),
    fiscalCode: toStrOrNull(d.fiscal_code ?? d.fiscalCode),
    active: toBool(d.active, true),
    settings: parseStoreSettings(d.settings),
  };
};

// ─── TypeScript → JSONB transformer (camelCase → snake_case) ─

const settingsToSnakeCase = (settings: StoreSettings): Record<string, unknown> => ({
  fiscal: {
    workpoint_number: settings.fiscal.workpointNumber,
    workpoint_name: settings.fiscal.workpointName,
    company_name: settings.fiscal.companyName,
    display_code: settings.fiscal.displayCode,
    reg_number: settings.fiscal.regNumber ?? '',
    phone: settings.fiscal.phone ?? '',
    email: settings.fiscal.email ?? '',
    city: settings.fiscal.city ?? '',
    county: settings.fiscal.county ?? '',
    address_full: settings.fiscal.addressFull ?? '',
    notes: settings.fiscal.notes ?? '',
  },
  tax: {
    default_vat_group: settings.tax.defaultVatGroup,
    vat_payer: settings.tax.vatPayer,
    price_tax_policy: settings.tax.priceTaxPolicy,
    vat_groups: Object.fromEntries(
      VAT_GROUP_KEYS.map((key) => [
        key,
        {
          rate: settings.tax.vatGroups[key].rate,
          label: settings.tax.vatGroups[key].label,
          fiscal_code: settings.tax.vatGroups[key].fiscalCode,
          active: settings.tax.vatGroups[key].active,
        },
      ])
    ),
  },
  stock: {
    stock_min_default: settings.stock.stockMinDefault,
    allow_negative_stock: settings.stock.allowNegativeStock,
    expiry_warning_days: settings.stock.expiryWarningDays,
  },
  pos: {
    default_payment_method: settings.pos.defaultPaymentMethod,
    allow_mixed_payment: settings.pos.allowMixedPayment,
    require_active_shift: settings.pos.requireActiveShift,
    require_manager_for_void: settings.pos.requireManagerForVoid,
    require_manager_for_return: settings.pos.requireManagerForReturn,
  },
  documents: {
    pos_receipt_prefix: settings.documents.posReceiptPrefix,
    return_prefix: settings.documents.returnPrefix,
    reception_prefix: settings.documents.receptionPrefix,
    waste_prefix: settings.documents.wastePrefix,
    transfer_prefix: settings.documents.transferPrefix,
  },
  reports: {
    business_day_start_hour: settings.reports.businessDayStartHour,
    timezone: settings.reports.timezone,
  },
  alerts: {
    alert_low_stock_enabled: settings.alerts.alertLowStockEnabled,
    alert_expiry_enabled: settings.alerts.alertExpiryEnabled,
    alert_cash_difference_limit: settings.alerts.alertCashDifferenceLimit,
  },
});

// ─── Validation helpers ──────────────────────────────────────

export const validateStoreSettings = (settings: StoreSettings): string[] => {
  const errors: string[] = [];

  // Fiscal
  if (settings.fiscal.workpointNumber < 1) {
    errors.push('Numărul punctului de lucru trebuie să fie cel puțin 1.');
  }
  if (settings.fiscal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.fiscal.email)) {
    errors.push('Adresa de email este invalidă.');
  }

  // Tax
  if (!VAT_GROUP_KEYS.includes(settings.tax.defaultVatGroup)) {
    errors.push('Grupa TVA implicită este invalidă.');
  }

  // Stock
  if (settings.stock.stockMinDefault < 0) {
    errors.push('Stocul minim implicit trebuie să fie >= 0.');
  }
  if (settings.stock.expiryWarningDays < 0) {
    errors.push('Zilele de avertizare expirare trebuie să fie >= 0.');
  }

  // Reports
  if (settings.reports.businessDayStartHour < 0 || settings.reports.businessDayStartHour > 23) {
    errors.push('Ora de start a zilei de business trebuie să fie între 0 și 23.');
  }

  // Alerts
  if (settings.alerts.alertCashDifferenceLimit < 0) {
    errors.push('Limita de diferență numerar trebuie să fie >= 0.');
  }

  // Documents prefixes
  const prefixFields: Array<{ key: keyof StoreDocumentsSettings; label: string }> = [
    { key: 'posReceiptPrefix', label: 'Prefix bon' },
    { key: 'returnPrefix', label: 'Prefix retur' },
    { key: 'receptionPrefix', label: 'Prefix recepție' },
    { key: 'wastePrefix', label: 'Prefix pierdere' },
    { key: 'transferPrefix', label: 'Prefix transfer' },
  ];
  for (const pf of prefixFields) {
    const val = settings.documents[pf.key];
    if (!val || val.trim().length === 0) {
      errors.push(`${pf.label} nu poate fi gol.`);
    }
    if (val && val.length > 10) {
      errors.push(`${pf.label} nu poate depăși 10 caractere.`);
    }
  }

  return errors;
};

/**
 * Enforce VAT payer/non-payer business rules:
 * - vatPayer=false → defaultVatGroup forced to E
 * - vatPayer=true  + defaultVatGroup=E → force to A
 */
export const enforceVatPayerRules = (settings: StoreSettings): StoreSettings => {
  const updated = { ...settings, tax: { ...settings.tax } };

  if (!updated.tax.vatPayer) {
    updated.tax.defaultVatGroup = 'E';
  } else if (updated.tax.vatPayer && updated.tax.defaultVatGroup === 'E') {
    updated.tax.defaultVatGroup = 'A';
  }

  return updated;
};

// ─── Service functions ───────────────────────────────────────

export const storeSettingsService = {
  async getStoreSettings(storeId: string): Promise<StoreSettingsResponse> {
    if (!storeId) throw new Error('Selectează un magazin pentru a configura setările.');

    const { data, error } = await supabase.rpc('get_store_settings', {
      p_store_id: storeId,
    });

    if (error) {
      console.error('getStoreSettings error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis') || error.message?.includes('nu este membru')) {
        throw new Error('Nu ai permisiunea necesară pentru setările acestui magazin.');
      }
      throw new Error('Nu s-au putut încărca setările magazinului.');
    }

    return parseStoreSettingsResponse(data);
  },

  async updateStoreSettings(storeId: string, settings: StoreSettings): Promise<StoreSettingsResponse> {
    if (!storeId) throw new Error('Selectează un magazin pentru a salva setările.');

    // Enforce VAT rules before sending
    const enforced = enforceVatPayerRules(settings);

    // Validate client-side
    const errors = validateStoreSettings(enforced);
    if (errors.length > 0) {
      throw new Error(`Validare eșuată: ${errors.join(' ')}`);
    }

    const payload = settingsToSnakeCase(enforced);

    const { data, error } = await supabase.rpc('update_store_settings', {
      p_store_id: storeId,
      p_settings: payload,
    });

    if (error) {
      console.error('updateStoreSettings error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis') || error.message?.includes('nu este admin')) {
        throw new Error('Nu ai permisiunea de a modifica setările. Doar admin și platform owner pot salva.');
      }
      if (error.message?.includes('schema') || error.message?.includes('invalid')) {
        throw new Error('Structura setărilor este invalidă. Verifică câmpurile introduse.');
      }
      throw new Error('Nu s-au putut salva setările magazinului.');
    }

    return parseStoreSettingsResponse(data);
  },

  async getStoreOperationalConfig(storeId: string): Promise<Record<string, unknown>> {
    if (!storeId) throw new Error('Selectează un magazin.');

    const { data, error } = await supabase.rpc('get_store_operational_config', {
      p_store_id: storeId,
    });

    if (error) {
      console.error('getStoreOperationalConfig error:', error);
      throw new Error('Nu s-a putut încărca configurația operațională.');
    }

    return (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  },
};
