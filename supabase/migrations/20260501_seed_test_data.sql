-- ======================================================================================
-- SEED TEST DATA FOR STAGING (FAZA 5.10)
-- ======================================================================================

DO $$ 
DECLARE 
    v_org_id UUID;
    v_store_id UUID;
    v_warehouse_id UUID;
BEGIN
    -- 1. Organizație
    INSERT INTO organizations (name, slug, is_vat_payer)
    VALUES ('Magazin Test Staging', 'magazin-test-staging', true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_org_id;

    -- 2. Locații
    INSERT INTO locations (organization_id, name, type)
    VALUES (v_org_id, 'Magazin Central (Store)', 'store')
    ON CONFLICT (organization_id, id) DO NOTHING
    RETURNING id INTO v_store_id;

    IF v_store_id IS NULL THEN
        SELECT id INTO v_store_id FROM locations WHERE organization_id = v_org_id AND name = 'Magazin Central (Store)';
    END IF;

    INSERT INTO locations (organization_id, name, type)
    VALUES (v_org_id, 'Depozit Sud (Warehouse)', 'warehouse')
    ON CONFLICT (organization_id, id) DO NOTHING
    RETURNING id INTO v_warehouse_id;

    IF v_warehouse_id IS NULL THEN
        SELECT id INTO v_warehouse_id FROM locations WHERE organization_id = v_org_id AND name = 'Depozit Sud (Warehouse)';
    END IF;

    -- 3. Payment Methods
    INSERT INTO payment_methods (organization_id, name, code)
    VALUES 
        (v_org_id, 'Numerar', 'cash'),
        (v_org_id, 'Card Bancar', 'card')
    ON CONFLICT (organization_id, code) DO NOTHING;

    -- 4. Audit Log (Optional)
    INSERT INTO audit_logs (organization_id, action, table_name)
    VALUES (v_org_id, 'SEED_STAGING_DATA', 'multiple');

    RAISE NOTICE 'Seed completed for org: %', v_org_id;
END $$;
