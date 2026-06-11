-- ############################################################################
-- BLUEPRINT MIGRATION: ADĂUGARE STATUS, LOT, NIR ȘI RECEPTIE_DATE ÎN RECEPTIONS (6REC.1)
-- Proiect: Gestiune Magazin v2
-- ############################################################################

-- Faza 1: Extindere structură public.receptions
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'posted';
-- Schimbăm default-ul pentru înregistrările viitoare în 'draft'
ALTER TABLE public.receptions ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS nir_number text NULL;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS reception_date date NOT NULL DEFAULT CURRENT_DATE;

-- Adăugare check constraint pe status
ALTER TABLE public.receptions DROP CONSTRAINT IF EXISTS check_receptions_status;
ALTER TABLE public.receptions ADD CONSTRAINT check_receptions_status CHECK (status IN ('draft', 'posted', 'cancelled'));

-- Actualizare reception_date pentru înregistrările istorice
UPDATE public.receptions SET reception_date = document_date WHERE reception_date IS NULL;

-- Faza 2: Creare RPC post_reception securizat
CREATE OR REPLACE FUNCTION public.post_reception(
    p_reception_id UUID,
    p_store_id UUID,
    p_profile_id UUID
) RETURNS UUID AS $$
DECLARE
    v_status TEXT;
    v_item RECORD;
    v_batch_id UUID;
    v_has_role BOOLEAN;
BEGIN
    -- 1. Validare permisiuni (admin, gestionar, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'gestionar']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/gestionar/platform_owner).';
    END IF;

    -- 2. Selectare și blocare rând cu FOR UPDATE pentru a evita race conditions
    SELECT status INTO v_status
    FROM public.receptions
    WHERE id = p_reception_id AND store_id = p_store_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Recepția nu a fost găsită.';
    END IF;

    IF v_status <> 'draft' THEN
        RAISE EXCEPTION 'Recepția nu este în starea Draft (status actual: %).', v_status;
    END IF;

    -- 3. Tranzitare status în 'posted'
    UPDATE public.receptions
    SET status = 'posted'
    WHERE id = p_reception_id;

    -- 4. Procesare stoc pentru fiecare articol din recepție
    FOR v_item IN 
        SELECT product_id, quantity, purchase_price, sale_price_new, vat_percent, batch_number, expiry_date
        FROM public.reception_items
        WHERE reception_id = p_reception_id AND store_id = p_store_id
    LOOP
        -- A. Upsert product_prices
        INSERT INTO public.product_prices (store_id, product_id, price_sale, price_purchase, vat_percent, updated_at)
        VALUES (p_store_id, v_item.product_id, v_item.sale_price_new, v_item.purchase_price, v_item.vat_percent, NOW())
        ON CONFLICT (store_id, product_id) DO UPDATE
        SET price_sale = EXCLUDED.price_sale,
            price_purchase = EXCLUDED.price_purchase,
            vat_percent = EXCLUDED.vat_percent,
            updated_at = NOW();

        -- B. Căutare/Creare stock_batches cu FOR UPDATE
        SELECT id INTO v_batch_id
        FROM public.stock_batches
        WHERE store_id = p_store_id 
          AND product_id = v_item.product_id 
          AND zone = 'depozit' 
          AND batch_number IS NOT DISTINCT FROM v_item.batch_number
          AND expiry_date IS NOT DISTINCT FROM v_item.expiry_date
        FOR UPDATE;

        IF v_batch_id IS NOT NULL THEN
            UPDATE public.stock_batches
            SET quantity = quantity + v_item.quantity,
                purchase_price = v_item.purchase_price
            WHERE id = v_batch_id;
        ELSE
            INSERT INTO public.stock_batches (store_id, product_id, zone, quantity, batch_number, expiry_date, purchase_price)
            VALUES (p_store_id, v_item.product_id, 'depozit', v_item.quantity, v_item.batch_number, v_item.expiry_date, v_item.purchase_price)
            RETURNING id INTO v_batch_id;
        END IF;

        -- C. Inserare stock_movements (trasabilitate completă)
        INSERT INTO public.stock_movements (store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by)
        VALUES (p_store_id, v_item.product_id, v_batch_id, 'reception', v_item.quantity, 'external', 'depozit', p_reception_id, p_profile_id);
    END LOOP;

    RETURN p_reception_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revocare și alocare explicită granturi pentru securitate
REVOKE EXECUTE ON FUNCTION public.post_reception(UUID, UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_reception(UUID, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.post_reception(UUID, UUID, UUID) TO authenticated;
