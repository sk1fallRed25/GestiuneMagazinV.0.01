-- ############################################################################
-- SEED INIȚIAL v2 - ADMINISTRARE ȘI MAGAZIN PRINCIPAL
-- ############################################################################

-- 1. CREARE MAGAZIN PRINCIPAL
INSERT INTO public.stores (id, name, address, fiscal_code)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- UUID Fix pentru testare ușoară
    'Magazin Principal', 
    'Strada Exemplu Nr. 1', 
    'RO12345678'
) ON CONFLICT (id) DO NOTHING;

-- 2. SEED PROFILE PENTRU ADMINISTRARE
-- ATENȚIE: Utilizatorii trebuie să fie creați în Supabase Auth înainte de rulare.

/*
-- 2.1. Seed Platform Owner (admin@owner.com)
DO $$
DECLARE 
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@owner.com';
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (v_user_id, 'admin@owner.com', 'Platform Owner', 'platform_owner')
        ON CONFLICT (id) DO UPDATE SET role = 'platform_owner';
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
        -- Adăugare Profil
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (v_user_id, 'admin@admin.com', 'Administrator Magazin', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
        
        -- Adăugare în Store
        INSERT INTO public.store_members (store_id, profile_id, role)
        VALUES (v_store_id, v_user_id, 'admin')
        ON CONFLICT (store_id, profile_id) DO NOTHING;
    END IF;
END $$;
*/

-- ############################################################################
-- VERIFICARE
-- ############################################################################
-- SELECT p.email, p.role, s.name as store_name, sm.role as store_role
-- FROM public.profiles p
-- LEFT JOIN public.store_members sm ON p.id = sm.profile_id
-- LEFT JOIN public.stores s ON sm.store_id = s.id;
