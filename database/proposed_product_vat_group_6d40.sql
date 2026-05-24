-- ============================================================================
-- SQL Blueprint: Gestiune Magazin v2 Product VAT Group (Etapa 6D.4.0.1)
-- Description: Schema modifications for storing VAT group per product/store.
-- Focus: Security & Defaults Hardening.
-- DO NOT APPLY TO THE LIVE DATABASE. This is a reference blueprint for review.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. SCHEMA & DATABASE OBJECTS
-- ----------------------------------------------------------------------------

-- 1. Add `vat_group` column to `product_prices`
-- Rationale: VAT configuration (like price) is store-specific, not global to the product catalog.
-- Compatibility: vat_percent remains temporarily for legacy compatibility.
-- In future stages, vat_group will be the source of truth, and vat_percent will be derived.
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
-- Useful for future reporting and filtering by VAT group within a store.
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
    -- 1. Explicit Access Check
    -- Only allow if platform owner or has a valid operational store role
    IF NOT (
        public.is_platform_owner() OR 
        public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'gestionar', 'casier'])
    ) THEN
        RAISE EXCEPTION 'Acces refuzat pentru configurația TVA a magazinului.';
    END IF;

    -- Fetch store settings
    SELECT settings INTO v_settings
    FROM public.stores
    WHERE id = p_store_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Magazinul nu exista.';
    END IF;

    -- 2. Merge with defaults to ensure robust tax configs (handles missing or partial fields)
    v_settings := public.merge_store_settings_with_defaults(COALESCE(v_settings, '{}'::jsonb));
    v_tax := COALESCE(v_settings -> 'tax', public.get_default_store_settings() -> 'tax');
    
    v_vat_payer := COALESCE((v_tax ->> 'vat_payer')::boolean, true);
    v_default_group := COALESCE(v_tax ->> 'default_vat_group', 'A');
    v_price_policy := COALESCE(v_tax ->> 'price_tax_policy', 'inclusive');

    -- Enforce fiscal alignment rules
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

-- 5. Explicit Grants & Security
REVOKE ALL ON FUNCTION public.get_product_vat_config(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_product_vat_config(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_product_vat_config(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_vat_config(uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- B. CONTROLLED BACKFILL LOGIC (MANUAL - NOT AUTO-EXECUTED)
-- ----------------------------------------------------------------------------
-- BACKFILL NU SE EXECUTĂ AUTOMAT ÎN 6D.4.1.
-- Pentru 6D.4.1 verificăm doar aplicarea schemei/RPC.
-- Backfill-ul poate fi aplicat controlat într-o etapă separată dacă este necesar.
-- Note: ADD COLUMN ... DEFAULT 'A' setează deja fallback 'A' pentru rândurile existente.
-- Pentru magazinele neplătitoare de TVA, rularea backfill-ului de mai jos este necesară 
-- pentru a alinia produsele lor la Grupa 'E'. Acest proces trebuie făcut manual și monitorizat.

/*
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

        -- Actualizează doar înregistrările magazinului curent cu valoarea calculată
        UPDATE public.product_prices
        SET vat_group = v_default_group
        WHERE store_id = r.id;
    END LOOP;
END $$;
*/
