/**
 * POS Cart Recovery Service — Stage 6APP.5.1
 *
 * Manages scoped, versioned localStorage drafts of unsaved POS carts.
 *
 * IMPORTANT: A cart draft is NOT an offline sale.
 * - No sale_id
 * - Does not decrement stock
 * - Does not write FiscalNet
 * - Is never sent to the server or entered in offline_sale_sync_log
 * - Can be deleted without any accounting effect
 * - Real checkout is ONLY via finalize_sale
 */

import { CartItem } from '../types';

// --- Types ---

export interface CartDraftContext {
  storeId: string;
  profileId: string;
  deviceId?: string | null;
}

export interface PosCartDraft {
  storeId: string;
  profileId: string;
  shiftId: string | null;
  deviceId: string | null;
  items: CartItem[];
  totalsSnapshot: {
    productsSubtotal: number;
    sgrTotal: number;
    grandTotal: number;
  };
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  schemaVersion: number;
}

export interface CartDraftSummary {
  itemCount: number;
  estimatedTotal: number;
  savedAt: string;
  storeId: string;
  profileId: string;
}

// --- Constants ---

const SCHEMA_VERSION = 1;
const KEY_PREFIX = 'pos_cart_draft_v1';

// --- Helpers ---

function buildStorageKey(ctx: CartDraftContext): string {
  const base = `${KEY_PREFIX}:${ctx.storeId}:${ctx.profileId}`;
  return ctx.deviceId ? `${base}:${ctx.deviceId}` : base;
}

function getAppVersion(): string {
  try {
    return (window as any).__APP_VERSION__ || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function calculateTotals(items: CartItem[]) {
  const productsSubtotal = items.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const sgrTotal = items.reduce((acc, item) => acc + (item.sgrEnabled ? item.quantity * 0.50 : 0), 0);
  return {
    productsSubtotal,
    sgrTotal,
    grandTotal: productsSubtotal + sgrTotal,
  };
}

// --- Service Functions ---

/**
 * Save the current POS cart as a draft to localStorage.
 * Only saves if context has storeId and profileId.
 * If items array is empty, clears the draft instead.
 */
export function savePosCartDraft(
  ctx: CartDraftContext,
  items: CartItem[],
  shiftId?: string | null
): void {
  if (!ctx.storeId || !ctx.profileId) return;

  // If cart is empty, clear draft
  if (!items || items.length === 0) {
    clearPosCartDraft(ctx);
    return;
  }

  const key = buildStorageKey(ctx);
  const existing = loadPosCartDraft(ctx);
  const now = new Date().toISOString();

  const draft: PosCartDraft = {
    storeId: ctx.storeId,
    profileId: ctx.profileId,
    shiftId: shiftId || null,
    deviceId: ctx.deviceId || null,
    items,
    totalsSnapshot: calculateTotals(items),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    appVersion: getAppVersion(),
    schemaVersion: SCHEMA_VERSION,
  };

  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (err) {
    console.warn('[PosCartRecovery] Failed to save draft:', err);
  }
}

/**
 * Load a previously saved cart draft from localStorage.
 * Returns null if not found or if data is corrupted.
 */
export function loadPosCartDraft(ctx: CartDraftContext): PosCartDraft | null {
  if (!ctx.storeId || !ctx.profileId) return null;

  const key = buildStorageKey(ctx);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!validateCartDraft(parsed)) {
      console.warn('[PosCartRecovery] Corrupted draft detected, clearing.');
      localStorage.removeItem(key);
      return null;
    }

    return parsed as PosCartDraft;
  } catch (err) {
    console.warn('[PosCartRecovery] Failed to load draft:', err);
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
    return null;
  }
}

/**
 * Clear the saved cart draft from localStorage.
 */
export function clearPosCartDraft(ctx: CartDraftContext): void {
  if (!ctx.storeId || !ctx.profileId) return;

  const key = buildStorageKey(ctx);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[PosCartRecovery] Failed to clear draft:', err);
  }
}

/**
 * Quick check: does a draft exist for this context?
 */
export function hasPosCartDraft(ctx: CartDraftContext): boolean {
  if (!ctx.storeId || !ctx.profileId) return false;

  const key = buildStorageKey(ctx);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return validateCartDraft(parsed) && parsed.items.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate structural integrity of a cart draft.
 */
export function validateCartDraft(draft: any): boolean {
  if (!draft || typeof draft !== 'object') return false;
  if (typeof draft.schemaVersion !== 'number') return false;
  if (draft.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof draft.storeId !== 'string' || !draft.storeId) return false;
  if (typeof draft.profileId !== 'string' || !draft.profileId) return false;
  if (!Array.isArray(draft.items)) return false;
  if (typeof draft.createdAt !== 'string') return false;
  if (typeof draft.updatedAt !== 'string') return false;

  // Validate each item has minimum required fields
  for (const item of draft.items) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.productId !== 'string' || !item.productId) return false;
    if (typeof item.name !== 'string') return false;
    if (typeof item.price !== 'number' || item.price < 0) return false;
    if (typeof item.quantity !== 'number' || item.quantity <= 0) return false;
  }

  return true;
}

/**
 * Get a human-readable summary of a cart draft.
 */
export function getCartDraftSummary(draft: PosCartDraft): CartDraftSummary {
  return {
    itemCount: draft.items.length,
    estimatedTotal: draft.totalsSnapshot.grandTotal,
    savedAt: draft.updatedAt,
    storeId: draft.storeId,
    profileId: draft.profileId,
  };
}

/**
 * Validate individual cart items against current product availability.
 * Returns { validItems, invalidCount, recalculated }.
 */
export function validateCartItems(
  draftItems: CartItem[],
  currentProducts: Array<{ id: string; name: string; priceSale: number; stockMagazin: number; sgrEnabled?: boolean; sgrType?: string | null; status?: string }>
): { validItems: CartItem[]; invalidCount: number; recalculated: boolean } {
  const validItems: CartItem[] = [];
  let invalidCount = 0;
  let recalculated = false;

  for (const item of draftItems) {
    // Skip items with bad structure
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      invalidCount++;
      continue;
    }

    const currentProduct = currentProducts.find(p => p.id === item.productId);

    // Product not found or inactive
    if (!currentProduct || (currentProduct.status && currentProduct.status !== 'active')) {
      invalidCount++;
      continue;
    }

    // Recalculate with current data if price/SGR changed
    const priceChanged = Math.abs(currentProduct.priceSale - item.price) > 0.001;
    const sgrChanged = (currentProduct.sgrEnabled || false) !== (item.sgrEnabled || false);

    if (priceChanged || sgrChanged) {
      recalculated = true;
    }

    validItems.push({
      ...item,
      price: currentProduct.priceSale,
      name: currentProduct.name,
      total: item.quantity * currentProduct.priceSale,
      stockAvailable: currentProduct.stockMagazin,
      sgrEnabled: currentProduct.sgrEnabled || false,
      sgrType: (currentProduct.sgrType as CartItem['sgrType']) || null,
      sgrDepositAmount: currentProduct.sgrEnabled ? 0.50 : 0,
      sgrTotalAmount: currentProduct.sgrEnabled ? item.quantity * 0.50 : 0,
    });
  }

  return { validItems, invalidCount, recalculated };
}
