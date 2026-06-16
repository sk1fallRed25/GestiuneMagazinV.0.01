# Raport de Audit și Decizie Cleanup — Etapa 6DATA.3

**Data auditului:** 2026-06-16  
**Mediu:** Supabase Cloud (Producție) — Proiect `iwlmlhhjzqnwlfoittot`  
**Metoda:** SQL read-only (SELECT) via Supabase MCP  
**Etapă anterioară:** 6DATA.2 — PASS  
**Scop:** Audit detaliat al datelor test rămase + decizie pentru 6DATA.4

---

## 1. Rezumat — Ce a rămas după 6DATA.2

Etapa **6DATA.2** a realizat curățarea controlată a bazei de date, ștergând datele test clare (7 magazine, 4 store_members, 62 recepții + 62 reception_items, 137 product_prices, 1 produs, 17 categorii, 69 audit_logs, 7 stores). Au fost păstrate intenționat datele legate de istoricul de vânzări.

**Starea curentă a bazei de date:**

| Tabel | Total rânduri | Test | Real | Observații |
|---|---|---|---|---|
| **profiles** | 4 | 0 | 4 | Toți 4 utilizatorii sunt necesari |
| **stores** | 5 | 3 | 2 | ⚠️ 3 magazine E2E re-create de teste |
| **store_members** | 6 | 3 | 3 | ⚠️ 3 membership-uri E2E re-create |
| **products** | 711 | 143 | 568 | Test products păstrate din cauza FK |
| **categories** | 24 | 18 | 6 | 18 categorii test fără produse |
| **sales** | 263 | 140 | 123 | 0 mixte |
| **sale_items** | 266 | — | — | Legate de sales |
| **payments** | 299 | 156 | 143 | 0 mixte |
| **waste_events** | 11 | 3 | 8 | 0 mixte |
| **waste_items** | 11 | 3 | 8 | Legate de waste_events |
| **pos_devices** | 2 | 1 | 1 | POS-TEST-E2E vs POS-DESKTOP |

### De ce au rămas:
Produsele de test sunt referențiate de `sale_items` (FK constraint `sale_items.product_id → products.id`). Ștergerea directă a produselor ar genera erori de integritate referențială. Categoriile test rămase nu au produse asociate dar au fost păstrate ca precauție.

### Risc:
- Datele test denaturează rapoartele financiare (1307.49 lei vânzări fictive).
- Categoriile test poluează UI-ul de catalog.
- Magazinele test re-create de E2E poluează Owner Console.

> [!IMPORTANT]
> **Observație nouă:** Testele E2E automate au re-creat **3 magazine test** (`Magazin Arhivat E2E`, `Magazin Suspendat E2E`, `Magazin Test E2E`) și **3 store_members** asociate de la cleanup-ul 6DATA.2. Acestea necesită ștergere în 6DATA.4 și refactorizarea testelor pentru a fi self-contained (cleanup after test).

---

## 2. Audit Detaliat Produse Test Rămase

**Total produse test identificate:** 143  
**Pattern-uri identificate:** `AUTO_NORM_E2E_*`, `AUTO_SGR_E2E_*`, `PRODUS_SGR_*`, `PRODUS_NORM_*`, `PROD_IPC_SEC_*`, `PROD_PILOT_*`, `PROD_PILOT_EL_*`, `PROD_SETT_*`, `PROD_SGR_EXP_*`, `E2E_FOCUS_*`, `E2E_NORM_*`, `Test Alcool 1`, `Produs Test Smoke 4I`, `PRODUS_NORMAL_*`, `PRODUS_NORMAL_FE_*`, `PRODUS_NORMAL_VQ_*`, `PRODUS_SGR_BACKEND_*`, `PRODUS_SGR_FE_*`, `PRODUS_SGR_REC_*`, `PRODUS_SGR_RET_*`

### Statistici produse test:

| Categorie | Număr | Procent |
|---|---|---|
| **Cu vânzări active** (în `sale_items`) | 119 | 83.2% |
| **Fără vânzări active** | 24 | 16.8% |
| **Cu stock_batches** | 141 | 98.6% |
| **Cu product_prices** | 6 | 4.2% |
| **Cu waste_items** | 1 | 0.7% |
| **Cu stock_movements** | 120 | 83.9% |
| **Clar test (is_clearly_test=true)** | 143 | 100% |

### Produse fără vânzări (24 produse — pot fi șterse direct dacă se rezolvă alte FK):
Toate 24 sunt clar produse E2E generate automat. Cele cu stock_batches/stock_movements necesită ștergerea prealabilă a acestor dependențe.

### Produse cu cele mai multe vânzări (top 10):

| Produs | Barcode | Sale Items | Qty Sold | Val Sold |
|---|---|---|---|---|
| AUTO_NORM_E2E_AUTO_NORM_14226042 | E2E_AUTO_NORM_14226042 | 4 | 4.00 | 20.00 |
| AUTO_NORM_E2E_AUTO_NORM_34983520 | E2E_AUTO_NORM_34983520 | 4 | 4.00 | 20.00 |
| AUTO_NORM_E2E_AUTO_NORM_49056243 | E2E_AUTO_NORM_49056243 | 4 | 4.00 | 20.00 |
| AUTO_NORM_E2E_AUTO_NORM_64448847 | E2E_AUTO_NORM_64448847 | 4 | 4.00 | 20.00 |
| AUTO_NORM_E2E_AUTO_NORM_75061956 | E2E_AUTO_NORM_75061956 | 4 | 4.00 | 20.00 |
| PRODUS_SGR_CH_E2E_SGR_CH_26817784 | E2E_SGR_CH_26817784 | 2 | 3.00 | 30.00 |
| PRODUS_SGR_CH_E2E_SGR_CH_49094654 | E2E_SGR_CH_49094654 | 2 | 3.00 | 30.00 |
| PRODUS_SGR_CH_E2E_SGR_CH_69639358 | E2E_SGR_CH_69639358 | 2 | 3.00 | 30.00 |
| PRODUS_SGR_CH_E2E_SGR_CH_84571689 | E2E_SGR_CH_84571689 | 2 | 3.00 | 30.00 |
| Test Alcool 1 | 2975782069324 | 2 | 2.00 | 20.00 |

> Toate produsele test au `is_clearly_test = true`. Niciun produs real nu a fost capturat de filtre.

---

## 3. Audit Categorii Test Rămase

**Total categorii test rămase:** 18

### Pe Magazin Principal (16 categorii):

| Categorie | Nivel | Produse Asociate | Cu Vânzări | Fără Vânzări |
|---|---|---|---|---|
| Test Cat 6CAT1 30538 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 46943 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 61639 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 63425 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 65734 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 84133 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 88174 | ROOT | 0 | 0 | 0 |
| Test Cat 6CAT1 94400 | ROOT | 0 | 0 | 0 |
| Test Subcat 6CAT1 30538 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 46943 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 61639 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 63425 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 65734 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 84133 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 88174 | SUB | 0 | 0 | 0 |
| Test Subcat 6CAT1 94400 | SUB | 0 | 0 | 0 |

### Pe STEF&MON STORE (2 categorii):

| Categorie | Nivel | Produse Asociate | Cu Vânzări | Fără Vânzări |
|---|---|---|---|---|
| test | ROOT | 0 | 0 | 0 |
| teste | SUB | 0 | 0 | 0 |

> [!TIP]
> **Toate cele 18 categorii test au 0 produse asociate și 0 vânzări.** Pot fi șterse în siguranță imediat, fără niciun risc de FK. Aceasta include categoriile `test`/`teste` de pe STEF&MON STORE care au fost marcate cu „NECESITĂ CONFIRMARE" în 6DATA.1.

---

## 4. Audit Vânzări Asociate Produselor Test

### Clasificare vânzări:

| Clasificare | Număr Sales | Valoare Totală (lei) | Perioada |
|---|---|---|---|
| **SAFE_TEST_SALE** | 140 | 1,307.49 | 2026-05-17 — 2026-06-10 |
| **MIXED_OR_UNKNOWN** | 0 | 0.00 | — |
| **KEEP_REAL_SALE** | 123 | 2,754.63 | 2026-05-13 — 2026-06-11 |

### Analiza pattern-urilor:
- **0 vânzări mixte** — separare 100% între vânzări test și reale
- Toate vânzările test conțin exclusiv produse cu barcode `E2E_*` sau `TEST-*`
- Valorile tipice de test: 5.00, 10.00, 12.00, 15.00, 20.00 lei per articol
- Produsele test sunt generate automat de suitele E2E (Playwright)
- Toate vânzările test sunt pe **STEF&MON STORE** (magazin real)

> [!NOTE]
> Separarea perfectă de 100% (0 vânzări mixte) confirmă că ștergerea vânzărilor test este sigură și nu va afecta datele reale.

---

## 5. Audit Plăți (Payments)

| Tip | Număr | Observații |
|---|---|---|
| **Plăți legate de SAFE_TEST_SALE** | 156 | Se pot șterge în cascadă |
| **Plăți legate de KEEP_REAL_SALE** | 143 | Trebuie păstrate |
| **Plăți legate de MIXED_OR_UNKNOWN** | 0 | — |
| **Total** | 299 | — |

**Risc de ștergere:** Niciunul. Plățile de test sunt legate 1:1 de vânzări clasificate ca test. Ștergerea se face cu `DELETE FROM payments WHERE sale_id IN (test_sale_ids)`.

---

## 6. Audit Casări (Waste Events) și Dispozitive POS

### Casări:

| Waste ID | Data | Magazin | Items | Test Items | Clasificare |
|---|---|---|---|---|---|
| da469541-... | 2026-05-24 | STEF&MON | 1 | 0 | **REAL** |
| 2e471239-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |
| 03a76487-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |
| f05be0b9-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |
| 57445ac1-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |
| 232915d4-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |
| 414f7e2c-... | 2026-05-17 | STEF&MON | 1 | 1 | **TEST** |
| fae137bf-... | 2026-05-17 | STEF&MON | 1 | 1 | **TEST** |
| f299827b-... | 2026-05-17 | STEF&MON | 1 | 1 | **TEST** |
| c9478f51-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |
| 7f6d828a-... | 2026-05-17 | STEF&MON | 1 | 0 | **REAL** |

**Rezumat:** 3 TEST, 8 REAL, 0 MIXED  
**Recomandare:** Ștergerea celor 3 waste events de test (conțin doar produse test) este sigură.

### Dispozitive POS:

| Device | Fingerprint | Magazin | Activ | Ultima activitate | Clasificare |
|---|---|---|---|---|---|
| POS-DESKTOP-6N68MP6 | 9ffaec1c... | STEF&MON | ✅ | 2026-06-11 | **REAL** (dev local) |
| POS-TEST-E2E | test_device_fingerprint_123456 | STEF&MON | ✅ | 2026-06-04 | **TEST** |

**Recomandare:** `POS-TEST-E2E` poate fi dezactivat (set `active = false`) sau șters. `POS-DESKTOP-6N68MP6` trebuie păstrat pentru testare/dezvoltare locală.

---

## 7. Audit Magazine și Store Members (Re-create de E2E)

> [!WARNING]
> **3 magazine test au fost re-create de testele E2E** după cleanup-ul 6DATA.2. Testele automate creează aceste magazine la fiecare rulare și nu le șterg la final.

### Magazine actuale:

| Magazin | ID | Clasificare |
|---|---|---|
| STEF&MON STORE | 00000000-...-000000000001 | **REAL** |
| Magazin Principal | b6d06d77-... | **REAL** |
| Magazin Arhivat E2E | bc233d6a-... | **TEST** (re-creat) |
| Magazin Suspendat E2E | db54cdcd-... | **TEST** (re-creat) |
| Magazin Test E2E | f676fce1-... | **TEST** (re-creat) |

### Store Members actuali:

| Email | Magazin | Rol | Clasificare |
|---|---|---|---|
| admin@admin.com | Magazin Principal | admin | **REAL** |
| casier@casier.com | Magazin Principal | casier | **REAL** |
| magazin@magazin.com | STEF&MON STORE | manager | **REAL** |
| admin@admin.com | Magazin Arhivat E2E | admin | **TEST** |
| admin@admin.com | Magazin Suspendat E2E | admin | **TEST** |
| admin@admin.com | Magazin Test E2E | admin | **TEST** |

**Recomandare:** Ștergerea celor 3 magazine test + 3 store_members E2E în 6DATA.4. Refactorizarea testelor E2E pentru a face cleanup post-test (ștergerea datelor create în fiecare test).

---

## 8. Audit Utilizator `magazin@magazin.com`

| Proprietate | Valoare |
|---|---|
| **Profile ID** | 18a0f6d0-4dec-40d8-a4c7-16ec647fd144 |
| **Email** | magazin@magazin.com |
| **Nume** | magazin |
| **Rol global** | casier |
| **Store membership** | STEF&MON STORE — rol `manager` |
| **Activitate** | Are membership activ pe magazinul real |

**Recomandare:** **Păstrare** — contul este folosit activ pentru testare manuală POS/casier pe magazinul real. Rolul global `casier` este corect. Membership-ul de `manager` pe STEF&MON STORE permite acces la funcționalități extinse. Evaluare ulterioară dacă trebuie degradat la `casier` pe magazin.

---

## 9. Opțiuni de Decizie pentru Etapa 6DATA.4

### VARIANTA A — Păstrare Istoric Test

| Aspect | Detalii |
|---|---|
| **Acțiune** | Se păstrează toate datele rămase intacte |
| **Se aplică pe** | 143 produse, 18 categorii, 140 sales, 156 payments, 3 waste, 1 POS |
| **Avantaj** | Risc zero de erori FK; zero efort de implementare |
| **Dezavantaj** | Baza conține zgomot de test; rapoartele financiare sunt denaturate cu 1307.49 lei; 18 categorii test vizibile în UI |
| **Potrivit pentru** | Proiecte care nu au nevoie de date curate (nu merge la pilot) |

### VARIANTA B — Arhivare Logică

| Aspect | Detalii |
|---|---|
| **Acțiune** | Redenumire produse/categorii test cu prefix `[ARCHIVED_TEST]`; filtrare în UI |
| **Se aplică pe** | 143 produse + 18 categorii (rename); 3 stores + 3 members test (ștergere) |
| **Avantaj** | Istoricul tranzacțional rămâne intact; produse vizibil marcate ca test |
| **Dezavantaj** | Datele test rămân în rapoartele financiare dacă nu se implementează filtrare; necesită logică UI suplimentară |
| **Potrivit pentru** | Dacă este important să se păstreze istoricul testelor pentru audit |

### VARIANTA C — Cleanup Complet Istoric Test (Recomandată)

| Aspect | Detalii |
|---|---|
| **Acțiune** | Ștergere în cascadă: payments → sale_items → sales → waste_items → waste_events → stock_movements → stock_batches → product_prices → products → categories → store_members → stores |
| **Se aplică pe** | 156 payments, 140 sales, 3 waste events, 143 produse, 18 categorii, 3 stores, 3 store_members, 1 POS device |
| **Avantaj** | Bază 100% curată; rapoarte financiare corecte; zero zgomot test |
| **Dezavantaj** | Risc teoretic dacă clasificarea e incorectă (dar 0% vânzări mixte confirmă siguranță) |
| **Potrivit pentru** | Pre-pilot, pre-producție, lansare comercială |

> [!IMPORTANT]
> **Recomandare preliminară:** Se recomandă **VARIANTA C** înainte de lansarea pilotului.
>
> **Argumente:**
> 1. Clasificarea arată separare **100%** între vânzări test și reale (0 MIXED_OR_UNKNOWN).
> 2. Toate produsele test au `is_clearly_test = true` — niciun fals pozitiv.
> 3. Categoriile test au **0 produse asociate** — ștergere directă, fără cascadă.
> 4. Valoarea totală a vânzărilor test (1307.49 lei) este fictivă și denaturează rapoartele.
> 5. Magazinele E2E re-create poluează Owner Console.
>
> **Condiție:** Implementarea se face **doar după confirmare explicită** de la utilizator.

---

## 10. Recomandare Finală

### Ce trebuie confirmat de utilizator:

1. **Varianta de implementare** (A / B / C) — recomandare: **C**
2. **Categorii `test`/`teste` pe STEF&MON STORE** — au 0 produse, recomandare: **ștergere**
3. **Utilizator `magazin@magazin.com`** — recomandare: **păstrare** (sau dezactivare în etapă ulterioară)
4. **POS-TEST-E2E** — recomandare: **ștergere** în 6DATA.4
5. **POS-DESKTOP-6N68MP6** — recomandare: **păstrare** (dispozitiv local de dezvoltare)
6. **Refactorizare teste E2E** — recomandare: adăugare cleanup post-test pentru a preveni re-crearea datelor

### Estimare impact Varianta C:

| Ce se șterge | Număr rânduri |
|---|---|
| payments test | 156 |
| sale_items test | ~140 |
| sales test | 140 |
| waste_items test | 3 |
| waste_events test | 3 |
| stock_movements test | ~120 |
| stock_batches test | ~141 |
| product_prices test | 6 |
| products test | 143 |
| categories test | 18 |
| store_members test | 3 |
| stores test | 3 |
| pos_devices test | 1 |
| **Total rânduri șterse** | **~877** |

### Ce rămâne după Varianta C:

| Tabel | Rânduri rămase |
|---|---|
| profiles | 4 |
| stores | 2 |
| store_members | 3 |
| products | 568 |
| categories | 6 |
| sales | 123 |
| sale_items | ~126 |
| payments | 143 |
| waste_events | 8 |
| waste_items | 8 |
| pos_devices | 1 |

---

## 11. Confirmări de Siguranță (6DATA.3)

> [!NOTE]
> * ✅ **NU** s-au executat ștergeri finale (`DELETE`) live în baza de date în această etapă.
> * ✅ **NU** s-au executat modificări de date (`UPDATE`) live.
> * ✅ **NU** s-a rulat `COMMIT` pentru scripturile de shape/modificare.
> * ✅ **NU** s-a modificat structura tabelelor (schema).
> * ✅ **NU** s-au modificat politici RLS sau funcții RPC.
> * ✅ **NU** s-a modificat `post_reception` sau `finalize_sale`.
> * ✅ **NU** s-a modificat FiscalNet sau POS checkout.
> * ✅ **NU** s-au generat fișiere executabile (`.exe`) sau build-uri Electron.
> * ✅ **NU** s-a rulat `npm run electron:build`.

---

## 12. Scripturi Create

| Script | Scop | Conține DELETE? |
|---|---|---|
| `scripts/database_cleanup_review_6data3.sql` | SELECT-uri de audit complet | ❌ Nu |
| `scripts/database_cleanup_archive_test_products_6data3_DRY_RUN.sql` | Dry-run Varianta B (arhivare logică) | UPDATE cu ROLLBACK |
| `scripts/database_cleanup_remove_test_sales_6data3_DRY_RUN.sql` | Dry-run Varianta C (cleanup complet) | DELETE cu ROLLBACK |
