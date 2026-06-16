-- =============================================================================
-- DATABASE CLEANUP — ETAPA 6DATA.4: EXECUTE CLEANUP (SAFE ROLLBACK VERSION)
-- =============================================================================
-- Purpose  : Delete ALL test data (products, sales, categories, stores, pos, etc.)
-- Safety   : Wrapped in BEGIN … ROLLBACK by default. COMMIT is commented out.
-- Database : Supabase PostgreSQL
-- Date     : 2026-06-16
-- =============================================================================
--
--  ██████╗  █████╗ ███╗   ██╗ ██████╗ ███████╗██████╗ 
--  ██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔════╝██╔══██╗
--  ██║  ██║███████║██╔██╗ ██║██║  ███╗█████╗  ██████╔╝
--  ██║  ██║██╔══██║██║╚██╗██║██║   ██║██╔══╝  ██╔══██╗
--  ██████╔╝██║  ██║██║ ╚████║╚██████╔╝███████╗██║  ██║
--  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝
--
--  ╔═══════════════════════════════════════════════════════════════════════╗
--  ║  *** SAFETY VERSION: ENDS WITH ROLLBACK ***                           ║
--  ║  *** To commit changes, uncomment COMMIT and comment ROLLBACK.      ║
--  ║  *** Run locally using scripts/database_cleanup_execute_6data4_COMMIT_LOCAL.sql ***
--  ╚═══════════════════════════════════════════════════════════════════════╝
--
-- Deletion order (child → parent):
--   1.  payments          (linked to test sales)
--   2.  sale_items         (linked to test sales)
--   3.  sales              (test-only sales)
--   4.  waste_items        (linked to test waste events)
--   5.  waste_events       (test-only waste events)
--   6.  stock_movements    (of test products)
--   7.  stock_batches      (of test products)
--   8.  product_prices     (of test products)
--   9.  products           (test products)
--   10. categories         (subcategories first, then root)
--   11. store_members      (linked to test stores)
--   12. stores             (test E2E stores)
--   13. audit_logs         (linked to test stores)
--   14. pos_devices        (POS-TEST-E2E)
-- =============================================================================

BEGIN;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1: BUILD CANDIDATE LISTS                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╗

-- ─── 1a. Test Product IDs ───────────────────────────────────────────────────

CREATE TEMP TABLE tmp_test_product_ids AS
SELECT id
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
   OR barcode ILIKE 'E2E\_%';

SELECT '--- Test products identified ---' AS step,
       COUNT(*) AS test_product_count
FROM tmp_test_product_ids;

-- ─── 1b. SAFE_TEST_SALE IDs (sales containing ONLY test products) ──────────

CREATE TEMP TABLE tmp_safe_test_sale_ids AS
SELECT sl.id
FROM sales sl
JOIN sale_items si ON si.sale_id = sl.id
GROUP BY sl.id
HAVING COUNT(si.id) = COUNT(si.id) FILTER (
    WHERE si.product_id IN (SELECT id FROM tmp_test_product_ids)
);

SELECT '--- Safe test sales identified ---' AS step,
       COUNT(*) AS safe_test_sale_count
FROM tmp_safe_test_sale_ids;

-- ─── 1c. TEST_WASTE_EVENT IDs (waste events containing ONLY test products) ─

CREATE TEMP TABLE tmp_test_waste_event_ids AS
SELECT we.id
FROM waste_events we
JOIN waste_items wi ON wi.waste_id = we.id
GROUP BY we.id
HAVING COUNT(wi.id) = COUNT(wi.id) FILTER (
    WHERE wi.product_id IN (SELECT id FROM tmp_test_product_ids)
);

SELECT '--- Test waste events identified ---' AS step,
       COUNT(*) AS test_waste_event_count
FROM tmp_test_waste_event_ids;

-- ─── 1d. Test Store IDs (E2E / test stores) ────────────────────────────────

CREATE TEMP TABLE tmp_test_store_ids AS
SELECT id
FROM stores
WHERE name ILIKE '%e2e%'
   OR name ILIKE '%test%';

SELECT '--- Test stores identified ---' AS step,
       COUNT(*) AS test_store_count
FROM tmp_test_store_ids;

-- ─── 1e. Preview all candidate counts together ─────────────────────────────

SELECT '=== CANDIDATE SUMMARY ===' AS section;

SELECT 'test_products'     AS candidate_type, COUNT(*) AS cnt FROM tmp_test_product_ids
UNION ALL
SELECT 'safe_test_sales',   COUNT(*) FROM tmp_safe_test_sale_ids
UNION ALL
SELECT 'test_waste_events', COUNT(*) FROM tmp_test_waste_event_ids
UNION ALL
SELECT 'test_stores',       COUNT(*) FROM tmp_test_store_ids
ORDER BY candidate_type;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2: DELETE — child → parent order                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─── DELETE 0a: Sale return items linked to test sales ──────────────────────

SELECT '--- DELETE 0a: sale_return_items linked to test sales ---' AS step;

DELETE FROM sale_return_items
WHERE original_sale_item_id IN (
    SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM tmp_safe_test_sale_ids)
);

-- ─── DELETE 0b: Sale returns linked to test sales ───────────────────────────

SELECT '--- DELETE 0b: sale_returns linked to test sales ---' AS step;

DELETE FROM sale_returns
WHERE original_sale_id IN (SELECT id FROM tmp_safe_test_sale_ids);

-- ─── DELETE 1: Payments linked to test sales ────────────────────────────────

SELECT '--- DELETE 1: payments linked to test sales ---' AS step;

DELETE FROM payments
WHERE sale_id IN (SELECT id FROM tmp_safe_test_sale_ids);

SELECT '    Remaining payments:' AS verify, COUNT(*) AS cnt FROM payments;

-- ─── DELETE 2: Sale items linked to test sales ──────────────────────────────

SELECT '--- DELETE 2: sale_items linked to test sales ---' AS step;

DELETE FROM sale_items
WHERE sale_id IN (SELECT id FROM tmp_safe_test_sale_ids);

SELECT '    Remaining sale_items:' AS verify, COUNT(*) AS cnt FROM sale_items;

-- ─── DELETE 3: Test-only sales ──────────────────────────────────────────────

SELECT '--- DELETE 3: sales (test-only) ---' AS step;

DELETE FROM sales
WHERE id IN (SELECT id FROM tmp_safe_test_sale_ids);

SELECT '    Remaining sales:' AS verify, COUNT(*) AS cnt FROM sales;

-- ─── DELETE 4: Waste items linked to test waste events ──────────────────────

SELECT '--- DELETE 4: waste_items linked to test waste events ---' AS step;

DELETE FROM waste_items
WHERE waste_id IN (SELECT id FROM tmp_test_waste_event_ids);

SELECT '    Remaining waste_items:' AS verify, COUNT(*) AS cnt FROM waste_items;

-- ─── DELETE 5: Test-only waste events ───────────────────────────────────────

SELECT '--- DELETE 5: waste_events (test-only) ---' AS step;

DELETE FROM waste_events
WHERE id IN (SELECT id FROM tmp_test_waste_event_ids);

SELECT '    Remaining waste_events:' AS verify, COUNT(*) AS cnt FROM waste_events;

-- ─── DELETE 6: Stock movements of test products ────────────────────────────

SELECT '--- DELETE 6: stock_movements of test products ---' AS step;

DELETE FROM stock_movements
WHERE product_id IN (SELECT id FROM tmp_test_product_ids);

SELECT '    Remaining stock_movements:' AS verify, COUNT(*) AS cnt FROM stock_movements;

-- ─── DELETE 7: Stock batches of test products ───────────────────────────────

SELECT '--- DELETE 7: stock_batches of test products ---' AS step;

DELETE FROM stock_batches
WHERE product_id IN (SELECT id FROM tmp_test_product_ids);

SELECT '    Remaining stock_batches:' AS verify, COUNT(*) AS cnt FROM stock_batches;

-- ─── DELETE 8: Product prices of test products ──────────────────────────────

SELECT '--- DELETE 8: product_prices of test products ---' AS step;

DELETE FROM product_prices
WHERE product_id IN (SELECT id FROM tmp_test_product_ids);

SELECT '    Remaining product_prices:' AS verify, COUNT(*) AS cnt FROM product_prices;

-- ─── DELETE 9: Test products ────────────────────────────────────────────────

SELECT '--- DELETE 9: products (test products) ---' AS step;

DELETE FROM products
WHERE id IN (SELECT id FROM tmp_test_product_ids);

SELECT '    Remaining products:' AS verify, COUNT(*) AS cnt FROM products;

-- ─── UPDATE: Decouple products from test categories ──────────────────────────

SELECT '--- UPDATE: Decouple products from test categories ---' AS step;

UPDATE products
SET category_id = NULL
WHERE category_id IN (
    SELECT id FROM categories
    WHERE name ILIKE '%test%' OR name ILIKE '%6CAT1%'
);

-- ─── DELETE 10: Test categories (subcategories FIRST, then root) ────────────

SELECT '--- DELETE 10a: categories — subcategories (parent_id IS NOT NULL) ---' AS step;

DELETE FROM categories
WHERE (
       name ILIKE '%test%'
    OR name ILIKE '%6CAT1%'
)
AND parent_id IS NOT NULL;

SELECT '    Remaining categories after sub-delete:' AS verify, COUNT(*) AS cnt FROM categories;

SELECT '--- DELETE 10b: categories — root categories (parent_id IS NULL) ---' AS step;

DELETE FROM categories
WHERE (
       name ILIKE '%test%'
    OR name ILIKE '%6CAT1%'
)
AND parent_id IS NULL;

SELECT '    Remaining categories after root-delete:' AS verify, COUNT(*) AS cnt FROM categories;

-- ─── DELETE 11: Store members linked to test stores ─────────────────────────

SELECT '--- DELETE 11: store_members linked to test stores ---' AS step;

DELETE FROM store_members
WHERE store_id IN (SELECT id FROM tmp_test_store_ids);

SELECT '    Remaining store_members:' AS verify, COUNT(*) AS cnt FROM store_members;

-- ─── DELETE 12: Test E2E stores ─────────────────────────────────────────────

SELECT '--- DELETE 12: stores (test E2E stores) ---' AS step;

DELETE FROM stores
WHERE id IN (SELECT id FROM tmp_test_store_ids);

SELECT '    Remaining stores:' AS verify, COUNT(*) AS cnt FROM stores;

-- ─── DELETE 13: Audit logs linked to test stores ────────────────────────────

SELECT '--- DELETE 13: audit_logs linked to test stores ---' AS step;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'store_id'
    ) THEN
        EXECUTE 'DELETE FROM audit_logs WHERE store_id IN (SELECT id FROM tmp_test_store_ids)';
        RAISE NOTICE 'audit_logs: deleted rows for test stores';
    ELSE
        RAISE NOTICE 'audit_logs: table or store_id column not found — skipping';
    END IF;
END $$;

-- ─── DELETE 14: POS devices test ────────────────────────────────────────────

SELECT '--- DELETE 14: pos_devices (test POS device) ---' AS step;

DELETE FROM pos_devices
WHERE device_name = 'POS-TEST-E2E'
   OR device_fingerprint = 'test_device_fingerprint_123456';

SELECT '    Remaining pos_devices:' AS verify, COUNT(*) AS cnt FROM pos_devices;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3: POST-CLEANUP VERIFICATION                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '=== POST-CLEANUP TABLE COUNTS ===' AS section;

SELECT 'products'        AS table_name, COUNT(*) AS remaining_rows FROM products
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
ORDER BY table_name;

-- Final sanity check: no test products should remain
SELECT '--- SANITY CHECK: Any remaining test products? ---' AS step;

SELECT COUNT(*) AS remaining_test_products
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
   OR barcode ILIKE 'E2E\_%';

SELECT '--- SANITY CHECK: Any remaining test categories? ---' AS step;

SELECT COUNT(*) AS remaining_test_categories
FROM categories
WHERE name ILIKE '%test%'
   OR name ILIKE '%6CAT1%';

SELECT '--- SANITY CHECK: Any remaining test stores? ---' AS step;

SELECT COUNT(*) AS remaining_test_stores
FROM stores
WHERE name ILIKE '%e2e%'
   OR name ILIKE '%test%';


-- =============================================================================
-- ROLLBACK — No changes are persisted. This is a DRY RUN version.
-- =============================================================================
ROLLBACK;
