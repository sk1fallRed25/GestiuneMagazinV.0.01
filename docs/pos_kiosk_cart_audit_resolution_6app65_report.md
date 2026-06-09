# Technical Report — POS Kiosk Mode, Cart Recovery Audit & Resolution Adaptation (6APP.6.5)

This report details the implementation of Stage 6APP.6.5, providing role-based window locking, preventing cart data loss upon app crash/exit, auditing cart modifications locally, and ensuring UI layout compatibility.

---

## 1. Controlled Window Fullscreen / Kiosk Mode

### Architecture & Handlers
To prevent non-cashier users (Admins, Managers, Owners) from being forced into fullscreen, and to lock down cashier sessions, we implemented a role-and-route-based window state toggle.

1. **Window Creation**: In `electron-main.js`, `fullscreen` is set to `false` at startup. Instead, `win.maximize()` is called, showing a normal, maximized window on the login screen.
2. **IPC Channel Registration**:
   - `app:set-kiosk-mode`: Toggles native kiosk mode on the active window.
   - `app:set-fullscreen-mode`: Toggles native fullscreen.
   - `app:get-window-state`: Returns active Kiosk, Fullscreen, and Maximized attributes.
   - `app:get-screen-size`: Returns primary display work area resolution metrics.
3. **Global React Router Monitoring**:
   In `AppRoutes.tsx`, a `useEffect` hook monitors the navigation location and user role:
   - When the user's role is `casier` and they enter `/pos` or `/vanzare`, the app requests `setKioskMode(true)`.
   - If they log out, navigate back, or hit an access-denied page, Kiosk Mode is immediately released.
4. **Header Kiosk Active Badge**:
   `PosPage.tsx` features an animated `🔒 Kiosk Activ` status indicator in the header, visible to the cashier only when Electron reports kiosk mode as active.

---

## 2. Hardened Cart Recovery System

To resolve the race condition where restored cart items failed validation checks because the product catalog was not yet loaded, we updated the recovery sequence:

- **Catalog Loading Protection**: In `PosPage.tsx`, the `useEffect` that checks for `hasPosCartDraft` now awaits the completion of `loadingAllProducts`.
- **Offline SQLite Product Source**: If the system is offline, products are fetched from the local SQLite catalog using `getAllLocalProducts(storeId)` to ensure validation and recovery function perfectly offline.
- **Audit tracking**: Discarding the recovery draft logs a `cart_discarded` event.

---

## 3. SQLite Cart Deletion & Audit Logs

To allow administrators to audit cart activities (like deleting products or changing quantities), we created a secure audit logger.

### Local SQLite Schema
A new local database table is initialized in `electron-sqlite-service.js`:
```sql
CREATE TABLE IF NOT EXISTS local_pos_cart_events (
    id TEXT PRIMARY KEY,
    store_id TEXT,
    cashier_profile_id TEXT,
    device_fingerprint TEXT,
    event_type TEXT,
    product_id TEXT,
    product_name TEXT,
    barcode TEXT,
    quantity_before REAL,
    quantity_after REAL,
    reason TEXT,
    created_at_local TEXT,
    synced_status TEXT DEFAULT 'local_only'
);
```

### Event Triggers
Logs are generated for the following event types:
- `item_added`: Add new product to cart.
- `item_quantity_changed`: Increment/decrement or set quantity.
- `item_removed`: Click Trash/Delete icon on a cart item.
- `cart_cleared`: Click Clear Cart button.
- `cart_restored`: Click restore on recovery draft.
- `cart_discarded`: Discard recovery draft.

### Admin Dashboard UI
An administrative dashboard panel "Evenimente coș POS" (`PosCartEventsPanel.tsx`) is rendered inside the Store Settings page. It allows admins to filter logs, view cashier details, timestamps, and target products.

---

## 4. Desktop Resolution Adaptation

To support varying desktop monitor sizes (from older 1024x768 screens to 1080p monitors), we optimized POS container resizing:
- Utilized CSS flexbox and grid layouts (`flex-1`, `overflow-hidden`, and `overflow-y-auto`) to guarantee cart lists and action buttons fit the screen perfectly without truncation or overlap.
- Added essential testids for Automated Layout validation:
  - `pos-layout-root` (Page Root)
  - `pos-cart-panel` (Left/Cart Section)
  - `pos-payment-panel` (Payment Section)
  - `pos-total-display` (Total to pay area)
  - `pos-scan-input` (Search/Scanner bar)
