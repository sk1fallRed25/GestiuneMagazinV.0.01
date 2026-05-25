-- ======================================================================================
-- LINK TEST USERS AND CONFIRM EMAILS (FAZA 5.10)
-- ======================================================================================

DO $$ 
DECLARE 
    v_org_id UUID;
    v_store_id UUID;
    v_warehouse_id UUID;
    v_admin_id UUID := '7d61011c-86ef-48b9-a826-eba1c3ab9597';
    v_casier_id UUID := '9f14ff73-4ee7-4c4b-bfb8-79cf06ce8504';
    v_gestionar_id UUID := '0bd1d8ea-85de-4f51-822c-03c35be51395';
BEGIN
    -- 1. Obține ID-uri
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'magazin-test-staging';
    SELECT id INTO v_store_id FROM locations WHERE organization_id = v_org_id AND name = 'Magazin Central (Store)';
    SELECT id INTO v_warehouse_id FROM locations WHERE organization_id = v_org_id AND name = 'Depozit Sud (Warehouse)';

    -- 2. Confirmă mail-uri în auth.users (Tabel de sistem, necesită superuser - db push rulează ca superuser)
    UPDATE auth.users SET email_confirmed_at = now() WHERE id IN (v_admin_id, v_casier_id, v_gestionar_id);

    -- 3. Profiles (Dacă nu s-au creat prin trigger - în v2 nu am pus trigger încă)
    INSERT INTO profiles (id, email, full_name, default_organization_id)
    VALUES 
        (v_admin_id, 'admin-test@magazinpro.ro', 'Admin Test', v_org_id),
        (v_casier_id, 'casier-test@magazinpro.ro', 'Casier Test', v_org_id),
        (v_gestionar_id, 'gestionar-test@magazinpro.ro', 'Gestionar Test', v_org_id)
    ON CONFLICT (id) DO UPDATE SET default_organization_id = v_org_id;

    -- 4. Organization Members
    INSERT INTO organization_members (organization_id, profile_id, role_id)
    VALUES 
        (v_org_id, v_admin_id, 'admin_firma'),
        (v_org_id, v_casier_id, 'casier'),
        (v_org_id, v_gestionar_id, 'gestionar')
    ON CONFLICT (organization_id, profile_id) DO UPDATE SET role_id = EXCLUDED.role_id;

    -- 5. Location Members
    INSERT INTO location_members (organization_id, location_id, profile_id, role_id)
    VALUES 
        (v_org_id, v_store_id, v_casier_id, 'casier'),
        (v_org_id, v_warehouse_id, v_gestionar_id, 'gestionar')
    ON CONFLICT (location_id, profile_id) DO NOTHING;

    RAISE NOTICE 'Users linked and confirmed for org: %', v_org_id;
END $$;
