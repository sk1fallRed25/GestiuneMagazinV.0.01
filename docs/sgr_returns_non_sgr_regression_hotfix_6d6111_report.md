# Raport Oficial: SGR Returns Non-SGR Regression SQL Hotfix — Etapa 6D.6.11.1

## 1. Rezumat Executiv
- **Status**: **PASS**
- **Scop**: Corectarea funcției `public.return_sale_items` pentru a preveni încălcarea constrângerii de CHECK `sale_return_items_sgr_check` în cazul returnării produselor non-SGR.
- **SQL Hotfix Aplicat**: Manual de către utilizator via Supabase SQL Editor (`database/hotfix_sgr_returns_non_sgr_regression_6d6111.sql`).
- **Verificări catalog post-hotfix**: **PASS**
- **Suita de teste backend (Scenariile A-F)**: **PASS** (100% succes)

---

## 2. Cauza Problemei (Identificată în Etapa 6D.6.11)
În timpul verificării inițiale a etapei 6D.6.11, Scenario F (regresie produs non-SGR) a picat. 
Cauza a fost o expresie legacy de tip `COALESCE(v_sale_item.sgr_vat_group, 'D')` la inserarea în tabela `public.sale_return_items` din corpul funcției `return_sale_items`.
Pentru produsele non-SGR (`sgr_enabled = false`), valoarea `sgr_vat_group` din `sale_items` este `NULL`, însă din cauza `COALESCE` era transformată în `'D'`.
Aceasta viola constrângerea check:
```sql
ALTER TABLE public.sale_return_items ADD CONSTRAINT sale_return_items_sgr_check CHECK (
  (sgr_enabled = false AND sgr_type IS NULL AND sgr_deposit_amount = 0 AND sgr_refund_amount = 0 AND sgr_vat_group IS NULL AND sgr_vat_rate = 0)
  OR
  (sgr_enabled = true AND sgr_type IN ('plastic', 'metal', 'glass') AND sgr_deposit_amount = 0.50 AND sgr_refund_amount >= 0 AND sgr_vat_group = 'D' AND sgr_vat_rate = 0)
);
```
Din cauză că `sgr_vat_group` devenea `'D'` în loc de `NULL`, tranzacția de retur era anulată.

---

## 3. Soluția de Hotfix Aplicată
Fișierul `database/hotfix_sgr_returns_non_sgr_regression_6d6111.sql` a modificat comportamentul instrucțiunii de inserare pentru a folosi expresii condiționate de tip `CASE` bazate direct pe valoarea `sgr_enabled` stocată în `sale_items`:

```sql
INSERT INTO public.sale_return_items (
    store_id, return_id, original_sale_item_id, product_id, batch_id, quantity, unit_price, total_item,
    sgr_enabled, sgr_type, sgr_deposit_amount, sgr_refund_amount, sgr_vat_group, sgr_vat_rate
) VALUES (
    p_store_id,
    v_return_id,
    v_item_id,
    v_sale_item.product_id,
    v_sale_item.batch_id,
    v_ret_qty,
    v_sale_item.unit_price,
    v_refund_item,
    COALESCE(v_sale_item.sgr_enabled, false),
    v_sale_item.sgr_type,
    CASE WHEN COALESCE(v_sale_item.sgr_enabled, false)
         THEN COALESCE(v_sale_item.sgr_deposit_amount, 0.50)
         ELSE 0.00
    END,
    v_refund_sgr,
    CASE WHEN COALESCE(v_sale_item.sgr_enabled, false)
         THEN 'D'
         ELSE NULL
    END,
    CASE WHEN COALESCE(v_sale_item.sgr_enabled, false)
         THEN COALESCE(v_sale_item.sgr_vat_rate, 0.00)
         ELSE 0.00
    END
);
```

---

## 4. Rezultate Verificări Read-Only Catalog

### A. Verificare Structură Funcție
A fost executată interogarea pe catalogul pg_proc pentru a confirma eliminarea elementului legacy și corectitudinea parametrilor:
```sql
SELECT
  position('COALESCE(v_sale_item.sgr_vat_group, ''D'')' in pg_get_functiondef('public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)'::regprocedure)) = 0 AS removed_legacy_coalesce,
  position('CASE WHEN COALESCE(v_sale_item.sgr_enabled, false)' in pg_get_functiondef('public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)'::regprocedure)) > 0 AS contains_sgr_branching,
  position('sgr_refund_total' in pg_get_functiondef('public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)'::regprocedure)) > 0 AS contains_audit_sgr_refund_total,
  position('jsonb_typeof' in pg_get_functiondef('public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)'::regprocedure)) > 0 AS contains_payload_validation,
  position('SET search_path' in pg_get_functiondef('public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)'::regprocedure)) > 0 AS contains_search_path;
```
**Rezultat obținut**:
- `removed_legacy_coalesce` = `true` (Confirmă eliminarea regresiei)
- `contains_sgr_branching` = `true` (Confirmă logica condiționată)
- `contains_audit_sgr_refund_total` = `true` (Confirmă logica auditare SGR)
- `contains_payload_validation` = `true` (Confirmă regulile de siguranță/hardening JSON)
- `contains_search_path` = `true` (Confirmă izolarea contextului public)

### B. Verificare Permisiuni (Grants)
S-a confirmat controlul securizat al execuției funcției:
```sql
SELECT
  has_function_privilege('public', 'public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)', 'EXECUTE') AS return_public_can_execute,
  has_function_privilege('anon', 'public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)', 'EXECUTE') AS return_anon_can_execute,
  has_function_privilege('authenticated', 'public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text)', 'EXECUTE') AS return_authenticated_can_execute;
```
**Rezultat obținut**:
- Public (all users): **false**
- Anonim: **false**
- Authenticated: **true** (Doar rolurile autentificate cu permisiunile necesare pot executa retururile).

---

## 5. Rezultate Test Backend Complet

A fost rulat scriptul complet de testare `test_sgr_returns_backend_6d611.py`. Toate scenariile au trecut cu succes:

- **Scenario A (Eligibility Check)**: **PASS** — Datele SGR ale vânzării sunt expuse corect în eligibilitate.
- **Scenario B (Partial Return)**: **PASS** — Garanția stornată a fost salvată corect (`sgr_refund_amount` = 0.50 lei) și stocul lotului a crescut de la 8 la 9.
- **Scenario C (Post-Partial Eligibility)**: **PASS** — Cantitățile disponibile au fost recalculate în timp real.
- **Scenario E (Capping Constraint)**: **PASS** — Tentativa de retur peste limita cantității vândute a fost blocată corect de RPC.
- **Scenario D (Full Return Finalization)**: **PASS** — Restul de 1 unitate a fost returnat cu succes, statusul vânzării s-a schimbat în `returned` și stocul a revenit la valoarea inițială.
- **Scenario F (Non-SGR Regression)**: **PASS** — Produsele simple (non-SGR) sunt returnate corect. Câmpurile `sgr_enabled = false`, `sgr_refund_amount = 0`, `sgr_vat_group = NULL` sunt stocare exact conform constrângerilor de siguranță, fără erori de bază de date.

---

## 6. Rezultate Regresie (Suita Completă SGR E2E)
Pentru asigurarea integrității depline, s-au executat suplimentar testele E2E pentru Checkout și Receipt:
1. `test_sgr_pos_checkout_e2e_6d67.py`: **PASS** — POS finalizează vânzările cash și mixte stocând corect snapshot-urile SGR.
2. `test_sgr_sales_history_receipt_6d68.py`: **PASS** — Receipt modal afișează corect liniile de garanție și detalierea TVA (Grupa D) fără a afecta bonurile istorice non-SGR.

---

## 7. Decizie și Următorul Pas
Ca urmare a validării corecte a tuturor scenariilor după aplicarea hotfix-ului, statusul etapei **6D.6.11** este promovat de la **PARTIAL PASS** la **PASS**.

Următorul pas recomandat este **Etapa 6D.6.12: SGR Returns Frontend Integration**, care presupune integrarea vizuală a fluxului de retururi SGR în interfața de administrare a magazinului (POS Return Page / Sales History Return action).
