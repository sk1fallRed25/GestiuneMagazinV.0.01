# Raport Etapa 6DATA.1 — Database Audit, Backup & Safe Cleanup Plan

## 1. Mediu Analizat

| Parametru | Valoare |
|---|---|
| Mediu | Supabase Cloud (Producție/Staging) |
| Proiect Supabase | `iwlmlhhjzqnwlfoittot` |
| Data auditului | 2026-06-16 |
| Metoda de audit | API REST read-only (Prefer: count=exact) |
| Autentificare | admin@owner.com (platform_owner) |

---

## 2. Stare Proiect — Confirmare Etape Anterioare

| Etapă | Status | Confirmare |
|---|---|---|
| 6CAT.1 — Category Management | ✅ PASS | `docs/catalog_category_management_6cat1_report.md` există |
| 6REC.1 — Reception Workflow | ✅ PASS | `docs/reception_workflow_history_6rec1_report.md` există |
| 6REC.1.2 — NIR Calculation | ✅ PASS | `docs/reception_line_nir_calculation_6rec1_2_report.md` există |
| post_reception RPC | ✅ Documentat | Utilizat în `receptionService.ts` |
| README_PROJECT_STATUS.md | ✅ Există | Actualizat la 6REC.1.2 |
| task.md | ❌ Nu a fost găsit | În repo nu există `task.md` la root |
| walkthrough.md | ❌ Nu a fost găsit | În repo nu există `walkthrough.md` la root |

---

## 3. Tabele Auditate

### Conturi și Roluri

| Tabel | Total Rânduri | Rânduri Reale | Rânduri Test | Risc | Recomandare |
|---|---|---|---|---|---|
| profiles | 4 | 3 (owner, admin, casier) | 0 directe | Scăzut | **Păstrează** 3 conturi obligatorii; `magazin@magazin.com` **NECESITĂ CONFIRMARE** |
| store_members | 7 | 2 (admin+casier → Magazin Principal) | 5 (către magazine test) | Mediu | Propune ștergere membership-uri test |

### Magazine

| Tabel | Total | Reale | Test | Risc | Recomandare |
|---|---|---|---|---|---|
| stores | 9 | 2 | 7 | Mediu | Propune ștergere 7 magazine test |

**Magazine păstrate:**
- `STEF&MON STORE` (id: 00000000...) — magazin real principal
- `Magazin Principal` (id: b6d06d77...) — punct de lucru real

**Magazine propuse pentru ștergere:**
1. Magazin Secret Owner E2E
2. Magazin Suspendat E2E (inactive)
3. Magazin Test E2E
4. Magazin Arhivat E2E (inactive)
5. Magazin Test 12345678 Punct 901 Editat
6. Magazin Test 12345678 Punct 902
7. Audit Test 55555555 Punct 951 Editat (inactive)

### Catalog

| Tabel | Total | Reale Estimate | Test Estimate | Risc | Recomandare |
|---|---|---|---|---|---|
| categories | 35 | ~6 | ~29 | Mediu | Propune ștergere categorii E2E/6CAT1 |
| products | 712 | ~568 | ~144 | Ridicat | Propune ștergere produse test; verifică FK-uri |
| product_prices | 711 | ~567 | ~144 | Ridicat | Cascade cu products |

**Categorii reale păstrate (STEF&MON STORE):**
- Bauturi alcoolice → Tarie
- Panificatie → SARATELE

**Categorii reale păstrate (Magazin Principal):**
- Panificatie → Paine

**Categorii NECESITĂ CONFIRMARE (STEF&MON STORE):**
- "test" (root) și "teste" (sub) — **Numele sugerează test dar se află pe magazinul real**

**Categorii test (propuse ștergere):** 29 categorii cu pattern-urile "Root E2E", "Sub E2E", "Test Cat 6CAT1", "Test Subcat 6CAT1"

### Stocuri

| Tabel | Total | Reale Estimate | Test Estimate | Risc | Recomandare |
|---|---|---|---|---|---|
| stock_batches | 1297 | ~1000+ | ~200+ | Ridicat | Ștergere doar loturi izolate de produse test |
| stock_movements | 1590 | ~500+ | ~1000+ | Ridicat | Toate 1000 sunt `inventory_adjustment`; necesită corelare cu produse |

### Recepții

| Tabel | Total | Reale | Test | Risc | Recomandare |
|---|---|---|---|---|---|
| receptions | 62 | 0 | 62 | Scăzut | Toate par de test (REC-*, INV-6REC1-*, TEST123) |
| reception_items | 62 | 0 | 62 | Scăzut | 1:1 cu receptions, toate test |

**Documente de test identificate:** REC-5D41-001, REC-POS-5D51, REC-SMOKE-5D6, REC-POS-6A3, REC-VOID-6B23, REC-RETURN-6B33, REC-POS-6D52, TEST123, INV-6REC1-*

### Vânzări/POS

| Tabel | Total | Reale Estimate | Test Estimate | Risc | Recomandare |
|---|---|---|---|---|---|
| sales | 263 | Neclar | Neclar | **RIDICAT** | **NECESITĂ CONFIRMARE MANUALĂ** |
| sale_items | 266 | Neclar | Neclar | **RIDICAT** | Cascade cu sales |
| payments | 299 | Neclar | Neclar | **RIDICAT** | Cascade cu sales |
| cashier_shifts | 0 | 0 | 0 | Fără risc | Gol |
| pos_shifts | 53 | Neclar | Neclar | Mediu | Necesită corelare cu magazine |

> **⚠️ ATENȚIE:** Vânzările (263) sunt pe `STEF&MON STORE` (magazin real). Multe au total `0.13` lei, sugerând date de test, dar nu se pot distinge sigur de vânzări reale fără confirmare manuală.

### Pierderi

| Tabel | Total | Reale | Test | Risc | Recomandare |
|---|---|---|---|---|---|
| waste_events | 11 | Posibil reale | 0 | Mediu | **NECESITĂ CONFIRMARE** |
| waste_items | 11 | Posibil reale | 0 | Mediu | Cascade cu waste_events |

### Loguri și Sincronizare

| Tabel | Total | Test Estimate | Risc | Recomandare |
|---|---|---|---|---|
| audit_logs | 373 | ~200+ (module_enable pe magazine test) | Scăzut | Propune ștergere loguri magazine test |
| client_events | 0 | 0 | Fără risc | Gol |
| sync_conflicts | 0 | 0 | Fără risc | Gol |
| error_reports | 0 | 0 | Fără risc | Gol |

### Dispozitive și Alte Tabele

| Tabel | Total | Recomandare |
|---|---|---|
| devices | 0 | Gol — fără acțiune |
| device_sync_status | 0 | Gol — fără acțiune |
| cash_registers | 1 | Păstrează (Casa 1) |
| pos_devices | 2 | **NECESITĂ CONFIRMARE** |

### Tabele Inexistente (404)
Nu există ca tabele separate: `transfers`, `transfer_items`, `pos_cart_events`, `fiscal_logs`, `returns`, `return_items` (sunt `sale_returns`, `sale_return_items`), `receipts`, `suppliers`, `loss_reports`, `memberships`, `user_store_roles`, `store_settings`, `store_modules`, `store_features`, `store_subscriptions`, `ture`, `produse`.

---

## 4. Date Păstrate Obligatoriu

### Utilizatori
- ✅ `admin@owner.com` (platform_owner)
- ✅ `admin@admin.com` (admin)
- ✅ `casier@casier.com` (casier)
- ⚠️ `magazin@magazin.com` (casier) — **NECESITĂ CONFIRMARE**

### Magazine
- ✅ `STEF&MON STORE` — magazin real principal
- ✅ `Magazin Principal` — punct de lucru real

### Catalog
- ✅ ~568 produse reale (STEF&MON STORE)
- ✅ 4 categorii reale: Bauturi alcoolice, Tarie, Panificatie, SARATELE
- ✅ 2 categorii reale (Magazin Principal): Panificatie, Paine
- ✅ Prețuri reale
- ✅ Stocuri reale
- ✅ Loturi reale

### Setări
- ✅ Setări magazin real (stores.settings JSONB)
- ✅ Setări FiscalNet (configurate în store settings)
- ✅ Setări POS
- ✅ Setări module reale (platform_modules, store_module_access)
- ✅ Casa de marcat (cash_registers: 1 rând)

### Recepții Reale
- ❌ Nu au fost identificate recepții reale (toate 62 par de test)
- ✅ RPC `post_reception` — intact, neatins

---

## 5. Date Propuse pentru Ștergere (doar în 6DATA.2)

### Magazine Test (7 rânduri)
- Magazin Secret Owner E2E, Magazin Suspendat E2E, Magazin Test E2E, Magazin Arhivat E2E, Magazin Test 12345678 Punct 901 Editat, Magazin Test 12345678 Punct 902, Audit Test 55555555 Punct 951 Editat

### Membership-uri Test (5 rânduri)
- Asocierile admin@admin.com/magazin@magazin.com cu magazinele test

### Produse Test (~144 rânduri)
- Produse cu pattern: `PRODUS_SGR_*`, `PRODUS_NORM_*`, `Produs Test Smoke 4I`, barcodes `TEST-*`, `E2E_*`

### Categorii Test (~29 rânduri)
- Toate categoriile cu pattern: `Root E2E *`, `Sub E2E *`, `Test Cat 6CAT1 *`, `Test Subcat 6CAT1 *`

### Recepții Test (62 rânduri + 62 items)
- Toate: REC-5D41-001, REC-POS-5D51, REC-SMOKE-5D6, REC-POS-6A3, REC-VOID-6B23, REC-RETURN-6B33, REC-POS-6D52, TEST123, INV-6REC1-*

### Loguri Asociate Magazinelor Test
- Audit logs cu store_id către magazine test

---

## 6. Date care NECESITĂ CONFIRMARE MANUALĂ

| Element | Motiv |
|---|---|
| `magazin@magazin.com` | User activ pe STEF&MON STORE cu rol manager; nu se poate determina automat dacă e test sau real |
| Categorii "test" și "teste" pe STEF&MON STORE | Numele sugerează test dar sunt pe magazinul real |
| Sales (263 rânduri) pe STEF&MON STORE | Multe au total 0.13 lei; dacă sunt de test, trebuie confirmat manual |
| Waste events (11) pe STEF&MON STORE | Posibil reale sau de test |
| pos_devices (2 rânduri) | Nu se poate determina dacă sunt test sau reale |
| Stock batches/movements pe STEF&MON | Amestec de date reale și test |

---

## 7. Backup

| Parametru | Status |
|---|---|
| Backup creat | ✅ Manifest audit în `backups/db_cleanup_6data1/` |
| Locația | `backups/db_cleanup_6data1/backup_manifest_6data1.md` |
| Tabele documentate | 25 tabele cu rânduri contorizate |
| Export CSV/SQL complet | ❌ Nu — necesită acces Supabase Dashboard sau pg_dump |
| Backup comis în git | ❌ Nu — `.gitignore` actualizat cu reguli backup |
| Notă | Backup-ul complet trebuie făcut prin Supabase Dashboard înainte de 6DATA.2 |

---

## 8. Scripturi Create

| Script | Scop | Conține DELETE? |
|---|---|---|
| `scripts/database_cleanup_preview_6data1.sql` | SELECT-uri de identificare date test vs reale | ❌ Nu |
| `scripts/database_cleanup_execute_6data1_DRY_RUN_ONLY.sql` | Scripturi DELETE comentate + ROLLBACK | ❌ Comentate |

---

## 9. Confirmări de Siguranță

| Restricție | Status |
|---|---|
| NU s-a rulat DELETE | ✅ Confirmat |
| NU s-a rulat TRUNCATE | ✅ Confirmat |
| NU s-a rulat COMMIT | ✅ Confirmat |
| NU s-a modificat schema Supabase | ✅ Confirmat |
| NU s-a modificat RLS/RPC | ✅ Confirmat |
| NU s-a modificat `post_reception` | ✅ Confirmat |
| NU s-a modificat `finalize_sale` | ✅ Confirmat |
| NU s-a modificat FiscalNet | ✅ Confirmat |
| NU s-a modificat POS checkout | ✅ Confirmat |
| NU s-a modificat auto-update | ✅ Confirmat |
| NU s-au aplicat migrări noi | ✅ Confirmat |
| NU s-a generat `.exe` | ✅ Confirmat |
| NU s-a rulat `npm run electron:build` | ✅ Confirmat |
| NU s-au comis backup-uri/CSV/SQL cu date reale | ✅ Confirmat |
| NU s-a comis `.env` | ✅ Confirmat |

---

## 10. Recomandare pentru 6DATA.2

### Ce se poate șterge sigur:
1. Magazine test (7) — toate au pattern clar de test
2. Membership-uri către magazine test (5)
3. Categorii test E2E/6CAT1 (~29)
4. Produse test cu barcode E2E_*/TEST-* (~144)
5. Prețuri/stocuri/loturi/mișcări asociate produselor test
6. Recepții test (62) + reception items (62)
7. Audit logs asociate magazinelor test

### Ce trebuie confirmat manual:
1. `magazin@magazin.com` — este utilizator real sau de test?
2. Categorii "test"/"teste" pe STEF&MON STORE — de șters sau de păstrat?
3. Sales (263) pe STEF&MON STORE — sunt de test sau reale?
4. Waste events (11) — de test sau reale?
5. Stock movements (1590) — câte sunt generate de teste vs operări reale?
6. pos_devices (2) — de test sau reale?

### Ce trebuie păstrat obligatoriu:
- Cele 3 conturi principale
- 2 magazine reale
- Categorii reale (Bauturi alcoolice, Panificatie, etc.)
- ~568 produse reale importate
- Toate RPC-urile și schema DB
- Setările de magazin
- Casa de marcat (cash_registers)

### Ordine recomandată de ștergere (6DATA.2):
1. audit_logs test
2. sale_items test (doar dacă confirmat)
3. sales test (doar dacă confirmat)
4. payments test
5. pos_shifts test
6. reception_items test
7. stock_movements test
8. stock_batches test (izolate)
9. receptions test
10. product_prices test
11. products test
12. categories subcategorii test
13. categories root test
14. store_members test
15. stores test
16. profiles test (doar dacă confirmat)
