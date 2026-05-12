-- ############################################################################
-- HARTĂ MIGRARE LEGACY -> v2 (NEAPLICATĂ)
-- Acest script este un GHID pentru transformarea datelor.
-- ############################################################################

/*
-- 1. PREGĂTIRE TABELĂ MAPPING ID-URI
-- Deoarece trecem de la BigInt (legacy) la UUID (v2), avem nevoie de o referință.
CREATE TEMP TABLE id_mapping (
    legacy_type TEXT,
    legacy_id BIGINT,
    new_id UUID
);

-- 2. MIGRARE UTILIZATORI -> PROFILES
-- Notă: Această etapă necesită ca utilizatorii să existe deja în auth.users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    au.id, 
    u.email, 
    u.nume, 
    CASE 
        WHEN u.rol = 'admin' THEN 'admin'
        WHEN u.rol = 'gestionar' THEN 'gestionar'
        ELSE 'casier'
    END
FROM public.utilizatori u
JOIN auth.users au ON au.email = u.email;


-- 3. MIGRARE PRODUSE -> PRODUCTS
-- Generăm un mapping pentru a păstra relațiile în vânzări
WITH inserted_products AS (
    INSERT INTO public.products (organization_id, name, barcode, unit)
    SELECT 
        'ID_ORGANIZATIE_AICI', 
        nume, 
        cod_bare, 
        'buc'
    FROM public.produse
    RETURNING id, barcode
)
INSERT INTO id_mapping (legacy_type, legacy_id, new_id)
SELECT 'product', p.id, ip.id
FROM public.produse p
JOIN inserted_products ip ON ip.barcode = p.cod_bare;


-- 4. MIGRARE STOCURI -> STOCK_BATCHES
INSERT INTO public.stock_batches (organization_id, location_id, product_id, quantity, zone)
SELECT 
    'ID_ORGANIZATIE_AICI',
    'ID_LOCATIE_MAGAZIN',
    m.new_id,
    p.stoc_magazin,
    'magazin'
FROM public.produse p
JOIN id_mapping m ON m.legacy_id = p.id AND m.legacy_type = 'product'
WHERE p.stoc_magazin > 0;


-- 5. MIGRARE VÂNZĂRI -> SALES
-- (Simplificat: migrarea doar a totalului și datei)
INSERT INTO public.sales (organization_id, location_id, total_amount, created_at)
SELECT 
    'ID_ORGANIZATIE_AICI',
    'ID_LOCATIE_MAGAZIN',
    total,
    data_vanzare
FROM public.vanzari;

*/

-- OBSERVAȚII CRITICE:
-- 1. ID_ORGANIZATIE_AICI trebuie înlocuit cu UUID-ul creat în PASUL 3 din planul de execuție.
-- 2. Migrarea detaliilor de vânzare necesită maparea ID-ului vânzării legacy la noul UUID.
-- 3. Datele de expirare din schema legacy (dacă există) trebuie mapate la 'expiry_date' în 'stock_batches'.
