-- ############################################################################
-- BLUEPRINT SQL: Commercial Reports Upgrade Hardened (Etapa 6C.2)
-- Project: Gestiune Magazin v2
--
-- IMPORTANT: Acest script reprezintă versiunea FINALĂ RAFIANATĂ a blueprint-ului.
-- NU SE APLICĂ în baza de date în această etapă (Nu aplica SQL).
-- Toate funcțiile sunt SECURITY DEFINER, au search_path = public și RLS strict.
-- ############################################################################

-- ============================================================================
-- A. RPC: get_sales_summary_report
-- Sintetizează principalii indicatori financiari ai vânzărilor într-un interval.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sales_summary_report(
    p_store_id UUID,
    p_date_from DATE,
    p_date_to DATE
) RETURNS JSONB AS $$
DECLARE
    v_has_role BOOLEAN;
    v_gross_sales DECIMAL(12,2) := 0;
    v_void_amount DECIMAL(12,2) := 0;
    v_return_amount DECIMAL(12,2) := 0;
    v_net_sales DECIMAL(12,2) := 0;
    
    v_cash_gross DECIMAL(12,2) := 0;
    v_cash_refunds DECIMAL(12,2) := 0;
    v_net_cash DECIMAL(12,2) := 0;
    
    v_card_gross DECIMAL(12,2) := 0;
    v_card_refunds DECIMAL(12,2) := 0;
    v_net_card DECIMAL(12,2) := 0;
    
    v_voucher_refunds DECIMAL(12,2) := 0;
    
    v_sales_count INT := 0;
    v_void_count INT := 0;
    v_return_count INT := 0;
    v_average_basket DECIMAL(12,2) := 0;
    v_active_shift_count INT := 0;
    
    v_tz_from TIMESTAMPTZ;
    v_tz_to TIMESTAMPTZ;
BEGIN
    -- 1. Validare permisiuni (admin, manager sau platform_owner)
    -- Nu folosim roluri nespecifice (owner, cashier)
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: permisiuni insuficiente pentru vizualizarea rapoartelor.';
    END IF;

    -- Convertește datele la timestamptz acoperind întreaga zi
    v_tz_from := p_date_from::TIMESTAMPTZ;
    v_tz_to := (p_date_to + INTERVAL '1 day' - INTERVAL '1 millisecond')::TIMESTAMPTZ;

    -- 2. Vânzări Brute (Gross Sales) și Numar Vânzări
    -- Exclude bonurile anulate (voided) sau anulate înainte de finalizare (cancelled)
    SELECT COALESCE(SUM(s.total), 0), COUNT(s.id)
    INTO v_gross_sales, v_sales_count
    FROM public.sales s
    WHERE s.store_id = p_store_id
      AND s.created_at >= v_tz_from
      AND s.created_at <= v_tz_to
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    -- 3. Anulări (Voids)
    SELECT COALESCE(SUM(sr.total_refund), 0), COUNT(sr.id)
    INTO v_void_amount, v_void_count
    FROM public.sale_returns sr
    WHERE sr.store_id = p_store_id
      AND sr.created_at >= v_tz_from
      AND sr.created_at <= v_tz_to
      AND sr.type = 'void'
      AND sr.status = 'completed';

    -- 4. Retururi (Returns)
    SELECT COALESCE(SUM(sr.total_refund), 0), COUNT(sr.id)
    INTO v_return_amount, v_return_count
    FROM public.sale_returns sr
    WHERE sr.store_id = p_store_id
      AND sr.created_at >= v_tz_from
      AND sr.created_at <= v_tz_to
      AND sr.type = 'return'
      AND sr.status = 'completed';

    -- 5. Vânzări Nete (Net Sales)
    v_net_sales := v_gross_sales - v_return_amount;

    -- 6. Plăți Brute Cash și Card
    SELECT COALESCE(SUM(pay.amount), 0)
    INTO v_cash_gross
    FROM public.payments pay
    JOIN public.sales s ON s.id = pay.sale_id
    WHERE s.store_id = p_store_id
      AND s.created_at >= v_tz_from
      AND s.created_at <= v_tz_to
      AND pay.method = 'cash'
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    SELECT COALESCE(SUM(pay.amount), 0)
    INTO v_card_gross
    FROM public.payments pay
    JOIN public.sales s ON s.id = pay.sale_id
    WHERE s.store_id = p_store_id
      AND s.created_at >= v_tz_from
      AND s.created_at <= v_tz_to
      AND pay.method = 'card'
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    -- 7. Rambursări Cash, Card și Voucher pe Retururi
    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_cash_refunds
    FROM public.sale_returns sr
    WHERE sr.store_id = p_store_id
      AND sr.created_at >= v_tz_from
      AND sr.created_at <= v_tz_to
      AND sr.type = 'return'
      AND sr.refund_method = 'cash'
      AND sr.status = 'completed';

    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_card_refunds
    FROM public.sale_returns sr
    WHERE sr.store_id = p_store_id
      AND sr.created_at >= v_tz_from
      AND sr.created_at <= v_tz_to
      AND sr.type = 'return'
      AND sr.refund_method = 'card'
      AND sr.status = 'completed';

    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_voucher_refunds
    FROM public.sale_returns sr
    WHERE sr.store_id = p_store_id
      AND sr.created_at >= v_tz_from
      AND sr.created_at <= v_tz_to
      AND sr.type = 'return'
      AND sr.refund_method = 'voucher'
      AND sr.status = 'completed';

    -- 8. Totale Nete Cash și Card
    v_net_cash := v_cash_gross - v_cash_refunds;
    v_net_card := v_card_gross - v_card_refunds;

    -- 9. Coș Mediu
    IF v_sales_count > 0 THEN
        v_average_basket := ROUND(v_net_sales / v_sales_count, 2);
    END IF;

    -- 10. Ture active/închise în perioadă
    SELECT COUNT(ps.id)
    INTO v_active_shift_count
    FROM public.pos_shifts ps
    WHERE ps.store_id = p_store_id
      AND ps.opened_at >= v_tz_from
      AND ps.opened_at <= v_tz_to
      AND ps.status IN ('open', 'closed');

    -- Returnare rezultat JSONB structurat
    RETURN jsonb_build_object(
        'grossSales', v_gross_sales,
        'voidAmount', v_void_amount,
        'returnAmount', v_return_amount,
        'netSales', v_net_sales,
        'cashGross', v_cash_gross,
        'cashRefunds', v_cash_refunds,
        'netCash', v_net_cash,
        'cardGross', v_card_gross,
        'cardRefunds', v_card_refunds,
        'netCard', v_net_card,
        'voucherRefunds', v_voucher_refunds,
        'salesCount', v_sales_count,
        'voidCount', v_void_count,
        'returnCount', v_return_count,
        'averageBasket', v_average_basket,
        'activeShiftCount', v_active_shift_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_sales_summary_report(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_summary_report(UUID, DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sales_summary_report(UUID, DATE, DATE) TO authenticated;


-- ============================================================================
-- B. RPC: get_product_performance_report
-- Afișează performanța produselor pe baza cantităților și profitului net sub formă de JSON.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_product_performance_report(
    p_store_id UUID,
    p_date_from DATE,
    p_date_to DATE,
    p_limit INT DEFAULT 20
) RETURNS JSONB AS $$
DECLARE
    v_has_role BOOLEAN;
    v_tz_from TIMESTAMPTZ;
    v_tz_to TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- 1. Validare permisiuni
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis: permisiuni insuficiente.';
    END IF;

    v_tz_from := p_date_from::TIMESTAMPTZ;
    v_tz_to := (p_date_to + INTERVAL '1 day' - INTERVAL '1 millisecond')::TIMESTAMPTZ;

    WITH item_returns AS (
        SELECT 
            sri.original_sale_item_id,
            SUM(sri.quantity) as qty_ret,
            SUM(sri.total_item) as val_ret
        FROM public.sale_return_items sri
        JOIN public.sale_returns sr ON sr.id = sri.return_id
        WHERE sr.store_id = p_store_id
          AND sr.status = 'completed'
          AND sr.created_at >= v_tz_from
          AND sr.created_at <= v_tz_to
        GROUP BY sri.original_sale_item_id
    ),
    aggregated_sales AS (
        SELECT 
            si.product_id,
            SUM(si.quantity) as qty_gross,
            SUM(COALESCE(r.qty_ret, 0)) as qty_ret,
            SUM(si.total_item) as rev_gross,
            SUM(COALESCE(r.val_ret, 0)) as rev_ret,
            -- Calcul COGS pe baza costului de lot din stock_batches sau prețul din product_prices
            SUM(
                (si.quantity - COALESCE(r.qty_ret, 0)) * 
                COALESCE(sb.purchase_price, pp.price_purchase, 0)
            ) as cogs_net
        FROM public.sale_items si
        JOIN public.sales s ON s.id = si.sale_id
        LEFT JOIN public.stock_batches sb ON sb.id = si.batch_id
        LEFT JOIN public.product_prices pp ON pp.product_id = si.product_id AND pp.store_id = p_store_id
        LEFT JOIN item_returns r ON r.original_sale_item_id = si.id
        WHERE s.store_id = p_store_id
          AND s.created_at >= v_tz_from
          AND s.created_at <= v_tz_to
          AND s.status IN ('finalized', 'partially_returned', 'returned')
        GROUP BY si.product_id
    ),
    perf_data AS (
        SELECT 
            p.id as "productId",
            p.name as "name",
            p.barcode as "barcode",
            COALESCE(a.qty_gross, 0)::NUMERIC as "quantitySoldGross",
            COALESCE(a.qty_ret, 0)::NUMERIC as "quantityReturned",
            (COALESCE(a.qty_gross, 0) - COALESCE(a.qty_ret, 0))::NUMERIC as "quantitySoldNet",
            COALESCE(a.rev_gross, 0)::NUMERIC as "grossRevenue",
            COALESCE(a.rev_ret, 0)::NUMERIC as "returnedRevenue",
            (COALESCE(a.rev_gross, 0) - COALESCE(a.rev_ret, 0))::NUMERIC as "netRevenue",
            COALESCE(a.cogs_net, 0)::NUMERIC as "estimatedCogs",
            ((COALESCE(a.rev_gross, 0) - COALESCE(a.rev_ret, 0)) - COALESCE(a.cogs_net, 0))::NUMERIC as "estimatedProfit",
            (
                CASE 
                    WHEN (COALESCE(a.rev_gross, 0) - COALESCE(a.rev_ret, 0)) > 0 THEN
                        ROUND(
                            (((COALESCE(a.rev_gross, 0) - COALESCE(a.rev_ret, 0)) - COALESCE(a.cogs_net, 0)) / 
                            (COALESCE(a.rev_gross, 0) - COALESCE(a.rev_ret, 0)) * 100), 2
                        )
                    ELSE 0
                END
            )::NUMERIC as "marginPercent"
        FROM public.products p
        JOIN aggregated_sales a ON a.product_id = p.id
        WHERE p.store_id = p_store_id
        ORDER BY "netRevenue" DESC
        LIMIT p_limit
    )
    SELECT jsonb_build_object('products', COALESCE(jsonb_agg(to_jsonb(pd)), '[]'::jsonb))
    INTO v_result
    FROM perf_data pd;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_product_performance_report(UUID, DATE, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_performance_report(UUID, DATE, DATE, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_performance_report(UUID, DATE, DATE, INT) TO authenticated;


-- ============================================================================
-- C. RPC: get_shift_report
-- Detalii financiare complete per tură, corectând excluderea vânzărilor returnate.
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
    -- 1. Validare permisiuni magazin
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    
    -- Selectare tură
    SELECT s.*, prof.full_name as cashier_name, cr.name as register_name 
    INTO v_shift
    FROM public.pos_shifts s
    JOIN public.profiles prof ON prof.id = s.opened_by
    LEFT JOIN public.cash_registers cr ON cr.id = s.cash_register_id
    WHERE s.id = p_shift_id AND s.store_id = p_store_id;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Tura nu există sau nu aparține magazinului selectat.';
    END IF;

    -- Dacă utilizatorul este casier, poate accesa doar propria tură
    IF NOT v_has_role AND v_shift.opened_by <> auth.uid() THEN
        RAISE EXCEPTION 'Acces interzis: casierii pot vedea doar propriul raport de tură.';
    END IF;

    -- 2. Calcul vânzări brute cash în această tură (indiferent de statusul post-vânzare)
    SELECT COALESCE(SUM(pay.amount), 0)
    INTO v_cash_sales
    FROM public.payments pay
    JOIN public.sales s ON s.id = pay.sale_id
    WHERE s.shift_id = p_shift_id
      AND pay.method = 'cash'
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    -- 3. Calcul retururi cash rambursate în această tură
    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_cash_returns
    FROM public.sale_returns sr
    WHERE sr.shift_id = p_shift_id
      AND sr.type = 'return'
      AND sr.refund_method = 'cash'
      AND sr.status = 'completed';

    -- 4. Calcul card
    SELECT COALESCE(SUM(pay.amount), 0)
    INTO v_card_sales
    FROM public.payments pay
    JOIN public.sales s ON s.id = pay.sale_id
    WHERE s.shift_id = p_shift_id
      AND pay.method = 'card'
      AND s.status IN ('finalized', 'partially_returned', 'returned');

    SELECT COALESCE(SUM(sr.total_refund), 0)
    INTO v_card_returns
    FROM public.sale_returns sr
    WHERE sr.shift_id = p_shift_id
      AND sr.type = 'return'
      AND sr.refund_method = 'card'
      AND sr.status = 'completed';

    -- 5. Tranzacții, anulări și retururi contorizate
    SELECT COUNT(s.id) INTO v_transactions_count FROM public.sales s WHERE s.shift_id = p_shift_id AND s.status IN ('finalized', 'partially_returned', 'returned');
    SELECT COUNT(sr.id) INTO v_voids_count FROM public.sale_returns sr WHERE sr.shift_id = p_shift_id AND sr.type = 'void' AND sr.status = 'completed';
    SELECT COUNT(sr.id) INTO v_returns_count FROM public.sale_returns sr WHERE sr.shift_id = p_shift_id AND sr.type = 'return' AND sr.status = 'completed';

    -- 6. Sold Cash Așteptat
    v_expected_cash := v_shift.opening_cash + v_cash_sales - v_cash_returns;

    -- 7. Listă vânzări sumară
    SELECT jsonb_agg(jsonb_build_object(
        'saleId', s.id,
        'createdAt', s.created_at,
        'total', s.total,
        'paymentMethod', s.payment_method,
        'status', s.status
    )) INTO v_sales_summary
    FROM public.sales s
    WHERE s.shift_id = p_shift_id
    ORDER BY s.created_at DESC;

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

REVOKE ALL ON FUNCTION public.get_shift_report(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_shift_report(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_shift_report(UUID, UUID) TO authenticated;


-- ============================================================================
-- D. RPC: get_daily_cash_report
-- Agregă soldurile tuturor turelor dintr-o anumită zi calendaristică.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_daily_cash_report(
    p_store_id UUID,
    p_date DATE
) RETURNS JSONB AS $$
DECLARE
    v_has_role BOOLEAN;
    v_shifts JSONB;
    v_total_opening DECIMAL(12,2) := 0;
    v_total_expected DECIMAL(12,2) := 0;
    v_total_declared DECIMAL(12,2) := 0;
    v_total_difference DECIMAL(12,2) := 0;
    v_net_cash DECIMAL(12,2) := 0;
    v_net_card DECIMAL(12,2) := 0;
BEGIN
    -- 1. Validare permisiuni
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis.';
    END IF;

    -- 2. Agregare ture individuale care încep în ziua selectată (în fusul orar local)
    SELECT jsonb_agg(
        jsonb_build_object(
            'shiftId', ps.id,
            'cashier', prof.full_name,
            'status', ps.status,
            'openedAt', ps.opened_at,
            'closedAt', ps.closed_at,
            'openingCash', ps.opening_cash,
            'expectedCash', COALESCE(ps.expected_cash, ps.opening_cash),
            'declaredCash', ps.declared_cash,
            'cashDifference', ps.cash_difference,
            'netCash', ps.total_cash,
            'netCard', ps.total_card
        )
    ) INTO v_shifts
    FROM public.pos_shifts ps
    JOIN public.profiles prof ON prof.id = ps.opened_by
    WHERE ps.store_id = p_store_id
      AND ps.opened_at::DATE = p_date;

    -- 3. Sumarizare valori de control
    SELECT 
        COALESCE(SUM(ps.opening_cash), 0),
        COALESCE(SUM(ps.expected_cash), 0),
        COALESCE(SUM(ps.declared_cash), 0),
        COALESCE(SUM(ps.cash_difference), 0),
        COALESCE(SUM(ps.total_cash), 0),
        COALESCE(SUM(ps.total_card), 0)
    INTO 
        v_total_opening,
        v_total_expected,
        v_total_declared,
        v_total_difference,
        v_net_cash,
        v_net_card
    FROM public.pos_shifts ps
    WHERE ps.store_id = p_store_id
      AND ps.opened_at::DATE = p_date
      AND ps.status = 'closed';

    RETURN jsonb_build_object(
        'date', p_date,
        'totalOpeningCash', v_total_opening,
        'totalExpectedCash', v_total_expected,
        'totalDeclaredCash', v_total_declared,
        'totalCashDifference', v_total_difference,
        'netCash', v_net_cash,
        'netCard', v_net_card,
        'shifts', COALESCE(v_shifts, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_daily_cash_report(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_daily_cash_report(UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_daily_cash_report(UUID, DATE) TO authenticated;


-- ============================================================================
-- E. RPC: get_inventory_value_report
-- Raport de stoc: valoarea totală de achiziție, vânzare și stocuri problematice.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_inventory_value_report(
    p_store_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_has_role BOOLEAN;
    
    v_stock_magazin NUMERIC := 0;
    v_stock_depozit NUMERIC := 0;
    v_estimated_purchase_value NUMERIC := 0;
    v_estimated_sale_value NUMERIC := 0;
    v_low_stock_count INT := 0;
    v_negative_stock_count INT := 0;
    v_dead_stock_candidates JSONB;
BEGIN
    -- 1. Validare permisiuni
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis.';
    END IF;

    -- 2. Cantitate totală Magazin vs Depozit
    SELECT COALESCE(SUM(sb.quantity), 0)
    INTO v_stock_magazin
    FROM public.stock_batches sb
    WHERE sb.store_id = p_store_id AND sb.zone = 'magazin';

    SELECT COALESCE(SUM(sb.quantity), 0)
    INTO v_stock_depozit
    FROM public.stock_batches sb
    WHERE sb.store_id = p_store_id AND sb.zone = 'depozit';

    -- 3. Estimare Valoare Achiziție și Vânzare
    -- Folosește costul specific lotului sau prețul implicit din product_prices ca fallback
    SELECT 
        COALESCE(SUM(sb.quantity * COALESCE(sb.purchase_price, pp.price_purchase, 0)), 0),
        COALESCE(SUM(sb.quantity * COALESCE(pp.price_sale, 0)), 0)
    INTO 
        v_estimated_purchase_value,
        v_estimated_sale_value
    FROM public.stock_batches sb
    LEFT JOIN public.product_prices pp ON pp.product_id = sb.product_id AND pp.store_id = p_store_id
    WHERE sb.store_id = p_store_id;

    -- 4. Alerte stoc
    -- Produse cu stoc cumulat sub pragul critic (5 unități)
    SELECT COUNT(*)
    INTO v_low_stock_count
    FROM (
        SELECT sb.product_id, SUM(sb.quantity) as total_qty
        FROM public.stock_batches sb
        WHERE sb.store_id = p_store_id
        GROUP BY sb.product_id
        HAVING SUM(sb.quantity) <= 5
    ) sub;

    -- Loturi/Produse cu stoc negativ
    SELECT COUNT(sb.id)
    INTO v_negative_stock_count
    FROM public.stock_batches sb
    WHERE sb.store_id = p_store_id AND sb.quantity < 0;

    -- 5. Candidăți Dead Stock (Slow Movers)
    -- Produse active cu stoc pozitiv, dar fără nicio vânzare finalizată în ultimele 30 de zile
    SELECT jsonb_agg(
        jsonb_build_object(
            'productId', p.id,
            'name', p.name,
            'barcode', p.barcode,
            'currentStock', sub.total_qty,
            'unit', p.unit
        )
    ) INTO v_dead_stock_candidates
    FROM public.products p
    JOIN (
        SELECT sb.product_id, SUM(sb.quantity) as total_qty
        FROM public.stock_batches sb
        WHERE sb.store_id = p_store_id
        GROUP BY sb.product_id
        HAVING SUM(sb.quantity) > 0
    ) sub ON sub.product_id = p.id
    WHERE p.store_id = p_store_id
      AND p.status = 'active'
      AND NOT EXISTS (
          SELECT 1 
          FROM public.sale_items si
          JOIN public.sales s ON s.id = si.sale_id
          WHERE si.product_id = p.id
            AND s.store_id = p_store_id
            AND s.status IN ('finalized', 'partially_returned', 'returned')
            AND s.created_at >= NOW() - INTERVAL '30 days'
      )
    LIMIT 20;

    RETURN jsonb_build_object(
        'totalStockMagazin', v_stock_magazin,
        'totalStockDepozit', v_stock_depozit,
        'estimatedPurchaseValue', v_estimated_purchase_value,
        'estimatedSaleValue', v_estimated_sale_value,
        'lowStockCount', v_low_stock_count,
        'negativeStockCount', v_negative_stock_count,
        'deadStockCandidates', COALESCE(v_dead_stock_candidates, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_inventory_value_report(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inventory_value_report(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_value_report(UUID) TO authenticated;


-- ============================================================================
-- F. RPC: get_losses_report
-- Analizează pierderile de stoc înregistrate în gestiune pe cauze și produse.
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
    -- 1. Validare permisiuni
    SELECT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) INTO v_has_role;
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Acces interzis.';
    END IF;

    v_tz_from := p_date_from::TIMESTAMPTZ;
    v_tz_to := (p_date_to + INTERVAL '1 day' - INTERVAL '1 millisecond')::TIMESTAMPTZ;

    -- 2. Cantitate totală și valoare estimată a pierderilor (la preț de achiziție)
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

    -- 3. Distribuție pierderi după Motiv (Reason)
    SELECT jsonb_agg(
        jsonb_build_object(
            'reason', we.reason,
            'eventsCount', COUNT(DISTINCT we.id),
            'quantity', SUM(wi.quantity),
            'estimatedValue', SUM(wi.quantity * COALESCE(sb.purchase_price, pp.price_purchase, 0))
        )
    ) INTO v_by_reason
    FROM public.waste_items wi
    JOIN public.waste_events we ON we.id = wi.waste_id
    LEFT JOIN public.stock_batches sb ON sb.id = wi.batch_id
    LEFT JOIN public.product_prices pp ON pp.product_id = wi.product_id AND pp.store_id = p_store_id
    WHERE we.store_id = p_store_id
      AND we.created_at >= v_tz_from
      AND we.created_at <= v_tz_to
    GROUP BY we.reason
    ORDER BY estimatedValue DESC;

    -- 4. Top produse pierdute / casate
    SELECT jsonb_agg(
        jsonb_build_object(
            'productId', p.id,
            'name', p.name,
            'barcode', p.barcode,
            'quantity', SUM(wi.quantity),
            'unit', p.unit,
            'estimatedValue', SUM(wi.quantity * COALESCE(sb.purchase_price, pp.price_purchase, 0))
        )
    ) INTO v_by_product
    FROM public.waste_items wi
    JOIN public.waste_events we ON we.id = wi.waste_id
    JOIN public.products p ON p.id = wi.product_id
    LEFT JOIN public.stock_batches sb ON sb.id = wi.batch_id
    LEFT JOIN public.product_prices pp ON pp.product_id = wi.product_id AND pp.store_id = p_store_id
    WHERE we.store_id = p_store_id
      AND we.created_at >= v_tz_from
      AND we.created_at <= v_tz_to
    GROUP BY p.id, p.name, p.barcode, p.unit
    ORDER BY estimatedValue DESC
    LIMIT 20;

    RETURN jsonb_build_object(
        'totalWasteQuantity', v_total_waste_qty,
        'estimatedWasteValue', v_estimated_waste_val,
        'byReason', COALESCE(v_by_reason, '[]'::jsonb),
        'byProduct', COALESCE(v_by_product, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_losses_report(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_losses_report(UUID, DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_losses_report(UUID, DATE, DATE) TO authenticated;
