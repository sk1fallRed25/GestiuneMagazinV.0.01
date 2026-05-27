import { FiscalNetPaymentMethod } from './types';

/**
 * Maps the application's internal VAT groups ('A' | 'B' | 'C' | 'D' | 'E')
 * to FiscalNet numeric VAT groups (1, 2, 3, 4, 5).
 * 
 * IMPORTANT: This mapping is a template/logical proposal and MUST be verified 
 * with the actual configuration of the fiscal printer (casa de marcat).
 * If the cash register configures VAT groups differently (e.g. A=19%, B=9%, etc.),
 * these mappings will need to be aligned accordingly.
 */
export const FISCAL_NET_VAT_MAPPINGS: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = {
  A: 1, // e.g., 19%
  B: 2, // e.g., 9%
  C: 3, // e.g., 5%
  D: 4, // e.g., 0% (or exempted, often used for SGR)
  E: 5  // e.g., non-taxable / special
};

/**
 * Maps application payment methods to FiscalNet numeric codes:
 * 1 = Numerar (Cash)
 * 2 = Card
 * 3 = Credit
 * 4 = Tichet masă (Meal Ticket)
 * 5 = Tichet valoric
 * 6 = Voucher
 * 7 = Plată modernă
 * 8/9 = Alte modalități (Other)
 */
export const FISCAL_NET_PAYMENT_MAPPINGS: Record<FiscalNetPaymentMethod, number> = {
  cash: 1,
  card: 2,
  credit: 3,
  meal_ticket: 4,
  voucher: 6,
  modern: 7,
  other: 8
};

/**
 * SGR constants.
 * SGR items are exported immediately after the main item as a separate product line.
 * They always use VAT group 'D' (which maps to FiscalNet group 4, i.e., 0% VAT).
 */
export const SGR_VAT_GROUP: 'A' | 'B' | 'C' | 'D' | 'E' = 'D';
export const SGR_DEFAULT_DEP_GROUP = 1;

export const SGR_NAMES = {
  plastic: 'GARANTIE SGR PLASTIC',
  metal: 'GARANTIE SGR METAL',
  glass: 'GARANTIE SGR STICLA'
};
