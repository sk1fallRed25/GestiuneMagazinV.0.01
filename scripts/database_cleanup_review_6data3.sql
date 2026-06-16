-- =============================================================================
-- DATABASE CLEANUP REVIEW SCRIPT — 6data3
-- =============================================================================
-- Purpose  : Read-only audit of ALL test data across the Supabase database
-- Safety   : SELECT-only — NO DELETE, UPDATE, INSERT, or COMMIT statements
-- Database : Supabase PostgreSQL
-- Date     : 2026-06-16
-- =============================================================================
-- Test-data identification patterns:
--   Products : name ILIKE '%test%' / '%e2e%' / '%demo%' / '%automat%'
--              / 'PRODUS_SGR%' / 'PRODUS_NORM%' / '%6CAT1%' / '%6REC1%' / '%6REC12%'
--              OR barcode ILIKE 'TEST-%' / 'E2E_%'
--   Categories: name ILIKE '%test%' / '%6CAT1%' (root + sub on both stores)
-- Expected : 143 test products, 18 test categories, 140 SAFE_TEST_SALEs,
--            156 test payments, 3 TEST_WASTE_EVENTs, 1 test POS device
-- =============================================================================


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1: TOTALS OVERVIEW                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- TABLE ROW COUNTS ---' AS section;

SELECT 'products'        AS table_name, COUNT(*) AS total_rows FROM products
UNION ALL
SELECT 'categories',      COUNT(*) FROM categories
UNION ALL
SELECT 'sales',           COUNT(*) FROM sales
UNION ALL
SELECT 'sale_items',      COUNT(*) FROM sale_items
UNION ALL
SELECT 'payments',        COUNT(*) FROM payments
UNION ALL
SELECT 'waste_events',    COUNT(*) FROM waste_events
UNION ALL
SELECT 'waste_items',     COUNT(*) FROM waste_items
UNION ALL
SELECT 'stock_batches',   COUNT(*) FROM stock_batches
UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL
SELECT 'product_prices',  COUNT(*) FROM product_prices
UNION ALL
SELECT 'stores',          COUNT(*) FROM stores
UNION ALL
SELECT 'store_members',   COUNT(*) FROM store_members
UNION ALL
SELECT 'pos_devices',     COUNT(*) FROM pos_devices
UNION ALL
SELECT 'profiles',        COUNT(*) FROM profiles
ORDER BY table_name;

SELECT '--- TEST ITEMS COUNTS ---' AS section;

SELECT 'test_products' AS item_type, COUNT(*) AS cnt
FROM products
WHERE name ILIKE '%test%'
   OR name ILIKE '%e2e%'
   OR name ILIKE '%demo%'
   OR name ILIKE '%automat%'
   OR name ILIKE 'PRODUS\_SGR%'
   OR name ILIKE 'PRODUS\_NORM%'
   OR name ILIKE '%6CAT1%'
   OR name ILIKE '%6REC1%'
   OR name ILIKE '%6REC12%'
   OR barcode ILIKE 'TEST-%'
   OR barcode ILIKE 'E2E\_%'

UNION ALL

SELECT 'test_categories', COUNT(*)
FROM categories
WHERE name ILIKE '%test%'
   OR name ILIKE '%6CAT1%'

UNION ALL

SELECT 'test_pos_devices', COUNT(*)
FROM pos_devices
WHERE device_identifier ILIKE '%test%'
   OR device_identifier ILIKE '%e2e%';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2: DETAILED TEST PRODUCTS AUDIT                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- DETAILED TEST PRODUCTS (143 expected) ---' AS section;

SELECT
    p.id,
    p.name,
    p.barcode,
    s.name                                      AS store_name,
    c.name                                      AS category_name,
    COALESCE(si_agg.sale_items_count, 0)        AS sale_items_count,
    COALESCE(si_agg.total_qty_sold, 0)          AS total_qty_sold,
    COALESCE(si_agg.total_val_sold, 0)          AS total_val_sold,
    CASE WHEN sb.cnt > 0 THEN true ELSE false END AS has_stock_batches,
    CASE WHEN sm.cnt > 0 THEN true ELSE false END AS has_stock_movements,
    CASE WHEN pp.cnt > 0 THEN true ELSE false END AS has_product_prices,
    CASE WHEN wi.cnt > 0 THEN true ELSE false END AS has_waste_items,
    true                                        AS is_clearly_test
FROM products p
JOIN stores s ON s.id = p.store_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
    SELECT COUNT(*)        AS sale_items_count,
           SUM(si.quantity) AS total_qty_sold,
           SUM(si.total)    AS total_val_sold
    FROM sale_items si
    WHERE si.product_id = p.id
) si_agg ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM stock_batches WHERE product_id = p.id
) sb ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM stock_movements WHERE product_id = p.id
) sm ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM product_prices WHERE product_id = p.id
) pp ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM waste_items WHERE product_id = p.id
) wi ON true
WHERE p.name ILIKE '%test%'
   OR p.name ILIKE '%e2e%'
   OR p.name ILIKE '%demo%'
   OR p.name ILIKE '%automat%'
   OR p.name ILIKE 'PRODUS\_SGR%'
   OR p.name ILIKE 'PRODUS\_NORM%'
   OR p.name ILIKE '%6CAT1%'
   OR p.name ILIKE '%6REC1%'
   OR p.name ILIKE '%6REC12%'
   OR p.barcode ILIKE 'TEST-%'
   OR p.barcode ILIKE 'E2E\_%'
ORDER BY s.name, p.name;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3: DETAILED TEST CATEGORIES AUDIT                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- DETAILED TEST CATEGORIES (18 expected) ---' AS section;

SELECT
    cat.id,
    cat.name,
    cat.parent_id,
    s.name                                              AS store_name,
    CASE WHEN cat.parent_id IS NULL THEN 'ROOT' ELSE 'SUBCATEGORY' END AS category_level,
    COALESCE(p_agg.assoc_products_count, 0)             AS assoc_products_count,
    COALESCE(p_agg.products_with_sales_count, 0)        AS products_with_sales_count,
    COALESCE(p_agg.products_without_sales_count, 0)     AS products_without_sales_count
FROM categories cat
JOIN stores s ON s.id = cat.store_id
LEFT JOIN LATERAL (
    SELECT
        COUNT(*)                                                              AS assoc_products_count,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM sale_items si WHERE si.product_id = pr.id)) AS products_with_sales_count,
        COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM sale_items si WHERE si.product_id = pr.id)) AS products_without_sales_count
    FROM products pr
    WHERE pr.category_id = cat.id
) p_agg ON true
WHERE cat.name ILIKE '%test%'
   OR cat.name ILIKE '%6CAT1%'
ORDER BY s.name, cat.parent_id NULLS FIRST, cat.name;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 4: SALES CLASSIFICATION                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- SALES CLASSIFICATION (140 SAFE_TEST / 0 MIXED / 123 KEEP_REAL expected) ---' AS section;

WITH test_product_ids AS (
    SELECT id FROM products
    WHERE name ILIKE '%test%'
       OR name ILIKE '%e2e%'
       OR name ILIKE '%demo%'
       OR name ILIKE '%automat%'
       OR name ILIKE 'PRODUS\_SGR%'
       OR name ILIKE 'PRODUS\_NORM%'
       OR name ILIKE '%6CAT1%'
       OR name ILIKE '%6REC1%'
       OR name ILIKE '%6REC12%'
       OR barcode ILIKE 'TEST-%'
       OR barcode ILIKE 'E2E\_%'
),
sale_classification AS (
    SELECT
        sl.id AS sale_id,
        sl.total,
        COUNT(si.id)                                                AS total_items,
        COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids)) AS test_items,
        CASE
            WHEN COUNT(si.id) = COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids))
                THEN 'SAFE_TEST_SALE'
            WHEN COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids)) > 0
                THEN 'MIXED_OR_UNKNOWN'
            ELSE 'KEEP_REAL_SALE'
        END AS classification
    FROM sales sl
    JOIN sale_items si ON si.sale_id = sl.id
    GROUP BY sl.id, sl.total
)
SELECT
    classification,
    COUNT(*)                   AS sale_count,
    COALESCE(SUM(total), 0)    AS total_value
FROM sale_classification
GROUP BY classification
ORDER BY classification;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 5: DETAILS OF TEST AND MIXED SALES                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- TEST & MIXED SALE DETAILS ---' AS section;

WITH test_product_ids AS (
    SELECT id FROM products
    WHERE name ILIKE '%test%'
       OR name ILIKE '%e2e%'
       OR name ILIKE '%demo%'
       OR name ILIKE '%automat%'
       OR name ILIKE 'PRODUS\_SGR%'
       OR name ILIKE 'PRODUS\_NORM%'
       OR name ILIKE '%6CAT1%'
       OR name ILIKE '%6REC1%'
       OR name ILIKE '%6REC12%'
       OR barcode ILIKE 'TEST-%'
       OR barcode ILIKE 'E2E\_%'
),
sale_classification AS (
    SELECT
        sl.id AS sale_id,
        sl.total,
        sl.store_id,
        sl.created_at,
        COUNT(si.id)                                                AS total_items,
        COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids)) AS test_items,
        CASE
            WHEN COUNT(si.id) = COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids))
                THEN 'SAFE_TEST_SALE'
            WHEN COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids)) > 0
                THEN 'MIXED_OR_UNKNOWN'
            ELSE 'KEEP_REAL_SALE'
        END AS classification
    FROM sales sl
    JOIN sale_items si ON si.sale_id = sl.id
    GROUP BY sl.id, sl.total, sl.store_id, sl.created_at
)
SELECT
    sc.sale_id,
    sc.classification,
    sc.total                   AS sale_total,
    sc.total_items,
    sc.test_items,
    st.name                    AS store_name,
    sc.created_at,
    COALESCE(pay.payments_count, 0) AS payments_count
FROM sale_classification sc
JOIN stores st ON st.id = sc.store_id
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS payments_count FROM payments WHERE sale_id = sc.sale_id
) pay ON true
WHERE sc.classification IN ('SAFE_TEST_SALE', 'MIXED_OR_UNKNOWN')
ORDER BY sc.classification, sc.created_at;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 6: PAYMENTS LINKED TO TEST SALES                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- PAYMENTS CLASSIFICATION (156 test / 143 real / 0 mixed expected) ---' AS section;

WITH test_product_ids AS (
    SELECT id FROM products
    WHERE name ILIKE '%test%'
       OR name ILIKE '%e2e%'
       OR name ILIKE '%demo%'
       OR name ILIKE '%automat%'
       OR name ILIKE 'PRODUS\_SGR%'
       OR name ILIKE 'PRODUS\_NORM%'
       OR name ILIKE '%6CAT1%'
       OR name ILIKE '%6REC1%'
       OR name ILIKE '%6REC12%'
       OR barcode ILIKE 'TEST-%'
       OR barcode ILIKE 'E2E\_%'
),
sale_classification AS (
    SELECT
        sl.id AS sale_id,
        CASE
            WHEN COUNT(si.id) = COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids))
                THEN 'SAFE_TEST_SALE'
            WHEN COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids)) > 0
                THEN 'MIXED_OR_UNKNOWN'
            ELSE 'KEEP_REAL_SALE'
        END AS classification
    FROM sales sl
    JOIN sale_items si ON si.sale_id = sl.id
    GROUP BY sl.id
)
SELECT
    CASE
        WHEN sc.classification = 'SAFE_TEST_SALE'  THEN 'TEST_PAYMENT'
        WHEN sc.classification = 'MIXED_OR_UNKNOWN' THEN 'MIXED_PAYMENT'
        ELSE 'REAL_PAYMENT'
    END AS payment_type,
    COUNT(pay.id) AS payment_count,
    COALESCE(SUM(pay.amount), 0) AS total_amount
FROM payments pay
JOIN sale_classification sc ON sc.sale_id = pay.sale_id
GROUP BY
    CASE
        WHEN sc.classification = 'SAFE_TEST_SALE'  THEN 'TEST_PAYMENT'
        WHEN sc.classification = 'MIXED_OR_UNKNOWN' THEN 'MIXED_PAYMENT'
        ELSE 'REAL_PAYMENT'
    END
ORDER BY payment_type;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 7: WASTE EVENTS CLASSIFICATION                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- WASTE EVENTS CLASSIFICATION (3 TEST / 0 MIXED / 8 REAL expected) ---' AS section;

WITH test_product_ids AS (
    SELECT id FROM products
    WHERE name ILIKE '%test%'
       OR name ILIKE '%e2e%'
       OR name ILIKE '%demo%'
       OR name ILIKE '%automat%'
       OR name ILIKE 'PRODUS\_SGR%'
       OR name ILIKE 'PRODUS\_NORM%'
       OR name ILIKE '%6CAT1%'
       OR name ILIKE '%6REC1%'
       OR name ILIKE '%6REC12%'
       OR barcode ILIKE 'TEST-%'
       OR barcode ILIKE 'E2E\_%'
),
waste_classification AS (
    SELECT
        we.id AS waste_event_id,
        we.store_id,
        we.created_at,
        COUNT(wi.id)                                                 AS total_items,
        COUNT(wi.id) FILTER (WHERE wi.product_id IN (SELECT id FROM test_product_ids)) AS test_items,
        CASE
            WHEN COUNT(wi.id) = COUNT(wi.id) FILTER (WHERE wi.product_id IN (SELECT id FROM test_product_ids))
                THEN 'TEST_WASTE_EVENT'
            WHEN COUNT(wi.id) FILTER (WHERE wi.product_id IN (SELECT id FROM test_product_ids)) > 0
                THEN 'MIXED_WASTE_EVENT'
            ELSE 'REAL_WASTE_EVENT'
        END AS classification
    FROM waste_events we
    LEFT JOIN waste_items wi ON wi.waste_event_id = we.id
    GROUP BY we.id, we.store_id, we.created_at
)
SELECT
    wc.waste_event_id,
    wc.classification,
    wc.total_items,
    wc.test_items,
    st.name AS store_name,
    wc.created_at
FROM waste_classification wc
JOIN stores st ON st.id = wc.store_id
ORDER BY wc.classification, wc.created_at;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 8: POS DEVICES LIST                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- POS DEVICES ---' AS section;

SELECT
    pd.id,
    pd.device_identifier,
    pd.device_name,
    pd.is_active,
    s.name AS store_name,
    pd.created_at,
    CASE
        WHEN pd.device_identifier ILIKE '%test%' OR pd.device_identifier ILIKE '%e2e%'
            THEN 'TEST_DEVICE'
        ELSE 'REAL_DEVICE'
    END AS device_type
FROM pos_devices pd
JOIN stores s ON s.id = pd.store_id
ORDER BY device_type, pd.device_identifier;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 9: USER magazin@magazin.com AUDIT                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- USER magazin@magazin.com PROFILE ---' AS section;

SELECT
    p.id,
    p.email,
    p.full_name,
    p.role AS global_role,
    p.created_at
FROM profiles p
WHERE p.email = 'magazin@magazin.com';

SELECT '--- USER magazin@magazin.com STORE MEMBERSHIPS ---' AS section;

SELECT
    sm.id AS membership_id,
    sm.store_id,
    s.name AS store_name,
    sm.role AS store_role,
    sm.created_at
FROM store_members sm
JOIN stores s ON s.id = sm.store_id
JOIN profiles p ON p.id = sm.user_id
WHERE p.email = 'magazin@magazin.com'
ORDER BY s.name;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 10: STORES AND STORE_MEMBERS OVERVIEW                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- ALL STORES (5 expected: 2 real + 3 test E2E) ---' AS section;

SELECT
    s.id,
    s.name,
    s.created_at,
    CASE
        WHEN s.name ILIKE '%e2e%' OR s.name ILIKE '%test%'
            THEN 'TEST_STORE'
        ELSE 'REAL_STORE'
    END AS store_type,
    COALESCE(mem.member_count, 0) AS member_count,
    COALESCE(prod.product_count, 0) AS product_count
FROM stores s
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS member_count FROM store_members WHERE store_id = s.id
) mem ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS product_count FROM products WHERE store_id = s.id
) prod ON true
ORDER BY store_type, s.name;

SELECT '--- ALL STORE MEMBERS (6 expected: 3 real + 3 test) ---' AS section;

SELECT
    sm.id AS membership_id,
    sm.store_id,
    s.name AS store_name,
    p.email,
    sm.role,
    sm.created_at,
    CASE
        WHEN s.name ILIKE '%e2e%' OR s.name ILIKE '%test%'
            THEN 'TEST_MEMBERSHIP'
        ELSE 'REAL_MEMBERSHIP'
    END AS membership_type
FROM store_members sm
JOIN stores s ON s.id = sm.store_id
JOIN profiles p ON p.id = sm.user_id
ORDER BY membership_type, s.name, p.email;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 11: SUMMARY CLASSIFICATION TOTALS                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- FINAL SUMMARY ---' AS section;

WITH test_product_ids AS (
    SELECT id FROM products
    WHERE name ILIKE '%test%'
       OR name ILIKE '%e2e%'
       OR name ILIKE '%demo%'
       OR name ILIKE '%automat%'
       OR name ILIKE 'PRODUS\_SGR%'
       OR name ILIKE 'PRODUS\_NORM%'
       OR name ILIKE '%6CAT1%'
       OR name ILIKE '%6REC1%'
       OR name ILIKE '%6REC12%'
       OR barcode ILIKE 'TEST-%'
       OR barcode ILIKE 'E2E\_%'
),
sale_classification AS (
    SELECT
        sl.id AS sale_id,
        CASE
            WHEN COUNT(si.id) = COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids))
                THEN 'SAFE_TEST_SALE'
            WHEN COUNT(si.id) FILTER (WHERE si.product_id IN (SELECT id FROM test_product_ids)) > 0
                THEN 'MIXED_OR_UNKNOWN'
            ELSE 'KEEP_REAL_SALE'
        END AS classification
    FROM sales sl
    JOIN sale_items si ON si.sale_id = sl.id
    GROUP BY sl.id
)
SELECT
    (SELECT COUNT(*) FROM test_product_ids)                                        AS test_products_count,
    (SELECT COUNT(*) FROM categories WHERE name ILIKE '%test%' OR name ILIKE '%6CAT1%') AS test_categories_count,
    (SELECT COUNT(*) FROM sale_classification WHERE classification = 'SAFE_TEST_SALE')  AS safe_test_sale_count,
    (SELECT COUNT(*) FROM sale_classification WHERE classification = 'MIXED_OR_UNKNOWN') AS mixed_sale_count,
    (SELECT COUNT(*) FROM sale_classification WHERE classification = 'KEEP_REAL_SALE')   AS keep_real_sale_count;


-- =============================================================================
-- END OF REVIEW SCRIPT
-- =============================================================================
