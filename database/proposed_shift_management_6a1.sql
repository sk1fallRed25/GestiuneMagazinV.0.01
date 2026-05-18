-- ############################################################################
-- BLUEPRINT GESTIUNE TURE CASIERI (SHIFT MANAGEMENT) - ETAPA 6A.1
-- Proiect: Gestiune Magazin v2
--
-- IMPORTANT: Acest script este un BLUEPRINT (propunere arhitecturală).
-- NU trebuie aplicat direct pe baza de date de producție în această etapă.
-- Scopul este definirea structurii riguroase pentru deschiderea/închiderea
-- turelor de casă și calculul diferențelor de numerar (scriptic vs faptic).
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

CREATE POLICY "CashRegisters: view access" ON public.cash_registers FOR SELECT 
USING (store_id IN (SELECT store_id FROM public.current_user_store_ids()) OR public.is_platform_owner());

CREATE POLICY "CashRegisters: admin manage" ON public.cash_registers FOR ALL 
USING (public.has_store_role(store_id, ARRAY['admin']) OR public.is_platform_owner());

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
-- 1. Un casier nu poate avea două ture deschise simultan în același magazin
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_unique_user_open 
ON public.pos_shifts(store_id, opened_by) WHERE status = 'open';

-- 2. O casă de marcat nu poate avea două ture deschise simultan
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_unique_register_open 
ON public.pos_shifts(cash_register_id) WHERE status = 'open' AND cash_register_id IS NOT NULL;

-- INDEX PENTRU CAUTARE RAPIDĂ DUPĂ STORE ȘI STATUS
CREATE INDEX IF NOT EXISTS idx_pos_shifts_store_status ON public.pos_shifts(store_id, status);

-- RLS PENTRU POS SHIFTS
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PosShifts: view access" ON public.pos_shifts FOR SELECT 
USING (store_id IN (SELECT store_id FROM public.current_user_store_ids()) OR public.is_platform_owner());

CREATE POLICY "PosShifts: staff manage" ON public.pos_shifts FOR ALL 
USING (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner());

CREATE TRIGGER update_pos_shifts_updated_at BEFORE UPDATE ON public.pos_shifts 
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- ============================================================================
-- 3. PROPUNERE ALTERARE TABELĂ: sales (MIGRARE DE LA LEGACY CASHIER_SHIFTS)
-- ============================================================================
-- Notă: În mod curent, sales.shift_id face referință la tabela legacy cashier_shifts.
-- Propunerea arhitecturală de mai jos va fi executată în Etapa 6A.2:
/*
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_shift_id_fkey,
ADD CONSTRAINT sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.pos_shifts(id);
*/


-- ============================================================================
-- 4. RPC: open_pos_shift
-- Scop: Deschide o tură nouă de casă cu un sold inițial de numerar
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
    -- 1. Validare permisiuni și roluri (admin, manager, casier, platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are permisiunea de a deschide tura în acest magazin.';
    END IF;

    -- 2. Validare stare magazin
    SELECT active INTO v_store_active FROM public.stores WHERE id = p_store_id;
    IF v_store_active IS NULL OR NOT v_store_active THEN
        RAISE EXCEPTION 'Magazinul selectat este inactiv sau nu există.';
    END IF;

    -- 3. Validare casă de marcat
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

    -- 4. Validare sumă inițială
    IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
        RAISE EXCEPTION 'Suma de deschidere (numerar inițial) trebuie să fie mai mare sau egală cu 0.';
    END IF;

    -- 5. Validare unicitate tură deschisă pentru casier în magazin
    IF EXISTS (
        SELECT 1 FROM public.pos_shifts 
        WHERE store_id = p_store_id AND opened_by = p_profile_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Ai deja o tură deschisă în acest magazin. Închide tura activă înainte de a deschide alta nouă.';
    END IF;

    -- 6. Validare unicitate tură deschisă pentru casa de marcat
    IF p_cash_register_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.pos_shifts 
        WHERE cash_register_id = p_cash_register_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Casa de marcat selectată are deja o tură deschisă de către alt utilizator.';
    END IF;

    -- 7. Inserare tură nouă
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
-- 5. RPC: get_active_pos_shift
-- Scop: Returnează informațiile detaliate ale turei active pentru un casier
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
    -- 1. Căutare tură activă
    SELECT s.id, s.status, s.opening_cash, s.opened_at, s.cash_register_id, c.name AS cash_register_name
    INTO v_shift
    FROM public.pos_shifts s
    LEFT JOIN public.cash_registers c ON c.id = s.cash_register_id
    WHERE s.store_id = p_store_id AND s.opened_by = p_profile_id AND s.status = 'open';

    IF v_shift IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Calcul agregări la zi din vânzările finalizate asociate turei
    SELECT 
        COALESCE(SUM(total), 0),
        COUNT(*)
    INTO v_total_sales, v_transactions_count
    FROM public.sales
    WHERE shift_id = v_shift.id AND status = 'finalized';

    -- Calcul numerar (cash) din tabela payments
    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_cash
    FROM public.payments p
    JOIN public.sales s ON s.id = p.sale_id
    WHERE s.shift_id = v_shift.id AND p.method = 'cash' AND s.status = 'finalized';

    -- Calcul card din tabela payments
    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_card
    FROM public.payments p
    JOIN public.sales s ON s.id = p.sale_id
    WHERE s.shift_id = v_shift.id AND p.method = 'card' AND s.status = 'finalized';

    -- Calcul total bonuri cu plată mixtă (informațional)
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
-- 6. RPC: close_pos_shift
-- Scop: Închide tura activă, calculează totalurile și diferența de numerar
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
    -- 1. Căutare și blocare tură (FOR UPDATE)
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

    -- 2. Validare permisiuni (casierul titular sau admin/manager)
    IF v_shift.opened_by <> p_profile_id THEN
        SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Acces interzis: Doar titularul turei sau un administrator/manager poate închide această tură.';
        END IF;
    END IF;

    IF p_declared_cash IS NULL OR p_declared_cash < 0 THEN
        RAISE EXCEPTION 'Numerarul faptic declarat trebuie să fie mai mare sau egal cu 0.';
    END IF;

    -- 3. Calcul agregări din vânzări
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

    -- 4. Calcul diferențe de casă (numerar așteptat vs declarat)
    v_expected_cash := v_shift.opening_cash + v_total_cash;
    v_cash_diff := p_declared_cash - v_expected_cash;

    -- 5. Actualizare înregistrare tură
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

    -- 6. Returnare rezultat complet
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
-- 7. RPC: cancel_pos_shift (OPȚIONAL / ANULARE TURĂ FĂRĂ VÂNZĂRI)
-- Scop: Anulează o tură deschisă din greșeală, dacă nu are tranzacții
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

    -- Validare permisiuni
    IF v_shift.opened_by <> p_profile_id THEN
        SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Acces interzis: Doar titularul sau un administrator/manager poate anula această tură.';
        END IF;
    END IF;

    -- Validare lipsă tranzacții
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
