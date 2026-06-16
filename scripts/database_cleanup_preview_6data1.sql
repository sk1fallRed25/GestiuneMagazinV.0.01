-- =============================================================================
-- 6DATA.1 — Database Cleanup PREVIEW (SELECT ONLY)
-- Data: 2026-06-16 | IMPORTANT: Doar SELECT. Nu conține DELETE.
-- =============================================================================

-- 1. Conturi păstrate
SELECT id, email, full_name, role, active FROM profiles
WHERE email IN ('admin@owner.com','admin@admin.com','casier@casier.com');

-- 2. Toți utilizatorii
SELECT id, email, full_name, role, active FROM profiles ORDER BY created_at;

-- 3. Magazine reale (păstrate)
SELECT id, name, active FROM stores
WHERE name NOT ILIKE '%test%' AND name NOT ILIKE '%e2e%'
  AND name NOT ILIKE '%demo%' AND name NOT ILIKE '%mock%'
  AND name NOT ILIKE '%suspendat e2e%' AND name NOT ILIKE '%audit test%';

-- 4. Magazine test (propuse ștergere)
SELECT id, name, active FROM stores
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%mock%' OR name ILIKE '%suspendat e2e%' OR name ILIKE '%audit test%';

-- 5. Utilizatori test (propuși ștergere)
SELECT id, email, role FROM profiles
WHERE email ILIKE '%test%' OR email ILIKE '%e2e%' OR email ILIKE '%demo%';

-- 6. Utilizatori care nu sunt în lista de păstrare (NECESITĂ CONFIRMARE)
SELECT id, email, role FROM profiles
WHERE email NOT IN ('admin@owner.com','admin@admin.com','casier@casier.com');

-- 7. Membership-uri către magazine test
SELECT sm.store_id, sm.profile_id, sm.role, s.name, p.email
FROM store_members sm JOIN stores s ON s.id=sm.store_id JOIN profiles p ON p.id=sm.profile_id
WHERE s.name ILIKE '%test%' OR s.name ILIKE '%e2e%' OR s.name ILIKE '%suspendat%' OR s.name ILIKE '%audit test%';

-- 8. Produse test
SELECT p.id, p.name, p.barcode, s.name AS store FROM products p JOIN stores s ON s.id=p.store_id
WHERE p.name ILIKE '%test%' OR p.name ILIKE '%e2e%' OR p.name ILIKE '%demo%'
   OR p.name ILIKE '%automat%' OR p.name ILIKE 'PRODUS_SGR%' OR p.name ILIKE 'PRODUS_NORM%'
   OR p.barcode ILIKE 'TEST-%' OR p.barcode ILIKE 'E2E_%';

SELECT COUNT(*) AS total_test_products FROM products
WHERE name ILIKE '%test%' OR name ILIKE '%e2e%' OR name ILIKE '%demo%'
   OR name ILIKE '%automat%' OR name ILIKE 'PRODUS_SGR%' OR name ILIKE 'PRODUS_NORM%'
   OR barcode ILIKE 'TEST-%' OR barcode ILIKE 'E2E_%';

-- 9. Categorii/subcategorii test
SELECT c.id, c.name, c.parent_id, s.name AS store FROM categories c JOIN stores s ON s.id=c.store_id
WHERE c.name ILIKE '%test%' OR c.name ILIKE '%e2e%' OR c.name ILIKE '%6CAT1%';

-- 10. Categorii "test"/"teste" pe STEF&MON STORE — NECESITĂ CONFIRMARE MANUALĂ
SELECT c.id, c.name FROM categories c JOIN stores s ON s.id=c.store_id
WHERE s.name='STEF&MON STORE' AND c.name ILIKE '%test%';

-- 11. Recepții test
SELECT r.id, r.document_number, r.supplier_text, r.status, s.name AS store
FROM receptions r JOIN stores s ON s.id=r.store_id
WHERE r.document_number ILIKE 'REC-%' OR r.document_number ILIKE 'INV-6REC1%'
   OR r.document_number ILIKE 'TEST%' OR r.supplier_text ILIKE '%test%' OR r.supplier_text ILIKE '%e2e%';

-- 12. Reception items test
SELECT ri.id, ri.reception_id, r.document_number FROM reception_items ri
JOIN receptions r ON r.id=ri.reception_id
WHERE r.document_number ILIKE 'REC-%' OR r.document_number ILIKE 'INV-6REC1%'
   OR r.document_number ILIKE 'TEST%' OR r.supplier_text ILIKE '%test%';

-- 13. Stock movements de la recepții test
SELECT sm.id, sm.type, sm.quantity, sm.reference_id FROM stock_movements sm
WHERE sm.reference_id IN (
  SELECT r.id FROM receptions r WHERE r.document_number ILIKE 'REC-%'
    OR r.document_number ILIKE 'INV-6REC1%' OR r.document_number ILIKE 'TEST%'
    OR r.supplier_text ILIKE '%test%'
);

-- 14. Audit logs test (magazine test)
SELECT al.id, al.action, al.entity_type, s.name FROM audit_logs al
LEFT JOIN stores s ON s.id=al.store_id
WHERE s.name ILIKE '%test%' OR s.name ILIKE '%e2e%' OR s.name ILIKE '%audit test%'
LIMIT 50;

-- 15. Totaluri per tabel
SELECT 'profiles' AS tabel, COUNT(*) AS total FROM profiles UNION ALL
SELECT 'stores', COUNT(*) FROM stores UNION ALL
SELECT 'store_members', COUNT(*) FROM store_members UNION ALL
SELECT 'categories', COUNT(*) FROM categories UNION ALL
SELECT 'products', COUNT(*) FROM products UNION ALL
SELECT 'product_prices', COUNT(*) FROM product_prices UNION ALL
SELECT 'stock_batches', COUNT(*) FROM stock_batches UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements UNION ALL
SELECT 'receptions', COUNT(*) FROM receptions UNION ALL
SELECT 'reception_items', COUNT(*) FROM reception_items UNION ALL
SELECT 'sales', COUNT(*) FROM sales UNION ALL
SELECT 'sale_items', COUNT(*) FROM sale_items UNION ALL
SELECT 'payments', COUNT(*) FROM payments UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs UNION ALL
SELECT 'waste_events', COUNT(*) FROM waste_events UNION ALL
SELECT 'waste_items', COUNT(*) FROM waste_items UNION ALL
SELECT 'pos_shifts', COUNT(*) FROM pos_shifts UNION ALL
SELECT 'cash_registers', COUNT(*) FROM cash_registers
ORDER BY tabel;
