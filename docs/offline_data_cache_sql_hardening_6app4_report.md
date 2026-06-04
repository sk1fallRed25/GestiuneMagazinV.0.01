# technical report: Offline Data Cache SQL Pre-Apply Hardening (Stage 6APP.4)

> [!IMPORTANT]
> None of the proposed SQL blueprints or rollback scripts have been applied to the live database in this stage. The POS checkout system continues to block checkouts in offline mode as implemented in Stage 6APP.1.

---

## 1. Schema Compatibility Audit & Results

We audited the live database schema files in the `database/` directory to ensure full signature and relational compatibility with our new tables and RPCs:
- **`public.stores(id)`**: Verified UUID. Configured cascade deletion on all child tables.
- **`public.profiles(id)`**: Verified UUID. Maps directly to `auth.users(id)`. Used for device creators and cashiers.
- **`public.sales` & `public.sale_items`**: Schema checked. The `sale_items` snapshot schema is ready to receive items created via sync loops.
- **`public.stock_batches`**: Verified columns. Stock deductions will run via the standard FEFO zone `'magazin'` batches.
- **`public.pos_shifts`**: Confirmed as the active shifts table (replacing legacy `cashier_shifts`). Referenced for status validation during sales sync.
- **`public.audit_logs`**: Structure matched. All RPC operations perform inserts for traceability.
- **`public.has_store_role(uuid, text[])`**: Exists and works. Integrated for RBAC checks in functions.
- **`public.current_user_store_ids()`**: Exists and returns a table of UUIDs.
- **`public.update_updated_at_column()`**: Exists and registered on `pos_devices` and `offline_sale_sync_log` triggers.
- **`public.finalize_sale(...)`**: Signature confirmed: `public.finalize_sale(p_store_id UUID, p_profile_id UUID, p_items JSONB, p_payments JSONB, p_shift_id UUID)`.
- **Existing `public.devices` Table**: We detected an existing `public.devices` table in `001_clean_schema_core.sql` used for general hardware tracking. To prevent naming conflicts, our offline POS registry uses a separate table: **`public.pos_devices`**.

---

## 2. Hardened Database Schemas

### `public.pos_devices`
- **Constraints Added:**
  - Length check: `device_fingerprint` must be >= 12 characters.
  - Length check: `device_name` must be >= 2 characters.
  - Unique constraint: `unique_store_device_fingerprint` on `(store_id, device_fingerprint)`.
- **Indexes:**
  - `idx_pos_devices_store_active` on `(store_id, active)` for terminal listings.
  - `idx_pos_devices_store_last_seen` on `(store_id, last_seen_at desc)` for monitoring.
- **RLS policies:**
  - SELECT: Allowed for platform owners, admins, managers, and catalog managers.
  - ALL (DML): Limited strictly to platform owners, admins, and managers.

### `public.offline_sale_sync_log`
- **Constraints Added:**
  - Hash check: `payload_hash` format validated as SHA-256 (64 hex characters: `^[a-f0-9]{64}$`).
  - Status check: Whitelisted to `'received', 'finalized', 'duplicate', 'conflict', 'failed', 'rejected'`.
  - Conditional consistency: If `'finalized'`, `sale_id` and `finalized_at` must not be null.
  - Conditional consistency: If `'conflict', 'failed', 'rejected'`, `error_code` must not be null.
  - Type check: `payload_summary` must be a JSONB object.
  - Unique constraint: `unique_store_device_sale` on `(store_id, device_id, local_sale_id)`.
- **Indexes:**
  - `idx_offline_sync_log_store_status` on `(store_id, status)`.
  - `idx_offline_sync_log_store_received` on `(store_id, received_at DESC)`.
  - `idx_offline_sync_log_lookup` on `(store_id, device_id, local_sale_id)`.
  - `idx_offline_sync_log_sale_id` (partial) on `(sale_id) WHERE sale_id IS NOT NULL`.
- **RLS policies:**
  - SELECT: Allowed for store admins/managers/gestionars, and cashiers (for their own logs).
  - Direct INSERT/UPDATE: Completely blocked for authenticated users (only writable via the `SECURITY DEFINER` RPC).

### `public.offline_sync_snapshots`
- **Constraints Added:**
  - Entity whitelist: `entity IN ('products', 'product_prices', 'stock_batches', 'categories', 'shifts', 'store_settings', 'fiscalnet_config', 'full_bundle')`.
  - Sync type whitelist: `sync_type IN ('full', 'incremental')`.
  - Bound check: `row_count >= 0`.
  - Checksum check: SHA-256 64-hex format.
- **RLS policies:**
  - SELECT: Allowed for all store members.
  - DML: Blocked directly (writable only via sync bundle requests).

---

## 3. Hardened RPC Functions

All new RPC functions use `SECURITY DEFINER` and `SET search_path = public` to prevent environment variables pollution and path manipulation attacks.

1. **`public.register_pos_device(...)`**
   - Normalizes input parameters (trim, lowercase for fingerprints).
   - Validates lengths (fingerprint >= 12, name >= 2).
   - Restricts updates to managers/admins.
   - Logs `pos_device_registered` or `pos_device_seen` in the audit logs.
2. **`public.get_offline_cache_bundle(...)`**
   - Validates that the device is active and belongs to the store.
   - Verifies active store membership of the current user.
   - Restricts cached parameters (sanitizes settings to tax details only).
   - Notes that `fiscalnet_config` is local-only and not transmitted.
   - Performs checksum aggregation using `encode(digest(...), 'hex')`.
3. **`public.sync_offline_sale(...)`**
   - Recalculates all totals, VAT rates, and SGR amounts from database entries (Zero Trust on client-supplied sums).
   - Asserts product availability and status.
   - Asserts associated shift is open and valid.
   - Wraps the live transaction insertion inside the existing `public.finalize_sale(...)` function.
   - Catches exceptions (e.g. stock depletion) and transitions logs to `conflict` / `failed` statuses.
4. **`public.get_offline_sync_status(...)`**
   - Calculates cache health indicators (`ok`, `stale_24h` (age >= 24h), `expired_48h` (age >= 48h)).
   - Aggregates logs counts and lists the latest 5 transaction failures.

---

## 4. Idempotency & Conflict Rules

- **Idempotency**: Checked via `(store_id, device_id, local_sale_id)`.
  - If a sale is already `finalized` and the payload hashes match, it returns `duplicate` alongside the existing `sale_id`.
  - If the payload hashes do not match, it registers a `payload_mismatch` conflict.
- **Stock Depletion**: Insufficient stock is caught from `finalize_sale` and mapped to `conflict_stock`.
- **Tax/Price Shifts**: Checked by comparing client price, VAT rates, and SGR states against database records. Any mismatch leads to `conflict_price`, `conflict_vat`, or `conflict_sgr` to prevent client-side modifications.

---

## 5. Rollback Blueprint

A rollback script has been created at [database/rollback_offline_data_cache_sales_queue_6app4.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/rollback_offline_data_cache_sales_queue_6app4.sql). It drops the functions, triggers, policies, and tables in reverse dependency order.

---

## 6. Recommendations & Next Step
- **Recommended Next Step**: **`6APP.5 SQL Manual Apply Verification`** (Execute the SQL script in the Supabase editor and perform automated RLS/RPC testing).
