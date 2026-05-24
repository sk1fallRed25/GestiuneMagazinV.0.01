-- ============================================================================
-- SQL Blueprint: Sales History VAT Snapshot (Etapa 6D.5.3)
-- Description: Database migrations for persisting VAT state per sale item.
-- Focus: Atomic integrity, exact reporting, and historical audit trail.
-- DO NOT APPLY TO THE LIVE DATABASE. Reference blueprint for review.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. SCHEMA EXTENSION (Idempotent ALTER TABLE queries)
-- ----------------------------------------------------------------------------

-- 1. Add snapshot columns to `public.sale_items`
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

-- 2. Add constraint for valid snapshot VAT groups
ALTER TABLE public.sale_items
DROP CONSTRAINT IF EXISTS sale_items_vat_group_check;

ALTER TABLE public.sale_items
ADD CONSTRAINT sale_items_vat_group_check
CHECK (vat_group IN ('A', 'B', 'C', 'D', 'E') OR vat_group IS NULL);

-- 3. Create index to facilitate faster VAT reporting by store, sale and group
CREATE INDEX IF NOT EXISTS idx_sale_items_store_vat_reporting 
ON public.sale_items (store_id, sale_id, vat_group);


-- ----------------------------------------------------------------------------
-- B. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- 1. Helper function to get VAT rate for a group
CREATE OR REPLACE FUNCTION public.get_vat_rate_for_group(p_vat_group text) 
RETURNS numeric AS $$
BEGIN
    CASE p_vat_group
        WHEN 'A' THEN RETURN 21.00;
        WHEN 'B' THEN RETURN 11.00;
        WHEN 'C' THEN RETURN 11.00;
        WHEN 'D' THEN RETURN 0.00;
        WHEN 'E' THEN RETURN 0.00;
        ELSE 
            RAISE EXCEPTION 'Grupă TVA invalidă: %. Valorile permise sunt A, B, C, D, E.', p_vat_group;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Helper function to calculate VAT breakdown
CREATE OR REPLACE FUNCTION public.calculate_vat_breakdown(
    p_total numeric, 
    p_vat_group text, 
    p_price_includes_vat boolean DEFAULT true
) RETURNS jsonb AS $$
DECLARE
    v_rate numeric;
    v_base numeric;
    v_vat numeric;
BEGIN
    v_rate := public.get_vat_rate_for_group(p_vat_group);
    
    IF p_price_includes_vat THEN
        v_base := ROUND(p_total / (1.0 + v_rate / 100.0), 2);
        v_vat := p_total - v_base;
    ELSE
        v_base := ROUND(p_total, 2);
        v_vat := ROUND(p_total * v_rate / 100.0, 2);
    END IF;
    
    RETURN jsonb_build_object(
        'vatGroup', p_vat_group,
        'vatRate', v_rate,
        'baseAmount', v_base,
        'vatAmount', v_vat,
        'grossAmount', ROUND(CASE WHEN p_price_includes_vat THEN p_total ELSE p_total + v_vat END, 2),
        'priceIncludesVat', p_price_includes_vat
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ----------------------------------------------------------------------------
-- C. ATOMIC TRANSACTIONAL RPC: finalize_sale (PATCHED BLUEPRINT)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalize_sale(
    p_store_id UUID,
    p_profile_id UUID,
    p_items JSONB,
    p_payments JSONB,
    p_shift_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_sale_id UUID;
    v_total_calc DECIMAL(12,2) := 0;
    v_payment_total DECIMAL(12,2) := 0;
    v_payment_method TEXT;
    v_payment_count INT;
    v_item JSONB;
    v_payment JSONB;
    
    -- VAT & Pricing Resolution vars
    v_settings JSONB;
    v_tax_settings JSONB;
    v_vat_payer BOOLEAN := true;
    v_price_policy TEXT := 'inclusive';
    v_default_vat_group TEXT := 'A';
    
    v_product_id UUID;
    v_req_qty DECIMAL(12,3);
    v_unit_price DECIMAL(12,2);
    v_prod_vat_group TEXT;
    
    -- Loop variables
    v_batch RECORD;
    v_qty_to_take DECIMAL(12,3);
    v_rem_qty DECIMAL(12,3);
    v_has_role BOOLEAN;
    
    -- Breakdown variables
    v_breakdown JSONB;
    v_item_total_gross DECIMAL(12,2);
    v_item_total_net DECIMAL(12,2);
    v_item_vat_amount DECIMAL(12,2);
    v_item_vat_rate DECIMAL(5,2);
    v_item_price_net DECIMAL(12,4);
BEGIN
    -- 1. Authorization Check (admin, casier, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'casier']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/casier/platform_owner) pentru magazinul solicitat.';
    END IF;

    -- 1b. Shift Validation
    IF p_shift_id IS NULL THEN
        RAISE EXCEPTION 'O tură activă este obligatorie pentru a finaliza vânzarea.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.pos_shifts
        WHERE id = p_shift_id AND store_id = p_store_id AND opened_by = p_profile_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Tura specificată (ID: %) nu este activă, nu aparține magazinului curent sau nu a fost deschisă de utilizatorul curent.', p_shift_id;
    END IF;

    -- 2. Fetch Store Tax Configuration
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    v_settings := public.merge_store_settings_with_defaults(COALESCE(v_settings, '{}'::jsonb));
    v_tax_settings := v_settings -> 'tax';
    
    v_vat_payer := COALESCE((v_tax_settings ->> 'vat_payer')::boolean, true);
    v_price_policy := COALESCE(v_tax_settings ->> 'price_tax_policy', 'inclusive');
    v_default_vat_group := COALESCE(v_tax_settings ->> 'default_vat_group', 'A');

    -- Enforce VAT Payer Rules
    IF NOT v_vat_payer THEN
        v_default_vat_group := 'E';
    ELSIF v_vat_payer AND v_default_vat_group = 'E' THEN
        v_default_vat_group := 'A';
    END IF;

    -- 3. Calculate Bill Total & Validate Quantities
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Nu au fost furnizate produse valide pentru vânzare.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_req_qty := (v_item->>'quantity')::DECIMAL;

        IF v_req_qty <= 0 THEN
            RAISE EXCEPTION 'Cantitate invalidă (<=0) pentru produsul %', v_product_id;
        END IF;

        SELECT price_sale INTO v_unit_price 
        FROM public.product_prices 
        WHERE store_id = p_store_id AND product_id = v_product_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Preț nesetat pentru produsul % în magazinul %.', v_product_id, p_store_id;
        END IF;

        v_total_calc := v_total_calc + (v_req_qty * v_unit_price);
    END LOOP;

    -- 4. Verify Payments
    IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array' OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'Nu a fost furnizată nicio plată.';
    END IF;
    v_payment_count := jsonb_array_length(p_payments);

    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        IF (v_payment->>'amount')::DECIMAL <= 0 THEN
             RAISE EXCEPTION 'Suma plății trebuie să fie > 0.';
        END IF;
        IF v_payment->>'method' NOT IN ('cash', 'card', 'mixed', 'voucher') THEN
             RAISE EXCEPTION 'Metodă de plată invalidă: %', v_payment->>'method';
        END IF;
        v_payment_total := v_payment_total + (v_payment->>'amount')::DECIMAL;
    END LOOP;

    IF ABS(v_payment_total - v_total_calc) > 0.01 THEN
        RAISE EXCEPTION 'Totalul plăților (%) nu corespunde cu totalul calculat al bonului (%).', v_payment_total, v_total_calc;
    END IF;

    IF v_payment_count = 1 THEN
        v_payment_method := p_payments->0->>'method';
    ELSE
        v_payment_method := 'mixed';
    END IF;

    -- 5. Create Header Sale
    INSERT INTO public.sales (store_id, profile_id, shift_id, total, payment_method, status)
    VALUES (p_store_id, p_profile_id, p_shift_id, v_total_calc, v_payment_method, 'finalized')
    RETURNING id INTO v_sale_id;

    -- 6. Insert Detailed Payments
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (store_id, sale_id, method, amount)
        VALUES (p_store_id, v_sale_id, v_payment->>'method', (v_payment->>'amount')::DECIMAL);
    END LOOP;

    -- 7. Process Stock Per Product & Insert Sale Items (FEFO/FIFO)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_rem_qty := (v_item->>'quantity')::DECIMAL;
        
        -- Retrieve sale price and VAT group from product_prices
        SELECT price_sale, COALESCE(NULLIF(vat_group, ''), v_default_vat_group) INTO v_unit_price, v_prod_vat_group 
        FROM public.product_prices 
        WHERE store_id = p_store_id AND product_id = v_product_id;

        -- Enforce non-payer policy
        IF NOT v_vat_payer THEN
            v_prod_vat_group := 'E';
        END IF;

        FOR v_batch IN 
            SELECT id, quantity, batch_number 
            FROM public.stock_batches
            WHERE store_id = p_store_id 
              AND product_id = v_product_id 
              AND zone = 'magazin' 
              AND quantity > 0
            ORDER BY expiry_date ASC NULLS LAST, created_at ASC
            FOR UPDATE
        LOOP
            IF v_rem_qty <= 0 THEN
                EXIT;
            END IF;

            v_qty_to_take := LEAST(v_batch.quantity, v_rem_qty);

            -- Deduct stock
            UPDATE public.stock_batches
            SET quantity = quantity - v_qty_to_take
            WHERE id = v_batch.id;

            -- Calculate fiscal snapshot figures (support both inclusive/exclusive policies)
            v_item_total_gross := v_qty_to_take * v_unit_price;
            
            -- Call helper calculation function
            v_breakdown := public.calculate_vat_breakdown(
                v_item_total_gross, 
                v_prod_vat_group, 
                (v_price_policy = 'inclusive')
            );
            
            v_item_vat_rate := (v_breakdown->>'vatRate')::numeric;
            v_item_vat_amount := (v_breakdown->>'vatAmount')::numeric;
            v_item_total_net := (v_breakdown->>'baseAmount')::numeric;
            v_item_price_net := ROUND(v_unit_price / (1.0 + v_item_vat_rate / 100.0), 4);

            -- Insert item with snapshot fields
            INSERT INTO public.sale_items (
                store_id, sale_id, product_id, batch_id, quantity, unit_price, total_item,
                vat_group, vat_rate, vat_amount, price_without_vat, total_without_vat, price_includes_vat
            )
            VALUES (
                p_store_id, v_sale_id, v_product_id, v_batch.id, v_qty_to_take, v_unit_price, v_item_total_gross,
                v_prod_vat_group, v_item_vat_rate, v_item_vat_amount, v_item_price_net, v_item_total_net, (v_price_policy = 'inclusive')
            );

            -- Record stock movement
            INSERT INTO public.stock_movements (store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by)
            VALUES (p_store_id, v_product_id, v_batch.id, 'sale', v_qty_to_take, 'magazin', 'customer', v_sale_id, p_profile_id);

            v_rem_qty := v_rem_qty - v_qty_to_take;
        END LOOP;

        IF v_rem_qty > 0 THEN
            RAISE EXCEPTION 'Stoc insuficient în Magazin pentru produsul % (Rămas neacoperit: %).', v_product_id, v_rem_qty;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('sale_id', v_sale_id, 'total', v_total_calc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Explicit Grants
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- D. OPTIONAL/COMMENTED BACKFILL SCRIPT FOR LEGACY SALE ITEMS
-- ----------------------------------------------------------------------------
/*
-- WARNING: Perform a database snapshot / backup before running this script.
-- This script backfills historical sale_items where snapshot columns are NULL.
-- It attempts to look up dynamic product_prices as a best-effort approximation.

DO $$
DECLARE
    r_item RECORD;
    v_vat_payer BOOLEAN;
    v_prod_vat_group TEXT;
    v_vat_rate DECIMAL(5,2);
    v_breakdown JSONB;
BEGIN
    FOR r_item IN 
        SELECT si.id, si.store_id, si.product_id, si.total_item
        FROM public.sale_items si
        WHERE si.vat_group IS NULL
    LOOP
        -- Check store payer settings
        SELECT COALESCE((settings->'tax'->>'vat_payer')::boolean, true) INTO v_vat_payer
        FROM public.stores 
        WHERE id = r_item.store_id;

        IF NOT v_vat_payer THEN
            v_prod_vat_group := 'E';
        ELSE
            -- Get product's current VAT group fallback
            SELECT COALESCE(NULLIF(vat_group, ''), 'A') INTO v_prod_vat_group
            FROM public.product_prices
            WHERE store_id = r_item.store_id AND product_id = r_item.product_id;
        END IF;

        -- Resolve VAT rate
        BEGIN
            v_vat_rate := public.get_vat_rate_for_group(v_prod_vat_group);
        EXCEPTION WHEN OTHERS THEN
            v_prod_vat_group := 'A';
            v_vat_rate := 21.00;
        END;

        -- Calculate breakdown assuming VAT-inclusive prices
        v_breakdown := public.calculate_vat_breakdown(r_item.total_item, v_prod_vat_group, true);

        -- Update the legacy row
        UPDATE public.sale_items
        SET 
            vat_group = v_prod_vat_group,
            vat_rate = v_vat_rate,
            vat_amount = (v_breakdown->>'vatAmount')::numeric,
            total_without_vat = (v_breakdown->>'baseAmount')::numeric,
            price_without_vat = ROUND(unit_price / (1.0 + v_vat_rate / 100.0), 4),
            price_includes_vat = true
        WHERE id = r_item.id;
    END LOOP;
END;
$$;
*/
