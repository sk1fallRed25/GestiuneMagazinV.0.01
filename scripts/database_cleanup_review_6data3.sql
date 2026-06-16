-- =============================================================================
-- 6DATA.3 — Database Cleanup Review (SELECT-ONLY)
-- =============================================================================
-- This script contains ONLY SELECT statements. No DELETE, UPDATE, or COMMIT.
-- Run this in the Supabase SQL Editor to verify the state of remaining test data.
-- =============================================================================

-- 1. TOTALS OVERVIEW
SELECT 'products_total' AS metric, COUNT(*) AS count FROM products
UNION ALL
SELECT 'test_products_total', COUNT(*) FROM products 
  WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
     OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
     OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
     OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%'
UNION ALL
SELECT 'categories_total', COUNT(*) FROM categories
UNION ALL
SELECT 'test_categories_total', COUNT(*) FROM categories
  WHERE name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%'
     OR name ILIKE '%test%' OR name ILIKE '%teste%'
UNION ALL
SELECT 'sales_total', COUNT(*) FROM sales
UNION ALL
SELECT 'sale_items_total', COUNT(*) FROM sale_items
UNION ALL
SELECT 'payments_total', COUNT(*) FROM payments
UNION ALL
SELECT 'waste_events_total', COUNT(*) FROM waste_events
UNION ALL
SELECT 'pos_devices_total', COUNT(*) FROM pos_devices;

-- 2. DETAILED TEST PRODUCTS AUDIT (WITH SALES, BATCHES, PRICES, WASTE REFS)
WITH test_prods AS (
  SELECT id, name, barcode, store_id, category_id
  FROM products
  WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
     OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
     OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
     OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%'
)
SELECT 
  tp.id AS product_id,
  tp.name AS product_name,
  tp.barcode,
  s.name AS store_name,
  c.name AS category_name,
  (SELECT COUNT(*) FROM sale_items si WHERE si.product_id = tp.id) AS sale_items_count,
  COALESCE((SELECT SUM(si.quantity) FROM sale_items si WHERE si.product_id = tp.id), 0) AS total_qty_sold,
  COALESCE((SELECT SUM(si.total_item) FROM sale_items si WHERE si.product_id = tp.id), 0) AS total_val_sold,
  EXISTS(SELECT 1 FROM stock_batches sb WHERE sb.product_id = tp.id) AS has_stock_batches,
  EXISTS(SELECT 1 FROM stock_movements sm WHERE sm.product_id = tp.id) AS has_stock_movements,
  EXISTS(SELECT 1 FROM product_prices pp WHERE pp.product_id = tp.id) AS has_product_prices,
  EXISTS(SELECT 1 FROM waste_items wi WHERE wi.product_id = tp.id) AS has_waste_items
FROM test_prods tp
JOIN stores s ON tp.store_id = s.id
LEFT JOIN categories c ON tp.category_id = c.id
ORDER BY sale_items_count DESC, tp.name;

-- 3. DETAILED TEST CATEGORIES AUDIT
WITH test_cats AS (
  SELECT id, name, parent_id, store_id
  FROM categories
  WHERE name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%'
     OR name ILIKE '%test%' OR name ILIKE '%teste%'
)
SELECT 
  tc.id AS category_id,
  tc.name AS category_name,
  tc.parent_id,
  s.name AS store_name,
  (SELECT COUNT(*) FROM products p WHERE p.category_id = tc.id) AS assoc_products_count,
  (SELECT COUNT(DISTINCT si.product_id) FROM sale_items si 
   JOIN products p ON si.product_id = p.id 
   WHERE p.category_id = tc.id) AS products_with_sales_count
FROM test_cats tc
LEFT JOIN stores s ON tc.store_id = s.id
ORDER BY tc.name;

-- 4. SALES CLASSIFICATION AUDIT
WITH sale_test_status AS (
  SELECT 
    s.id AS sale_id,
    s.total AS total_amount,
    COUNT(si.id) AS total_items,
    SUM(CASE WHEN (
      p.name ILIKE '%test%' OR p.name ILIKE '%e2e%' OR p.name ILIKE '%demo%'
      OR p.name ILIKE '%automat%' OR p.name ILIKE 'PRODUS_SGR%' OR p.name ILIKE 'PRODUS_NORM%'
      OR p.barcode ILIKE 'TEST-%' OR p.barcode ILIKE 'E2E_%'
      OR p.name ILIKE '%6CAT1%' OR p.name ILIKE '%6REC1%' OR p.name ILIKE '%6REC12%'
    ) THEN 1 ELSE 0 END) AS test_items_count
  FROM sales s
  JOIN sale_items si ON s.id = si.sale_id
  JOIN products p ON si.product_id = p.id
  GROUP BY s.id, s.total
),
classified_sales AS (
  SELECT 
    sale_id,
    total_amount,
    CASE 
      WHEN test_items_count = total_items THEN 'SAFE_TEST_SALE'
      WHEN test_items_count > 0 AND test_items_count < total_items THEN 'MIXED_OR_UNKNOWN'
      ELSE 'KEEP_REAL_SALE'
    END AS classification
  FROM sale_test_status
)
SELECT 
  classification,
  COUNT(*) AS sales_count,
  SUM(total_amount) AS total_value
FROM classified_sales
GROUP BY classification;

-- 5. DETAILS OF SAFE_TEST_SALE AND MIXED SALES
WITH sale_test_status AS (
  SELECT 
    s.id AS sale_id,
    s.total AS total_amount,
    s.created_at,
    COUNT(si.id) AS total_items,
    SUM(CASE WHEN (
      p.name ILIKE '%test%' OR p.name ILIKE '%e2e%' OR p.name ILIKE '%demo%'
      OR p.name ILIKE '%automat%' OR p.name ILIKE 'PRODUS_SGR%' OR p.name ILIKE 'PRODUS_NORM%'
      OR p.barcode ILIKE 'TEST-%' OR p.barcode ILIKE 'E2E_%'
      OR p.name ILIKE '%6CAT1%' OR p.name ILIKE '%6REC1%' OR p.name ILIKE '%6REC12%'
    ) THEN 1 ELSE 0 END) AS test_items_count
  FROM sales s
  JOIN sale_items si ON s.id = si.sale_id
  JOIN products p ON si.product_id = p.id
  GROUP BY s.id, s.total, s.created_at
),
classified_sales AS (
  SELECT 
    sale_id,
    total_amount,
    created_at,
    test_items_count,
    total_items,
    CASE 
      WHEN test_items_count = total_items THEN 'SAFE_TEST_SALE'
      WHEN test_items_count > 0 AND test_items_count < total_items THEN 'MIXED_OR_UNKNOWN'
      ELSE 'KEEP_REAL_SALE'
    END AS classification
  FROM sale_test_status
)
SELECT 
  cs.sale_id,
  cs.total_amount,
  cs.created_at,
  cs.classification,
  (SELECT COUNT(*) FROM payments pay WHERE pay.sale_id = cs.sale_id) AS payments_count
FROM classified_sales cs
WHERE cs.classification IN ('SAFE_TEST_SALE', 'MIXED_OR_UNKNOWN')
ORDER BY cs.created_at DESC;

-- 6. WASTE EVENTS AUDIT
WITH waste_classification AS (
  SELECT 
    we.id AS waste_id,
    we.created_at,
    s.name AS store_name,
    COUNT(wi.id) AS total_items,
    SUM(CASE WHEN (
      p.name ILIKE '%test%' OR p.name ILIKE '%e2e%' OR p.name ILIKE '%demo%'
      OR p.name ILIKE '%automat%' OR p.name ILIKE 'PRODUS_SGR%' OR p.name ILIKE 'PRODUS_NORM%'
      OR p.barcode ILIKE 'TEST-%' OR p.barcode ILIKE 'E2E_%'
      OR p.name ILIKE '%6CAT1%' OR p.name ILIKE '%6REC1%' OR p.name ILIKE '%6REC12%'
    ) THEN 1 ELSE 0 END) AS test_items_count
  FROM waste_events we
  JOIN waste_items wi ON we.id = wi.waste_id
  JOIN products p ON wi.product_id = p.id
  JOIN stores s ON we.store_id = s.id
  GROUP BY we.id, we.created_at, s.name
)
SELECT 
  waste_id,
  created_at,
  store_name,
  total_items,
  test_items_count,
  CASE 
    WHEN test_items_count = total_items THEN 'TEST_WASTE_EVENT'
    WHEN test_items_count > 0 AND test_items_count < total_items THEN 'MIXED_WASTE_EVENT'
    ELSE 'REAL_WASTE_EVENT'
  END AS waste_classification
FROM waste_classification
ORDER BY created_at DESC;

-- 7. POS DEVICES LIST
SELECT 
  pd.id AS device_id,
  pd.device_name,
  pd.device_fingerprint,
  s.name AS store_name,
  pd.active,
  pd.last_seen_at
FROM pos_devices pd
JOIN stores s ON pd.store_id = s.id
ORDER BY pd.device_name;

-- 8. USER magazin@magazin.com AUDIT
SELECT 
  p.id AS profile_id,
  p.email,
  p.role AS global_role,
  sm.role AS store_member_role,
  s.name AS store_name
FROM profiles p
LEFT JOIN store_members sm ON p.id = sm.profile_id
LEFT JOIN stores s ON sm.store_id = s.id
WHERE p.email = 'magazin@magazin.com';
