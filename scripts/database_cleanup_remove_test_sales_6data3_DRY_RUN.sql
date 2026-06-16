-- =============================================================================
-- 6DATA.3 — Database Complete Cleanup Dry Run (VARIANTA C)
-- =============================================================================
-- This script performs a DRY RUN of deleting all test sales, sale_items,
-- payments, waste_events, waste_items, stock_batches, stock_movements,
-- product_prices, products, and categories associated with E2E/test runs.
-- NO COMMIT is allowed. The transaction ends with ROLLBACK.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- SECȚIUNEA 1: PREVIEW CANDIDATES
-- ═══════════════════════════════════════════════════════════════════

-- Test Products Candidates
CREATE TEMP TABLE temp_test_prod_ids AS
SELECT id FROM products
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
   OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%';

-- Test Sales Candidates (Sales that contain ONLY test products)
CREATE TEMP TABLE temp_test_sale_ids AS
WITH sale_items_status AS (
  SELECT 
    si.sale_id,
    COUNT(si.id) AS total_items,
    SUM(CASE WHEN si.product_id IN (SELECT id FROM temp_test_prod_ids) THEN 1 ELSE 0 END) AS test_items
  FROM sale_items si
  GROUP BY si.sale_id
)
SELECT sale_id FROM sale_items_status WHERE total_items = test_items;

-- Test Waste Events Candidates (Waste events that contain ONLY test products)
CREATE TEMP TABLE temp_test_waste_ids AS
WITH waste_items_status AS (
  SELECT 
    wi.waste_id,
    COUNT(wi.id) AS total_items,
    SUM(CASE WHEN wi.product_id IN (SELECT id FROM temp_test_prod_ids) THEN 1 ELSE 0 END) AS test_items
  FROM waste_items wi
  GROUP BY wi.waste_id
)
SELECT waste_id FROM waste_items_status WHERE total_items = test_items;

-- Preview counts
SELECT 'products_to_delete' AS target, COUNT(*) AS count FROM temp_test_prod_ids
UNION ALL
SELECT 'sales_to_delete', COUNT(*) FROM temp_test_sale_ids
UNION ALL
SELECT 'waste_events_to_delete', COUNT(*) FROM temp_test_waste_ids;


-- ═══════════════════════════════════════════════════════════════════
-- SECȚIUNEA 2: EXECUTARE DELETE (COPIL -> PARINTE)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Payments linked to test sales
DELETE FROM payments
WHERE sale_id IN (SELECT sale_id FROM temp_test_sale_ids);

-- 2. Sale items linked to test sales
DELETE FROM sale_items
WHERE sale_id IN (SELECT sale_id FROM temp_test_sale_ids);

-- 3. Sales (test-only sales)
DELETE FROM sales
WHERE id IN (SELECT sale_id FROM temp_test_sale_ids);

-- 4. Waste items linked to test waste events
DELETE FROM waste_items
WHERE waste_id IN (SELECT waste_id FROM temp_test_waste_ids);

-- 5. Waste events (test-only waste events)
DELETE FROM waste_events
WHERE id IN (SELECT waste_id FROM temp_test_waste_ids);

-- 6. Stock movements of test products
DELETE FROM stock_movements
WHERE product_id IN (SELECT id FROM temp_test_prod_ids);

-- 7. Stock batches of test products
DELETE FROM stock_batches
WHERE product_id IN (SELECT id FROM temp_test_prod_ids);

-- 8. Product prices of test products
DELETE FROM product_prices
WHERE product_id IN (SELECT id FROM temp_test_prod_ids);

-- 9. Products (test products)
DELETE FROM products
WHERE id IN (SELECT id FROM temp_test_prod_ids);

-- 10. Categories and subcategories of test
DELETE FROM categories
WHERE name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%'
   OR name ILIKE '%test%' OR name ILIKE '%teste%';


-- ═══════════════════════════════════════════════════════════════════
-- SECȚIUNEA 3: VERIFICARE DUPĂ CURĂȚARE
-- ═══════════════════════════════════════════════════════════════════
SELECT 'remaining_products' AS target, COUNT(*) AS count FROM products
UNION ALL
SELECT 'remaining_categories', COUNT(*) FROM categories
UNION ALL
SELECT 'remaining_sales', COUNT(*) FROM sales
UNION ALL
SELECT 'remaining_sale_items', COUNT(*) FROM sale_items
UNION ALL
SELECT 'remaining_payments', COUNT(*) FROM payments
UNION ALL
SELECT 'remaining_waste_events', COUNT(*) FROM waste_events
UNION ALL
SELECT 'remaining_waste_items', COUNT(*) FROM waste_items;


-- ═══════════════════════════════════════════════════════════════════
-- SAFETY ROLLBACK (DO NOT REMOVE OR CHANGE TO COMMIT IN 6DATA.3)
-- ═══════════════════════════════════════════════════════════════════
ROLLBACK;
