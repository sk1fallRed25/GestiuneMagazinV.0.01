-- ============================================================================
-- SQL Blueprint: SGR Container Deposit System (Etapa 6D.6.1 - Hardened)
-- Description: Database migrations for SGR products configuration and snapshotting.
-- Focus: Strict constraints on VAT group D (0%) and deposit amounts.
--
-- !! DO NOT APPLY TO THE LIVE DATABASE WITHOUT REVIEW !!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Schema Extension: products
-- ----------------------------------------------------------------------------
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sgr_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sgr_type text NULL;

-- Constraint: sgr_enabled=false => sgr_type must be NULL. sgr_enabled=true => sgr_type must be plastic, metal, or glass.
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_sgr_type_check;

ALTER TABLE public.products
ADD CONSTRAINT products_sgr_type_check
CHECK (
  (sgr_enabled = false AND sgr_type IS NULL)
  OR
  (sgr_enabled = true AND sgr_type IN ('plastic', 'metal', 'glass'))
);

-- Indexes for SGR query performance
CREATE INDEX IF NOT EXISTS idx_products_sgr_enabled
ON public.products(sgr_enabled);

CREATE INDEX IF NOT EXISTS idx_products_sgr_type
ON public.products(sgr_type);


-- ----------------------------------------------------------------------------
-- 2. Schema Extension: sale_items SGR snapshot fields
-- ----------------------------------------------------------------------------
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS sgr_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sgr_type text NULL,
ADD COLUMN IF NOT EXISTS sgr_deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgr_total_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgr_vat_group text NULL,
ADD COLUMN IF NOT EXISTS sgr_vat_rate numeric(5,2) NOT NULL DEFAULT 0;

-- Constraint on sale_items SGR snapshot
-- Impune strict:
--   - sgr_enabled = false => toate campurile asociate trebuie sa fie goale/zero
--   - sgr_enabled = true => tip ambalaj valid, deposit_amount fix 0.50, grupa D, rata 0%, total_amount >= 0
ALTER TABLE public.sale_items
DROP CONSTRAINT IF EXISTS sale_items_sgr_check;

ALTER TABLE public.sale_items
ADD CONSTRAINT sale_items_sgr_check
CHECK (
  (
    sgr_enabled = false
    AND sgr_type IS NULL
    AND sgr_deposit_amount = 0
    AND sgr_total_amount = 0
    AND sgr_vat_group IS NULL
    AND sgr_vat_rate = 0
  )
  OR
  (
    sgr_enabled = true
    AND sgr_type IN ('plastic', 'metal', 'glass')
    AND sgr_deposit_amount = 0.50
    AND sgr_total_amount >= 0
    AND sgr_vat_group = 'D'
    AND sgr_vat_rate = 0
  )
);

-- Indexes for sale_items SGR reporting
CREATE INDEX IF NOT EXISTS idx_sale_items_sgr_enabled
ON public.sale_items(store_id, sgr_enabled);

CREATE INDEX IF NOT EXISTS idx_sale_items_sgr_type
ON public.sale_items(store_id, sgr_type)
WHERE sgr_enabled = true;


-- ----------------------------------------------------------------------------
-- 3. Config Helper Function: get_sgr_deposit_config()
-- ----------------------------------------------------------------------------
-- Returneaza metadatele si configuratia sistemului SGR.
-- IMMUTABLE: nu acceseaza si nu modifica baza de date.
-- SET search_path = public: securizat.
-- GRANTS: revocat pentru public/anon, disponibil doar pentru authenticated.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sgr_deposit_config()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'amount', 0.50,
    'currency', 'RON',
    'vatGroup', 'D',
    'vatRate', 0,
    'vatLabel', 'Grupa D — 0%',
    'depositLabel', 'Garanție SGR',
    'types', jsonb_build_array(
      jsonb_build_object('key', 'plastic', 'label', 'SGR - PLASTIC'),
      jsonb_build_object('key', 'metal', 'label', 'SGR - METAL'),
      jsonb_build_object('key', 'glass', 'label', 'SGR - STICLĂ')
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Secure helper grants
REVOKE EXECUTE ON FUNCTION public.get_sgr_deposit_config() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sgr_deposit_config() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sgr_deposit_config() TO authenticated;


-- ============================================================================
-- NOTE:
-- Acest script NU aplica automat patch-ul pe functia finalize_sale.
-- Patch-ul tranzactional pentru salvarea snapshot-ului SGR in finalize_sale
-- va fi realizat intr-o etapa separata de integrare backend/POS (e.g. 6D.6.3).
-- Punctul de compatibilitate de date existente este asigurat prin faptul ca
-- valorile implicite (sgr_enabled = false, sgr_type = null, sgr_deposit_amount = 0)
-- satisfac pe deplin noul constraint `sale_items_sgr_check`.
-- ============================================================================
