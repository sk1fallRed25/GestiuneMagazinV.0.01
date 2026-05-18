-- ====================================================================
-- BLUEPRINT SQL: Sales Returns & Voids (Etapa 6B.1)
-- ====================================================================
-- ATENȚIE: ACEST SCRIPT ESTE UN BLUEPRINT DE PROIECTARE ARHITECTURALĂ.
-- NU SE APLICĂ AUTOMAT ÎN BAZA DE DATE ÎN ETAPA 6B.1.
-- ====================================================================

-- 1. TABELA PRINCIPALĂ: sale_returns
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

-- Indexuri pentru concurență și performanță
CREATE INDEX IF NOT EXISTS idx_sale_returns_store_id ON public.sale_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_original_sale_id ON public.sale_returns(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_shift_id ON public.sale_returns(shift_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_created_at ON public.sale_returns(created_at);

-- Activare RLS
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "has_store_role_sale_returns" ON public.sale_returns
    FOR ALL
    USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner', 'admin', 'manager', 'cashier']))
    WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner', 'admin', 'manager', 'cashier']));


-- 2. TABELA DE DETALII: sale_return_items
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

-- Indexuri
CREATE INDEX IF NOT EXISTS idx_sale_return_items_store_id ON public.sale_return_items(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_return_id ON public.sale_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_original_item ON public.sale_return_items(original_sale_item_id);

-- Activare RLS
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "has_store_role_sale_return_items" ON public.sale_return_items
    FOR ALL
    USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner', 'admin', 'manager', 'cashier']))
    WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner', 'admin', 'manager', 'cashier']));


-- 3. TABELA OPȚIONALĂ PENTRU ROBUSTEȚE: refund_payments
-- Oferă suport pentru plăți/rambursări mixte și trasabilitate financiară detaliată
CREATE TABLE IF NOT EXISTS public.refund_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
    method text NOT NULL CHECK (method IN ('cash', 'card', 'voucher')),
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_payments_store_id ON public.refund_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_refund_payments_return_id ON public.refund_payments(return_id);

ALTER TABLE public.refund_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "has_store_role_refund_payments" ON public.refund_payments
    FOR ALL
    USING (public.has_store_role(store_id, auth.uid(), ARRAY['owner', 'admin', 'manager', 'cashier']))
    WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['owner', 'admin', 'manager', 'cashier']));


-- ====================================================================
-- 4. PROPUNERI DE MODIFICARE A CONSTRÂNGERILOR EXISTENTE (ALTERS)
-- ====================================================================

-- A. Extinderea statusurilor pe tabela sales
-- Observație: În funcție de cum e definit statusul pe sales (check constraint sau enum),
-- blueprint-ul propune adăugarea valorilor: 'voided', 'partially_returned', 'returned'.
/*
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check 
    CHECK (status IN ('pending', 'finalized', 'cancelled', 'voided', 'partially_returned', 'returned'));
*/

-- B. Extinderea tipurilor de mișcări pe tabela stock_movements
-- Blueprint-ul propune adăugarea valorilor 'return' și 'void' pentru type.
/*
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_type_check 
    CHECK (type IN ('reception', 'transfer', 'waste', 'sale', 'adjustment', 'return', 'void'));
*/


-- ====================================================================
-- 5. PROCEDURI STOCATE (RPC-uri)
-- ====================================================================

-- A. void_sale (Anulare Totală a unei vânzări din tura curentă)
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
    v_sale record;
    v_shift record;
    v_return_id uuid;
    v_item record;
BEGIN
    -- 1. Validare permisiuni și existență vânzare
    IF NOT public.has_store_role(p_store_id, p_profile_id, ARRAY['owner', 'admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Acces refuzat: nu ai permisiunea de a anula vânzări.';
    END IF;

    -- Selectare și blocare vânzare FOR UPDATE
    SELECT * INTO v_sale FROM public.sales 
    WHERE id = p_sale_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Vânzarea nu există sau nu aparține acestui magazin.';
    END IF;

    IF v_sale.status <> 'finalized' THEN
        RAISE EXCEPTION 'Doar vânzările finalizate pot fi anulate (status curent: %).', v_sale.status;
    END IF;

    -- 2. Validare tură activă (pentru casieri, anularea se face obligatoriu în tura în care s-a vândut)
    -- Dacă utilizatorul este casier (nu admin/manager), verificăm tura
    IF NOT public.has_store_role(p_store_id, p_profile_id, ARRAY['owner', 'admin', 'manager']) THEN
        -- Verifică dacă tura pe care s-a făcut vânzarea este încă deschisă
        SELECT * INTO v_shift FROM public.pos_shifts WHERE id = v_sale.shift_id AND status = 'open';
        IF v_shift IS NULL THEN
            RAISE EXCEPTION 'Casierii pot anula doar vânzări din tura curentă deschisă.';
        END IF;
    END IF;

    -- 3. Verificare dacă există deja un retur sau anulare pe acest bon
    IF EXISTS (SELECT 1 FROM public.sale_returns WHERE original_sale_id = p_sale_id AND status = 'completed') THEN
        RAISE EXCEPTION 'Există deja o operațiune de retur sau anulare pe această vânzare.';
    END IF;

    -- 4. Creare antet sale_returns
    INSERT INTO public.sale_returns (
        store_id, original_sale_id, shift_id, profile_id, type, status, reason, total_refund, refund_method, notes
    ) VALUES (
        p_store_id, p_sale_id, v_sale.shift_id, p_profile_id, 'void', 'completed', p_reason, v_sale.total, v_sale.payment_method, p_notes
    ) RETURNING id INTO v_return_id;

    -- 5. Procesare linii și stocuri
    FOR v_item IN (SELECT * FROM public.sale_items WHERE sale_id = p_sale_id AND store_id = p_store_id FOR UPDATE) LOOP
        -- Inserare linie retur
        INSERT INTO public.sale_return_items (
            store_id, return_id, original_sale_item_id, product_id, batch_id, quantity, unit_price, total_item
        ) VALUES (
            p_store_id, v_return_id, v_item.id, v_item.product_id, v_item.batch_id, v_item.quantity, v_item.unit_price, v_item.total_item
        );

        -- Readucere stoc în lotul original (dacă batch_id există)
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.stock_batches 
            SET quantity = quantity + v_item.quantity 
            WHERE id = v_item.batch_id AND store_id = p_store_id;
        END IF;

        -- Creare mișcare de stoc inversă
        INSERT INTO public.stock_movements (
            store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by
        ) VALUES (
            p_store_id, v_item.product_id, v_item.batch_id, 'void', v_item.quantity, 'customer', 'magazin', v_return_id, p_profile_id
        );
    END LOOP;

    -- 6. Actualizare status vânzare
    UPDATE public.sales SET status = 'voided' WHERE id = p_sale_id;

    -- 7. Înregistrare în audit logs
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
    VALUES (p_store_id, p_profile_id, 'sale.void', 'sale_returns', v_return_id, jsonb_build_object(
        'sale_id', p_sale_id,
        'total_refund', v_sale.total,
        'reason', p_reason
    ));

    RETURN v_return_id;
END;
$$;

REVOKE ALL ON FUNCTION public.void_sale(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_sale(uuid, uuid, uuid, text, text) TO authenticated;


-- B. return_sale_items (Retur Parțial sau Total)
CREATE OR REPLACE FUNCTION public.return_sale_items(
    p_store_id uuid,
    p_profile_id uuid,
    p_sale_id uuid,
    p_items jsonb, -- Array de obiecte: [{"sale_item_id": "uuid", "quantity": 1.5}]
    p_reason text,
    p_refund_method text,
    p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale record;
    v_return_id uuid;
    v_elem jsonb;
    v_item_id uuid;
    v_ret_qty numeric(12,3);
    v_sale_item record;
    v_already_ret numeric(12,3);
    v_refund_item numeric(12,2);
    v_total_refund numeric(12,2) := 0;
    v_all_fully_returned boolean := true;
BEGIN
    -- 1. Validare permisiuni
    IF NOT public.has_store_role(p_store_id, p_profile_id, ARRAY['owner', 'admin', 'manager']) THEN
        RAISE EXCEPTION 'Acces refuzat: doar managerii sau administratorii pot înregistra retururi parțiale/totale.';
    END IF;

    -- 2. Blocare vânzare FOR UPDATE
    SELECT * INTO v_sale FROM public.sales 
    WHERE id = p_sale_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Vânzarea nu există sau nu aparține acestui magazin.';
    END IF;

    IF v_sale.status NOT IN ('finalized', 'partially_returned') THEN
        RAISE EXCEPTION 'Returul nu este permis pentru bonuri cu status: %', v_sale.status;
    END IF;

    -- 3. Creare antet sale_returns
    INSERT INTO public.sale_returns (
        store_id, original_sale_id, shift_id, profile_id, type, status, reason, total_refund, refund_method, notes
    ) VALUES (
        p_store_id, p_sale_id, v_sale.shift_id, p_profile_id, 'return', 'completed', p_reason, 0, p_refund_method, p_notes
    ) RETURNING id INTO v_return_id;

    -- 4. Procesare fiecare element din p_items
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_item_id := (v_elem->>'sale_item_id')::uuid;
        v_ret_qty := (v_elem->>'quantity')::numeric(12,3);

        IF v_ret_qty <= 0 THEN
            RAISE EXCEPTION 'Cantitatea returnată trebuie să fie pozitivă.';
        END IF;

        -- Selectare linie bon FOR UPDATE
        SELECT * INTO v_sale_item FROM public.sale_items WHERE id = v_item_id AND sale_id = p_sale_id FOR UPDATE;
        IF v_sale_item IS NULL THEN
            RAISE EXCEPTION 'Linia de bon % nu există în vânzarea %.', v_item_id, p_sale_id;
        END IF;

        -- Calcul cantitate deja returnată anterior pe această linie
        SELECT COALESCE(SUM(quantity), 0) INTO v_already_ret 
        FROM public.sale_return_items 
        WHERE original_sale_item_id = v_item_id;

        IF v_ret_qty > (v_sale_item.quantity - v_already_ret) THEN
            RAISE EXCEPTION 'Cantitatea returnată (%) depășește cantitatea disponibilă pentru retur (%).', 
                v_ret_qty, (v_sale_item.quantity - v_already_ret);
        END IF;

        -- Calcul valoare rambursată pe linie
        v_refund_item := round(v_ret_qty * v_sale_item.unit_price, 2);
        v_total_refund := v_total_refund + v_refund_item;

        -- Inserare linie retur
        INSERT INTO public.sale_return_items (
            store_id, return_id, original_sale_item_id, product_id, batch_id, quantity, unit_price, total_item
        ) VALUES (
            p_store_id, v_return_id, v_item_id, v_sale_item.product_id, v_sale_item.batch_id, v_ret_qty, v_sale_item.unit_price, v_refund_item
        );

        -- Readucere stoc pe lot
        IF v_sale_item.batch_id IS NOT NULL THEN
            UPDATE public.stock_batches 
            SET quantity = quantity + v_ret_qty 
            WHERE id = v_sale_item.batch_id AND store_id = p_store_id;
        END IF;

        -- Creare mișcare stoc
        INSERT INTO public.stock_movements (
            store_id, product_id, batch_id, type, quantity, source_zone, target_zone, reference_id, created_by
        ) VALUES (
            p_store_id, v_sale_item.product_id, v_sale_item.batch_id, 'return', v_ret_qty, 'customer', 'magazin', v_return_id, p_profile_id
        );
    END LOOP;

    -- 5. Actualizare total refund pe antet
    UPDATE public.sale_returns SET total_refund = v_total_refund WHERE id = v_return_id;

    -- 6. Verificare dacă bonul a fost returnat complet sau parțial
    FOR v_sale_item IN (SELECT id, quantity FROM public.sale_items WHERE sale_id = p_sale_id) LOOP
        SELECT COALESCE(SUM(quantity), 0) INTO v_already_ret 
        FROM public.sale_return_items 
        WHERE original_sale_item_id = v_sale_item.id;

        IF v_already_ret < v_sale_item.quantity THEN
            v_all_fully_returned := false;
        END IF;
    END LOOP;

    IF v_all_fully_returned THEN
        UPDATE public.sales SET status = 'returned' WHERE id = p_sale_id;
    ELSE
        UPDATE public.sales SET status = 'partially_returned' WHERE id = p_sale_id;
    END IF;

    -- 7. Audit log
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
    VALUES (p_store_id, p_profile_id, 'sale.return', 'sale_returns', v_return_id, jsonb_build_object(
        'sale_id', p_sale_id,
        'total_refund', v_total_refund,
        'items', p_items,
        'reason', p_reason
    ));

    RETURN v_return_id;
END;
$$;

REVOKE ALL ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.return_sale_items(uuid, uuid, uuid, jsonb, text, text, text) TO authenticated;


-- C. get_sale_return_eligibility (Verificare Eligibilitate și Stare Vânzare pentru Retur)
CREATE OR REPLACE FUNCTION public.get_sale_return_eligibility(
    p_store_id uuid,
    p_sale_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale record;
    v_shift record;
    v_items jsonb;
    v_payments jsonb;
    v_can_void boolean := false;
    v_can_return boolean := false;
BEGIN
    -- 1. Citire vânzare
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id AND store_id = p_store_id;
    IF v_sale IS NULL THEN
        RETURN jsonb_build_object('error', 'Vânzarea nu există.');
    END IF;

    -- 2. Citire stare tură
    SELECT * INTO v_shift FROM public.pos_shifts WHERE id = v_sale.shift_id;

    -- 3. Citire linii și calcul cantități returnabile
    SELECT jsonb_agg(jsonb_build_object(
        'sale_item_id', si.id,
        'product_id', si.product_id,
        'product_name', p.name,
        'barcode', p.barcode,
        'quantity_sold', si.quantity,
        'unit_price', si.unit_price,
        'total_item', si.total_item,
        'batch_id', si.batch_id,
        'quantity_returned', COALESCE((
            SELECT SUM(sri.quantity) FROM public.sale_return_items sri WHERE sri.original_sale_item_id = si.id
        ), 0),
        'quantity_available_to_return', si.quantity - COALESCE((
            SELECT SUM(sri.quantity) FROM public.sale_return_items sri WHERE sri.original_sale_item_id = si.id
        ), 0)
    )) INTO v_items
    FROM public.sale_items si
    LEFT JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id;

    -- 4. Citire plăți
    SELECT jsonb_agg(jsonb_build_object(
        'id', pay.id,
        'method', pay.method,
        'amount', pay.amount
    )) INTO v_payments
    FROM public.payments pay
    WHERE pay.sale_id = p_sale_id;

    -- 5. Determinare reguli de eligibilitate
    IF v_sale.status = 'finalized' THEN
        -- Void este permis dacă tura e încă deschisă
        IF v_shift IS NOT NULL AND v_shift.status = 'open' THEN
            v_can_void := true;
        END IF;
        v_can_return := true;
    ELSIF v_sale.status = 'partially_returned' THEN
        v_can_return := true;
    END IF;

    RETURN jsonb_build_object(
        'sale_id', v_sale.id,
        'created_at', v_sale.created_at,
        'total', v_sale.total,
        'status', v_sale.status,
        'payment_method', v_sale.payment_method,
        'shift_id', v_sale.shift_id,
        'shift_status', v_shift.status,
        'items', v_items,
        'payments', v_payments,
        'allowed_operations', jsonb_build_object(
            'can_void', v_can_void,
            'can_return', v_can_return
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sale_return_eligibility(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sale_return_eligibility(uuid, uuid) TO authenticated;
