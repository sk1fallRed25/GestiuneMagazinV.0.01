-- ============================================================================
-- BLUEPRINT SQL: Sales Void MVP (Etapa 6B.2.0 - Pre-Apply Hardening)
-- ============================================================================
-- ATENȚIE: ACEST SCRIPT ESTE UN BLUEPRINT DE PROIECTARE ARHITECTURALĂ RAFINAT.
-- NU SE APLICĂ AUTOMAT ÎN BAZA DE DATE ÎN ETAPA 6B.2.0.
-- ============================================================================

-- 1. TABELA PRINCIPALĂ: sale_returns (pentru stocarea operațiunilor de anulare/retur)
CREATE TABLE IF NOT EXISTS public.sale_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    original_sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    shift_id uuid REFERENCES public.pos_shifts(id) ON DELETE SET NULL,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    type text NOT NULL CHECK (type IN ('void', 'return')),
    status text NOT NULL CHECK (status IN ('completed', 'cancelled')),
    reason text NOT NULL,
    total_refund numeric(12,2) NOT NULL DEFAULT 0,
    refund_method text CHECK (refund_method IN ('cash', 'card', 'voucher', 'mixed') OR refund_method IS NULL),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. TABELA DE DETALII: sale_return_items (pentru liniile stornate)
CREATE TABLE IF NOT EXISTS public.sale_return_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
    original_sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id uuid REFERENCES public.stock_batches(id) ON DELETE SET NULL,
    quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
    unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
    total_item numeric(12,2) NOT NULL CHECK (total_item >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. INDEXURI PENTRU PERFORMANȚĂ ȘI CONCURENȚĂ
CREATE INDEX IF NOT EXISTS idx_sale_returns_store_id ON public.sale_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_original_sale_id ON public.sale_returns(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_return_id ON public.sale_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_original_item ON public.sale_return_items(original_sale_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_created_at ON public.sale_returns(created_at);

-- 4. SECURITATE RLS (ROW LEVEL SECURITY)
-- Folosim rolurile reale din sistem: admin, manager, casier și verificarea is_platform_owner()
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SaleReturns: staff access" ON public.sale_returns
    FOR ALL
    USING (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner())
    WITH CHECK (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner());

CREATE POLICY "SaleReturnItems: staff access" ON public.sale_return_items
    FOR ALL
    USING (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner())
    WITH CHECK (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner());

-- ============================================================================
-- 5. MODIFICĂRI CONSTRÂNGERI (ALTERS IDEMPOTENTE)
-- ====================================================================

-- A. Extinderea statusurilor pe tabela sales cu 'voided'
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check 
    CHECK (status IN ('pending', 'finalized', 'cancelled', 'voided', 'partially_returned', 'returned'));

-- B. Extinderea tipurilor de mișcări pe tabela stock_movements cu 'void'
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_type_check 
    CHECK (type IN ('reception', 'transfer', 'sale', 'return', 'waste', 'inventory_adjustment', 'void'));

-- ============================================================================
-- 6. PROCEDURI STOCATE (RPC-uri MVP)
-- ============================================================================

-- A. void_sale (Anulare Totală a unei vânzări eligibile)
CREATE OR REPLACE FUNCTION public.void_sale(
    p_store_id uuid,
    p_profile_id uuid,
    p_sale_id uuid,
    p_reason text,
    p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_role boolean;
    v_is_manager boolean;
    v_sale record;
    v_shift record;
    v_return_id uuid;
    v_item record;
    v_clean_reason text;
BEGIN
    -- 0. Curățare și validare motiv
    v_clean_reason := trim(p_reason);
    IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
        RAISE EXCEPTION 'Motivul anulării este obligatoriu și nu poate fi gol.';
    END IF;

    -- 1. Validare permisiuni generale de acces (admin, manager, casier sau platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: Utilizatorul nu are permisiunea de a anula tranzacții în acest magazin.';
    END IF;

    -- Verificare dacă utilizatorul are rol de admin/manager/platform_owner
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_is_manager;

    -- 2. Selectare și blocare vânzare FOR UPDATE
    SELECT * INTO v_sale FROM public.sales 
    WHERE id = p_sale_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Vânzarea nu există sau nu aparține acestui magazin.';
    END IF;

    IF v_sale.status <> 'finalized' THEN
        RAISE EXCEPTION 'Doar vânzările finalizate pot fi anulate (status curent: %).', v_sale.status;
    END IF;

    IF v_sale.shift_id IS NULL THEN
        RAISE EXCEPTION 'Vânzarea nu este asociată unei ture de casă (shift_id lipsă).';
    END IF;

    -- 3. Selectare tură de casă
    SELECT * INTO v_shift FROM public.pos_shifts WHERE id = v_sale.shift_id;
    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Tura asociată acestei vânzări nu există în sistem.';
    END IF;

    -- 4. Validări specifice pe roluri și pe starea turei
    -- Recomandare MVP: Pentru siguranța reconcilierii de casă, anularea este permisă strict dacă tura este încă deschisă, atât pentru casieri cât și pentru manageri/admini.
    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Tura în care s-a emis bonul este închisă sau anulată (status: %). Anularea bonului este blocată pentru a asigura integritatea reconcilierii de casă.', v_shift.status;
    END IF;

    IF NOT v_is_manager THEN
        -- Reguli stricte pentru casier
        IF v_sale.profile_id <> p_profile_id THEN
            RAISE EXCEPTION 'Casierii pot anula exclusiv propriile tranzacții.';
        END IF;

        IF v_shift.opened_by <> p_profile_id THEN
            RAISE EXCEPTION 'Tura activă nu a fost deschisă de tine. Nu poți anula bonuri din tura altui casier.';
        END IF;
    END IF;

    -- 5. Verificare dacă există deja un retur sau anulare pe acest bon
    IF EXISTS (SELECT 1 FROM public.sale_returns WHERE original_sale_id = p_sale_id AND status = 'completed') THEN
        RAISE EXCEPTION 'Există deja o operațiune de retur sau anulare finalizată pe acest bon.';
    END IF;

    -- 6. Creare antet sale_returns
    INSERT INTO public.sale_returns (
        store_id, original_sale_id, shift_id, profile_id, type, status, reason, total_refund, refund_method, notes
    ) VALUES (
        p_store_id, p_sale_id, v_sale.shift_id, p_profile_id, 'void', 'completed', v_clean_reason, v_sale.total, v_sale.payment_method, p_notes
    ) RETURNING id INTO v_return_id;

    -- 7. Procesare linii de bon și stocuri cu blocare FOR UPDATE
    FOR v_item IN (SELECT * FROM public.sale_items WHERE sale_id = p_sale_id AND store_id = p_store_id FOR UPDATE) LOOP
        -- Validare existență batch_id (fail-fast)
        IF v_item.batch_id IS NULL THEN
            RAISE EXCEPTION 'Eroare critică: Linia de bon % pentru produsul % nu are lot asociat (batch_id lipsă). Anularea nu poate reface stocul.', v_item.id, v_item.product_id;
        END IF;

        -- Inserare linie retur
        INSERT INTO public.sale_return_items (
            store_id, return_id, original_sale_item_id, product_id, batch_id, quantity, unit_price, total_item
        ) VALUES (
            p_store_id, v_return_id, v_item.id, v_item.product_id, v_item.batch_id, v_item.quantity, v_item.unit_price, v_item.total_item
        );

        -- Blocare lot FOR UPDATE și readucere cantitate în lotul original
        UPDATE public.stock_batches 
        SET quantity = quantity + v_item.quantity 
        WHERE id = v_item.batch_id AND store_id = p_store_id;

        -- Creare mișcare de stoc inversă
        INSERT INTO public.stock_movements (
            store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by
        ) VALUES (
            p_store_id, v_item.product_id, v_item.batch_id, 'void', v_item.quantity, 'customer', 'magazin', v_return_id, p_profile_id
        );
    END LOOP;

    -- 8. Actualizare status vânzare
    UPDATE public.sales SET status = 'voided' WHERE id = p_sale_id;

    -- 9. Înregistrare în audit logs
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
    VALUES (p_store_id, p_profile_id, 'sale.void', 'sale_returns', v_return_id, jsonb_build_object(
        'sale_id', p_sale_id,
        'total_refund', v_sale.total,
        'reason', v_clean_reason
    ));

    RETURN v_return_id;
END;
$$;

REVOKE ALL ON FUNCTION public.void_sale(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_sale(uuid, uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_sale(uuid, uuid, uuid, text, text) TO authenticated;

-- B. get_sale_void_eligibility (Consultare eligibilitate anulare totală bon)
CREATE OR REPLACE FUNCTION public.get_sale_void_eligibility(
    p_store_id uuid,
    p_profile_id uuid,
    p_sale_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_role boolean;
    v_is_manager boolean;
    v_sale record;
    v_shift record;
    v_items jsonb;
    v_payments jsonb;
    v_can_void boolean := false;
    v_reason_if_not text := NULL;
BEGIN
    -- 1. Validare permisiuni generale de acces (admin, manager, casier sau platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RETURN jsonb_build_object(
            'sale_id', p_sale_id,
            'can_void', false,
            'reason_if_not', 'Acces interzis: nu ai permisiunea de a accesa datele magazinului.'
        );
    END IF;

    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_is_manager;

    -- 2. Citire vânzare
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id AND store_id = p_store_id;
    IF v_sale IS NULL THEN
        RETURN jsonb_build_object(
            'sale_id', p_sale_id,
            'can_void', false,
            'reason_if_not', 'Vânzarea nu există sau nu aparține acestui magazin.'
        );
    END IF;

    -- 3. Citire tură
    SELECT * INTO v_shift FROM public.pos_shifts WHERE id = v_sale.shift_id;

    -- 4. Citire linii de bon
    SELECT jsonb_agg(jsonb_build_object(
        'sale_item_id', si.id,
        'product_id', si.product_id,
        'product_name', p.name,
        'barcode', p.barcode,
        'quantity', si.quantity,
        'unit_price', si.unit_price,
        'total_item', si.total_item,
        'batch_id', si.batch_id
    )) INTO v_items
    FROM public.sale_items si
    LEFT JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id;

    -- 5. Citire plăți
    SELECT jsonb_agg(jsonb_build_object(
        'id', pay.id,
        'method', pay.method,
        'amount', pay.amount
    )) INTO v_payments
    FROM public.payments pay
    WHERE pay.sale_id = p_sale_id;

    -- 6. Verificări de eligibilitate pentru void
    IF v_sale.status <> 'finalized' THEN
        v_can_void := false;
        v_reason_if_not := 'Doar vânzările finalizate pot fi anulate (status curent: ' || v_sale.status || ').';
    ELSIF v_sale.shift_id IS NULL THEN
        v_can_void := false;
        v_reason_if_not := 'Vânzarea nu este asociată unei ture de casă.';
    ELSIF v_shift IS NULL THEN
        v_can_void := false;
        v_reason_if_not := 'Tura asociată vânzării nu a putut fi identificată.';
    ELSIF v_shift.status <> 'open' THEN
        v_can_void := false;
        v_reason_if_not := 'Tura în care s-a emis bonul este închisă sau anulată. Anularea bonului este blocată pentru siguranța reconcilierii de casă.';
    ELSIF EXISTS (SELECT 1 FROM public.sale_returns WHERE original_sale_id = p_sale_id AND status = 'completed') THEN
        v_can_void := false;
        v_reason_if_not := 'Există deja o operațiune de retur sau anulare finalizată pe acest bon.';
    ELSIF NOT v_is_manager THEN
        -- Verificări specifice pentru casier
        IF v_sale.profile_id <> p_profile_id THEN
            v_can_void := false;
            v_reason_if_not := 'Casierii pot anula exclusiv propriile tranzacții.';
        ELSIF v_shift.opened_by <> p_profile_id THEN
            v_can_void := false;
            v_reason_if_not := 'Tura activă nu a fost deschisă de tine.';
        ELSE
            v_can_void := true;
        END IF;
    ELSE
        -- Managerii/Adminii pot anula dacă tura e deschisă
        v_can_void := true;
    END IF;

    RETURN jsonb_build_object(
        'sale_id', v_sale.id,
        'status', v_sale.status,
        'total', v_sale.total,
        'shift_id', v_sale.shift_id,
        'shift_status', CASE WHEN v_shift IS NOT NULL THEN v_shift.status ELSE 'unknown' END,
        'can_void', v_can_void,
        'reason_if_not', v_reason_if_not,
        'items_summary', COALESCE(v_items, '[]'::jsonb),
        'payments_summary', COALESCE(v_payments, '[]'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sale_void_eligibility(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sale_void_eligibility(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sale_void_eligibility(uuid, uuid, uuid) TO authenticated;
