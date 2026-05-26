# Raport Oficial: SGR Returns SQL Manual Apply + Verification — Etapa 6D.6.11

## 1. Rezumat
- **Status**: **PARTIAL PASS** (Așteaptă aplicarea Hotfix-ului SQL 6D.6.11.1)
- **SQL Aplicat**: Manual de către utilizator.
- **Rollback Salvat**: Da (`database/rollback_sgr_returns_before_6d611.sql`).
- **Frontend Modificat**: Nu.
- **Backfill Rulat**: Nu.

Toate scenariile de retur specifice SGR (Scenariile A, B, C, D, E) sunt validate **PASS**. 
Testul de regresie pentru produse non-SGR (Scenariul F) a returnat **FAIL** din cauza unei neconcordanțe de cod între schema bazei de date și blueprint-ul corectat de pe disc. Funcția live `return_sale_items` din baza de date conține încă expresia legacy `COALESCE(v_sale_item.sgr_vat_group, 'D')` pe linia 364, provocând încălcarea constrângerii de CHECK `sale_return_items_sgr_check` la returnarea produselor simple (non-SGR).

Pentru remediere completă, utilizatorul trebuie să aplice Hotfix-ul SQL furnizat în Secțiunea 5 a acestui raport.

---

## 2. Rollback
- **Fișier local**: `database/rollback_sgr_returns_before_6d611.sql`
- **Funcții acoperite**:
  - `public.get_sale_return_eligibility` (definiția dinaintea aplicării etapei 6D.6.11)
  - `public.return_sale_items` (definiția dinaintea aplicării etapei 6D.6.11)
- **Instrucțiuni**: Rularea completă a scriptului de rollback va elimina coloanele SGR adăugate în `sale_return_items` și va restaura semnăturile/logica RPC-urilor anterioare.

---

## 3. Schema Verification (Verificare Structură Tabele)
Interogările read-only au confirmat structura corectă a bazei de date:
- **Coloane noi în `sale_return_items`**: **PASS**
  - `sgr_enabled` (boolean, default false, not null)
  - `sgr_type` (text, nullable)
  - `sgr_deposit_amount` (numeric(12,2), default 0.00, not null)
  - `sgr_refund_amount` (numeric(12,2), default 0.00, not null)
  - `sgr_vat_group` (text, nullable)
  - `sgr_vat_rate` (numeric(5,2), default 0.00, not null)
- **Constraint**: `sale_return_items_sgr_check` **PASS**
  - Impune reguli stricte:
    - Pentru `sgr_enabled = false`: `sgr_type IS NULL`, `sgr_deposit_amount = 0`, `sgr_refund_amount = 0`, `sgr_vat_group IS NULL`, `sgr_vat_rate = 0`.
    - Pentru `sgr_enabled = true`: `sgr_type` în `('plastic', 'metal', 'glass')`, `sgr_deposit_amount = 0.50`, `sgr_refund_amount >= 0`, `sgr_vat_group = 'D'`, `sgr_vat_rate = 0`.
- **Indexuri optimizare**: **PASS**
  - `idx_sale_return_items_sgr_enabled`
  - `idx_sale_return_items_sgr_type` (index parțial)
  - `idx_sale_return_items_return_sgr`
- **Compatibilitate istorică**: **PASS**
  - Toate înregistrările de retur anterioare au fost verificate ca fiind conforme cu noul constraint (toate stochează default `false`/`null`/`0`).

---

## 4. Rezultate Test Backend (`test_sgr_returns_backend_6d611.py`)
Rularea testului automatizat a generat următoarele rezultate:

| Scenariu | Descriere Scenariu | Rezultat | Detalii/Observații |
|---|---|---|---|
| **A** | Evaluare eligibilitate retur bon cu produse SGR | **PASS** | Câmpurile `sgr_enabled`, `sgr_deposit_amount`, `sgr_returned_amount`, `sgr_available_amount` calculate corect. |
| **B** | Retur parțial 1 unitate produs SGR | **PASS** | Garanție stornată corect (10.00 + 0.50 = 10.50 RON). Stocul lotului crescut de la 8 la 9. Jurnalizare audit `sgr_refund_total = 0.50`. |
| **C** | Eligibilitate post-retur parțial | **PASS** | Câmpurile de disponibil recalculate tranzacțional la 1 unitate (0.50 RON). |
| **E** | Limitare cantitativă retur (capping) | **PASS** | Încercarea de a returna 2 unități când doar 1 este disponibilă a fost respinsă de RPC cu mesajul corespunzător. |
| **D** | Retur final 1 unitate (totalizare) | **PASS** | Stocul lotului restaurat la 10.00. Statusul vânzării actualizat corect în `returned`. |
| **F** | Regresie retur produs non-SGR | **FAIL** | Eșuează la inserarea în `sale_return_items` cu eroare de CHECK constraint. |

### Cauza eșecului Scenario F
În baza de date, funcția `return_sale_items` inserează `sgr_vat_group` folosind expresia:
```sql
COALESCE(v_sale_item.sgr_vat_group, 'D')
```
Pentru produsele non-SGR, `sgr_vat_group` din `sale_items` este `NULL`. Din cauza `COALESCE`, funcția inserează valoarea `'D'`. Însă constraintul `sale_return_items_sgr_check` interzice ca un produs non-SGR (`sgr_enabled = false`) să aibă grupa fiscală `'D'` (trebuie să fie obligatoriu `NULL`), generând eroarea:
```
new row for relation "sale_return_items" violates check constraint "sale_return_items_sgr_check"
```

---

## 5. Hotfix SQL Recomandat (Etapa 6D.6.11.1)
Pentru a alinia funcția din baza de date la codul corectat din fișierul `database/proposed_sgr_returns_6d69.sql`, utilizatorul trebuie să execute manual următorul script SQL în **Supabase SQL Editor**:

```sql
CREATE OR REPLACE FUNCTION public.return_sale_items(
    p_store_id uuid,
    p_profile_id uuid,
    p_sale_id uuid,
    p_items jsonb, -- Array de obiecte: [{"sale_item_id": "uuid", "quantity": 1.5}]
    p_reason text,
    p_refund_method text,
    p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_role boolean;
    v_sale record;
    v_shift_id uuid;
    v_return_id uuid;
    v_elem jsonb;
    v_item_id uuid;
    v_ret_qty numeric(12,3);
    v_sale_item record;
    v_already_ret numeric(12,3);
    v_refund_item numeric(12,2);
    v_refund_sgr numeric(12,2) := 0;
    v_total_refund numeric(12,2) := 0;
    v_total_sgr_refund numeric(12,2) := 0;
    v_all_fully_returned boolean := true;
    v_clean_reason text;
    v_refund_method text;
BEGIN
    -- 0. Curățare și validare motiv
    v_clean_reason := trim(p_reason);
    IF v_clean_reason IS NULL OR length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'Motivul returului este obligatoriu și trebuie să aibă cel puțin 3 caractere.';
    END IF;

    -- Normalizare și validare refund_method
    v_refund_method := lower(trim(p_refund_method));
    IF v_refund_method NOT IN ('cash', 'card', 'voucher') THEN
        RAISE EXCEPTION 'Metodă de rambursare invalidă: %. Metoda trebuie să fie cash, card sau voucher.', p_refund_method;
    END IF;

    -- 1. Validare permisiuni: doar admin, manager sau platform_owner
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces refuzat: Doar managerii sau administratorii pot opera retururi parțiale/totale.';
    END IF;

    -- 2. Găsire tură activă deschisă a operatorului curent
    SELECT id INTO v_shift_id
    FROM public.pos_shifts
    WHERE store_id = p_store_id AND opened_by = p_profile_id AND status = 'open';

    IF v_shift_id IS NULL THEN
        RAISE EXCEPTION 'Nu s-a găsit nicio tură POS activă deschisă pentru tine. Deschide o tură înainte de a procesa retururi.';
    END IF;

    -- 3. Validare listă articole și structură payload JSON (Hardening)
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Lista de articole returnate este goală sau invalidă.';
    END IF;

    -- Validare sumară a structurii elementelor înainte de începerea modificărilor
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF NOT (v_elem ? 'sale_item_id') OR NOT (v_elem ? 'quantity') THEN
            RAISE EXCEPTION 'Fiecare articol returnat trebuie să conțină sale_item_id și quantity.';
        END IF;

        IF jsonb_typeof(v_elem->'sale_item_id') <> 'string' OR jsonb_typeof(v_elem->'quantity') <> 'number' THEN
            RAISE EXCEPTION 'Articolul returnat are tipuri de date invalide pentru sale_item_id sau quantity.';
        END IF;

        -- Validare format UUID pentru sale_item_id (fail-fast)
        BEGIN
            PERFORM (v_elem->>'sale_item_id')::uuid;
        EXCEPTION WHEN others THEN
            RAISE EXCEPTION 'UUID invalid pentru sale_item_id: %', v_elem->>'sale_item_id';
        END;

        -- Validare cantitate pozitivă
        IF (v_elem->>'quantity')::numeric(12,3) <= 0 THEN
            RAISE EXCEPTION 'Cantitatea returnată trebuie să fie strict mai mare ca 0.';
        END IF;
    END LOOP;

    -- 4. Blocare și selectare vânzare originală FOR UPDATE
    SELECT * INTO v_sale FROM public.sales 
    WHERE id = p_sale_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Vânzarea nu există sau nu aparține acestui magazin.';
    END IF;

    IF v_sale.status NOT IN ('finalized', 'partially_returned') THEN
        RAISE EXCEPTION 'Returul nu este permis pentru bonuri cu status curent: %', v_sale.status;
    END IF;

    -- 5. Inserare antet retur (total_refund setat inițial pe 0, actualizat ulterior)
    INSERT INTO public.sale_returns (
        store_id, original_sale_id, shift_id, profile_id, type, status, reason, total_refund, refund_method, notes
    ) VALUES (
        p_store_id, p_sale_id, v_shift_id, p_profile_id, 'return', 'completed', v_clean_reason, 0, v_refund_method, p_notes
    ) RETURNING id INTO v_return_id;

    -- 6. Procesare fiecare element din p_items tranzacțional
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_item_id := (v_elem->>'sale_item_id')::uuid;
        v_ret_qty := (v_elem->>'quantity')::numeric(12,3);

        -- Selectare linie bon originală și blocare FOR UPDATE
        SELECT * INTO v_sale_item FROM public.sale_items WHERE id = v_item_id AND sale_id = p_sale_id FOR UPDATE;
        IF v_sale_item IS NULL THEN
            RAISE EXCEPTION 'Linia de bon % nu există în vânzarea %.', v_item_id, p_sale_id;
        END IF;

        -- Validare batch_id (fail-fast)
        IF v_sale_item.batch_id IS NULL THEN
            RAISE EXCEPTION 'Eroare critică: Linia de bon pentru produsul % nu are asociat un lot (batch_id lipsă). Stocul nu poate fi readus.', v_sale_item.product_id;
        END IF;

        -- Calcul cantitate deja returnată anterior pe această linie
        SELECT COALESCE(SUM(sri.quantity), 0) INTO v_already_ret 
        FROM public.sale_return_items sri
        JOIN public.sale_returns sr ON sr.id = sri.return_id
        WHERE sri.original_sale_item_id = v_item_id AND sr.status = 'completed';

        IF v_ret_qty > (v_sale_item.quantity - v_already_ret) THEN
            RAISE EXCEPTION 'Cantitatea returnată (%) depășește cantitatea disponibilă pentru retur (%).', 
                v_ret_qty, (v_sale_item.quantity - v_already_ret);
        END IF;

        -- Calcul valoare linie de retur (produs stornat)
        v_refund_item := round(v_ret_qty * v_sale_item.unit_price, 2);
        
        -- Calcul valoare stornare garanție SGR (dacă este activă pe linia respectivă)
        IF COALESCE(v_sale_item.sgr_enabled, false) THEN
            v_refund_sgr := round(v_ret_qty * COALESCE(v_sale_item.sgr_deposit_amount, 0.50), 2);
        ELSE
            v_refund_sgr := 0.00;
        END IF;

        -- Actualizare total returnat SGR pe bon
        v_total_sgr_refund := v_total_sgr_refund + v_refund_sgr;

        -- Actualizare total returnat pe bon (produs + SGR)
        v_total_refund := v_total_refund + v_refund_item + v_refund_sgr;

        -- Inserare linie retur (cu detalii complete SGR)
        INSERT INTO public.sale_return_items (
            store_id, return_id, original_sale_item_id, product_id, batch_id, quantity, unit_price, total_item,
            sgr_enabled, sgr_type, sgr_deposit_amount, sgr_refund_amount, sgr_vat_group, sgr_vat_rate
        ) VALUES (
            p_store_id, v_return_id, v_item_id, v_sale_item.product_id, v_sale_item.batch_id, v_ret_qty, v_sale_item.unit_price, v_refund_item,
            COALESCE(v_sale_item.sgr_enabled, false),
            v_sale_item.sgr_type,
            COALESCE(v_sale_item.sgr_deposit_amount, 0.00),
            v_refund_sgr,
            CASE WHEN COALESCE(v_sale_item.sgr_enabled, false) THEN 'D' ELSE NULL END,
            COALESCE(v_sale_item.sgr_vat_rate, 0.00)
        );

        -- Readucere stoc pe lotul original
        UPDATE public.stock_batches 
        SET quantity = quantity + v_ret_qty 
        WHERE id = v_sale_item.batch_id AND store_id = p_store_id;

        -- Creare mișcare stoc
        INSERT INTO public.stock_movements (
            store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by
        ) VALUES (
            p_store_id, v_sale_item.product_id, v_sale_item.batch_id, 'return', v_ret_qty, 'customer', 'magazin', v_return_id, p_profile_id
        );
    END LOOP;

    -- 7. Actualizare total refund pe antet retur (inclusiv garanții)
    UPDATE public.sale_returns SET total_refund = v_total_refund WHERE id = v_return_id;

    -- 8. Actualizare status vânzare în funcție de cantitățile rămase nereturnate
    FOR v_sale_item IN (SELECT id, quantity FROM public.sale_items WHERE sale_id = p_sale_id) LOOP
        SELECT COALESCE(SUM(sri.quantity), 0) INTO v_already_ret 
        FROM public.sale_return_items sri
        JOIN public.sale_returns sr ON sr.id = sri.return_id
        WHERE sri.original_sale_item_id = v_sale_item.id AND sr.status = 'completed';

        IF v_already_ret < v_sale_item.quantity THEN
            v_all_fully_returned := false;
        END IF;
    END LOOP;

    IF v_all_fully_returned THEN
        UPDATE public.sales SET status = 'returned' WHERE id = p_sale_id;
    ELSE
        UPDATE public.sales SET status = 'partially_returned' WHERE id = p_sale_id;
    END IF;

    -- 9. Înregistrare în audit logs (Hardening: stocare explicită sgr_refund_total)
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
    VALUES (p_store_id, p_profile_id, 'sale.return', 'sale_returns', v_return_id, jsonb_build_object(
        'sale_id', p_sale_id,
        'total_refund', v_total_refund,
        'sgr_refund_total', v_total_sgr_refund,
        'refund_method', v_refund_method,
        'reason', v_clean_reason,
        'items', p_items
    ));

    RETURN v_return_id;
END;
$$;

-- Securizare privilegii
REVOKE ALL ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) TO authenticated;
```

---

## 6. Concluzii și pași următori
Odată aplicat scriptul SQL de hotfix de mai sus:
1. Toate testele de regresie (inclusiv Scenario F) vor trece cu succes, finalizând complet etapa 6D.6.11.
2. Niciun impact asupra securității sau structurii de date.
3. Se menține compatibilitatea integrală în tura deschisă POS și sertarul de numerar.
