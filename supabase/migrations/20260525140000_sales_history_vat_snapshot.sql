-- Migration: Sales History VAT Snapshot (Phase 1 & Phase 2)
-- Timestamp: 20260525140000

-- ============================================================================
-- FAZA 1 — Schema changes & helper functions
-- ============================================================================

-- 1A. SCHEMA EXTENSION — new columns in sale_items
ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS vat_group text;

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2);

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2);

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS price_without_vat numeric(12,2);

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS total_without_vat numeric(12,2);

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS price_includes_vat boolean DEFAULT true;

-- Drop and recreate the CHECK constraint safely
ALTER TABLE public.sale_items
    DROP CONSTRAINT IF EXISTS sale_items_vat_group_check;

ALTER TABLE public.sale_items
    ADD CONSTRAINT sale_items_vat_group_check
    CHECK (vat_group IN ('A', 'B', 'C', 'D', 'E') OR vat_group IS NULL);

-- Index for VAT reporting
CREATE INDEX IF NOT EXISTS idx_sale_items_store_vat_reporting
    ON public.sale_items (store_id, sale_id, vat_group);

-- 1B. HELPER — get_vat_rate_for_group

-- Real definition of get_vat_rate_for_group
CREATE OR REPLACE FUNCTION public.get_vat_rate_for_group(p_vat_group text)
RETURNS numeric AS $$
DECLARE
    v_group text;
BEGIN
    v_group := upper(trim(p_vat_group));

    IF v_group IS NULL OR v_group = '' THEN
        RAISE EXCEPTION 'Grupa TVA nu poate fi null sau goala. Valorile permise sunt A, B, C, D, E.';
    END IF;

    CASE v_group
        WHEN 'A' THEN RETURN 21.00;
        WHEN 'B' THEN RETURN 11.00;
        WHEN 'C' THEN RETURN 11.00;
        WHEN 'D' THEN RETURN 0.00;
        WHEN 'E' THEN RETURN 0.00;
        ELSE
            RAISE EXCEPTION 'Grupa TVA invalida: %. Valorile permise sunt A, B, C, D, E.', v_group;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Revoke permissions for the helper
REVOKE EXECUTE ON FUNCTION public.get_vat_rate_for_group(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_vat_rate_for_group(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vat_rate_for_group(text) FROM authenticated;

-- 1C. HELPER — calculate_vat_breakdown
CREATE OR REPLACE FUNCTION public.calculate_vat_breakdown(
    p_total           numeric,
    p_vat_group       text,
    p_price_includes_vat boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
    v_rate numeric;
    v_base numeric;
    v_vat  numeric;
    v_gross numeric;
BEGIN
    IF p_total IS NULL THEN
        RAISE EXCEPTION 'Parametrul p_total nu poate fi NULL in calculate_vat_breakdown.';
    END IF;
    IF p_total < 0 THEN
        RAISE EXCEPTION 'Parametrul p_total nu poate fi negativ (valoare primita: %). Verificati calculul cantitatii.', p_total;
    END IF;

    IF p_price_includes_vat IS NULL THEN
        p_price_includes_vat := true;
    END IF;

    v_rate := public.get_vat_rate_for_group(p_vat_group);

    IF p_price_includes_vat THEN
        v_base  := ROUND(p_total / (1.0 + v_rate / 100.0), 2);
        v_vat   := ROUND(p_total - v_base, 2);
        v_gross := ROUND(p_total, 2);
    ELSE
        v_base  := ROUND(p_total, 2);
        v_vat   := ROUND(p_total * v_rate / 100.0, 2);
        v_gross := ROUND(v_base + v_vat, 2);
    END IF;

    RETURN jsonb_build_object(
        'vatGroup',        upper(trim(p_vat_group)),
        'vatRate',         v_rate,
        'baseAmount',      v_base,
        'vatAmount',       v_vat,
        'grossAmount',     v_gross,
        'priceIncludesVat', p_price_includes_vat
    );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Revoke permissions for the helper
REVOKE EXECUTE ON FUNCTION public.calculate_vat_breakdown(numeric, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_vat_breakdown(numeric, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_vat_breakdown(numeric, text, boolean) FROM authenticated;


-- ============================================================================
-- FAZA 2 — PATCH finalize_sale
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

    -- Variabile TVA & politica pret (noi in patch)
    v_settings          JSONB;
    v_tax_settings      JSONB;
    v_vat_payer         BOOLEAN := true;
    v_price_policy      TEXT    := 'inclusive';
    v_default_vat_group TEXT    := 'A';
    v_prod_vat_group    TEXT;

    -- Variabile calcul snapshot per linie (noi in patch)
    v_breakdown         JSONB;
    v_item_total_gross  DECIMAL(12,2);
    v_item_total_net    DECIMAL(12,2);
    v_item_vat_amount   DECIMAL(12,2);
    v_item_vat_rate     DECIMAL(5,2);
    v_item_price_net    DECIMAL(12,4);
BEGIN
    -- 1. Validare permisiuni si roluri
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'casier']) OR public.is_platform_owner())
    INTO v_has_role;

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/casier/platform_owner) pentru magazinul solicitat.';
    END IF;

    -- 1b. Validare tura activa obligatorie
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

    -- 2. Citire configuratie fiscala magazin
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    v_settings      := public.merge_store_settings_with_defaults(COALESCE(v_settings, '{}'::jsonb));
    v_tax_settings  := v_settings -> 'tax';

    v_vat_payer         := COALESCE((v_tax_settings->>'vat_payer')::boolean,  true);
    v_price_policy      := COALESCE(v_tax_settings->>'price_tax_policy',      'inclusive');
    v_default_vat_group := COALESCE(v_tax_settings->>'default_vat_group',     'A');

    -- Regula neplătitor TVA
    IF NOT v_vat_payer THEN
        v_default_vat_group := 'E';
    ELSIF v_vat_payer AND v_default_vat_group = 'E' THEN
        v_default_vat_group := 'A';
    END IF;

    -- 3. Calcul total din DB si validare cantitati
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

        SELECT price_sale INTO v_unit_price
        FROM public.product_prices
        WHERE store_id = p_store_id AND product_id = v_product_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Pret nesetat pentru produsul % in magazinul %.', v_product_id, p_store_id;
        END IF;

        v_total_calc := v_total_calc + (v_req_qty * v_unit_price);
    END LOOP;

    -- 4. Verificare plati
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
        RAISE EXCEPTION 'Totalul platilor (%) nu corespunde cu totalul calculat al bonului (%).', v_payment_total, v_total_calc;
    END IF;

    IF v_payment_count = 1 THEN
        v_payment_method := p_payments->0->>'method';
    ELSE
        v_payment_method := 'mixed';
    END IF;

    -- 5. Creare header sale
    INSERT INTO public.sales (store_id, profile_id, shift_id, total, payment_method, status)
    VALUES (p_store_id, p_profile_id, p_shift_id, v_total_calc, v_payment_method, 'finalized')
    RETURNING id INTO v_sale_id;

    -- 6. Inserare plati detaliate
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (store_id, sale_id, method, amount)
        VALUES (p_store_id, v_sale_id, v_payment->>'method', (v_payment->>'amount')::DECIMAL);
    END LOOP;

    -- 7. Procesare stoc per produs (FEFO/FIFO) + snapshot TVA per linie
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_rem_qty    := (v_item->>'quantity')::DECIMAL;

        SELECT
            price_sale,
            COALESCE(NULLIF(TRIM(vat_group), ''), v_default_vat_group)
        INTO v_unit_price, v_prod_vat_group
        FROM public.product_prices
        WHERE store_id = p_store_id AND product_id = v_product_id;

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

            UPDATE public.stock_batches
            SET quantity = quantity - v_qty_to_take
            WHERE id = v_batch.id;

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

            INSERT INTO public.sale_items (
                store_id, sale_id, product_id, batch_id,
                quantity, unit_price, total_item,
                vat_group, vat_rate, vat_amount,
                price_without_vat, total_without_vat, price_includes_vat
            )
            VALUES (
                p_store_id, v_sale_id, v_product_id, v_batch.id,
                v_qty_to_take, v_unit_price, v_item_total_gross,
                v_prod_vat_group, v_item_vat_rate, v_item_vat_amount,
                v_item_price_net, v_item_total_net, (v_price_policy = 'inclusive')
            );

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

-- Grants finalize_sale
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) TO authenticated;
