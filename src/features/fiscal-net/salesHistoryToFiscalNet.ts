import { SaleDetails } from '../sales-history/types';
import { 
  FiscalNetReceiptPayload, 
  FiscalNetReceiptItem, 
  FiscalNetPayment, 
  FiscalNetPaymentMethod 
} from './types';

/**
 * Maps a `SaleDetails` object from the sales history module
 * into a structured `FiscalNetReceiptPayload` for receipt formatting.
 * 
 * Verifies all math, presence of payment details, SGR types, and VAT groups.
 * Throws clean, user-friendly errors on missing or invalid data.
 */
export function mapSaleDetailsToFiscalNetPayload(
  saleDetails: SaleDetails,
  options?: {
    fiscalCode?: string | null;
    noteLines?: string[];
  }
): FiscalNetReceiptPayload {
  if (!saleDetails) {
    throw new Error('Nu se poate genera fișier FiscalNet: detalii vânzare lipsă.');
  }

  // 1. Map items & validate VAT and SGR
  const mappedItems: FiscalNetReceiptItem[] = [];
  let computedProductsTotal = 0;
  let computedSgrTotal = 0;

  for (const item of saleDetails.items) {
    // VAT group validation
    if (!item.vatGroup) {
      throw new Error('Nu se poate genera fișier FiscalNet: grupa TVA lipsește.');
    }

    // SGR validation
    let sgrItemPayload = null;
    if (item.sgrEnabled) {
      const validSgrTypes = ['plastic', 'metal', 'glass'];
      if (!item.sgrType || !validSgrTypes.includes(item.sgrType)) {
        throw new Error('Nu se poate genera fișier FiscalNet: tipul SGR este invalid.');
      }
      
      const sgrAmount = item.sgrDepositAmount ?? 0.50;
      sgrItemPayload = {
        enabled: true,
        type: item.sgrType as 'plastic' | 'metal' | 'glass',
        amount: sgrAmount,
        vatGroup: 'D' as const
      };
      
      computedSgrTotal += item.quantity * sgrAmount;
    }

    computedProductsTotal += item.unitPrice * item.quantity;

    mappedItems.push({
      name: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: 'buc', // Defaulting to pieces as unit isn't in SaleItemDetails
      vatGroup: item.vatGroup,
      departmentGroup: 1,
      barcode: item.barcode || null,
      sgr: sgrItemPayload
    });
  }

  // 2. Map payments & validate payment existence
  let mappedPayments: FiscalNetPayment[] = [];
  if (saleDetails.payments && saleDetails.payments.length > 0) {
    mappedPayments = saleDetails.payments.map(p => {
      let method: FiscalNetPaymentMethod = 'other';
      const m = p.method.toLowerCase().trim();
      
      if (m === 'cash') method = 'cash';
      else if (m === 'card') method = 'card';
      else if (m === 'voucher') method = 'voucher';
      else if (m === 'credit') method = 'credit';
      else if (m === 'meal_ticket') method = 'meal_ticket';
      else if (m === 'modern') method = 'modern';
      
      return {
        method,
        amount: p.amount
      };
    });
  } else if (saleDetails.paymentMethod) {
    let method: FiscalNetPaymentMethod = 'other';
    const m = saleDetails.paymentMethod.toLowerCase().trim();
    
    if (m === 'cash') method = 'cash';
    else if (m === 'card') method = 'card';
    else if (m === 'voucher') method = 'voucher';
    else if (m === 'credit') method = 'credit';
    else if (m === 'meal_ticket') method = 'meal_ticket';
    else if (m === 'modern') method = 'modern';
    
    if (m === 'mixed') {
      throw new Error('Nu se poate genera fișier FiscalNet: metoda de plată lipsește.');
    }
    
    mappedPayments = [{ method, amount: saleDetails.total }];
  } else {
    throw new Error('Nu se poate genera fișier FiscalNet: metoda de plată lipsește.');
  }

  // Double check that we actually have non-zero payment lines
  const totalPaid = mappedPayments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid <= 0) {
    throw new Error('Nu se poate genera fișier FiscalNet: metoda de plată lipsește.');
  }

  // 3. Validate overall totals match
  const computedGrandTotal = computedProductsTotal + computedSgrTotal;
  const diffGrand = Math.abs(computedGrandTotal - saleDetails.total);
  if (diffGrand > 0.01) {
    throw new Error('Nu se poate genera fișier FiscalNet: totalurile nu corespund.');
  }

  return {
    saleId: saleDetails.id,
    fiscalCode: options?.fiscalCode || null,
    items: mappedItems,
    payments: mappedPayments,
    totals: {
      productsTotal: Number(computedProductsTotal.toFixed(2)),
      sgrTotal: Number(computedSgrTotal.toFixed(2)),
      grandTotal: Number(computedGrandTotal.toFixed(2))
    },
    noteLines: options?.noteLines || []
  };
}
