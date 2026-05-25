-- ============================================================================
-- SQL Blueprint: SGR finalize_sale Integration (Etapa 6D.6.4)
-- Description: Integration of SGR container deposit calculations and snapshots
--              inside the POS checkout RPC function.
--
-- !! DO NOT APPLY TO THE LIVE DATABASE IN THIS STAGE !!
--
-- ROLLOUT WARNING:
-- Do not apply this function while the deployed POS frontend still calculates
-- payments without SGR. This patch validates payments against SGR-inclusive
-- totals and can reject sales for products where products.sgr_enabled = true.
-- Apply only together with the POS SGR frontend integration and E2E validation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.finalize_sale(
    p_store_id   UUID,
    p_profile_id UUID,
    p_items      JSONB,
    p_payments   JSONB,
    p_shift_id   UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_sale_id        UUID;
    v_total_calc     DECIMAL(12,2) := 0;
    v_payment_total  DECIMAL(12,2) := 0;
    v_payment_method TEXT;
    v_payment_count  INT;
    v_item           JSONB;
    v_payment        JSONB;
    v_product_id     UUID;
    v_req_qty        DECIMAL(12,3);
    v_unit_price     DECIMAL(12,2);
    v_batch          RECORD;
    v_qty_to_take    DECIMAL(12,3);
    v_rem_qty        DECIMAL(12,3);
    v_has_role       BOOLEAN;

    -- Variabile TVA & politica pret
    v_settings          JSONB;
    v_tax_settings      JSONB;
    v_vat_payer         BOOLEAN := true;
    v_price_policy      TEXT    := 'inclusive';
    v_default_vat_group TEXT    := 'A';
    v_prod_vat_group    TEXT;

    -- Variabile calcul snapshot TVA per linie
    v_breakdown         JSONB;
    v_item_total_gross  DECIMAL(12,2);
    v_item_total_net    DECIMAL(12,2);
    v_item_vat_amount   DECIMAL(12,2);
    v_item_vat_rate     DECIMAL(5,2);
    v_item_price_net    DECIMAL(12,4);

    -- Variabile SGR per produs si linie (Noi în 6D.6.4)
    v_prod_sgr_enabled   BOOLEAN;
    v_prod_sgr_type      TEXT;
    v_sgr_enabled        BOOLEAN;
    v_sgr_type           TEXT;
    v_sgr_deposit_amount DECIMAL(12,2);
    v_sgr_total_amount   DECIMAL(12,2);
    v_sgr_vat_group      TEXT;
    v_sgr_vat_rate       DECIMAL(5,2);
BEGIN
    -- =========================================================================
    -- 1. Validare permisiuni si roluri
    -- =========================================================================
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'casier']) OR public.is_platform_owner())
    INTO v_has_role;

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/casier/platform_owner) pentru magazinul solicitat.';
    END IF;

    -- =========================================================================
    -- 1b. Validare tura activa obligatorie
    -- =========================================================================
    IF p_shift_id IS NULL THEN
        RAISE EXCEPTION 'O tura activa este obligatorie pentru a finaliza vanzarea.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.pos_shifts
        WHERE id = p_shift_id
          AND store_id = p_store_id
          AND opened_by = p_profile_id
          AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Tura specificata (ID: %) nu este activa, nu apartine magazinului curent sau nu a fost deschisa de utilizatorul curent.', p_shift_id;
    END IF;

    -- =========================================================================
    -- 2. Citire configuratie fiscala magazin
    -- =========================================================================
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    v_settings      := public.merge_store_settings_with_defaults(COALESCE(v_settings, '{}'::jsonb));
    v_tax_settings  := v_settings -> 'tax';

    v_vat_payer         := COALESCE((v_tax_settings->>'vat_payer')::boolean,  true);
    v_price_policy      := COALESCE(v_tax_settings->>'price_tax_policy',      'inclusive');
    v_default_vat_group := COALESCE(v_tax_settings->>'default_vat_group',     'A');

    -- Regula neplătitor TVA: forteaza grupa E
    IF NOT v_vat_payer THEN
        v_default_vat_group := 'E';
    ELSIF v_vat_payer AND v_default_vat_group = 'E' THEN
        v_default_vat_group := 'A';
    END IF;

    -- =========================================================================
    -- 3. Calcul total din DB si validare cantitati
    --    SGR recalculat direct in DB pentru a preveni manipularea client-side
    -- =========================================================================
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Nu au fost furnizate produse valide pentru vanzare.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_req_qty    := (v_item->>'quantity')::DECIMAL;

        IF v_req_qty <= 0 THEN
            RAISE EXCEPTION 'Cantitate invalida (<=0) pentru produsul %', v_product_id;
        END IF;

        -- Citire pret
        SELECT price_sale INTO v_unit_price
        FROM public.product_prices
        WHERE store_id = p_store_id AND product_id = v_product_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Pret nesetat pentru produsul % in magazinul %.', v_product_id, p_store_id;
        END IF;

        -- Citire SGR direct din tabela de produse (Sursa de Adevăr)
        SELECT COALESCE(sgr_enabled, false), sgr_type
        INTO v_prod_sgr_enabled, v_prod_sgr_type
        FROM public.products
        WHERE id = v_product_id AND store_id = p_store_id;

        -- Adaugare pret produs la total
        v_total_calc := v_total_calc + (v_req_qty * v_unit_price);

        -- Adaugare taxa SGR (0.50 RON per bucata) la totalul de plată
        IF v_prod_sgr_enabled THEN
            v_total_calc := v_total_calc + (v_req_qty * 0.50);
        END IF;
    END LOOP;

    -- =========================================================================
    -- 4. Verificare plati (Trebuie sa acopere totalul inclus SGR)
    -- =========================================================================
    IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array' OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'Nu a fost furnizata nicio plata.';
    END IF;
    v_payment_count := jsonb_array_length(p_payments);

    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        IF (v_payment->>'amount')::DECIMAL <= 0 THEN
            RAISE EXCEPTION 'Suma platii trebuie sa fie > 0.';
        END IF;
        IF v_payment->>'method' NOT IN ('cash', 'card', 'mixed', 'voucher') THEN
            RAISE EXCEPTION 'Metoda de plata invalida: %', v_payment->>'method';
        END IF;
        v_payment_total := v_payment_total + (v_payment->>'amount')::DECIMAL;
    END LOOP;

    IF ABS(v_payment_total - v_total_calc) > 0.01 THEN
        RAISE EXCEPTION 'Totalul platilor (%) nu corespunde cu totalul calculat al bonului incluzand SGR (%).', v_payment_total, v_total_calc;
    END IF;

    IF v_payment_count = 1 THEN
        v_payment_method := p_payments->0->>'method';
    ELSE
        v_payment_method := 'mixed';
    END IF;

    -- =========================================================================
    -- 5. Creare header sale
    -- =========================================================================
    INSERT INTO public.sales (store_id, profile_id, shift_id, total, payment_method, status)
    VALUES (p_store_id, p_profile_id, p_shift_id, v_total_calc, v_payment_method, 'finalized')
    RETURNING id INTO v_sale_id;

    -- =========================================================================
    -- 6. Inserare plati detaliate
    -- =========================================================================
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (store_id, sale_id, method, amount)
        VALUES (p_store_id, v_sale_id, v_payment->>'method', (v_payment->>'amount')::DECIMAL);
    END LOOP;

    -- =========================================================================
    -- 7. Procesare stoc per produs + snapshot TVA si SGR per linie
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_rem_qty    := (v_item->>'quantity')::DECIMAL;

        -- Citeste pret de vanzare SI grupa TVA
        SELECT
            price_sale,
            COALESCE(NULLIF(TRIM(vat_group), ''), v_default_vat_group)
        INTO v_unit_price, v_prod_vat_group
        FROM public.product_prices
        WHERE store_id = p_store_id AND product_id = v_product_id;

        -- Citeste SGR direct din tabela de produse
        SELECT COALESCE(sgr_enabled, false), sgr_type
        INTO v_prod_sgr_enabled, v_prod_sgr_type
        FROM public.products
        WHERE id = v_product_id AND store_id = p_store_id;

        IF NOT v_vat_payer THEN
            v_prod_vat_group := 'E';
        END IF;

        FOR v_batch IN
            SELECT id, quantity, batch_number
            FROM public.stock_batches
            WHERE store_id   = p_store_id
              AND product_id = v_product_id
              AND zone       = 'magazin'
               AND quantity   > 0
            ORDER BY expiry_date ASC NULLS LAST, created_at ASC
            FOR UPDATE
        LOOP
            IF v_rem_qty <= 0 THEN
                EXIT;
            END IF;

            v_qty_to_take := LEAST(v_batch.quantity, v_rem_qty);

            -- Deducere stoc
            UPDATE public.stock_batches
            SET quantity = quantity - v_qty_to_take
            WHERE id = v_batch.id;

            -- Calcul snapshot TVA per linie (TVA produs)
            v_item_total_gross := v_qty_to_take * v_unit_price;

            v_breakdown := public.calculate_vat_breakdown(
                v_item_total_gross,
                v_prod_vat_group,
                (v_price_policy = 'inclusive')
            );

            v_item_vat_rate   := (v_breakdown->>'vatRate')::numeric;
            v_item_vat_amount := (v_breakdown->>'vatAmount')::numeric;
            v_item_total_net  := (v_breakdown->>'baseAmount')::numeric;

            IF v_price_policy = 'inclusive' THEN
                v_item_price_net := ROUND(v_unit_price / (1.0 + v_item_vat_rate / 100.0), 4);
            ELSE
                v_item_price_net := ROUND(v_unit_price, 4);
            END IF;

            -- Calcul snapshot SGR per linie (Noi în 6D.6.4)
            IF v_prod_sgr_enabled THEN
                v_sgr_enabled        := true;
                v_sgr_type           := v_prod_sgr_type;
                v_sgr_deposit_amount := 0.50;
                v_sgr_total_amount   := v_qty_to_take * 0.50;
                v_sgr_vat_group      := 'D';
                v_sgr_vat_rate       := 0.00;
            ELSE
                v_sgr_enabled        := false;
                v_sgr_type           := NULL;
                v_sgr_deposit_amount := 0.00;
                v_sgr_total_amount   := 0.00;
                v_sgr_vat_group      := NULL;
                v_sgr_vat_rate       := 0.00;
            END IF;

            -- Insert sale_items cu ambele tipuri de snapshot (TVA si SGR)
            INSERT INTO public.sale_items (
                store_id, sale_id, product_id, batch_id,
                quantity, unit_price, total_item,
                vat_group, vat_rate, vat_amount,
                price_without_vat, total_without_vat, price_includes_vat,
                sgr_enabled, sgr_type, sgr_deposit_amount,
                sgr_total_amount, sgr_vat_group, sgr_vat_rate
            )
            VALUES (
                p_store_id, v_sale_id, v_product_id, v_batch.id,
                v_qty_to_take, v_unit_price, v_item_total_gross,
                v_prod_vat_group, v_item_vat_rate, v_item_vat_amount,
                v_item_price_net, v_item_total_net, (v_price_policy = 'inclusive'),
                v_sgr_enabled, v_sgr_type, v_sgr_deposit_amount,
                v_sgr_total_amount, v_sgr_vat_group, v_sgr_vat_rate
            );

            -- Inregistrare miscare stoc
            INSERT INTO public.stock_movements (
                store_id, product_id, batch_id, type,
                quantity, source_zone, target_zone, reference_id, created_by
            )
            VALUES (
                p_store_id, v_product_id, v_batch.id, 'sale',
                v_qty_to_take, 'magazin', 'customer', v_sale_id, p_profile_id
            );

            v_rem_qty := v_rem_qty - v_qty_to_take;
        END LOOP;

        IF v_rem_qty > 0 THEN
            RAISE EXCEPTION 'Stoc insuficient in Magazin pentru produsul % (Ramas neacoperit: %).', v_product_id, v_rem_qty;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('sale_id', v_sale_id, 'total', v_total_calc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke default grants
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) TO authenticated;
