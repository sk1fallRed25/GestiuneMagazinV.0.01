-- ############################################################################
-- BLUEPRINT PROCEDURI STOCATE ATOMICE (RPC) - ETAPA 5D.0.1 (ALINIAT CU SCHEMA REALĂ)
-- Proiect: Gestiune Magazin v2
--
-- IMPORTANT: Acest script este un BLUEPRINT (propunere arhitecturală).
-- NU trebuie aplicat direct pe baza de date de producție în această etapă.
-- Scopul este înlocuirea operațiunilor multi-step din frontend cu tranzacții
-- atomice ACID în PostgreSQL pentru a garanta integritatea stocurilor.
-- ############################################################################

-- ============================================================================
-- 1. RPC: finalize_sale
-- Scop: Finalizează o vânzare în mod atomic. Calculează prețurile din DB.
-- ============================================================================

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
    v_product_id UUID;
    v_req_qty DECIMAL(12,3);
    v_unit_price DECIMAL(12,2);
    v_batch RECORD;
    v_qty_to_take DECIMAL(12,3);
    v_rem_qty DECIMAL(12,3);
    v_has_role BOOLEAN;
BEGIN
    -- 1. Validare permisiuni și roluri (admin, casier, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'casier']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/casier/platform_owner) pentru magazinul solicitat.';
    END IF;

    -- 2. Calcul total din DB (prețuri din product_prices) și validare cantități
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

        -- Citire preț de vânzare din baza de date
        SELECT price_sale INTO v_unit_price 
        FROM public.product_prices 
        WHERE store_id = p_store_id AND product_id = v_product_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Preț nesetat pentru produsul % în magazinul %.', v_product_id, p_store_id;
        END IF;

        v_total_calc := v_total_calc + (v_req_qty * v_unit_price);
    END LOOP;

    -- 3. Verificare plăți
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

    -- Toleranță la zecimale pentru total (0.01)
    IF ABS(v_payment_total - v_total_calc) > 0.01 THEN
        RAISE EXCEPTION 'Totalul plăților (%) nu corespunde cu totalul calculat al bonului (%).', v_payment_total, v_total_calc;
    END IF;

    -- Determinare payment_method antet
    IF v_payment_count = 1 THEN
        v_payment_method := p_payments->0->>'method';
    ELSE
        v_payment_method := 'mixed';
    END IF;

    -- 4. Creare Header Sale (coloană: total)
    INSERT INTO public.sales (store_id, profile_id, shift_id, total, payment_method, status)
    VALUES (p_store_id, p_profile_id, p_shift_id, v_total_calc, v_payment_method, 'completed')
    RETURNING id INTO v_sale_id;

    -- 5. Inserare plăți detaliate
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (store_id, sale_id, method, amount)
        VALUES (p_store_id, v_sale_id, v_payment->>'method', (v_payment->>'amount')::DECIMAL);
    END LOOP;

    -- 6. Procesare stoc per produs (FEFO/FIFO pe zona magazin cu FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_rem_qty := (v_item->>'quantity')::DECIMAL;
        
        -- Preluare unit_price din DB (știm deja că există de la pasul 2)
        SELECT price_sale INTO v_unit_price 
        FROM public.product_prices 
        WHERE store_id = p_store_id AND product_id = v_product_id;

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

            -- Scădere stoc din lot
            UPDATE public.stock_batches
            SET quantity = quantity - v_qty_to_take
            WHERE id = v_batch.id;

            -- Creare sale_items (inclusiv batch_id, total_item)
            INSERT INTO public.sale_items (store_id, sale_id, product_id, batch_id, quantity, unit_price, total_item)
            VALUES (p_store_id, v_sale_id, v_product_id, v_batch.id, v_qty_to_take, v_unit_price, v_qty_to_take * v_unit_price);

            -- Creare stock_movements
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

REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, UUID) TO authenticated;


-- ============================================================================
-- 2. RPC: receive_stock
-- Scop: Recepție marfă în mod atomic
-- ============================================================================

CREATE OR REPLACE FUNCTION public.receive_stock(
    p_store_id UUID,
    p_profile_id UUID,
    p_document_number TEXT,
    p_document_date DATE,
    p_supplier_name TEXT,
    p_supplier_cui TEXT,
    p_observations TEXT,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_reception_id UUID;
    v_total_value DECIMAL(12,2) := 0;
    v_item JSONB;
    v_product_id UUID;
    v_quantity DECIMAL(12,3);
    v_purchase_price DECIMAL(12,2);
    v_sale_price DECIMAL(12,2);
    v_vat_percent DECIMAL(5,2);
    v_batch_number TEXT;
    v_expiry_date DATE;
    v_zone TEXT;
    v_batch_id UUID;
    v_has_role BOOLEAN;
BEGIN
    -- 1. Validare permisiuni (admin, gestionar, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'gestionar']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/gestionar/platform_owner).';
    END IF;
    
    IF p_document_number IS NULL OR trim(p_document_number) = '' THEN
        RAISE EXCEPTION 'Numărul documentului este obligatoriu.';
    END IF;
    
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Recepția trebuie să conțină cel puțin un produs.';
    END IF;

    -- 2. Calcul total_value
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_quantity := (v_item->>'quantity')::DECIMAL;
        v_purchase_price := (v_item->>'purchase_price')::DECIMAL;
        
        IF v_quantity <= 0 THEN RAISE EXCEPTION 'Cantitate invalidă.'; END IF;
        IF v_purchase_price < 0 THEN RAISE EXCEPTION 'Preț achiziție invalid.'; END IF;
        
        v_total_value := v_total_value + (v_quantity * v_purchase_price);
    END LOOP;

    -- 3. Inserare Header Receptions
    INSERT INTO public.receptions (store_id, profile_id, document_number, document_date, total_value, supplier_text, supplier_cui, observations)
    VALUES (p_store_id, p_profile_id, p_document_number, p_document_date, v_total_value, p_supplier_name, p_supplier_cui, p_observations)
    RETURNING id INTO v_reception_id;

    -- 4. Procesare Linii
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::DECIMAL;
        v_purchase_price := (v_item->>'purchase_price')::DECIMAL;
        v_sale_price := (v_item->>'sale_price')::DECIMAL;
        v_vat_percent := COALESCE((v_item->>'vat_percent')::DECIMAL, 19);
        v_batch_number := COALESCE(v_item->>'batch_number', p_document_number);
        v_expiry_date := NULLIF(v_item->>'expiry_date', '')::DATE;
        v_zone := COALESCE(v_item->>'zone', 'depozit');
        
        IF v_zone NOT IN ('depozit', 'magazin') THEN
            v_zone := 'depozit';
        END IF;

        IF v_sale_price < 0 THEN RAISE EXCEPTION 'Preț vânzare invalid pentru produsul %', v_product_id; END IF;
        IF v_vat_percent < 0 THEN RAISE EXCEPTION 'TVA invalid pentru produsul %', v_product_id; END IF;

        -- A. Inserare reception_items
        INSERT INTO public.reception_items (store_id, reception_id, product_id, quantity, purchase_price, sale_price_new, vat_percent, batch_number, expiry_date)
        VALUES (p_store_id, v_reception_id, v_product_id, v_quantity, v_purchase_price, v_sale_price, v_vat_percent, v_batch_number, v_expiry_date);

        -- B. Upsert product_prices
        -- Necesită unique constraint pe product_prices(store_id, product_id) pentru a funcționa corect.
        INSERT INTO public.product_prices (store_id, product_id, price_sale, price_purchase, vat_percent, updated_at)
        VALUES (p_store_id, v_product_id, v_sale_price, v_purchase_price, v_vat_percent, NOW())
        ON CONFLICT (store_id, product_id) DO UPDATE
        SET price_sale = EXCLUDED.price_sale,
            price_purchase = EXCLUDED.price_purchase,
            vat_percent = EXCLUDED.vat_percent,
            updated_at = NOW();

        -- C. Căutare/Creare stock_batches cu FOR UPDATE
        SELECT id INTO v_batch_id
        FROM public.stock_batches
        WHERE store_id = p_store_id 
          AND product_id = v_product_id 
          AND zone = v_zone 
          AND batch_number IS NOT DISTINCT FROM v_batch_number
          AND expiry_date IS NOT DISTINCT FROM v_expiry_date
        FOR UPDATE;

        IF v_batch_id IS NOT NULL THEN
            UPDATE public.stock_batches
            SET quantity = quantity + v_quantity,
                purchase_price = v_purchase_price
            WHERE id = v_batch_id;
        ELSE
            INSERT INTO public.stock_batches (store_id, product_id, zone, quantity, batch_number, expiry_date, purchase_price)
            VALUES (p_store_id, v_product_id, v_zone, v_quantity, v_batch_number, v_expiry_date, v_purchase_price)
            RETURNING id INTO v_batch_id;
        END IF;

        -- D. Inserare stock_movements
        INSERT INTO public.stock_movements (store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by)
        VALUES (p_store_id, v_product_id, v_batch_id, 'reception', v_quantity, 'external', v_zone, v_reception_id, p_profile_id);
    END LOOP;

    RETURN v_reception_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.receive_stock(UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.receive_stock(UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.receive_stock(UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, JSONB) TO authenticated;


-- ============================================================================
-- 3. RPC: transfer_stock
-- Scop: Transfer atomic între zone (depozit <-> magazin) cu respectarea FEFO/FIFO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_stock(
    p_store_id UUID,
    p_profile_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL,
    p_source_zone TEXT,
    p_target_zone TEXT
) RETURNS DECIMAL AS $$
DECLARE
    v_rem_qty DECIMAL(12,3) := p_quantity;
    v_batch RECORD;
    v_qty_to_take DECIMAL(12,3);
    v_target_batch_id UUID;
    v_has_role BOOLEAN;
BEGIN
    -- 1. Validare permisiuni (admin, gestionar, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'gestionar']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/gestionar/platform_owner).';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Cantitatea de transferat trebuie să fie mai mare ca 0.';
    END IF;

    IF p_source_zone NOT IN ('magazin', 'depozit') OR p_target_zone NOT IN ('magazin', 'depozit') OR p_source_zone = p_target_zone THEN
        RAISE EXCEPTION 'Zone de transfer invalide.';
    END IF;

    -- 2. Procesare loturi sursă (FEFO/FIFO cu FOR UPDATE)
    FOR v_batch IN 
        SELECT id, quantity, batch_number, expiry_date, purchase_price
        FROM public.stock_batches
        WHERE store_id = p_store_id 
          AND product_id = p_product_id 
          AND zone = p_source_zone 
          AND quantity > 0
        ORDER BY expiry_date ASC NULLS LAST, created_at ASC
        FOR UPDATE
    LOOP
        IF v_rem_qty <= 0 THEN
            EXIT;
        END IF;

        v_qty_to_take := LEAST(v_batch.quantity, v_rem_qty);
        
        -- Verificare defensivă pre-scădere
        IF v_batch.quantity < v_qty_to_take THEN 
            RAISE EXCEPTION 'Stoc sursă insuficient la rulare (race condition evitat).';
        END IF;

        -- Scădere din sursă
        UPDATE public.stock_batches
        SET quantity = quantity - v_qty_to_take
        WHERE id = v_batch.id;

        -- Căutare/Creare în destinație cu FOR UPDATE
        SELECT id INTO v_target_batch_id
        FROM public.stock_batches
        WHERE store_id = p_store_id
          AND product_id = p_product_id
          AND zone = p_target_zone
          AND batch_number IS NOT DISTINCT FROM v_batch.batch_number
          AND expiry_date IS NOT DISTINCT FROM v_batch.expiry_date
          AND purchase_price IS NOT DISTINCT FROM v_batch.purchase_price
        FOR UPDATE;

        IF v_target_batch_id IS NOT NULL THEN
            UPDATE public.stock_batches
            SET quantity = quantity + v_qty_to_take
            WHERE id = v_target_batch_id;
        ELSE
            INSERT INTO public.stock_batches (store_id, product_id, zone, quantity, batch_number, expiry_date, purchase_price)
            VALUES (p_store_id, p_product_id, p_target_zone, v_qty_to_take, v_batch.batch_number, v_batch.expiry_date, v_batch.purchase_price)
            RETURNING id INTO v_target_batch_id;
        END IF;

        -- Inserare stock_movements (păstrăm batch_id pe batch-ul sursă)
        INSERT INTO public.stock_movements (store_id, product_id, batch_id, type, quantity, source_zone, target_zone, created_by)
        VALUES (p_store_id, p_product_id, v_batch.id, 'transfer', v_qty_to_take, p_source_zone, p_target_zone, p_profile_id);

        v_rem_qty := v_rem_qty - v_qty_to_take;
    END LOOP;

    IF v_rem_qty > 0 THEN
        RAISE EXCEPTION 'Stoc insuficient în % pentru a transfera cantitatea solicitată (Rămas neacoperit: %).', p_source_zone, v_rem_qty;
    END IF;

    RETURN p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, DECIMAL, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, DECIMAL, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, DECIMAL, TEXT, TEXT) TO authenticated;


-- ============================================================================
-- 4. RPC: record_waste
-- Scop: Înregistrare pierdere/casare atomică
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_waste(
    p_store_id UUID,
    p_profile_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL,
    p_source_zone TEXT,
    p_reason TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_waste_id UUID;
    v_total_available DECIMAL(12,3);
    v_rem_qty DECIMAL(12,3) := p_quantity;
    v_batch RECORD;
    v_qty_to_take DECIMAL(12,3);
    v_has_role BOOLEAN;
BEGIN
    -- 1. Validare permisiuni (admin, gestionar, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'gestionar']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are rolul necesar (admin/gestionar/platform_owner).';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Cantitatea de casat trebuie să fie mai mare ca 0.';
    END IF;

    IF p_source_zone NOT IN ('magazin', 'depozit', 'auto') THEN
        RAISE EXCEPTION 'Sursă de casare invalidă.';
    END IF;

    -- 2. Pre-verificare stoc global pe zonă înainte de a crea antetul
    SELECT COALESCE(SUM(quantity),0) INTO v_total_available
    FROM public.stock_batches
    WHERE store_id = p_store_id
      AND product_id = p_product_id
      AND quantity > 0
      AND (p_source_zone = 'auto' OR zone = p_source_zone);

    IF v_total_available < p_quantity THEN
        RAISE EXCEPTION 'Stoc insuficient pentru casare. Disponibil: %, Solicitat: %', v_total_available, p_quantity;
    END IF;

    -- 3. Creare Header waste_events
    INSERT INTO public.waste_events (store_id, profile_id, reason, description)
    VALUES (p_store_id, p_profile_id, p_reason, p_description)
    RETURNING id INTO v_waste_id;

    -- 4. Procesare loturi (FEFO/FIFO cu FOR UPDATE)
    FOR v_batch IN 
        SELECT id, quantity, zone 
        FROM public.stock_batches
        WHERE store_id = p_store_id 
          AND product_id = p_product_id 
          AND (p_source_zone = 'auto' OR zone = p_source_zone)
          AND quantity > 0
        ORDER BY 
          CASE WHEN p_source_zone = 'auto' AND zone = 'magazin' THEN 1 
               WHEN p_source_zone = 'auto' AND zone = 'depozit' THEN 2 
               ELSE 1 END ASC,
          expiry_date ASC NULLS LAST, 
          created_at ASC
        FOR UPDATE
    LOOP
        IF v_rem_qty <= 0 THEN
            EXIT;
        END IF;

        v_qty_to_take := LEAST(v_batch.quantity, v_rem_qty);
        
        -- Verificare defensivă pre-scădere
        IF v_batch.quantity < v_qty_to_take THEN 
            RAISE EXCEPTION 'Stoc sursă insuficient la rulare (race condition evitat).';
        END IF;

        -- Scădere stoc
        UPDATE public.stock_batches
        SET quantity = quantity - v_qty_to_take
        WHERE id = v_batch.id;

        -- Inserare waste_items (include batch_id)
        INSERT INTO public.waste_items (store_id, waste_id, product_id, batch_id, quantity)
        VALUES (p_store_id, v_waste_id, p_product_id, v_batch.id, v_qty_to_take);

        -- Inserare stock_movements
        INSERT INTO public.stock_movements (store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by)
        VALUES (p_store_id, p_product_id, v_batch.id, 'waste', v_qty_to_take, v_batch.zone, 'external', v_waste_id, p_profile_id);

        v_rem_qty := v_rem_qty - v_qty_to_take;
    END LOOP;

    IF v_rem_qty > 0 THEN
        RAISE EXCEPTION 'Eroare la procesarea loturilor pentru casare (Rămas neacoperit: %).', v_rem_qty;
    END IF;

    RETURN v_waste_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_waste(UUID, UUID, UUID, DECIMAL, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_waste(UUID, UUID, UUID, DECIMAL, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_waste(UUID, UUID, UUID, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
