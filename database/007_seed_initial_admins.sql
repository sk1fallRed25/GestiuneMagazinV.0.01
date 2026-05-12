-- ############################################################################
-- SEED INIȚIAL v2 - ADMINISTRARE ȘI MAGAZIN PRINCIPAL (ACTIV)
-- ############################################################################

-- 1. CREARE MAGAZIN PRINCIPAL
-- UUID Fix pentru a asigura stabilitatea referințelor în scripturile de test
INSERT INTO public.stores (id, name, address, fiscal_code)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Magazin Principal', 
    'Strada Exemplu Nr. 1', 
    'RO12345678'
) ON CONFLICT (id) DO NOTHING;

-- 2. SEED PROFILE PENTRU ADMINISTRARE
-- NOTĂ: Utilizatorii admin@owner.com și admin@admin.com TREBUIE să fie creați 
-- manual în Supabase Auth înainte de rularea acestui script.

-- 2.1. Seed Platform Owner (admin@owner.com)
DO $$
DECLARE 
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@owner.com';
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, active)
        VALUES (v_user_id, 'admin@owner.com', 'Platform Owner', 'platform_owner', true)
        ON CONFLICT (id) DO UPDATE SET role = 'platform_owner', active = true;
        
        RAISE NOTICE 'User admin@owner.com a fost configurat ca platform_owner.';
    ELSE
        RAISE NOTICE 'User admin@owner.com NU există în auth.users. Creează-l în Supabase Auth înainte de seed.';
    END IF;
END $$;


-- 2.2. Seed Store Admin (admin@admin.com)
DO $$
DECLARE 
    v_user_id UUID;
    v_store_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@admin.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Adăugare/Actualizare Profil
        INSERT INTO public.profiles (id, email, full_name, role, active)
        VALUES (v_user_id, 'admin@admin.com', 'Administrator Magazin', 'admin', true)
        ON CONFLICT (id) DO UPDATE SET role = 'admin', active = true;
        
        -- Adăugare în Store Members (asociere cu Magazin Principal)
        INSERT INTO public.store_members (store_id, profile_id, role, active)
        VALUES (v_store_id, v_user_id, 'admin', true)
        ON CONFLICT (store_id, profile_id) DO UPDATE SET role = 'admin', active = true;
        
        RAISE NOTICE 'User admin@admin.com a fost configurat ca admin pentru Magazin Principal.';
    ELSE
        RAISE NOTICE 'User admin@admin.com NU există în auth.users. Creează-l în Supabase Auth înainte de seed.';
    END IF;
END $$;

-- ############################################################################
-- VERIFICARE REZULTATE SEED
-- ############################################################################
-- SELECT p.email, p.role, s.name as store_name, sm.role as store_role
-- FROM public.profiles p
-- LEFT JOIN public.store_members sm ON p.id = sm.profile_id
-- LEFT JOIN public.stores s ON sm.store_id = s.id;
