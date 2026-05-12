-- ############################################################################
-- PLAN SEEDING PROFILES (NEAPLICAT)
-- Scop: Popularea tabelei 'public.profiles' pe baza utilizatorilor din 'auth.users'.
-- ############################################################################

/*
-- NOTĂ: Tabela 'profiles' trebuie să aibă coloana 'role' și 'active' (sau similar).
-- Dacă nu există, rulați mai întâi (exemplu):
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 1. Sincronizare Platform Owner (Super Admin)
-- Presupunem că adresa email este 'admin@owner.com'
INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
    id, 
    'Platform Owner', 
    'platform_owner', 
    NOW()
FROM auth.users 
WHERE email = 'admin@owner.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'platform_owner', full_name = 'Platform Owner';


-- 2. Sincronizare Administrator Magazin
-- Presupunem că adresa email este 'admin@admin.com'
INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
    id, 
    'Administrator Magazin', 
    'admin', 
    NOW()
FROM auth.users 
WHERE email = 'admin@admin.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', full_name = 'Administrator Magazin';


-- 3. Sincronizare automată pentru restul utilizatorilor existenți
-- (Dacă vrem să migrăm toți userii din 'auth.users' care nu au profil)
INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email), 
    'user', 
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

*/

-- ############################################################################
-- VERIFICARE REZULTATE
-- ############################################################################
-- SELECT p.id, au.email, p.role 
-- FROM public.profiles p
-- JOIN auth.users au ON p.id = au.id;
