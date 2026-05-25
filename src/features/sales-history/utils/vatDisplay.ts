export function formatVatGroupLabel(group?: string | null, rate?: number | null): string {
    if (!group) return 'TVA indisponibil';
    const cleanGroup = group.trim().toUpperCase();
    if (rate !== null && rate !== undefined) {
        return `${cleanGroup} — ${rate}%`;
    }
    // Fallbacks if rate is missing
    const defaultRates: Record<string, number> = {
        A: 21,
        B: 11,
        C: 11,
        D: 0,
        E: 0
    };
    const rateVal = defaultRates[cleanGroup] ?? 0;
    return `${cleanGroup} — ${rateVal}%`;
}

export function calculateIncludedVat(totalWithVat: number, vatRate: number): {
    totalWithoutVat: number;
    vatAmount: number;
} {
    if (vatRate < 0) {
        return { totalWithoutVat: totalWithVat, vatAmount: 0 };
    }
    const divisor = 1 + (vatRate / 100);
    const totalWithoutVat = Number((totalWithVat / divisor).toFixed(2));
    const vatAmount = Number((totalWithVat - totalWithoutVat).toFixed(2));
    return { totalWithoutVat, vatAmount };
}

export function formatMoney(value?: number | null): string {
    if (value === undefined || value === null || isNaN(value)) {
        return '—';
    }
    return `${value.toFixed(2)} LEI`;
}

export type VatGroupKey = 'A' | 'B' | 'C' | 'D' | 'E';

export function getStandardVatRateForGroup(group?: string | null): number | null {
  const normalized = typeof group === 'string' ? group.trim().toUpperCase() : '';

  switch (normalized) {
    case 'A':
      return 21;
    case 'B':
      return 11;
    case 'C':
      return 11;
    case 'D':
      return 0;
    case 'E':
      return 0;
    default:
      return null;
  }
}

export function normalizeVatGroup(group?: string | null): VatGroupKey | null {
  if (!group) return null;
  const normalized = group.trim().toUpperCase();
  if (normalized === 'A' || normalized === 'B' || normalized === 'C' || normalized === 'D' || normalized === 'E') {
    return normalized as VatGroupKey;
  }
  return null;
}

