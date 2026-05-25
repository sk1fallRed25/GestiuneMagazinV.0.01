export type SgrType = 'plastic' | 'metal' | 'glass';
export type SgrSelection = 'none' | SgrType;

export const SGR_DEPOSIT_AMOUNT = 0.5;
export const SGR_VAT_GROUP = 'D';
export const SGR_VAT_RATE = 0;

export const SGR_OPTIONS = [
  { value: 'none', label: 'Fără SGR', description: 'Produs fără garanție SGR' },
  { value: 'plastic', label: 'SGR - PLASTIC', description: 'PET / ambalaj plastic eligibil SGR' },
  { value: 'metal', label: 'SGR - METAL', description: 'Doză aluminiu / metal eligibil SGR' },
  { value: 'glass', label: 'SGR - STICLĂ', description: 'Sticlă eligibilă SGR' },
] as const;

export function normalizeSgrType(value: unknown): SgrType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'plastic' || normalized === 'metal' || normalized === 'glass') {
    return normalized as SgrType;
  }
  return null;
}

export function selectionFromSgr(enabled?: boolean | null, type?: unknown): SgrSelection {
  if (!enabled) return 'none';
  const normType = normalizeSgrType(type);
  return normType || 'none';
}

export function payloadFromSgrSelection(selection: SgrSelection): {
  sgrEnabled: boolean;
  sgrType: SgrType | null;
} {
  if (selection === 'none') {
    return { sgrEnabled: false, sgrType: null };
  }
  const normType = normalizeSgrType(selection);
  return {
    sgrEnabled: normType !== null,
    sgrType: normType
  };
}

export function formatSgrLabel(enabled?: boolean | null, type?: unknown): string {
  const selection = selectionFromSgr(enabled, type);
  const option = SGR_OPTIONS.find(opt => opt.value === selection);
  return option ? option.label : 'Fără SGR';
}
