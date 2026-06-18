-- =============================================================================
-- DATABASE CLEANUP — ETAPA 6DATA.4: EXECUTE CLEANUP (COMMIT VERSION)
-- =============================================================================
-- Purpose  : Delete ALL test data (products, sales, categories, stores, pos, etc.)
-- Safety   : Wrapped in BEGIN … COMMIT — permanent changes will be saved!
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
--  *** WARNING: THIS FILE COMMITS TRANSACTIONS AND MODIFIES THE LIVE DATABASE ***
--  *** DO NOT COMMIT THIS FILE TO THE PUBLIC GIT REPOSITORY ***
--
-- =============================================================================

BEGIN;

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

-- ─── 1b. SAFE_TEST_SALE IDs (sales containing ONLY test products) ──────────

CREATE TEMP TABLE tmp_safe_test_sale_ids AS
SELECT sl.id
FROM sales sl
JOIN sale_items si ON si.sale_id = sl.id
GROUP BY sl.id
HAVING COUNT(si.id) = COUNT(si.id) FILTER (
    WHERE si.product_id IN (SELECT id FROM tmp_test_product_ids)
);

-- ─── 1c. TEST_WASTE_EVENT IDs (waste events containing ONLY test products) ─

CREATE TEMP TABLE tmp_test_waste_event_ids AS
SELECT we.id
FROM waste_events we
JOIN waste_items wi ON wi.waste_id = we.id
GROUP BY we.id
HAVING COUNT(wi.id) = COUNT(wi.id) FILTER (
    WHERE wi.product_id IN (SELECT id FROM tmp_test_product_ids)
);

-- ─── 1d. Test Store IDs (E2E / test stores) ────────────────────────────────

CREATE TEMP TABLE tmp_test_store_ids AS
SELECT id
FROM stores
WHERE name ILIKE '%e2e%'
   OR name ILIKE '%test%';

-- ─── DELETE 0a: Sale return items linked to test sales ──────────────────────
DELETE FROM sale_return_items
WHERE original_sale_item_id IN (
    SELECT id FROM sale_items WHERE sale_id IN (SELECT id FROM tmp_safe_test_sale_ids)
);

-- ─── DELETE 0b: Sale returns linked to test sales ───────────────────────────
DELETE FROM sale_returns
WHERE original_sale_id IN (SELECT id FROM tmp_safe_test_sale_ids);

-- ─── DELETE 1: Payments linked to test sales ────────────────────────────────
DELETE FROM payments
WHERE sale_id IN (SELECT id FROM tmp_safe_test_sale_ids);

-- ─── DELETE 2: Sale items linked to test sales ──────────────────────────────
DELETE FROM sale_items
WHERE sale_id IN (SELECT id FROM tmp_safe_test_sale_ids);

-- ─── DELETE 3: Test-only sales ──────────────────────────────────────────────
DELETE FROM sales
WHERE id IN (SELECT id FROM tmp_safe_test_sale_ids);

-- ─── DELETE 4: Waste items linked to test waste events ──────────────────────
DELETE FROM waste_items
WHERE waste_id IN (SELECT id FROM tmp_test_waste_event_ids);

-- ─── DELETE 5: Test-only waste events ───────────────────────────────────────
DELETE FROM waste_events
WHERE id IN (SELECT id FROM tmp_test_waste_event_ids);

-- ─── DELETE 6: Stock movements of test products ────────────────────────────
DELETE FROM stock_movements
WHERE product_id IN (SELECT id FROM tmp_test_product_ids);

-- ─── DELETE 7: Stock batches of test products ───────────────────────────────
DELETE FROM stock_batches
WHERE product_id IN (SELECT id FROM tmp_test_product_ids);

-- ─── DELETE 8: Product prices of test products ──────────────────────────────
DELETE FROM product_prices
WHERE product_id IN (SELECT id FROM tmp_test_product_ids);

-- ─── DELETE 9: Test products ────────────────────────────────────────────────
DELETE FROM products
WHERE id IN (SELECT id FROM tmp_test_product_ids);

-- ─── UPDATE: Decouple products from test categories ──────────────────────────
UPDATE products
SET category_id = NULL
WHERE category_id IN (
    SELECT id FROM categories
    WHERE name ILIKE '%test%' OR name ILIKE '%6CAT1%'
);

-- ─── DELETE 10: Test categories (subcategories FIRST, then root) ────────────
DELETE FROM categories
WHERE (name ILIKE '%test%' OR name ILIKE '%6CAT1%') AND parent_id IS NOT NULL;

DELETE FROM categories
WHERE (name ILIKE '%test%' OR name ILIKE '%6CAT1%') AND parent_id IS NULL;

-- ─── DELETE 11: Store members linked to test stores ─────────────────────────
DELETE FROM store_members
WHERE store_id IN (SELECT id FROM tmp_test_store_ids);

-- ─── DELETE 12: Test E2E stores ─────────────────────────────────────────────
DELETE FROM stores
WHERE id IN (SELECT id FROM tmp_test_store_ids);

-- ─── DELETE 13: Audit logs linked to test stores ────────────────────────────
DELETE FROM audit_logs WHERE store_id IN (SELECT id FROM tmp_test_store_ids);

-- ─── DELETE 14: POS devices test ────────────────────────────────────────────
DELETE FROM pos_devices
WHERE device_name = 'POS-TEST-E2E' OR device_fingerprint = 'test_device_fingerprint_123456';

COMMIT;
