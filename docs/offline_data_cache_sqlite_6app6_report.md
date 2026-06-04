# Raport Etapa 6APP.6: Local SQLite Database & Cache Storage in Electron Main

Acest document descrie arhitectura tehnică, schema bazei de date locale, fluxurile de sincronizare și rezultatele testelor E2E / regresie pentru funcționalitatea **Baza de Date Locală (Offline Cache) în Electron Main**.

---

## 1. Arhitectură & Schema SQLite Locală

Pentru stocarea datelor local pe calculatorul POS (în procesul Main din Electron), am utilizat librăria nativă ultra-rapidă **`better-sqlite3`**, beneficiind de tranzacții ACID pentru prevenirea coruperii datelor la căderi bruște de curent.

Baza de date este salvată în folderul securizat `%APPDATA%/Sistem Gestiune Magazin/offline_cache.db`.

### Schemă Tabele Create (SQLite)
1. **`local_products`**: Cache catalog produse active.
   - `product_id` (TEXT PRIMARY KEY), `barcode` (TEXT), `name` (TEXT), `unit` (TEXT), `category_id` (TEXT), `active` (INTEGER), `sgr_enabled` (INTEGER), `sgr_type` (TEXT).
2. **`local_product_prices`**: Cache prețuri și cote TVA per magazin.
   - `product_id` (TEXT), `store_id` (TEXT), `price_sale` (REAL), `vat_group` (TEXT), `vat_percent` (REAL), PRIMARY KEY (`product_id`, `store_id`).
3. **`local_stock_snapshot`**: Cache stocuri agregate la raft.
   - `product_id` (TEXT), `store_id` (TEXT), `total_stock` (REAL), PRIMARY KEY (`product_id`, `store_id`).
4. **`local_categories`**: Cache ierarhie categorii.
   - `id` (TEXT PRIMARY KEY), `parent_id` (TEXT), `name` (TEXT).
5. **`local_shift_state`**: Salvează tura activă local.
   - `shift_id` (TEXT PRIMARY KEY), `store_id` (TEXT), `cashier_profile_id` (TEXT), `opened_at` (TEXT), `status` (TEXT), `synced_at` (TEXT).
6. **`local_store_settings`**: Cache setări magazin (taxe).
   - `store_id` (TEXT PRIMARY KEY), `name` (TEXT), `tax_settings_json` (TEXT).
7. **`local_sync_metadata`**: Istoricul sincronizărilor.
   - `store_id` (TEXT PRIMARY KEY), `last_sync_at` (TEXT), `checksum` (TEXT), `sync_type` (TEXT), `row_counts_json` (TEXT).
8. **`local_offline_sales_queue`**: Coada locală de vânzări offline (pregătită structural pentru etapa 6APP.7).

### Indecși Performanță
S-au creat indecși pe codul de bare (`idx_products_barcode`) și pe numele produsului (`idx_products_name`) pentru căutări și scanări instantanee de cod de bare, chiar și offline.

---

## 2. Fluxul de Sincronizare & Verificare Dispozitiv

Sincronizarea este declanșată manual (Settings) sau automat și urmează un protocol de Zero Trust:
1. **Identitate Dispozitiv (Device Identity):** La prima pornire, aplicația Electron generează automat o identitate unică locală (`device_id.json`) constând într-un `fingerprint` persistent și un nume bazat pe computer (`POS-${hostname}`).
2. **Verificare Supabase:** La sincronizare, aplicația interoghează tabela server-side `pos_devices`.
   - Dacă dispozitivul nu există sau este marcat ca inactiv pe server, aplicația încearcă o **auto-reactivare / înregistrare automată** (RPC `register_pos_device`) dacă sesiunea aparține unui Administrator/Manager.
   - Dacă sesiunea aparține unui casier și dispozitivul e inactiv, sincronizarea este blocată securizat.
3. **Descărcare & Salvare Atomica:** RPC-ul `get_offline_cache_bundle` aduce întreg catalogul cu semnătură SHA-256 (`checksum`). Acesta este salvat în SQLite local în cadrul unei **tranzacții SQL unice**, garantând atomicitate (ori totul se salvează corect, ori se dă rollback la starea precedentă).

---

## 3. Integrare în UI / UX & Fallback Căutare

- **`OfflineCacheSyncPanel.tsx`:** Randează un widget premium în ecranul de setări magazin, arătând numărul curent de produse, prețuri și categorii din SQLite, data ultimei sincronizări și un indicator vizual de prospețime a datelor (Verde, Galben dacă are >24h, Roșu blocat dacă depășește 48h).
- **Fallback Scanare/Căutare (`usePos.ts`):** Dacă hook-ul de rețea indică `offline = true` (sau în lipsa conexiunii Supabase live), funcțiile de căutare și scanare cod de bare la checkout deviază automat cererea către IPC-ul SQLite (`window.electronAPI.sqlite.searchProducts` și `getProductByBarcode`), mapând rezultatele local. Casierul poate adăuga produse în coș fără întreruperi.

---

## 4. Rezultate Teste E2E & Regresie

Rularea suitei dedicate de teste Playwright E2E (`test_offline_data_cache_sqlite_6app6.py`) a returnat **3 succese din 3 scenarii**:
- **Test A (Status initial):** Panelul de sincronizare a pornit nesincronizat (0 elemente, badge roșu) conform design-ului defensiv.
- **Test B (Manual sync):** Apăsarea butonului de sincronizare a descărcat cu succes datele din Supabase, populând cache-ul SQLite cu 700+ produse, 700+ prețuri active și actualizând panelul la culoarea verde.
- **Test C (Offline fallback):** Simulat deconectare internet (`set_offline(True)`) pe pagina POS. Scanarea codului de bare `5941300013220` a apelat cu succes fallback-ul SQLite offline, adăugând corect produsul `"BOROMIR CHEC LAPTE 50G"` în coș cu prețul și cota TVA corecte.

### Teste Regresie Rulate (100% Succes):
- **Cart Recovery & App Close (`test_pos_cart_recovery_close_app_6app51.py`):** 12/12 teste trecute (securitate coș draft pe deconectare/logout).
- **Auto-Update (`test_desktop_auto_update_6app2.py`):** Scenarii de bariere coș plin și actualizare NSIS (trece).
- **Offline Safe Mode (`test_nir_placeholder_update_offline_6app1.py`):** Monitorizare online/offline, blocare checkout offline (cât timp coada offline din 6APP.7 nu este încă implementată), restricții e-factura NIR (trece).
