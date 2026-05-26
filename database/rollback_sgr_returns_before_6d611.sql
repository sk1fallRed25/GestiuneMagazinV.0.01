-- Rollback for Etapa 6D.6.11
-- Restores public.get_sale_return_eligibility and public.return_sale_items before SGR Returns patch.
-- Generated from pg_get_functiondef before applying database/proposed_sgr_returns_6d69.sql.

CREATE OR REPLACE FUNCTION public.get_sale_return_eligibility(p_store_id uuid, p_profile_id uuid, p_sale_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- 1. Validare permisiuni: admin, manager sau platform_owner (reducere fraudă MVP)
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
        'total_item', si.total_item
    )) INTO v_items
    FROM public.sale_items si
    LEFT JOIN public.products p ON p.id = si.product_id
    LEFT JOIN (
        SELECT sri.original_sale_item_id, SUM(sri.quantity) as qty_ret 
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
$function$;


CREATE OR REPLACE FUNCTION public.return_sale_items(p_store_id uuid, p_profile_id uuid, p_sale_id uuid, p_items jsonb, p_reason text, p_refund_method text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_total_refund numeric(12,2) := 0;
    v_all_fully_returned boolean := true;
    v_clean_reason text;
BEGIN
    -- 0. Curățare și validare motiv
    v_clean_reason := trim(p_reason);
    IF v_clean_reason IS NULL OR length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'Motivul returului este obligatoriu și trebuie să aibă cel puțin 3 caractere.';
    END IF;

    -- Validare refund_method
    IF p_refund_method NOT IN ('cash', 'card', 'voucher') THEN
        RAISE EXCEPTION 'Metodă de rambursare invalidă: %. Metoda trebuie să fie cash, card sau voucher.', p_refund_method;
    END IF;

    -- 1. Validare permisiuni: doar admin, manager sau platform_owner
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces refuzat: Doar managerii sau administratorii pot opera retururi parțiale/totale.';
    END IF;

    -- 2. Găsire tură activă deschisă a operatorului curent (pentru trasabilitate cash/expected_cash)
    SELECT id INTO v_shift_id
    FROM public.pos_shifts
    WHERE store_id = p_store_id AND opened_by = p_profile_id AND status = 'open';

    IF v_shift_id IS NULL THEN
        RAISE EXCEPTION 'Nu s-a găsit nicio tură POS activă deschisă pentru tine. Deschide o tură înainte de a procesa retururi.';
    END IF;

    -- 3. Validare listă articole
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Lista de articole returnate este goală.';
    END IF;

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
        p_store_id, p_sale_id, v_shift_id, p_profile_id, 'return', 'completed', v_clean_reason, 0, p_refund_method, p_notes
    ) RETURNING id INTO v_return_id;

    -- 6. Procesare fiecare element din p_items tranzacțional
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_item_id := (v_elem->>'sale_item_id')::uuid;
        v_ret_qty := (v_elem->>'quantity')::numeric(12,3);

        IF v_ret_qty <= 0 THEN
            RAISE EXCEPTION 'Cantitatea returnată trebuie să fie strict mai mare ca 0.';
        END IF;

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

        -- Calcul valoare linie de retur
        v_refund_item := round(v_ret_qty * v_sale_item.unit_price, 2);
        v_total_refund := v_total_refund + v_refund_item;

        -- Inserare linie retur
        INSERT INTO public.sale_return_items (
            store_id, return_id, original_sale_item_id, product_id, batch_id, quantity, unit_price, total_item
        ) VALUES (
            p_store_id, v_return_id, v_item_id, v_sale_item.product_id, v_sale_item.batch_id, v_ret_qty, v_sale_item.unit_price, v_refund_item
        );

        -- Readucere stoc pe lotul original, cu blocare
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

    -- 7. Actualizare total refund pe antet retur
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

    -- 9. Înregistrare în audit logs
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
    VALUES (p_store_id, p_profile_id, 'sale.return', 'sale_returns', v_return_id, jsonb_build_object(
        'sale_id', p_sale_id,
        'total_refund', v_total_refund,
        'refund_method', p_refund_method,
        'reason', v_clean_reason,
        'items', p_items
    ));

    RETURN v_return_id;
END;
$function$;
