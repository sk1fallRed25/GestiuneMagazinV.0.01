-- =============================================================================
-- 6DATA.1 — Database Cleanup DRY RUN ONLY
-- =============================================================================
-- IMPORTANT: Acest script NU EXECUTA ȘTERGERI.
-- Toate DELETE-urile sunt COMENTATE.
-- Finalul scriptului conține ROLLBACK, nu COMMIT.
-- Data: 2026-06-16
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- FAZA 0: PREVIEW — Contorizare rânduri de șters
-- ═══════════════════════════════════════════════════════════════════

-- Preview: magazine test
SELECT 'stores_test' AS target, COUNT(*) AS rows_to_delete FROM stores
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%mock%' OR name ILIKE '%suspendat e2e%' OR name ILIKE '%audit test%';

-- Preview: produse test
SELECT 'products_test' AS target, COUNT(*) AS rows_to_delete FROM products
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%';

-- Preview: categorii test
SELECT 'categories_test' AS target, COUNT(*) AS rows_to_delete FROM categories
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%6CAT1%';

-- Preview: recepții test
SELECT 'receptions_test' AS target, COUNT(*) AS rows_to_delete FROM receptions
WHERE document_number ILIKE 'REC-%' OR document_number ILIKE 'INV-6REC1%'
   OR document_number ILIKE 'TEST%' OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%';

-- Preview: membership-uri test
SELECT 'memberships_test' AS target, COUNT(*) AS rows_to_delete FROM store_members
WHERE store_id IN (SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
   OR name ILIKE '%demo%' OR name ILIKE '%suspendat%' OR name ILIKE '%audit test%');


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 1: ȘTERGERE LOGURI/AUDIT TEST (comentat)
-- Ordinea: copil → părinte
-- ═══════════════════════════════════════════════════════════════════

-- 1. Audit logs asociate magazinelor test
-- DELETE FROM audit_logs WHERE store_id IN (
--   SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--     OR name ILIKE '%demo%' OR name ILIKE '%audit test%'
-- );


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 2: ȘTERGERE SALE_ITEMS / SALES TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 2a. Payments asociate vânzărilor din magazine test
-- DELETE FROM payments WHERE sale_id IN (
--   SELECT id FROM sales WHERE store_id IN (
--     SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--   )
-- );

-- 2b. Sale items din magazine test
-- DELETE FROM sale_items WHERE sale_id IN (
--   SELECT id FROM sales WHERE store_id IN (
--     SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--   )
-- );

-- 2c. Sales din magazine test
-- DELETE FROM sales WHERE store_id IN (
--   SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
-- );


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 3: ȘTERGERE POS SHIFTS TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 3. POS shifts asociate magazinelor test
-- DELETE FROM pos_shifts WHERE store_id IN (
--   SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
-- );


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 4: ȘTERGERE RECEPTION ITEMS / RECEPTIONS TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 4a. Reception items test
-- DELETE FROM reception_items WHERE reception_id IN (
--   SELECT id FROM receptions WHERE document_number ILIKE 'REC-%'
--     OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'TEST%'
--     OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%'
-- );

-- 4b. Receptions test
-- DELETE FROM receptions WHERE document_number ILIKE 'REC-%'
--   OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'TEST%'
--   OR supplier_text ILIKE '%test%' OR supplier_text ILIKE '%e2e%';


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 5: ȘTERGERE STOCK MOVEMENTS / BATCHES TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 5a. Stock movements asociate recepțiilor test
-- DELETE FROM stock_movements WHERE reference_id IN (
--   SELECT id FROM receptions WHERE document_number ILIKE 'REC-%'
--     OR document_number ILIKE 'INV-6REC1%' OR document_number ILIKE 'TEST%'
--     OR supplier_text ILIKE '%test%'
-- );

-- 5b. Stock movements asociate produselor test
-- DELETE FROM stock_movements WHERE product_id IN (
--   SELECT id FROM products WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--     OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
--     OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
-- );

-- 5c. Stock batches asociate produselor test
-- DELETE FROM stock_batches WHERE product_id IN (
--   SELECT id FROM products WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--     OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
--     OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
-- );


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 6: ȘTERGERE PREȚURI / PRODUSE TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 6a. Product prices pentru produse test
-- DELETE FROM product_prices WHERE product_id IN (
--   SELECT id FROM products WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--     OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
--     OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%'
-- );

-- 6b. Products test
-- DELETE FROM products WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--   OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
--   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%';


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 7: ȘTERGERE CATEGORII TEST (comentat)
-- Ordinea: subcategorii → categorii root
-- ═══════════════════════════════════════════════════════════════════

-- 7a. Subcategorii test (parent_id NOT NULL)
-- DELETE FROM categories WHERE parent_id IS NOT NULL AND (
--   name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%6CAT1%'
-- );

-- 7b. Categorii root test (parent_id IS NULL)
-- DELETE FROM categories WHERE parent_id IS NULL AND (
--   name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%6CAT1%'
-- );


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 8: ȘTERGERE MEMBERSHIPS TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 8. Store members pentru magazine test
-- DELETE FROM store_members WHERE store_id IN (
--   SELECT id FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--     OR name ILIKE '%demo%' OR name ILIKE '%suspendat%' OR name ILIKE '%audit test%'
-- );


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 9: ȘTERGERE MAGAZINE TEST (comentat)
-- ═══════════════════════════════════════════════════════════════════

-- 9. Stores test
-- DELETE FROM stores WHERE name ILIKE '%test%' OR name ILIKE '%e2e%'
--   OR name ILIKE '%demo%' OR name ILIKE '%mock%'
--   OR name ILIKE '%suspendat e2e%' OR name ILIKE '%audit test%';


-- ═══════════════════════════════════════════════════════════════════
-- FAZA 10: ȘTERGERE PROFIL USER NEPĂSTRAT (comentat)
-- NECESITĂ CONFIRMARE MANUALĂ — magazin@magazin.com
-- ═══════════════════════════════════════════════════════════════════

-- 10. Profiles test (doar dacă confirmat)
-- DELETE FROM profiles WHERE email NOT IN (
--   'admin@owner.com', 'admin@admin.com', 'casier@casier.com'
-- ) AND email ILIKE '%test%' OR email ILIKE '%e2e%' OR email ILIKE '%demo%';

-- NOTĂ: magazin@magazin.com NU se șterge automat — NECESITĂ CONFIRMARE MANUALĂ


-- ═══════════════════════════════════════════════════════════════════
-- FINAL: ROLLBACK — NICIO MODIFICARE NU ESTE PERSISTENTĂ
-- ═══════════════════════════════════════════════════════════════════

ROLLBACK;
-- NU SE FOLOSESTE COMMIT ÎN ACEASTĂ ETAPĂ (6DATA.1)
