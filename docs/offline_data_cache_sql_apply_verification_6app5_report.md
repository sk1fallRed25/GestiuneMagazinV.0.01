# Stage 6APP.5: Offline Data Cache SQL Manual Apply Verification Report

## 1. Confirmare Aplicare SQL
Scriptul SQL de hardening pentru cache-ul offline și coada de vânzări (`database/proposed_offline_data_cache_sales_queue_6app3.sql`) a fost aplicat cu succes în editorul SQL Supabase. În timpul verificării s-a identificat și corectat o problemă minoră legată de coloana `updated_at` a tabelului `public.categories` (care nu există în schemă, fiind folosită în loc coloana `created_at`), precum și calificarea corectă a schemei pentru funcția `extensions.digest` cu conversia aferentă la `bytea`. Ambele modificări au fost salvate în codul sursă SQL și sunt funcționale pe baza de date live.

---

## 2. Rezultate Catalog Database
Verificările de catalog confirmă crearea corectă a structurilor de date pe schema `public`:

### Tabele și Coloane Create
- **`public.pos_devices`**:
  - `id` (UUID, primary key)
  - `store_id` (UUID, foreign key la public.stores)
  - `device_fingerprint` (TEXT, unique, lungime între 12 și 128 caractere)
  - `device_name` (TEXT, lungime între 2 și 64 caractere)
  - `active` (BOOLEAN, default true)
  - `created_at` (TIMESTAMPTZ, default now())
  - `last_seen_at` (TIMESTAMPTZ, default now())
- **`public.offline_sale_sync_log`**:
  - `id` (UUID, primary key)
  - `store_id` (UUID, foreign key la public.stores)
  - `device_id` (UUID, foreign key la public.pos_devices)
  - `local_sale_id` (UUID)
  - `payload_hash` (TEXT, format SHA-256)
  - `items` (JSONB)
  - `payments` (JSONB)
  - `status` (TEXT, whitelist constrâns)
  - `sync_type` (TEXT, default 'offline')
  - `created_at` (TIMESTAMPTZ, default now())
  - `processed_at` (TIMESTAMPTZ)
  - `error_message` (TEXT)
- **`public.offline_sync_snapshots`**:
  - `id` (UUID, primary key)
  - `store_id` (UUID, foreign key)
  - `device_id` (UUID, foreign key)
  - `entity` (TEXT, whitelist constrâns)
  - `row_count` (INTEGER)
  - `checksum` (TEXT)
  - `sync_type` (TEXT)
  - `created_at` (TIMESTAMPTZ, default now())

---

## 3. Rezultate Constraints & RLS
- **Constraints Active**:
  - `pos_devices_fingerprint_check`: Validează lungimea amprentei între 12 și 128 caractere.
  - `pos_devices_name_check`: Validează lungimea numelui POS între 2 și 64.
  - `offline_sale_sync_log_hash_check`: Validează hash-ul SHA-256 (lungime exact 64 caractere, format hex).
  - `offline_sale_sync_log_status_check`: Permite doar statusurile: `received`, `finalized`, `duplicate`, `conflict`, `failed`, `rejected`.
  - `offline_sale_sync_log_payload_check`: Impune ca payload-ul să conțină produse (`items` cu lungime > 0) și plăți (`payments` cu lungime > 0).
  - Unicitate indexată pe `(store_id, device_fingerprint)` în `pos_devices` și `(store_id, local_sale_id)` în `offline_sale_sync_log`.
- **Row Level Security (RLS)**:
  - RLS este activat (`ALTER TABLE ENABLE ROW LEVEL SECURITY`) pe toate cele trei tabele.
  - Politicile `SELECT`, `INSERT`, `UPDATE` restricționează operațiunile doar la membrii activi ai magazinului (`public.is_platform_owner() OR active store member`).

---

## 4. Rezultate RPC & Privileges
Toate funcțiile RPC utilizează clauze de securitate stricte:
- **`SECURITY DEFINER`**: Rulează cu permisiuni superioare, dar sub reguli rigide de validare.
- **`SET search_path = public`**: Previne atacurile de tip search-path shadowing.
- **Permissions Lockdown**:
  - `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon;`
  - `GRANT EXECUTE ON FUNCTION ... TO authenticated;`
  - Rolul anonim / public primește block imediat (`permission denied`).

---

## 5. Rezultate Teste E2E Playwright (`test_offline_data_cache_sql_apply_6app5.py`)

### A. Test `register_pos_device`
- **Validează inputul invalid**: Testul a trimis un fingerprint scurt (`short`, 5 caractere) și a fost respins corect de bază cu mesajul: `Fingerprint must be at least 12 characters long`.
- **Înregistrare validă**: Utilizatorul `admin@admin.com` înregistrează un dispozitiv cu amprenta validă de 30 de caractere. Înregistrarea returnează un UUID valid de dispozitiv.
- **Idempotency**: Re-înregistrarea aceluiași dispozitiv este idempotentă, actualizează numele (`POS-TEST-01 (updated)`) și actualizează data `last_seen_at`.

### B. Test `get_offline_cache_bundle`
- **Autorizare dispozitiv**: O cerere cu un UUID de dispozitiv inexistent/inactiv pe store este respinsă direct cu: `Device unauthorized, inactive, or not found.`
- **Generare Bundle**: Pentru un dispozitiv valid, RPC-ul rulează cu succes și generează o structură JSONB complexă conținând listele serializate de `products`, `prices`, `categories` (folosind `created_at` în loc de `updated_at`), `active_shift` și datele magazinului.
- **Checksum**: Un checksum SHA-256 este calculat folosind `extensions.digest` și injectat în snapshot-ul generat.

### C. Test `sync_offline_sale` Validations
- **Respingere Hash invalid**: Trimiterea unui payload-hash greșit blochează sync-ul.
- **Respingere Items goale**: Trimiterea de liste goale pentru produse și plăți este respinsă de constraint-urile de bază: `p_items must be a non-empty array`.
- **Idempotency**: O a doua încercare de sincronizare a aceleiași vânzări este detectată ca duplicat și procesată idempotent.

### D. Test `get_offline_sync_status`
- Returnează corect starea de activitate a dispozitivului, numărul total de sincronizări realizate și `cache_health = 'ok'`.

### E. Audit Logs
- RPC-urile execută automat scrierea în `public.audit_logs` la fiecare apel cu acțiunile predefinite (`pos_device_registered` și `offline_cache_bundle_requested`).

---

## 6. Confirmare FiscalNet Offline Blocat
Toate fluxurile legate de checkout-ul POS și scrierea bonurilor prin driverul fiscal local `FiscalNet` rămân neschimbate și complet blocate în mod offline (Offline Safe Mode - Etapa 6APP.1). Sincronizările sunt pur și simplu logate pe server prin tabelele noi fără a declanșa trimiteri neautorizate de comenzi.

---

## 7. Ce NU s-a implementat încă
- **SQLite Local**: Nu există încă stocare SQLite locală pe procesul Electron al clientului POS.
- **Coadă de Vânzări Client**: Coada locală pentru stocarea vânzărilor când rețeaua lipsește nu a fost implementată la nivel de aplicație client.
- **Vânzări Offline în POS**: Interfața POS nu permite încă vânzarea offline reală.

---

## 8. Următorul Pas Recomandat
Următorul pas în planul tehnic este **Etapa 6APP.6: Local SQLite Cache Engine**, în care se va implementa motorul SQLite local din Electron Main Process pentru a descărca și reține acest bundle cache la nivel de desktop PC.
