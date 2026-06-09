/**
 * POS Cart Events logging service.
 * Tracks cart deletions, updates, additions, clearances, restorations, and discards.
 * Exposes SQLite local logs or uses localStorage backup if browser fallback is active.
 */

export interface CartEvent {
  id?: string;
  storeId: string;
  cashierProfileId: string;
  deviceFingerprint?: string;
  eventType: 'item_added' | 'item_quantity_changed' | 'item_removed' | 'cart_cleared' | 'cart_restored' | 'cart_discarded';
  productId?: string | null;
  productName?: string | null;
  barcode?: string | null;
  quantityBefore?: number;
  quantityAfter?: number;
  reason?: string | null;
  createdAtLocal?: string;
  syncedStatus?: string;
}

export async function logCartEvent(event: CartEvent): Promise<void> {
  const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI?.sqlite;
  const now = new Date().toISOString();
  const id = event.id || (globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : 'evt_' + Math.random().toString(36).substring(2, 15));

  if (isDesktop) {
    try {
      const devInfo = await (window as any).electronAPI.sqlite.getDeviceInfo();
      const fingerprint = devInfo?.fingerprint || 'unknown';

      await (window as any).electronAPI.sqlite.logCartEvent({
        id,
        store_id: event.storeId,
        cashier_profile_id: event.cashierProfileId,
        device_fingerprint: fingerprint,
        event_type: event.eventType,
        product_id: event.productId || null,
        product_name: event.productName || null,
        barcode: event.barcode || null,
        quantity_before: event.quantityBefore !== undefined ? event.quantityBefore : 0,
        quantity_after: event.quantityAfter !== undefined ? event.quantityAfter : 0,
        reason: event.reason || null
      });
      return;
    } catch (err) {
      console.error('[CartEventService] Failed to write to SQLite database, falling back to localStorage:', err);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `local_pos_cart_events:${event.storeId}`;
    const raw = localStorage.getItem(key);
    const events: any[] = raw ? JSON.parse(raw) : [];

    events.push({
      id,
      store_id: event.storeId,
      cashier_profile_id: event.cashierProfileId,
      device_fingerprint: 'browser_fallback',
      event_type: event.eventType,
      product_id: event.productId || null,
      product_name: event.productName || null,
      barcode: event.barcode || null,
      quantity_before: event.quantityBefore !== undefined ? event.quantityBefore : 0,
      quantity_after: event.quantityAfter !== undefined ? event.quantityAfter : 0,
      reason: event.reason || null,
      created_at_local: now,
      synced_status: 'local_only'
    });

    // Keep only last 1000 events to avoid storage limits
    if (events.length > 1000) {
      events.shift();
    }

    localStorage.setItem(key, JSON.stringify(events));
  } catch (err) {
    console.error('[CartEventService] Fallback logging error:', err);
  }
}

export async function listCartEvents(storeId: string): Promise<any[]> {
  const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI?.sqlite;

  if (isDesktop) {
    try {
      return await (window as any).electronAPI.sqlite.listCartEvents({ storeId });
    } catch (err) {
      console.error('[CartEventService] SQLite list failed, reading from localStorage:', err);
    }
  }

  try {
    const key = `local_pos_cart_events:${storeId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Sort descending by created_at_local
    return parsed.sort((a: any, b: any) => new Date(b.created_at_local).getTime() - new Date(a.created_at_local).getTime());
  } catch (err) {
    console.error('[CartEventService] Fallback reading error:', err);
    return [];
  }
}
