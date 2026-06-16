-- =============================================================================
-- 6DATA.3 — Database Cleanup Archive Dry Run (VARIANTA B)
-- =============================================================================
-- This script performs a DRY RUN of renaming remaining test products with
-- the prefix '[ARCHIVED_TEST] ' and test categories with '[ARCHIVED_TEST] '.
-- NO COMMIT is allowed. The transaction ends with ROLLBACK.
-- =============================================================================

BEGIN;

-- 1. PREVIEW: Products to be renamed
SELECT 'products_to_archive' AS target, COUNT(*) AS count 
FROM products
WHERE (name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
   OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%')
  AND name NOT LIKE '[ARCHIVED_TEST]%';

-- 2. PREVIEW: Categories to be renamed
SELECT 'categories_to_archive' AS target, COUNT(*) AS count 
FROM categories
WHERE (name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%'
   OR name ILIKE '%test%' OR name ILIKE '%teste%')
  AND name NOT LIKE '[ARCHIVED_TEST]%';

-- 3. EXECUTE UPDATE (Commented or followed by ROLLBACK)
-- Update products name
UPDATE products 
SET name = '[ARCHIVED_TEST] ' || name
WHERE (name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
   OR name ILIKE '%6CAT1%' OR name ILIKE '%6REC1%' OR name ILIKE '%6REC12%')
  AND name NOT LIKE '[ARCHIVED_TEST]%';

-- Update categories name
UPDATE categories 
SET name = '[ARCHIVED_TEST] ' || name
WHERE (name ILIKE '%Root E2E%' OR name ILIKE '%Sub E2E%' OR name ILIKE '%Test Cat 6CAT1%' OR name ILIKE '%Test Subcat 6CAT1%'
   OR name ILIKE '%test%' OR name ILIKE '%teste%')
  AND name NOT LIKE '[ARCHIVED_TEST]%';

-- 4. VERIFY: Show modified samples
SELECT name, barcode FROM products WHERE name LIKE '[ARCHIVED_TEST]%' LIMIT 10;
SELECT name FROM categories WHERE name LIKE '[ARCHIVED_TEST]%' LIMIT 10;

-- 5. SAFETY ROLLBACK (DO NOT REMOVE OR CHANGE TO COMMIT IN 6DATA.3)
ROLLBACK;
