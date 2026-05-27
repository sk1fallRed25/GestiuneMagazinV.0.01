import { FiscalNetReceiptPayload, FiscalNetReceiptItem } from './types';
import { 
  FISCAL_NET_VAT_MAPPINGS, 
  FISCAL_NET_PAYMENT_MAPPINGS, 
  SGR_NAMES, 
  SGR_VAT_GROUP, 
  SGR_DEFAULT_DEP_GROUP 
} from './fiscalNetMappings';

/**
 * Transliterates Romanian diacritics to simple Latin equivalents,
 * which is highly recommended for legacy fiscal printers / FiscalNet.
 */
export function removeDiacritics(text: string): string {
  const map: Record<string, string> = {
    'ă': 'a', 'Ă': 'A',
    'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I',
    'ş': 's', 'Ş': 'S',
    'ș': 's', 'Ș': 'S',
    'ţ': 't', 'Ţ': 'T',
    'ț': 't', 'Ț': 'T'
  };
  return text.replace(/[ăĂâÂîÎşŞșȘţŢțȚ]/g, match => map[match] || match);
}

/**
 * Formats a money value (LEI) for FiscalNet.
 * FiscalNet expects values as integers representing bani (2 decimals without separator).
 * E.g., 10.00 -> "1000", 4.50 -> "450", 0.50 -> "50".
 */
export function toFiscalNetMoney(value: number): string {
  if (value < 0) {
    throw new Error('Sumele negative nu sunt permise în formatul FiscalNet.');
  }
  // Round to nearest integer to avoid float representation issues
  return Math.round(value * 100).toString();
}

/**
 * Formats a quantity value for FiscalNet.
 * FiscalNet expects quantities with 3 decimal places without a separator.
 * E.g., 1 -> "1000", 2 -> "2000", 0.5 -> "500".
 */
export function toFiscalNetQuantity(value: number): string {
  if (value < 0) {
    throw new Error('Cantitățile negative nu sunt permise în formatul FiscalNet.');
  }
  return Math.round(value * 1000).toString();
}

/**
 * Sanitizes text to be safe for FiscalNet columns.
 * Rules:
 * - Removes the caret character (^) as it is the column separator
 * - Removes newline characters (\r and \n)
 * - Transliterates diacritics
 * - Normalizes duplicate spaces
 * - Truncates to a maximum length (default 36 characters)
 */
export function sanitizeFiscalNetText(value: string, maxLength: number = 36): string {
  let cleaned = value.replace(/\^/g, '');
  cleaned = cleaned.replace(/[\r\n]+/g, ' ');
  cleaned = removeDiacritics(cleaned);
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  return cleaned.substring(0, maxLength);
}

/**
 * Validates the totals of a payload for mathematical consistency:
 * 1. Sum of products + SGR = grand total (within 0.01 tolerance)
 * 2. Sum of payments = grand total (within 0.01 tolerance)
 * 3. Quantities, prices, and payments must be non-negative
 * 4. SGR total matches calculated SGR count * deposit amount (0.50)
 */
export function validateReceiptTotals(payload: FiscalNetReceiptPayload): void {
  const tolerance = 0.01;

  if (payload.totals.grandTotal < 0 || payload.totals.productsTotal < 0 || payload.totals.sgrTotal < 0) {
    throw new Error('Totalurile bonului nu pot fi negative.');
  }

  // 1. Validate non-negative quantities and prices
  let calculatedProductsTotal = 0;
  let calculatedSgrTotal = 0;

  for (const item of payload.items) {
    if (item.unitPrice < 0) {
      throw new Error(`Prețul produsului '${item.name}' nu poate fi negativ.`);
    }
    if (item.quantity <= 0) {
      throw new Error(`Cantitatea produsului '${item.name}' trebuie să fie pozitivă.`);
    }
    calculatedProductsTotal += item.unitPrice * item.quantity;

    if (item.sgr?.enabled) {
      const sgrAmount = item.sgr.amount ?? 0.50;
      if (sgrAmount < 0) {
        throw new Error(`Valoarea garanției SGR pentru '${item.name}' nu poate fi negativă.`);
      }
      calculatedSgrTotal += item.quantity * sgrAmount;
    }
  }

  // Check calculated values against totals in payload
  const diffProducts = Math.abs(calculatedProductsTotal - payload.totals.productsTotal);
  if (diffProducts > tolerance) {
    throw new Error(
      `Mismatched products total! Calculated: ${calculatedProductsTotal.toFixed(2)}, ` +
      `Payload: ${payload.totals.productsTotal.toFixed(2)}`
    );
  }

  const diffSgr = Math.abs(calculatedSgrTotal - payload.totals.sgrTotal);
  if (diffSgr > tolerance) {
    throw new Error(
      `Mismatched SGR total! Calculated: ${calculatedSgrTotal.toFixed(2)}, ` +
      `Payload: ${payload.totals.sgrTotal.toFixed(2)}`
    );
  }

  const expectedGrandTotal = calculatedProductsTotal + calculatedSgrTotal;
  const diffGrand = Math.abs(expectedGrandTotal - payload.totals.grandTotal);
  if (diffGrand > tolerance) {
    throw new Error(
      `Mismatched grand total! Sum of products + SGR: ${expectedGrandTotal.toFixed(2)}, ` +
      `Payload grand total: ${payload.totals.grandTotal.toFixed(2)}`
    );
  }

  // 2. Validate payments match grand total
  let totalPayments = 0;
  for (const p of payload.payments) {
    if (p.amount < 0) {
      throw new Error('Suma plății nu poate fi negativă.');
    }
    totalPayments += p.amount;
  }

  const diffPayments = Math.abs(totalPayments - payload.totals.grandTotal);
  if (diffPayments > tolerance) {
    throw new Error(
      `Suma plăților (${totalPayments.toFixed(2)}) nu coincide cu totalul bonului ` +
      `(${payload.totals.grandTotal.toFixed(2)})!`
    );
  }
}

/**
 * Formats a payload into the FiscalNet command string format.
 * Generates plain text where columns are separated by "^".
 * 
 * Line formats generated:
 * - CF^[CUI] (Client fiscal code)
 * - S^Name^Price^Qty^UM^VATGroup^DepGroup (Sale line)
 * - TL^Text (Free text note line)
 * - P^PaymentType^Amount (Payment line)
 */
export function formatFiscalNetReceipt(payload: FiscalNetReceiptPayload): string {
  // Always validate first
  validateReceiptTotals(payload);

  const lines: string[] = [];

  // 1. Client fiscal code line (optional)
  if (payload.fiscalCode) {
    // Sanitize fiscal code (e.g., remove spaces or ^ characters)
    const sanitizedCode = sanitizeFiscalNetText(payload.fiscalCode, 20);
    lines.push(`CF^${sanitizedCode}`);
  }

  // 2. Products and their SGR lines
  for (const item of payload.items) {
    const sanitizedName = sanitizeFiscalNetText(item.name, 36);
    const priceStr = toFiscalNetMoney(item.unitPrice);
    const qtyStr = toFiscalNetQuantity(item.quantity);
    const um = sanitizeFiscalNetText(item.unit || 'buc', 5);
    
    // Map VAT group (A-E to 1-5)
    const vatMapped = FISCAL_NET_VAT_MAPPINGS[item.vatGroup] ?? 1;
    const depMapped = item.departmentGroup ?? 1;

    // S line: S^DENUMIRE^PRET^CANTITATE^UM^GRTVA^GRDEP
    lines.push(`S^${sanitizedName}^${priceStr}^${qtyStr}^${um}^${vatMapped}^${depMapped}`);

    // If item has SGR enabled, export SGR warranty line immediately after it
    if (item.sgr?.enabled) {
      const sgrType = item.sgr.type || 'plastic';
      const sgrName = SGR_NAMES[sgrType] || SGR_NAMES.plastic;
      const sgrPriceStr = toFiscalNetMoney(item.sgr.amount ?? 0.50);
      
      const sgrVatGroup = item.sgr.vatGroup || SGR_VAT_GROUP;
      const sgrVatMapped = FISCAL_NET_VAT_MAPPINGS[sgrVatGroup] ?? 4;
      const sgrDepMapped = SGR_DEFAULT_DEP_GROUP;

      lines.push(`S^${sgrName}^${sgrPriceStr}^${qtyStr}^${um}^${sgrVatMapped}^${sgrDepMapped}`);
    }
  }

  // 3. Free text note lines (optional)
  if (payload.noteLines && payload.noteLines.length > 0) {
    for (const note of payload.noteLines) {
      if (note.trim()) {
        const sanitizedNote = sanitizeFiscalNetText(note, 40);
        lines.push(`TL^${sanitizedNote}`);
      }
    }
  }

  // NOTE on ST^: We choose NOT to append a mandatory subtotal line (ST^)
  // because FiscalNet computes subtotals automatically when applying payment lines.
  // It is also safer because some older drivers reject explicit ST^ lines if not pre-configured.

  // 4. Payment lines
  for (const payment of payload.payments) {
    // Only export non-zero payments
    if (payment.amount > 0) {
      const paymentCode = FISCAL_NET_PAYMENT_MAPPINGS[payment.method] ?? 8;
      const paymentAmountStr = toFiscalNetMoney(payment.amount);
      lines.push(`P^${paymentCode}^${paymentAmountStr}`);
    }
  }

  // Ensure file ends with a trailing newline
  return lines.join('\r\n') + '\r\n';
}
