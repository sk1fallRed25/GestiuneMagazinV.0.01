-- ======================================================================================
-- SEED LICENSE DATA FOR STAGING (FAZA 6.1)
-- ======================================================================================

DO $$ 
DECLARE 
    v_org_id UUID;
    v_plan_id UUID;
BEGIN
    -- 1. Obține ID-ul organizației de test
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'magazin-test-staging';

    -- 2. Creează un plan de test
    INSERT INTO subscription_plans (name, code, price_monthly, max_locations, max_devices)
    VALUES ('MagazinPro Business (Staging)', 'BIZ_STAGING', 99.00, 5, 10)
    ON CONFLICT (code) DO UPDATE SET max_devices = 10
    RETURNING id INTO v_plan_id;

    -- 3. Creează un abonament activ pentru organizație
    INSERT INTO subscriptions (organization_id, plan_id, status, start_date, end_date)
    VALUES (v_org_id, v_plan_id, 'active', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '1 year')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'License seed completed for org: %', v_org_id;
END $$;
