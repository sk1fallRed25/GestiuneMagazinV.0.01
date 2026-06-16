[ignoring loop detection]
-- =============================================================================
-- 6DATA.2 — Database Cleanup EXECUTION (CONTROLLED CLEANUP)
-- =============================================================================
-- SAFETY MODE:
-- By default this script ends with ROLLBACK.
-- Change ROLLBACK to COMMIT only after manual verification of all preview counts.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- SECȚIUNEA 1: PREVIEW INAINTE DE SHAPING
-- ═══════════════════════════════════════════════════════════════════

SELECT 'stores_test' AS target, COUNT(*) AS rows_to_delete FROM stores
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%mock%' OR name ILIKE '%suspendat e2e%' OR name ILIKE '%audit test%';

SELECT 'products_test' AS target, COUNT(*) AS rows_to_delete FROM products
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
   OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%';

SELECT 'categories_test' AS target, COUNT(*) AS rows_to_delete FROM categories
WHERE (name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%')
   OR store_id IN (SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%' OR name ILIKE '%audit test%');

SELECT 'receptions_test' AS target, COUNT(*) AS rows_to_delete FROM receptions
WHERE document_number ILIKE 'REC-%' OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'INV-6REC12%'
   OR document_number ILIKE 'TEST%' OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%';

SELECT 'store_members_test' AS target, COUNT(*) AS rows_to_delete FROM store_members
WHERE store_id IN (SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%' OR name ILIKE '%audit test%');


-- ═══════════════════════════════════════════════════════════════════
-- SECȚIUNEA 2: EXECUTARE DELETE (COPIL -> PARINTE)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Audit logs din magazinele test
DELETE FROM audit_logs 
WHERE store_id IN (
    SELECT id FROM stores 
    WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%' OR name ILIKE '%audit test%'
);

-- 2. Store members din magazinele test
DELETE FROM store_members 
WHERE store_id IN (
    SELECT id FROM stores 
    WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%' OR name ILIKE '%audit test%'
);

-- 3. Reception items din receptii de test
DELETE FROM reception_items 
WHERE reception_id IN (
    SELECT id FROM receptions 
    WHERE document_number ILIKE 'REC-%' OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'INV-6REC12%'
       OR document_number ILIKE 'TEST%' OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%'
);

-- 4. Receptions de test
DELETE FROM receptions 
WHERE document_number ILIKE 'REC-%' OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'INV-6REC12%'
   OR document_number ILIKE 'TEST%' OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%';

-- 5. Stock movements generate de produse de test sau receptii de test
DELETE FROM stock_movements 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
       OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
       OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
       OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%'
) OR reference_id IN (
    SELECT id FROM receptions 
    WHERE document_number ILIKE 'REC-%' OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'INV-6REC12%'
       OR document_number ILIKE 'TEST%' OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%'
);

-- 6. Stock batches generate de produse de test
DELETE FROM stock_batches 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
       OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
       OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
       OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%'
);

-- 7. Product prices pentru produse de test
DELETE FROM product_prices 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
       OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
       OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
       OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%'
);

-- 8. Products de test
DELETE FROM products 
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
   OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%';

-- 9. Categorii si subcategorii de test (Root E2E, Sub E2E, 6CAT1)
-- 9a. Subcategorii (parent_id is not null)
DELETE FROM categories 
WHERE parent_id IS NOT NULL AND (
    (name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%')
    OR store_id IN (SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%' OR name ILIKE '%audit test%')
);

-- 9b. Categorii radacina (parent_id is null)
DELETE FROM categories 
WHERE parent_id IS NULL AND (
    (name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%')
    OR store_id IN (SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%' OR name ILIKE '%audit test%')
);

-- 10. Stores de test
DELETE FROM stores 
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%mock%' OR name ILIKE '%suspendat e2e%' OR name ILIKE '%audit test%';


-- ═══════════════════════════════════════════════════════════════════
-- SECȚIUNEA 3: POST-DELETE VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

SELECT 'stores_remaining' AS target, COUNT(*) AS count FROM stores;
SELECT 'products_remaining' AS target, COUNT(*) AS count FROM products;
SELECT 'categories_remaining' AS target, COUNT(*) AS count FROM categories;
SELECT 'receptions_remaining' AS target, COUNT(*) AS count FROM receptions;


-- ═══════════════════════════════════════════════════════════════════
-- INSTRUCTIUNE: Schimba ROLLBACK in COMMIT dupa ce ai verificat count-urile
-- ═══════════════════════════════════════════════════════════════════

ROLLBACK;
-- COMMIT;
