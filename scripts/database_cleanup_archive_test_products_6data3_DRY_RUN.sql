-- =============================================================================
-- DATABASE CLEANUP — VARIANTA B: LOGICAL ARCHIVAL (DRY RUN)
-- =============================================================================
-- Purpose  : Rename test products & categories with '[ARCHIVED_TEST] ' prefix
-- Safety   : Wrapped in BEGIN … ROLLBACK — NO data is permanently changed
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
--  *** NO COMMIT IS ALLOWED — Transaction ends with ROLLBACK ***
--  *** This is a DRY RUN — execute safely to verify counts   ***
--
-- =============================================================================

BEGIN;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 1: PREVIEW — Products to be archived                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- PREVIEW: Products to be archived ---' AS step;

SELECT
    p.id,
    p.name                      AS current_name,
    '[ARCHIVED_TEST] ' || p.name AS new_name,
    p.barcode,
    s.name                      AS store_name
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE (
       p.name ILIKE '%test%'
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
)
AND p.name NOT LIKE '[ARCHIVED_TEST]%'
ORDER BY s.name, p.name;

SELECT '--- Products to archive count ---' AS step,
       COUNT(*) AS products_to_archive
FROM products
WHERE (
       name ILIKE '%test%'
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
)
AND name NOT LIKE '[ARCHIVED_TEST]%';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 2: PREVIEW — Categories to be archived                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- PREVIEW: Categories to be archived ---' AS step;

SELECT
    c.id,
    c.name                      AS current_name,
    '[ARCHIVED_TEST] ' || c.name AS new_name,
    c.parent_id,
    s.name                      AS store_name,
    CASE WHEN c.parent_id IS NULL THEN 'ROOT' ELSE 'SUBCATEGORY' END AS category_level
FROM categories c
JOIN stores s ON s.id = c.store_id
WHERE (
       c.name ILIKE '%test%'
    OR c.name ILIKE '%6CAT1%'
)
AND c.name NOT LIKE '[ARCHIVED_TEST]%'
ORDER BY s.name, c.parent_id NULLS FIRST, c.name;

SELECT '--- Categories to archive count ---' AS step,
       COUNT(*) AS categories_to_archive
FROM categories
WHERE (
       name ILIKE '%test%'
    OR name ILIKE '%6CAT1%'
)
AND name NOT LIKE '[ARCHIVED_TEST]%';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 3: DRY-RUN UPDATE — Rename test products                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- DRY-RUN: Renaming test products ---' AS step;

UPDATE products
SET name = '[ARCHIVED_TEST] ' || name
WHERE (
       name ILIKE '%test%'
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
)
AND name NOT LIKE '[ARCHIVED_TEST]%';

-- Report rows affected
SELECT '--- Products renamed ---' AS step,
       COUNT(*) AS archived_products
FROM products
WHERE name LIKE '[ARCHIVED_TEST]%';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 4: DRY-RUN UPDATE — Rename test categories                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- DRY-RUN: Renaming test categories ---' AS step;

UPDATE categories
SET name = '[ARCHIVED_TEST] ' || name
WHERE (
       name ILIKE '%test%'
    OR name ILIKE '%6CAT1%'
)
AND name NOT LIKE '[ARCHIVED_TEST]%';

-- Report rows affected
SELECT '--- Categories renamed ---' AS step,
       COUNT(*) AS archived_categories
FROM categories
WHERE name LIKE '[ARCHIVED_TEST]%';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 5: VERIFY — Show modified samples                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT '--- VERIFY: Sample archived products ---' AS step;

SELECT name, barcode
FROM products
WHERE name LIKE '[ARCHIVED_TEST]%'
ORDER BY name
LIMIT 10;

SELECT '--- VERIFY: Sample archived categories ---' AS step;

SELECT name
FROM categories
WHERE name LIKE '[ARCHIVED_TEST]%'
ORDER BY name
LIMIT 10;


-- =============================================================================
-- ROLLBACK — No changes are persisted
-- =============================================================================
ROLLBACK;

-- =============================================================================
-- END OF DRY RUN — VARIANTA B (Logical Archival)
-- =============================================================================
