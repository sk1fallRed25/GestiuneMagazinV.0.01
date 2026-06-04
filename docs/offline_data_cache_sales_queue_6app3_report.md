# Offline Data Cache & Sales Queue Blueprint Report - Stage 6APP.3

This report details the architectural specifications, local schemas, synchronization mechanisms, and safety features designed for offline Point of Sale (POS) operations.

---

## 1. Summary of Created Assets
- **SQL Blueprint (`database/proposed_offline_data_cache_sales_queue_6app3.sql`)**: Defines server-side tables (`pos_devices`, `offline_sale_sync_log`, `offline_sync_snapshots`) and secure RPC functions (`register_pos_device`, `get_offline_cache_bundle`, `sync_offline_sale`, `get_offline_sync_status`). All functions are hardened with `SECURITY DEFINER` and specific path searches.
- **Architectural Specifications (`docs/offline_data_cache_sales_queue_blueprint_6app3.md`)**: Details local SQLite tables, sync timings, cache validity thresholds, local backup strategies, and recovery procedures.
- **Static Verification Suite (`test_offline_data_cache_sales_queue_blueprint_6app3.py`)**: Checks for the presence of all required files, DB structures, and documented criteria.

> [!IMPORTANT]
> No real offline sales, SQLite engines, or synchronization routines are enabled in the codebase during this stage. The POS checkout continues to block checkouts when offline as implemented in Stage 6APP.1.

---

## 2. Core Architectural Decisions

### SQLite as the Local Engine
SQLite running in the Electron Main process is selected over browser-based storage (LocalStorage, IndexedDB) for its robust ACID compliance, index-optimized searches, relational integrity, and single-file backup convenience.

### Synchronization Regimes
- **Full Sync:** Triggers daily at app startup to build fresh catalogs.
- **Incremental Sync:** Triggers every 15-30 minutes when online to download modified catalog rows.
- **Cache Validity:** Limits offline checkouts to a maximum cache age of 48 hours to prevent stale prices and tax rules.

### Hardware Protection (PC Failure Recovery)
Every offline checkout writes to SQLite and immediately appends the transaction to a local daily backup file:
`%APPDATA%\GestiuneMagazin\offline-backups\offline-sales-backup-YYYY-MM-DD.jsonl`
Each transaction is recorded as a single-line JSON structure complete with SHA-256 payload hashes. These logs are preserved for 30 days and can be exported/imported by store admins.

### Post-Sync FiscalNet Writing
To prevent double receipt print jobs or orphan logs, the client does **NOT** write files to the monitored FiscalNet folder while offline. Files are only written once a connection is restored, the sale is sent to the server, and the database issues a finalized `sale_id`.

---

## 3. Risk Assessment & Verification

| Risk Category | Hazard | Mitigation |
| :--- | :--- | :--- |
| **Transaction Integrity** | Local database tampering. | The client hashes the payload with SHA-256; the server recalculates all totals (VAT, SGR, prices) and rejects modifications. |
| **Idempotency** | Double sync submissions. | Handled via server-side unique constraints on the combination of `device_id` and `local_sale_id`. |
| **Pricing / VAT Shifts** | Outdated tax rates or prices. | Strict 48-hour cache invalidation windows block offline checkout access. |
