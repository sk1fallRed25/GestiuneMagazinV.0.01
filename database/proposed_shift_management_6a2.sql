-- ############################################################################
-- BLUEPRINT GESTIUNE TURE CASIERI (SHIFT MANAGEMENT) - ETAPA 6A.2
-- Proiect: Gestiune Magazin v2
--
-- IMPORTANT: Acest script este un BLUEPRINT rafinat și complet idempotent.
-- Conține definiția tabelelor cash_registers, pos_shifts, procedurile stocate
-- atomice, migrarea FK-ului pe sales.shift_id, seeding-ul casei de marcat
-- și întărirea procedurii finalize_sale cu validarea obligatorie a turei.
-- ############################################################################

-- ============================================================================
-- 1. TABELA: cash_registers (CASE DE MARCAT / SERTARE FIZICE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXURI PENTRU CASH REGISTERS
CREATE INDEX IF NOT EXISTS idx_cash_registers_store ON public.cash_registers(store_id) WHERE active = true;

-- RLS PENTRU CASH REGISTERS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CashRegisters: view access" ON public.cash_registers;
CREATE POLICY "CashRegisters: view access" ON public.cash_registers FOR SELECT 
USING (store_id IN (SELECT store_id FROM public.current_user_store_ids()) OR public.is_platform_owner());

DROP POLICY IF EXISTS "CashRegisters: admin manage" ON public.cash_registers;
CREATE POLICY "CashRegisters: admin manage" ON public.cash_registers FOR ALL 
USING (public.has_store_role(store_id, ARRAY['admin']) OR public.is_platform_owner());

DROP TRIGGER IF EXISTS update_cash_registers_updated_at ON public.cash_registers;
CREATE TRIGGER update_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers 
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- ============================================================================
-- 2. TABELA: pos_shifts (TURELE DE CASIERI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cash_registers(id),
    opened_by UUID NOT NULL REFERENCES public.profiles(id),
    closed_by UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'cancelled')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
    expected_cash DECIMAL(12,2),
    declared_cash DECIMAL(12,2) CHECK (declared_cash >= 0),
    cash_difference DECIMAL(12,2),
    total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_card DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_mixed DECIMAL(12,2) NOT NULL DEFAULT 0,
    transactions_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    closing_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXURI PARȚIALE UNICE (CONSTRÂNGERI STRICTE DE INTEGRITATE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_unique_user_open 
ON public.pos_shifts(store_id, opened_by) WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_unique_register_open 
ON public.pos_shifts(cash_register_id) WHERE status = 'open' AND cash_register_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pos_shifts_store_status ON public.pos_shifts(store_id, status);

-- RLS PENTRU POS SHIFTS
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PosShifts: view access" ON public.pos_shifts;
CREATE POLICY "PosShifts: view access" ON public.pos_shifts FOR SELECT 
USING (store_id IN (SELECT store_id FROM public.current_user_store_ids()) OR public.is_platform_owner());

DROP POLICY IF EXISTS "PosShifts: staff manage" ON public.pos_shifts;
CREATE POLICY "PosShifts: staff manage" ON public.pos_shifts FOR ALL 
USING (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner());

DROP TRIGGER IF EXISTS update_pos_shifts_updated_at ON public.pos_shifts;
CREATE TRIGGER update_pos_shifts_updated_at BEFORE UPDATE ON public.pos_shifts 
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- ============================================================================
-- 3. ALTERARE TABELĂ: sales (MIGRARE DE LA LEGACY CASHIER_SHIFTS)
-- ============================================================================
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_shift_id_fkey,
ADD CONSTRAINT sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.pos_shifts(id);


-- ============================================================================
-- 4. SEEDING: CASA DE MARCAT INITIALA (CASA 1)
-- ============================================================================
INSERT INTO public.cash_registers(store_id, name, code)
SELECT id, 'Casa 1', 'POS-01' FROM public.stores WHERE active = true
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 5. RPC: open_pos_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION public.open_pos_shift(
    p_store_id UUID,
    p_profile_id UUID,
    p_cash_register_id UUID,
    p_opening_cash DECIMAL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_shift_id UUID;
    v_has_role BOOLEAN;
    v_store_active BOOLEAN;
    v_register_active BOOLEAN;
    v_register_store_id UUID;
BEGIN
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are permisiunea de a deschide tura în acest magazin.';
    END IF;

    SELECT active INTO v_store_active FROM public.stores WHERE id = p_store_id;
    IF v_store_active IS NULL OR NOT v_store_active THEN
        RAISE EXCEPTION 'Magazinul selectat este inactiv sau nu există.';
    END IF;

    IF p_cash_register_id IS NOT NULL THEN
        SELECT active, store_id INTO v_register_active, v_register_store_id 
        FROM public.cash_registers WHERE id = p_cash_register_id;

        IF v_register_active IS NULL OR NOT v_register_active THEN
            RAISE EXCEPTION 'Casa de marcat selectată este inactivă sau nu există.';
        END IF;

        IF v_register_store_id <> p_store_id THEN
            RAISE EXCEPTION 'Casa de marcat nu aparține magazinului selectat.';
        END IF;
    END IF;

    IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
        RAISE EXCEPTION 'Suma de deschidere (numerar inițial) trebuie să fie mai mare sau egală cu 0.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.pos_shifts 
        WHERE store_id = p_store_id AND opened_by = p_profile_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Ai deja o tură deschisă în acest magazin. Închide tura activă înainte de a deschide alta nouă.';
    END IF;

    IF p_cash_register_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.pos_shifts 
        WHERE cash_register_id = p_cash_register_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Casa de marcat selectată are deja o tură deschisă de către alt utilizator.';
    END IF;

    INSERT INTO public.pos_shifts (
        store_id, cash_register_id, opened_by, status, opened_at, opening_cash, notes
    ) VALUES (
        p_store_id, p_cash_register_id, p_profile_id, 'open', NOW(), p_opening_cash, p_notes
    ) RETURNING id INTO v_shift_id;

    RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.open_pos_shift(UUID, UUID, UUID, DECIMAL, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.open_pos_shift(UUID, UUID, UUID, DECIMAL, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.open_pos_shift(UUID, UUID, UUID, DECIMAL, TEXT) TO authenticated;


-- ============================================================================
-- 6. RPC: get_active_pos_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_pos_shift(
    p_store_id UUID,
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_shift RECORD;
    v_total_cash DECIMAL(12,2) := 0;
    v_total_card DECIMAL(12,2) := 0;
    v_total_sales DECIMAL(12,2) := 0;
    v_total_mixed DECIMAL(12,2) := 0;
    v_transactions_count INT := 0;
BEGIN
    SELECT s.id, s.status, s.opening_cash, s.opened_at, s.cash_register_id, c.name AS cash_register_name
    INTO v_shift
    FROM public.pos_shifts s
    LEFT JOIN public.cash_registers c ON c.id = s.cash_register_id
    WHERE s.store_id = p_store_id AND s.opened_by = p_profile_id AND s.status = 'open';

    IF v_shift IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(total), 0), COUNT(*)
    INTO v_total_sales, v_transactions_count
    FROM public.sales
    WHERE shift_id = v_shift.id AND status = 'finalized';

    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_cash
    FROM public.payments p
    JOIN public.sales s ON s.id = p.sale_id
    WHERE s.shift_id = v_shift.id AND p.method = 'cash' AND s.status = 'finalized';

    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_card
    FROM public.payments p
    JOIN public.sales s ON s.id = p.sale_id
    WHERE s.shift_id = v_shift.id AND p.method = 'card' AND s.status = 'finalized';

    SELECT COALESCE(SUM(total), 0) INTO v_total_mixed
    FROM public.sales
    WHERE shift_id = v_shift.id AND payment_method = 'mixed' AND status = 'finalized';

    RETURN jsonb_build_object(
        'shift_id', v_shift.id,
        'status', v_shift.status,
        'opening_cash', v_shift.opening_cash,
        'opened_at', v_shift.opened_at,
        'cash_register_id', v_shift.cash_register_id,
        'cash_register_name', v_shift.cash_register_name,
        'current_totals', jsonb_build_object(
            'total_sales', v_total_sales,
            'total_cash', v_total_cash,
            'total_card', v_total_card,
            'total_mixed', v_total_mixed,
            'expected_cash', v_shift.opening_cash + v_total_cash,
            'transactions_count', v_transactions_count
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_active_pos_shift(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_pos_shift(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_active_pos_shift(UUID, UUID) TO authenticated;


-- ============================================================================
-- 7. RPC: close_pos_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION public.close_pos_shift(
    p_store_id UUID,
    p_profile_id UUID,
    p_shift_id UUID,
    p_declared_cash DECIMAL,
    p_closing_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_shift RECORD;
    v_has_role BOOLEAN;
    v_total_cash DECIMAL(12,2) := 0;
    v_total_card DECIMAL(12,2) := 0;
    v_total_sales DECIMAL(12,2) := 0;
    v_total_mixed DECIMAL(12,2) := 0;
    v_transactions_count INT := 0;
    v_expected_cash DECIMAL(12,2) := 0;
    v_cash_diff DECIMAL(12,2) := 0;
BEGIN
    SELECT id, store_id, opened_by, status, opening_cash
    INTO v_shift
    FROM public.pos_shifts
    WHERE id = p_shift_id
    FOR UPDATE;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Tura specificată nu există.';
    END IF;

    IF v_shift.store_id <> p_store_id THEN
        RAISE EXCEPTION 'Tura nu aparține magazinului selectat.';
    END IF;

    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Tura nu este deschisă (stare curentă: %).', v_shift.status;
    END IF;

    IF v_shift.opened_by <> p_profile_id THEN
        SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Acces interzis: Doar titularul turei sau un administrator/manager poate închide această tură.';
        END IF;
    END IF;

    IF p_declared_cash IS NULL OR p_declared_cash < 0 THEN
        RAISE EXCEPTION 'Numerarul faptic declarat trebuie să fie mai mare sau egal cu 0.';
    END IF;

    SELECT COALESCE(SUM(total), 0), COUNT(*)
    INTO v_total_sales, v_transactions_count
    FROM public.sales
    WHERE shift_id = p_shift_id AND status = 'finalized';

    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_cash
    FROM public.payments p
    JOIN public.sales s ON s.id = p.sale_id
    WHERE s.shift_id = p_shift_id AND p.method = 'cash' AND s.status = 'finalized';

    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_card
    FROM public.payments p
    JOIN public.sales s ON s.id = p.sale_id
    WHERE s.shift_id = p_shift_id AND p.method = 'card' AND s.status = 'finalized';

    SELECT COALESCE(SUM(total), 0) INTO v_total_mixed
    FROM public.sales
    WHERE shift_id = p_shift_id AND payment_method = 'mixed' AND status = 'finalized';

    v_expected_cash := v_shift.opening_cash + v_total_cash;
    v_cash_diff := p_declared_cash - v_expected_cash;

    UPDATE public.pos_shifts
    SET status = 'closed',
        closed_by = p_profile_id,
        closed_at = NOW(),
        expected_cash = v_expected_cash,
        declared_cash = p_declared_cash,
        cash_difference = v_cash_diff,
        total_sales = v_total_sales,
        total_cash = v_total_cash,
        total_card = v_total_card,
        total_mixed = v_total_mixed,
        transactions_count = v_transactions_count,
        closing_notes = p_closing_notes,
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
        'shift_id', p_shift_id,
        'status', 'closed',
        'closed_at', NOW(),
        'summary', jsonb_build_object(
            'opening_cash', v_shift.opening_cash,
            'total_sales', v_total_sales,
            'total_cash', v_total_cash,
            'total_card', v_total_card,
            'total_mixed', v_total_mixed,
            'expected_cash', v_expected_cash,
            'declared_cash', p_declared_cash,
            'cash_difference', v_cash_diff,
            'transactions_count', v_transactions_count
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.close_pos_shift(UUID, UUID, UUID, DECIMAL, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_pos_shift(UUID, UUID, UUID, DECIMAL, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.close_pos_shift(UUID, UUID, UUID, DECIMAL, TEXT) TO authenticated;


-- ============================================================================
-- 8. RPC: cancel_pos_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_pos_shift(
    p_store_id UUID,
    p_profile_id UUID,
    p_shift_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_shift RECORD;
    v_has_role BOOLEAN;
BEGIN
    SELECT id, store_id, opened_by, status
    INTO v_shift
    FROM public.pos_shifts
    WHERE id = p_shift_id
    FOR UPDATE;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Tura specificată nu există.';
    END IF;

    IF v_shift.store_id <> p_store_id THEN
        RAISE EXCEPTION 'Tura nu aparține magazinului selectat.';
    END IF;

    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Tura nu este deschisă (stare curentă: %).', v_shift.status;
    END IF;

    IF v_shift.opened_by <> p_profile_id THEN
        SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Acces interzis: Doar titularul sau un administrator/manager poate anula această tură.';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.sales WHERE shift_id = p_shift_id AND status = 'finalized') THEN
        RAISE EXCEPTION 'Tura nu poate fi anulată deoarece are deja vânzări înregistrate. Folosește procedura de închidere tură.';
    END IF;

    UPDATE public.pos_shifts
    SET status = 'cancelled',
        closed_by = p_profile_id,
        closed_at = NOW(),
        closing_notes = COALESCE(p_notes, 'Tură anulată fără tranzacții.'),
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.cancel_pos_shift(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_pos_shift(UUID, UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_pos_shift(UUID, UUID, UUID, TEXT) TO authenticated;


-- ============================================================================
-- 9. RPC ÎNTĂRIT: finalize_sale (CU VALIDARE OBLIGATORIE A TUREI)
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

    -- 1b. Validare tură activă obligatorie
    IF p_shift_id IS NULL THEN
        RAISE EXCEPTION 'O tură activă este obligatorie pentru a finaliza vânzarea.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.pos_shifts
        WHERE id = p_shift_id AND store_id = p_store_id AND opened_by = p_profile_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Tura specificată (ID: %) nu este activă, nu aparține magazinului curent sau nu a fost deschisă de utilizatorul curent.', p_shift_id;
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

    IF ABS(v_payment_total - v_total_calc) > 0.01 THEN
        RAISE EXCEPTION 'Totalul plăților (%) nu corespunde cu totalul calculat al bonului (%).', v_payment_total, v_total_calc;
    END IF;

    IF v_payment_count = 1 THEN
        v_payment_method := p_payments->0->>'method';
    ELSE
        v_payment_method := 'mixed';
    END IF;

    -- 4. Creare Header Sale
    INSERT INTO public.sales (store_id, profile_id, shift_id, total, payment_method, status)
    VALUES (p_store_id, p_profile_id, p_shift_id, v_total_calc, v_payment_method, 'finalized')
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

            UPDATE public.stock_batches
            SET quantity = quantity - v_qty_to_take
            WHERE id = v_batch.id;

            INSERT INTO public.sale_items (store_id, sale_id, product_id, batch_id, quantity, unit_price, total_item)
            VALUES (p_store_id, v_sale_id, v_product_id, v_batch.id, v_qty_to_take, v_unit_price, v_qty_to_take * v_unit_price);

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
