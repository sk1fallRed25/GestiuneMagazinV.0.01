-- ======================================================================================
-- FAZA 6.1: RPC LICENSE & DEVICE MANAGEMENT
-- ======================================================================================

-- 1. RPC: check_license
-- Verifică dacă organizația are un abonament activ și returnează detaliile acestuia.
CREATE OR REPLACE FUNCTION check_license(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_result JSONB;
BEGIN
    -- Verificăm apartenența utilizatorului la organizație
    IF NOT is_org_member(p_org_id) THEN
        RAISE EXCEPTION 'Acces refuzat: Nu sunteți membru al acestei organizații.';
    END IF;

    -- Căutăm cel mai recent abonament activ
    SELECT s.id, s.status, s.end_date, p.name as plan_name, p.max_devices, p.max_locations
    INTO v_subscription
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.organization_id = p_org_id
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('active', false, 'message', 'Nu a fost găsit niciun abonament.');
    END IF;

    -- Verificăm starea și data de expirare
    IF v_subscription.status != 'active' THEN
        RETURN jsonb_build_object('active', false, 'status', v_subscription.status, 'message', 'Abonamentul nu este activ.');
    END IF;

    IF v_subscription.end_date IS NOT NULL AND v_subscription.end_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('active', false, 'status', 'expired', 'message', 'Abonamentul a expirat la data de ' || v_subscription.end_date);
    END IF;

    RETURN jsonb_build_object(
        'active', true,
        'subscription_id', v_subscription.id,
        'plan_name', v_subscription.plan_name,
        'max_devices', v_subscription.max_devices,
        'max_locations', v_subscription.max_locations,
        'end_date', v_subscription.end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- 2. RPC: register_device
-- Înregistrează un device nou sau returnează ID-ul unuia existent, verificând limitele licenței.
CREATE OR REPLACE FUNCTION register_device(
    p_org_id UUID, 
    p_loc_id UUID, 
    p_hw_id TEXT, 
    p_name TEXT
)
RETURNS UUID AS $$
DECLARE
    v_license JSONB;
    v_device_id UUID;
    v_current_count INTEGER;
BEGIN
    -- 1. Verificăm licența
    v_license := check_license(p_org_id);
    IF NOT (v_license->>'active')::BOOLEAN THEN
        RAISE EXCEPTION 'Eroare licență: %', v_license->>'message';
    END IF;

    -- 2. Verificăm dacă device-ul există deja
    SELECT id INTO v_device_id 
    FROM devices 
    WHERE organization_id = p_org_id AND hardware_id = p_hw_id;

    IF FOUND THEN
        RETURN v_device_id;
    END IF;

    -- 3. Verificăm limita de device-uri
    SELECT COUNT(*) INTO v_current_count 
    FROM devices 
    WHERE organization_id = p_org_id AND status != 'revoked';

    IF v_current_count >= (v_license->>'max_devices')::INTEGER THEN
        RAISE EXCEPTION 'Limită atinsă: Abonamentul dumneavoastră permite maxim % dispozitive.', v_license->>'max_devices';
    END IF;

    -- 4. Înregistrăm device-ul
    INSERT INTO devices (organization_id, location_id, hardware_id, name, status)
    VALUES (p_org_id, p_loc_id, p_hw_id, p_name, 'pending')
    RETURNING id INTO v_device_id;

    -- 5. Audit (opțional pentru 6.1)
    -- PERFORM create_audit_log(jsonb_build_object('action', 'DEVICE_REGISTER', 'record_id', v_device_id));

    RETURN v_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- ACORDARE PERMISIUNI (DOAR PENTRU TESTARE)
GRANT EXECUTE ON FUNCTION check_license(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION register_device(UUID, UUID, TEXT, TEXT) TO authenticated;
