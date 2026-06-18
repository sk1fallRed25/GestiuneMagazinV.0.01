# Go-Live Checklist - Stage 6OPS.1

This checklist details the steps required to safely transition the GestiuneMagazin application from the pilot stage to full production.

---

## 1. Phase A: Pre-Deployment Verification

### 1.1. Database Baseline
- [ ] **DB Cleanup:** Verify that the database is cleared of all test/dummy sales, test shifts, and debug store entries (must only contain baseline products, configured stores, and active users).
- [ ] **Schema Migrations:** Ensure all migrations are applied to production. Run:
  ```bash
  npx supabase db push
  ```
- [ ] **RLS Verification:** Run the security audit SQL queries to verify RLS is enabled on all tables:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
  ```
  *(Verify that all active tables return `true` for rowsecurity)*
- [ ] **RPC Check:** Verify that execution rights are revoked for `anon` on all transactional RPCs (`finalize_sale`, `sync_offline_sale`, etc.).

### 1.2. Environment Configurations
- [ ] **Environment variables (.env):** Check that production client environment files are correct:
  * `VITE_SUPABASE_URL` -> Production URL
  * `VITE_SUPABASE_ANON_KEY` -> Production Anon Key
- [ ] **Update Feed (.env.local):** Ensure `VITE_UPDATE_FEED_URL` points to the production auto-update generic/GitHub gateway:
  * In production, this should point to `https://github.com/sk1fallRed25/GestiuneMagazinV.0.01` or a custom update gateway (instead of localhost).

---

## 2. Phase B: Deployment Execution

### 2.1. Electron Executable Compilation
- [ ] **Dependency check:** Clean `node_modules` and run clean installation:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- [ ] **Code Compilation:** Compile TypeScript and build web assets:
  ```bash
  npm run build
  ```
- [ ] **Package Electron App:** Pack Electron client for target production architecture (Windows x64):
  ```bash
  npm run electron:build
  ```
- [ ] **Verify Artifacts:** Check that installers (`.exe`, `RELEASES`, `.nupkg`) are generated inside the `release/` folder.

### 2.2. GitHub Release Publication
- [ ] **Draft Release:** Create a new release draft on GitHub.
  * Tag version: `v1.0.1` (matching `package.json`).
  * Release Title: `Sistem Gestiune Magazin v1.0.1`.
- [ ] **Upload installers:** Attach the Windows installer `.exe`, `RELEASES` file, and `.nupkg` archive from the `release/` directory to the release assets.
- [ ] **Publish:** Publish the release. Mark as **Pre-release** if running pilot phase, or **Latest** for production.

---

## 3. Phase C: Post-Deployment Verification

### 3.1. Client POS Testing (First Boot)
- [ ] **Clean Install:** Download the `.exe` installer on a clean target POS Windows terminal.
- [ ] **Startup Verification:** Run the application. Confirm it boots without throwing SQLite or native database errors.
- [ ] **Device Registration:** Log in with manager credentials and register the device fingerprint. Check `pos_devices` table to verify it appeared.
- [ ] **Offline Cache Pull:** Verify that products catalog, pricing, and active cashier shifts are pulled and cached in SQLite (`offline_cache.db`).

### 3.2. Transactional Validation
- [ ] **Shift Lifecycle:** Open a POS Shift from the UI. Confirm `pos_shifts` table is updated.
- [ ] **Fiscal Printing:** Conduct a dummy sale checkout. Verify that:
  * Bonuri txt file is written to the configured FiscalNet `bonuri/` folder.
  * FiscalNet reads the response and prints successfully.
  * Stock is deducted using FIFO rules from `stock_batches`.
- [ ] **Offline Checkout:** Disconnect network adapter. Execute a sale. Confirm:
  * POS workspace continues working.
  * Sale is successfully written to SQLite local offline queue (`status = 'queued'`).
- [ ] **Sync Verification (conditional on 6APP.8 UI unlock):** Reconnect network. Trigger sync. Verify that local sale status changes to `synced` and appears in the production database.
