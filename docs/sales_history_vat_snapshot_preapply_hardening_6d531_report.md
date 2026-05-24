# Raport Pre-Apply Hardening: Sales VAT Snapshot SQL — Etapa 6D.5.3.1

## 1. Rezumat

| Item | Status |
|------|--------|
| DB modificată | ❌ Nu |
| Frontend modificat | ❌ Nu |
| `finalize_sale` live modificat | ❌ Nu |
| Blueprint SQL întărit | ✅ Da |
| Decizie finală | **✅ Ready for 6D.5.4 SQL Apply Verification** |

---

## 2. Audit `finalize_sale` live vs blueprint

### Funcția LIVE confirmată la 2026-05-24

Semnătura: `public.finalize_sale(uuid, uuid, jsonb, jsonb, uuid)`

Comportament live:
- ✅ Shift obligatoriu (`p_shift_id IS NULL` → excepție)
- ✅ Verificare tură activă (`pos_shifts WHERE status='open'`)
- ✅ Validare cantități (`v_req_qty <= 0` → excepție)
- ✅ Preț din `product_prices` (nu din frontend)
- ✅ Verificare plăți (sumă, metodă, toleranță 0.01)
- ✅ Inserare `sales` cu status `'finalized'`
- ✅ Inserare `payments` per metodă
- ✅ FEFO/FIFO pe `stock_batches` cu `FOR UPDATE`
- ✅ Deducere `stock_batches.quantity`
- ✅ Inserare `stock_movements` tip `'sale'`
- ✅ `SECURITY DEFINER SET search_path TO 'public'`
- ✅ `GRANT EXECUTE TO authenticated`

Ceea ce **lipsea** din funcția live (adăugat în patch):
- ❌ Nu citea `vat_group` din `product_prices`
- ❌ Nu citea `stores.settings` (tax config)
- ❌ Nu calcula TVA
- ❌ INSERT `sale_items` cu 7 coloane (fără snapshot TVA)

### Concluzie comparație

Patch-ul din `proposed_sales_history_vat_snapshot_6d53.sql` **păstrează integral** toate regulile live și adaugă exclusiv logica TVA. Nicio regresie față de funcția live.

---

## 3. Helper `get_vat_rate_for_group`

### Modificări aduse în 6D.5.3.1

| Aspect | Înainte (6D.5.3) | După (6D.5.3.1) |
|--------|------------------|-----------------|
| Normalizare input | `CASE p_vat_group` (sensitiv) | `upper(trim(p_vat_group))` |
| Input NULL | Cădea în ELSE (excepție ambiguă) | Excepție explicită separată |
| Input gol `''` | Cădea în ELSE | Excepție explicită separată |
| `SET search_path` | Lipsă | `SET search_path = public` |
| Grants | Lipsă | `REVOKE FROM PUBLIC/anon/authenticated` |

### Rate confirmate

| Grupă | Rată TVA |
|-------|----------|
| A | 21.00% |
| B | 11.00% |
| C | 11.00% |
| D | 0.00% |
| E | 0.00% (neplătitor) |

### Justificare grants

Helperul este **intern** — apelat exclusiv din `finalize_sale` (SECURITY DEFINER) și din scripturi DBA. Nu trebuie expus ca endpoint RPC frontend. `finalize_sale` rulează ca `postgres`/owner, deci nu necesită `GRANT TO authenticated` pe helper.

---

## 4. Helper `calculate_vat_breakdown`

### Modificări aduse în 6D.5.3.1

| Aspect | Înainte (6D.5.3) | După (6D.5.3.1) |
|--------|------------------|-----------------|
| Input `p_total NULL` | Fără validare | `RAISE EXCEPTION` |
| Input `p_total < 0` | Fără validare | `RAISE EXCEPTION` |
| Input `p_price_includes_vat NULL` | Fără normalizare | `IF NULL THEN true` |
| `vat_amount` inclusive | `p_total - v_base` (corect) | `ROUND(p_total - v_base, 2)` (explicit) |
| `SET search_path` | Lipsă | `SET search_path = public` |
| Grants | Lipsă | `REVOKE FROM PUBLIC/anon/authenticated` |

### Formula rotunjiri

**Inclusive (standard retail România):**
```
base  = ROUND(total / (1 + rate/100), 2)
vat   = ROUND(total - base, 2)       -- evită erori double-rounding
gross = ROUND(total, 2)
```

**Exclusive (TVA adăugat):**
```
base  = ROUND(total, 2)
vat   = ROUND(total * rate/100, 2)
gross = ROUND(base + vat, 2)
```

> **Notă rotunjiri:** Rotunjirea per linie poate genera diferențe de ±0.01 LEI față de un calcul global. Comportament standard acceptat în retail (TVA per linie de bon).

---

## 5. Patch `finalize_sale`

### Corecție `price_without_vat` (bug fix în 6D.5.3.1)

**Înainte (incorect pentru exclusive):**
```sql
v_item_price_net := ROUND(v_unit_price / (1.0 + v_item_vat_rate / 100.0), 4);
```

**După (corect pentru ambele politici):**
```sql
IF v_price_policy = 'inclusive' THEN
    v_item_price_net := ROUND(v_unit_price / (1.0 + v_item_vat_rate / 100.0), 4);
ELSE
    v_item_price_net := ROUND(v_unit_price, 4);
END IF;
```

**Motivare:** Dacă `price_tax_policy = 'exclusive'`, `unit_price` este deja baza fără TVA. Împărțirea la `(1 + rată)` ar fi greșită și ar genera o bază prea mică.

### Notă despre `price_tax_policy = 'exclusive'`

Aplicația POS actuală trimite **prețuri de raft** (inclusive). Politica `exclusive` este suportată în calcul dar **nu este activată în POS**. Dacă se activează în viitor, impactul asupra totalului bonului (gross vs net) necesită decizie separată de business. **În 6D.5.3.1 totalul bonului nu este modificat.**

### Structura de aplicare separată pe faze

| Fază | Conținut | Când se aplică |
|------|----------|----------------|
| **Faza 1** | ALTER TABLE + constraint + index + helperi + grants | 6D.5.4 (safe, fără risc operational) |
| **Faza 2** | PATCH `finalize_sale` | După verificare 6D.5.4, separat |
| **Faza 3** | BACKFILL | Opțional, cu backup, aprobare separată |

---

## 6. Backfill

- Rămâne **comentat** în SQL (bloc `/* ... */`)
- **Nu se execută automat** la aplicarea Fazei 1 sau 2
- Necesită **backup/snapshot** manual înainte de rulare
- Datele produse pentru bonuri vechi sunt **estimative** — folosesc TVA curent din `product_prices`, nu TVA din momentul vânzării
- Protecție suplimentară: fallback la `'A'` dacă `get_vat_rate_for_group` ridică excepție

---

## 7. Riscuri Rămase

| Risc | Severitate | Mitigare |
|------|-----------|----------|
| Bonuri vechi fără snapshot (vat_group = NULL) | Medie | UI afișează fallback cu badge `vatIsFallback` |
| Rotunjiri per linie ±0.01 vs total bon | Scăzut | Standard acceptat în retail |
| `price_tax_policy = exclusive` impact business | Medie | Amânat — necesită decizie separată |
| Backfill TVA incorect dacă TVA produsului s-a schimbat | Mare | Backfill marcat explicit ca estimativ |

---

## 8. Decizie

**✅ Ready for 6D.5.4 Sales VAT Snapshot SQL Apply Verification**

Faza 1 (schema + helperi) poate fi aplicată manual în Supabase SQL Editor.
Faza 2 (patch `finalize_sale`) se aplică după verificarea Fazei 1.
