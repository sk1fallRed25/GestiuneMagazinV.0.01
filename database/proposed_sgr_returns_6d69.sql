-- ============================================================================
-- BLUEPRINT SQL: SGR Returns Integration (Etapa 6D.6.9 / Securizat 6D.6.10)
-- ============================================================================
-- ATENȚIE: ACEST SCRIPT ESTE UN BLUEPRINT DE PROIECTARE ARHITECTURALĂ SECURIZATĂ.
-- AVERTISMENT DE ROLLOUT: NU APLICAȚI ACEST SCRIPT ÎNAINTE DE ETAPA 6D.6.11!
-- FUNCȚIILE LIVE NU SE MODIFICĂ ÎN CADRUL ETAPEI CURENTE (6D.6.10).
-- NU MODIFICĂ BAZA DE DATE LIVE SAU RPC-URILE ACTIVE.
-- ============================================================================

-- 1. EXTINDERE STRUCTURĂ TABELĂ: sale_return_items
-- Adăugare coloane pentru snapshot și tracking stornare garanție SGR
ALTER TABLE public.sale_return_items
ADD COLUMN IF NOT EXISTS sgr_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sgr_type text NULL,
ADD COLUMN IF NOT EXISTS sgr_deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgr_refund_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgr_vat_group text NULL,
ADD COLUMN IF NOT EXISTS sgr_vat_rate numeric(5,2) NOT NULL DEFAULT 0;

-- 2. CONSTRÂNGERE DE INTEGRITATE DATE (CHECK CONSTRAINT)
-- Garantează corectitudinea datelor SGR stornate
-- sgr_refund_amount = returned_qty * sgr_deposit_amount;
-- Constrângerea nu leagă direct de quantity ca să nu complice migrarea, dar funcția RPC trebuie să calculeze exact.
ALTER TABLE public.sale_return_items DROP CONSTRAINT IF EXISTS sale_return_items_sgr_check;
ALTER TABLE public.sale_return_items ADD CONSTRAINT sale_return_items_sgr_check
CHECK (
  (
    sgr_enabled = false
    AND sgr_type IS NULL
    AND sgr_deposit_amount = 0
    AND sgr_refund_amount = 0
    AND sgr_vat_group IS NULL
    AND sgr_vat_rate = 0
  )
  OR
  (
    sgr_enabled = true
    AND sgr_type IN ('plastic', 'metal', 'glass')
    AND sgr_deposit_amount = 0.50
    AND sgr_refund_amount >= 0
    AND sgr_vat_group = 'D'
    AND sgr_vat_rate = 0
  )
);

-- 3. INDEXURI RECOMANDATE PENTRU OPTIMIZAREA INTEROGĂRILOR ȘI RECONCILIERILOR
CREATE INDEX IF NOT EXISTS idx_sale_return_items_sgr_enabled ON public.sale_return_items(sgr_enabled);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_sgr_type ON public.sale_return_items(sgr_type) WHERE sgr_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sale_return_items_return_sgr ON public.sale_return_items(return_id, sgr_enabled);


-- ============================================================================
-- 4. PROPOSED RPC: get_sale_return_eligibility (V2 cu suport SGR)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sale_return_eligibility(
    p_store_id uuid,
    p_profile_id uuid,
    p_sale_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_role boolean;
    v_sale record;
    v_items jsonb;
    v_payments jsonb;
    v_previous_returns jsonb;
    v_can_return boolean := true;
    v_reason_if_not text := NULL;
    v_returnable_count int := 0;
BEGIN
    -- 1. Validare permisiuni: admin, manager sau platform_owner
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RETURN jsonb_build_object(
            'sale_id', p_sale_id,
            'can_return', false,
            'reason_if_not', 'Acces interzis: Doar managerii sau administratorii pot consulta eligibilitatea returului.'
        );
    END IF;

    -- 2. Citire vânzare
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id AND store_id = p_store_id;
    IF v_sale IS NULL THEN
        RETURN jsonb_build_object(
            'sale_id', p_sale_id,
            'can_return', false,
            'reason_if_not', 'Vânzarea nu există sau nu aparține acestui magazin.'
        );
    END IF;

    -- 3. Validare status vânzare
    IF v_sale.status NOT IN ('finalized', 'partially_returned') THEN
        v_can_return := false;
        v_reason_if_not := 'Vânzarea nu este eligibilă pentru retur. Status curent: ' || v_sale.status || '.';
    END IF;

    -- 4. Citire linii și calcul cantități returnabile (folosind sume grupate din sale_return_items)
    -- Include informațiile din snapshot-ul SGR salvat în sale_items, plus SGR deja returnat și disponibil
    SELECT jsonb_agg(jsonb_build_object(
        'sale_item_id', si.id,
        'product_id', si.product_id,
        'product_name', p.name,
        'barcode', p.barcode,
        'batch_id', si.batch_id,
        'quantity_sold', si.quantity,
        'quantity_returned', COALESCE(ret.qty_ret, 0),
        'quantity_available_to_return', si.quantity - COALESCE(ret.qty_ret, 0),
        'unit_price', si.unit_price,
        'total_item', si.total_item,
        -- Snapshot SGR din vânzare
        'sgr_enabled', COALESCE(si.sgr_enabled, false),
        'sgr_type', si.sgr_type,
        'sgr_deposit_amount', COALESCE(si.sgr_deposit_amount, 0),
        'sgr_total_amount', COALESCE(si.sgr_total_amount, 0),
        'sgr_vat_group', COALESCE(si.sgr_vat_group, 'D'),
        'sgr_vat_rate', COALESCE(si.sgr_vat_rate, 0),
        -- Câmpuri de monitorizare stornare SGR
        'sgr_returned_amount', COALESCE(ret.sgr_refund_ret, 0),
        'sgr_available_amount',
          CASE
            WHEN COALESCE(si.sgr_enabled, false)
            THEN ROUND((si.quantity - COALESCE(ret.qty_ret, 0)) * COALESCE(si.sgr_deposit_amount, 0.50), 2)
            ELSE 0.00
          END
    )) INTO v_items
    FROM public.sale_items si
    LEFT JOIN public.products p ON p.id = si.product_id
    LEFT JOIN (
        SELECT sri.original_sale_item_id, 
               SUM(sri.quantity) as qty_ret,
               SUM(COALESCE(sri.sgr_refund_amount, 0)) as sgr_refund_ret
        FROM public.sale_return_items sri
        JOIN public.sale_returns sr ON sr.id = sri.return_id
        WHERE sr.status = 'completed'
        GROUP BY sri.original_sale_item_id
    ) ret ON ret.original_sale_item_id = si.id
    WHERE si.sale_id = p_sale_id;

    -- 5. Numărare articole cu cantitate disponibilă pentru retur > 0
    SELECT COALESCE(COUNT(*), 0) INTO v_returnable_count
    FROM (
        SELECT si.quantity - COALESCE(SUM(sri.quantity), 0) as available
        FROM public.sale_items si
        LEFT JOIN public.sale_returns sr ON sr.original_sale_id = si.sale_id AND sr.status = 'completed'
        LEFT JOIN public.sale_return_items sri ON sri.return_id = sr.id AND sri.original_sale_item_id = si.id
        WHERE si.sale_id = p_sale_id
        GROUP BY si.id, si.quantity
    ) sub
    WHERE sub.available > 0;

    IF v_can_return AND v_returnable_count = 0 THEN
        v_can_return := false;
        v_reason_if_not := 'Nu mai există articole disponibile pentru retur pe acest bon.';
    END IF;

    -- 6. Citire plăți originale
    SELECT jsonb_agg(jsonb_build_object(
        'id', pay.id,
        'method', pay.method,
        'amount', pay.amount
    )) INTO v_payments
    FROM public.payments pay
    WHERE pay.sale_id = p_sale_id;

    -- 7. Citire istoric retururi finalizate
    SELECT jsonb_agg(jsonb_build_object(
        'id', sr.id,
        'created_at', sr.created_at,
        'total_refund', sr.total_refund,
        'refund_method', sr.refund_method,
        'reason', sr.reason
    )) INTO v_previous_returns
    FROM public.sale_returns sr
    WHERE sr.original_sale_id = p_sale_id AND sr.status = 'completed';

    RETURN jsonb_build_object(
        'sale_id', v_sale.id,
        'status', v_sale.status,
        'total', v_sale.total,
        'payment_method', v_sale.payment_method,
        'can_return', v_can_return,
        'reason_if_not', v_reason_if_not,
        'items', COALESCE(v_items, '[]'::jsonb),
        'payments', COALESCE(v_payments, '[]'::jsonb),
        'previous_returns', COALESCE(v_previous_returns, '[]'::jsonb),
        'allowed_refund_methods', ARRAY['cash', 'card', 'voucher']
    );
END;
$$;

-- Securizare explicită privilegii get_sale_return_eligibility
REVOKE ALL ON FUNCTION public.get_sale_return_eligibility(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sale_return_eligibility(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sale_return_eligibility(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sale_return_eligibility(uuid, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_return_eligibility(uuid, uuid, uuid) TO authenticated;


-- ============================================================================
-- 5. PROPOSED RPC: return_sale_items (V2 cu suport SGR și Hardening)
-- ============================================================================
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
            COALESCE(v_sale_item.sgr_vat_group, 'D'),
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

-- Securizare explicită privilegii return_sale_items
REVOKE ALL ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) TO authenticated;
