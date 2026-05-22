-- ============================================================================
-- SQL Blueprint: Gestiune Magazin v2 Product VAT Group (Etapa 6D.4.0)
-- Description: Schema modifications for storing VAT group per product/store.
-- DO NOT APPLY TO THE LIVE DATABASE. This is a reference blueprint for review.
-- ============================================================================

-- 1. Add `vat_group` column to `product_prices`
-- Rationale: VAT configuration (like price) is store-specific, not global to the product catalog.
ALTER TABLE public.product_prices
ADD COLUMN IF NOT EXISTS vat_group text NOT NULL DEFAULT 'A';

-- 2. Add constraint for valid VAT groups
-- Must match the allowed groups defined in the Store Settings VAT model (Etapa 6D.1).
ALTER TABLE public.product_prices
DROP CONSTRAINT IF EXISTS product_prices_vat_group_check;

ALTER TABLE public.product_prices
ADD CONSTRAINT product_prices_vat_group_check
CHECK (vat_group IN ('A', 'B', 'C', 'D', 'E'));

-- 3. Add Index for performance
-- Useful for future reporting and filtering by VAT group within a store
CREATE INDEX IF NOT EXISTS idx_product_prices_store_vat_group 
ON public.product_prices (store_id, vat_group);

-- 4. Helper RPC: get_product_vat_config
-- Returns the VAT configuration for a given store to be used by the frontend
-- when creating/editing products (to enforce VAT Payer / Non-Payer rules).
CREATE OR REPLACE FUNCTION public.get_product_vat_config(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings jsonb;
    v_tax jsonb;
    v_vat_payer boolean;
    v_default_group text;
    v_price_policy text;
BEGIN
    -- Fetch store settings
    SELECT settings INTO v_settings
    FROM public.stores
    WHERE id = p_store_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Magazinul nu exista.';
    END IF;

    -- Extract tax config (with defaults)
    v_tax := COALESCE(v_settings -> 'tax', '{}'::jsonb);
    
    v_vat_payer := COALESCE((v_tax ->> 'vat_payer')::boolean, true);
    v_default_group := COALESCE(v_tax ->> 'default_vat_group', 'A');
    v_price_policy := COALESCE(v_tax ->> 'price_tax_policy', 'inclusive');

    -- Enforce rules
    IF NOT v_vat_payer THEN
        v_default_group := 'E';
    ELSIF v_vat_payer AND v_default_group = 'E' THEN
        v_default_group := 'A';
    END IF;

    RETURN jsonb_build_object(
        'vatPayer', v_vat_payer,
        'defaultVatGroup', v_default_group,
        'priceTaxPolicy', v_price_policy,
        'vatGroups', COALESCE(v_tax -> 'vat_groups', '{}'::jsonb)
    );
END;
$$;

-- Grant permissions to operational roles
REVOKE ALL ON FUNCTION public.get_product_vat_config(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_vat_config(uuid) TO authenticated;

-- ============================================================================
-- BACKFILL LOGIC (Documentation only - NOT auto-executed)
-- ============================================================================
/*
To backfill existing data when this blueprint is applied, an admin should run:

DO $$ 
DECLARE
    r RECORD;
    v_tax jsonb;
    v_vat_payer boolean;
    v_default_group text;
BEGIN
    FOR r IN SELECT id, settings FROM public.stores LOOP
        v_tax := COALESCE(r.settings -> 'tax', '{}'::jsonb);
        v_vat_payer := COALESCE((v_tax ->> 'vat_payer')::boolean, true);
        v_default_group := COALESCE(v_tax ->> 'default_vat_group', 'A');
        
        IF NOT v_vat_payer THEN
            v_default_group := 'E';
        ELSIF v_vat_payer AND v_default_group = 'E' THEN
            v_default_group := 'A';
        END IF;

        UPDATE public.product_prices
        SET vat_group = v_default_group
        WHERE store_id = r.id;
    END LOOP;
END $$;
*/
