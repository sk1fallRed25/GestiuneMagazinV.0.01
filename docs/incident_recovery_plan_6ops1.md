# Incident Recovery Plan - Stage 6OPS.1

This document outlines standard operating procedures (runbooks) for recovering from critical operational failures in a production environment.

---

## 1. Runbook 1: Connectivity Outages (Internet Loss)

### Impact:
The client application cannot reach the Supabase backend. Cashiers cannot authenticate, pull new catalogs, or write sales directly to Postgres.

### Automatic Fallback:
1. The app automatically enters **Offline Mode** if network requests fail.
2. Product searches and barcode lookups route to the local SQLite `offline_cache.db`.
3. Cashiers can continue checking out items. Checked-out sales are written to `local_offline_sales_queue` with status `queued` and a unique UUID.
4. Shift states remain tracked locally.

### Recovery Steps (Restoring Connection):
1. **Verify Connection:** Ensure physical Ethernet/Wi-Fi connection is restored on the terminal.
2. **Access Offline Queue:** Navigate to **Store Settings -> Coadă Vânzări Offline**.
3. **Queue Check:** Confirm the number of queued offline transactions matches the expected sales count.
4. **Trigger Sync:** Once the UI sync is enabled (Etapa 6APP.8), click **Sincronizează acum** to push sales.
5. **Conflict Resolution:** If a transaction reports a sync conflict, it will show status `conflict`. An administrator must inspect the conflict on the Supabase dashboard (`public.sync_conflicts` table) and manually update the stock batch or confirm the sale details.

---

## 2. Runbook 2: SQLite Database Corruption

### Impact:
The local SQLite file `offline_cache.db` becomes corrupt due to sudden power loss or disk failure. The application throws a database error on startup and hangs or closes immediately.

### Diagnostics:
- Check Node.js log or run a quick SQLite integrity query if access is available:
  ```sql
  PRAGMA integrity_check;
  ```

### Recovery Steps:
1. **Backup Corrupt File:** Copy the corrupt `offline_cache.db` file to a temporary location to prevent data loss:
   * Location: `%APPDATA%/Sistem Gestiune Magazin/offline_cache.db`
2. **Clear Database:** Delete the corrupt file from `%APPDATA%/Sistem Gestiune Magazin/`.
3. **App Launch:** Relaunch the application. Electron will automatically recreate the database and table schemas on startup (`initDb`).
4. **Full Catalog Sync:** Ensure the POS terminal is connected to the internet. Log in with manager credentials to automatically fetch a new `get_offline_cache_bundle` from Supabase, fully repopulating the local products, prices, and stock snapshot.
5. **Offline Data Recovery:**
   * If there were unsynced sales in the corrupt database, attempt to retrieve the data from the daily JSONL backup files under `%APPDATA%/GestiuneMagazin/offline-backups/` (if daily file backup is active).
   * Otherwise, transactions must be re-registered manually from physical printed receipts.

---

## 3. Runbook 3: Failed Update or Rollback

### Impact:
A newly published app update (`v1.0.2`) contains a critical regression, fails to boot, or crashes frequently.

### Rollback Strategy (Emergency Feed Update):
1. **Modify Release Feed:** Point the auto-update generic server or GitHub release metadata away from the buggy version.
   * Edit the `latest.yml` file on the update feed server.
   * Change `version: 1.0.2` back to `version: 1.0.1` and update the installer file path and hash to point to `v1.0.1`.
2. **Auto-Downgrade:** Upon restarting, client stations will detect version `1.0.1` as the targeted latest release (since `allowPrerelease = true` allows version checks) and prompt to download/install.

### Manual Downgrade (Fallback):
1. **Uninstall Buggy Version:** On the Windows POS terminal, open Settings -> Apps & Features and uninstall `Sistem Gestiune Magazin`.
2. **Install Previous Build:** Run the stable `v1.0.1` installer executable (`Sistem Gestiune Magazin Setup 1.0.1.exe`) previously saved in the local release backup directory or downloaded from the GitHub Release stable tags.
3. **Database Check:** Confirm that local SQLite databases did not suffer backward-compatibility issues. If schemas are incompatible, delete `offline_cache.db` and perform a clean sync.

---

## 4. Runbook 4: Security Incident & Key Leakage

### Impact:
The Supabase anon key or user credentials are leaked, allowing external attackers to attempt database exploitation.

### Recovery Steps:
1. **Supabase Anon Key Rotation:**
   * Access the Supabase Dashboard -> Project Settings -> API.
   * Click **Rotate Key** next to the anon key.
2. **Update Client Configurations:**
   * Update the environment variables in the central build repository.
   * Re-build the Electron client containing the new `VITE_SUPABASE_ANON_KEY`.
   * Distribute the update via the auto-updater or perform manual installation on all POS terminals.
3. **Credential Auditing:**
   * Inspect the `public.audit_logs` table for platform owner administrative modifications.
   * Query the Supabase access log for high-frequency or suspicious IP addresses querying RPCs.
   * Suspend compromised manager or cashier accounts immediately in the Auth dashboard.
