-- ############################################################################
-- HOTFIX SQL: Commercial Reports Minimal Hotfix (Etapa 6C.2.2A)
-- Project: Gestiune Magazin v2
--
-- SCOP:
-- - Remediază erorile runtime din get_shift_report și get_losses_report.
-- - Nu modifică tabele, nu adaugă/șterge date, nu alterează fluxuri.
-- - Se aplică manual în Supabase SQL Editor.
-- - Configurează securitatea (SECURITY DEFINER, SET search_path = public).
-- - Aplică GRANT/REVOKE defensive pentru toate cele 6 RPC-uri comerciale.
-- ############################################################################

-- ============================================================================
-- 1. HOTFIX: public.get_shift_report
-- Rezolvă: "subquery in FROM must have an alias" și ORDER BY invalid în jsonb_agg.
-- Permite casierului să își vadă propria tură, iar admin/manager/platform_owner oricare.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shift_report(
    p_store_id UUID,
    p_shift_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_has_role BOOLEAN;
    v_shift RECORD;
    v_cash_sales DECIMAL(12,2) := 0;
    v_cash_returns DECIMAL(12,2) := 0;
    v_card_sales DECIMAL(12,2) := 0;
    v_card_returns DECIMAL(12,2) := 0;
    v_expected_cash DECIMAL(12,2) := 0;
    v_transactions_count INT := 0;
    v_voids_count INT := 0;
    v_returns_count INT := 0;
    v_sales_summary JSONB;
BEGIN
    -- Validare permisiuni magazin (admin, manager sau platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    
    -- Selectare date tură
    SELECT s.*, prof.full_name as cashier_name, cr.name as register_name 
    INTO v_shift
    FROM public.pos_shifts s
    JOIN public.profiles prof ON prof.id = s.opened_by
    LEFT JOIN public.cash_registers cr ON cr.id = s.cash_register_id
    WHERE s.id = p_shift_id AND s.store_id = p_store_id;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Tura nu există sau nu aparține magazinului selectat.';
    END IF;

    -- Dacă utilizatorul este casier (nu are rol admin/manager/platform_owner), poate accesa doar propria sa tură
    IF NOT v_has_role AND v_shift.opened_by <> auth.uid() THEN
        RAISE EXCEPTION 'Acces interzis: casierii pot vedea doar propriul raport de tură.';
    END IF;

    -- Calcul vânzări brute cash în această tură (indiferent de statusul post-vânzare)
    SELECT COALESCE(SUM(pay.amount), 0)
    INTO v_cash_sales
    FROM public.payments pay
    JOIN public.sales s ON s.id = pay.sale_id
    WHERE s.shift_id = p_shift_id
      AND pay.method = 'cash'
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    -- Calcul retururi cash rambursate în această tură
    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_cash_returns
    FROM public.sale_returns sr
    WHERE sr.shift_id = p_shift_id
      AND sr.type = 'return'
      AND sr.refund_method = 'cash'
      AND sr.status = 'completed';

    -- Calcul vânzări card în această tură
    SELECT COALESCE(SUM(pay.amount), 0)
    INTO v_card_sales
    FROM public.payments pay
    JOIN public.sales s ON s.id = pay.sale_id
    WHERE s.shift_id = p_shift_id
      AND pay.method = 'card'
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    -- Calcul retururi card rambursate în această tură
    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_card_returns
    FROM public.sale_returns sr
    WHERE sr.shift_id = p_shift_id
      AND sr.type = 'return'
      AND sr.refund_method = 'card'
      AND sr.status = 'completed';

    -- Contorizare tranzacții, anulări (voids) și retururi
    SELECT COUNT(s.id) INTO v_transactions_count FROM public.sales s WHERE s.shift_id = p_shift_id AND s.status IN ('finalized', 'partially_returned', 'returned');
    SELECT COUNT(sr.id) INTO v_voids_count FROM public.sale_returns sr WHERE sr.shift_id = p_shift_id AND sr.type = 'void' AND sr.status = 'completed';
    SELECT COUNT(sr.id) INTO v_returns_count FROM public.sale_returns sr WHERE sr.shift_id = p_shift_id AND sr.type = 'return' AND sr.status = 'completed';

    -- Calcul sold cash așteptat (opening_cash + cash_sales - cash_returns)
    v_expected_cash := v_shift.opening_cash + v_cash_sales - v_cash_returns;

    -- Listă sumară a vânzărilor din tură (sortată descrescător după data creării)
    SELECT jsonb_agg(to_jsonb(sales_list)) INTO v_sales_summary
    FROM (
        SELECT 
            s.id as "saleId",
            s.created_at as "createdAt",
            s.total as "total",
            s.payment_method as "paymentMethod",
            s.status as "status"
        FROM public.sales s
        WHERE s.shift_id = p_shift_id
        ORDER BY s.created_at DESC
    ) sales_list;

    RETURN jsonb_build_object(
        'shiftId', v_shift.id,
        'cashierName', v_shift.cashier_name,
        'registerName', v_shift.register_name,
        'status', v_shift.status,
        'openedAt', v_shift.opened_at,
        'closedAt', v_shift.closed_at,
        'openingCash', v_shift.opening_cash,
        'cashSales', v_cash_sales,
        'cashReturns', v_cash_returns,
        'expectedCash', v_expected_cash,
        'declaredCash', v_shift.declared_cash,
        'cashDifference', COALESCE(v_shift.declared_cash - v_expected_cash, 0),
        'cardSales', v_card_sales,
        'cardReturns', v_card_returns,
        'transactionsCount', v_transactions_count,
        'voidsCount', v_voids_count,
        'returnsCount', v_returns_count,
        'salesList', COALESCE(v_sales_summary, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 2. HOTFIX: public.get_losses_report
-- Rezolvă: "aggregate function calls cannot be nested" prin pre-agregare în CTE.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_losses_report(
    p_store_id UUID,
    p_date_from DATE,
    p_date_to DATE
) RETURNS JSONB AS $$
DECLARE
    v_has_role BOOLEAN;
    v_total_waste_qty NUMERIC := 0;
    v_estimated_waste_val NUMERIC := 0;
    v_by_reason JSONB;
    v_by_product JSONB;
    v_tz_from TIMESTAMPTZ;
    v_tz_to TIMESTAMPTZ;
BEGIN
    -- Validare permisiuni magazin (admin, manager sau platform_owner)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: permisiuni insuficiente pentru vizualizarea rapoartelor.';
    END IF;

    -- Convertește datele de intrare acoperind integral zilele selectate
    v_tz_from := p_date_from::TIMESTAMPTZ;
    v_tz_to := (p_date_to + INTERVAL '1 day' - INTERVAL '1 millisecond')::TIMESTAMPTZ;

    -- Cantitate totală și valoare totală estimată a pierderilor (la cost de achiziție)
    SELECT 
        COALESCE(SUM(wi.quantity), 0),
        COALESCE(SUM(wi.quantity * COALESCE(sb.purchase_price, pp.price_purchase, 0)), 0)
    INTO
        v_total_waste_qty,
        v_estimated_waste_val
    FROM public.waste_items wi
    JOIN public.waste_events we ON we.id = wi.waste_id
    LEFT JOIN public.stock_batches sb ON sb.id = wi.batch_id
    LEFT JOIN public.product_prices pp ON pp.product_id = wi.product_id AND pp.store_id = p_store_id
    WHERE we.store_id = p_store_id
      AND we.created_at >= v_tz_from
      AND we.created_at <= v_tz_to;

    -- Distribuție pierderi după motiv (Reason) folosind CTE pentru a evita agregările imbricate
    WITH reason_agg AS (
        SELECT 
            we.reason as r_reason,
            COUNT(DISTINCT we.id) as r_events_count,
            SUM(wi.quantity) as r_quantity,
            SUM(wi.quantity * COALESCE(sb.purchase_price, pp.price_purchase, 0)) as r_val
        FROM public.waste_items wi
        JOIN public.waste_events we ON we.id = wi.waste_id
        LEFT JOIN public.stock_batches sb ON sb.id = wi.batch_id
        LEFT JOIN public.product_prices pp ON pp.product_id = wi.product_id AND pp.store_id = p_store_id
        WHERE we.store_id = p_store_id
          AND we.created_at >= v_tz_from
          AND we.created_at <= v_tz_to
        GROUP BY we.reason
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'reason', r_reason,
            'eventsCount', r_events_count,
            'quantity', r_quantity,
            'estimatedValue', r_val
        )
    ) INTO v_by_reason
    FROM reason_agg;

    -- Top produse casate / pierdute folosind CTE pentru a evita agregările imbricate
    WITH prod_agg AS (
        SELECT 
            p.id as p_id,
            p.name as p_name,
            p.barcode as p_barcode,
            p.unit as p_unit,
            SUM(wi.quantity) as p_quantity,
            SUM(wi.quantity * COALESCE(sb.purchase_price, pp.price_purchase, 0)) as p_val
        FROM public.waste_items wi
        JOIN public.waste_events we ON we.id = wi.waste_id
        JOIN public.products p ON p.id = wi.product_id
        LEFT JOIN public.stock_batches sb ON sb.id = wi.batch_id
        LEFT JOIN public.product_prices pp ON pp.product_id = wi.product_id AND pp.store_id = p_store_id
        WHERE we.store_id = p_store_id
          AND we.created_at >= v_tz_from
          AND we.created_at <= v_tz_to
        GROUP BY p.id, p.name, p.barcode, p.unit
        ORDER BY p_val DESC
        LIMIT 20
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'productId', p_id,
            'name', p_name,
            'barcode', p_barcode,
            'quantity', p_quantity,
            'unit', p_unit,
            'estimatedValue', p_val
        )
    ) INTO v_by_product
    FROM prod_agg;

    RETURN jsonb_build_object(
        'totalWasteQuantity', v_total_waste_qty,
        'estimatedWasteValue', v_estimated_waste_val,
        'byReason', COALESCE(v_by_reason, '[]'::jsonb),
        'byProduct', COALESCE(v_by_product, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 3. GRANTS DEFENSIVE PENTRU CELE 2 RPC-URI MODIFICATE
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_shift_report(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_shift_report(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_shift_report(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_losses_report(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_losses_report(UUID, DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_losses_report(UUID, DATE, DATE) TO authenticated;


-- ============================================================================
-- 4. GRANTS DEFENSIVE GENERALE PENTRU TOATE CELE 6 RPC-URI COMERCIALE
-- Asigură eliminarea warning-urilor de securitate de tip "SECURITY DEFINER executabil de anon/PUBLIC"
-- ============================================================================

-- A. get_sales_summary_report
REVOKE ALL ON FUNCTION public.get_sales_summary_report(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_summary_report(UUID, DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sales_summary_report(UUID, DATE, DATE) TO authenticated;

-- B. get_product_performance_report
REVOKE ALL ON FUNCTION public.get_product_performance_report(UUID, DATE, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_performance_report(UUID, DATE, DATE, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_performance_report(UUID, DATE, DATE, INT) TO authenticated;

-- C. get_shift_report
REVOKE ALL ON FUNCTION public.get_shift_report(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_shift_report(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_shift_report(UUID, UUID) TO authenticated;

-- D. get_daily_cash_report
REVOKE ALL ON FUNCTION public.get_daily_cash_report(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_daily_cash_report(UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_daily_cash_report(UUID, DATE) TO authenticated;

-- E. get_inventory_value_report
REVOKE ALL ON FUNCTION public.get_inventory_value_report(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inventory_value_report(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_value_report(UUID) TO authenticated;

-- F. get_losses_report
REVOKE ALL ON FUNCTION public.get_losses_report(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_losses_report(UUID, DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_losses_report(UUID, DATE, DATE) TO authenticated;
