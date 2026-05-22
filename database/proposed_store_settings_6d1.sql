-- ============================================================================
-- SQL Blueprint: Gestiune Magazin v2 Store Settings (Etapa 6D.1.1)
-- Description: Database-level blueprint for store operations & fiscal settings.
-- DO NOT APPLY TO THE LIVE DATABASE. This is a reference blueprint for review.
-- ============================================================================

-- 1. Helper function to validate store settings JSONB schema
CREATE OR REPLACE FUNCTION public.validate_store_settings_schema(p_settings jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_key text;
    v_val jsonb;
    v_elem jsonb;
BEGIN
    -- Allow empty settings if default is set
    IF p_settings IS NULL OR p_settings = '{}'::jsonb THEN
        RETURN true;
    END IF;

    -- Validate top-level keys if they exist (allows incremental migrations)
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings)
    LOOP
        IF v_key NOT IN ('fiscal', 'tax', 'stock', 'pos', 'documents', 'reports', 'alerts', 'workpointNumber', 'displayCode', 'companyName', 'notes') THEN
            RAISE WARNING 'Cheie invalida la nivelul principal al setarilor: %', v_key;
            RETURN false;
        END IF;
    END LOOP;

    -- Validate "fiscal" section if present
    IF p_settings ? 'fiscal' THEN
        IF jsonb_typeof(p_settings -> 'fiscal') != 'object' THEN
            RETURN false;
        END IF;
        -- Validate sub-keys of fiscal
        FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings -> 'fiscal')
        LOOP
            IF v_key NOT IN ('workpoint_number', 'workpoint_name', 'company_name', 'display_code', 'notes', 'reg_number', 'phone', 'email', 'city', 'county', 'address_full') THEN
                RETURN false;
            END IF;
        END LOOP;
        
        -- workpoint_number must be an integer > 0
        IF (p_settings -> 'fiscal' ? 'workpoint_number') AND 
           (jsonb_typeof(p_settings -> 'fiscal' -> 'workpoint_number') != 'number' OR 
            (p_settings -> 'fiscal' ->> 'workpoint_number')::numeric % 1 != 0 OR
            (p_settings -> 'fiscal' ->> 'workpoint_number')::integer <= 0) THEN
            RETURN false;
        END IF;
    END IF;

    -- Validate "tax" section if present (Updated for Romania Tax Groups)
    IF p_settings ? 'tax' THEN
        IF jsonb_typeof(p_settings -> 'tax') != 'object' THEN
            RETURN false;
        END IF;
        FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings -> 'tax')
        LOOP
            IF v_key NOT IN ('vat_default_group', 'price_tax_policy', 'tax_groups') THEN
                RETURN false;
            END IF;
        END LOOP;

        -- vat_default_group validation (must be A, B, C, D, or E)
        IF (p_settings -> 'tax' ? 'vat_default_group') AND 
           (p_settings -> 'tax' ->> 'vat_default_group' NOT IN ('A', 'B', 'C', 'D', 'E')) THEN
            RETURN false;
        END IF;

        -- tax_groups validation
        IF (p_settings -> 'tax' ? 'tax_groups') THEN
            IF jsonb_typeof(p_settings -> 'tax' -> 'tax_groups') != 'array' THEN
                RETURN false;
            END IF;
            -- Check each element in array has group, percent, label
            FOR v_elem IN SELECT * FROM jsonb_array_elements(p_settings -> 'tax' -> 'tax_groups')
            LOOP
                IF jsonb_typeof(v_elem) != 'object'
                   OR NOT (v_elem ? 'group') OR (v_elem ->> 'group' NOT IN ('A', 'B', 'C', 'D', 'E'))
                   OR NOT (v_elem ? 'percent') OR (jsonb_typeof(v_elem -> 'percent') != 'number' OR (v_elem ->> 'percent')::numeric < 0)
                   OR NOT (v_elem ? 'label') OR (jsonb_typeof(v_elem -> 'label') != 'string') THEN
                    RETURN false;
                END IF;
            END LOOP;
        END IF;

        -- price_tax_policy validation
        IF (p_settings -> 'tax' ? 'price_tax_policy') AND
           (p_settings -> 'tax' ->> 'price_tax_policy' NOT IN ('inclusive', 'exclusive')) THEN
            RETURN false;
        END IF;
    END IF;

    -- Validate "stock" section if present
    IF p_settings ? 'stock' THEN
        IF jsonb_typeof(p_settings -> 'stock') != 'object' THEN
            RETURN false;
        END IF;
        FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings -> 'stock')
        LOOP
            IF v_key NOT IN ('stock_min_default', 'allow_negative_stock', 'expiry_warning_days') THEN
                RETURN false;
            END IF;
        END LOOP;

        -- stock_min_default validation
        IF (p_settings -> 'stock' ? 'stock_min_default') AND 
           (jsonb_typeof(p_settings -> 'stock' -> 'stock_min_default') != 'number' OR
            (p_settings -> 'stock' ->> 'stock_min_default')::numeric < 0) THEN
            RETURN false;
        END IF;

        -- allow_negative_stock validation
        IF (p_settings -> 'stock' ? 'allow_negative_stock') AND 
           (jsonb_typeof(p_settings -> 'stock' -> 'allow_negative_stock') != 'boolean') THEN
            RETURN false;
        END IF;

        -- expiry_warning_days validation
        IF (p_settings -> 'stock' ? 'expiry_warning_days') AND 
           (jsonb_typeof(p_settings -> 'stock' -> 'expiry_warning_days') != 'number' OR
            (p_settings -> 'stock' ->> 'expiry_warning_days')::integer < 0) THEN
            RETURN false;
        END IF;
    END IF;

    -- Validate "pos" section if present
    IF p_settings ? 'pos' THEN
        IF jsonb_typeof(p_settings -> 'pos') != 'object' THEN
            RETURN false;
        END IF;
        FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings -> 'pos')
        LOOP
            IF v_key NOT IN ('default_payment_method', 'allow_mixed_payment', 'require_active_shift', 'require_manager_for_void', 'require_manager_for_return') THEN
                RETURN false;
            END IF;
        END LOOP;

        -- default_payment_method validation
        IF (p_settings -> 'pos' ? 'default_payment_method') AND
           (p_settings -> 'pos' ->> 'default_payment_method' NOT IN ('cash', 'card', 'mixed')) THEN
            RETURN false;
        END IF;
    END IF;

    -- Validate "documents" section if present
    IF p_settings ? 'documents' THEN
        IF jsonb_typeof(p_settings -> 'documents') != 'object' THEN
            RETURN false;
        END IF;
        -- All values must be text/string
        FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings -> 'documents')
        LOOP
            IF jsonb_typeof(v_val) != 'string' THEN
                RETURN false;
            END IF;
        END LOOP;
    END IF;

    -- Validate "reports" section if present
    IF p_settings ? 'reports' THEN
        IF jsonb_typeof(p_settings -> 'reports') != 'object' THEN
            RETURN false;
        END IF;
        IF (p_settings -> 'reports' ? 'business_day_start_hour') AND
           (jsonb_typeof(p_settings -> 'reports' -> 'business_day_start_hour') != 'number' OR
            (p_settings -> 'reports' ->> 'business_day_start_hour')::integer NOT BETWEEN 0 AND 23) THEN
            RETURN false;
        END IF;
    END IF;

    -- Validate "alerts" section if present
    IF p_settings ? 'alerts' THEN
        IF jsonb_typeof(p_settings -> 'alerts') != 'object' THEN
            RETURN false;
        END IF;
        -- Validate cash difference limit
        IF (p_settings -> 'alerts' ? 'alert_cash_difference_limit') AND
           (jsonb_typeof(p_settings -> 'alerts' -> 'alert_cash_difference_limit') != 'number' OR
            (p_settings -> 'alerts' ->> 'alert_cash_difference_limit')::numeric < 0) THEN
            RETURN false;
        END IF;
    END IF;

    RETURN true;
END;
$$;


-- 2. Schema check constraint declaration (Reference Only)
-- ALTER TABLE public.stores ADD CONSTRAINT check_settings_validity CHECK (public.validate_store_settings_schema(settings));


-- 3. Utility Function: Safe Getter for Text Settings
CREATE OR REPLACE FUNCTION public.get_store_setting_text(
    p_store_id uuid,
    p_path text[],
    p_default text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_settings jsonb;
    v_result text;
BEGIN
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    
    IF v_settings IS NULL THEN
        RETURN p_default;
    END IF;
    
    v_result := v_settings #>> p_path;
    
    -- Fallback for legacy keys if path is simple
    IF v_result IS NULL AND array_length(p_path, 1) = 2 THEN
        IF p_path[1] = 'fiscal' AND p_path[2] = 'company_name' THEN
            v_result := v_settings ->> 'companyName';
        ELSIF p_path[1] = 'fiscal' AND p_path[2] = 'display_code' THEN
            v_result := v_settings ->> 'displayCode';
        ELSIF p_path[1] = 'fiscal' AND p_path[2] = 'notes' THEN
            v_result := v_settings ->> 'notes';
        END IF;
    END IF;
    
    RETURN COALESCE(v_result, p_default);
END;
$$;


-- 4. Utility Function: Safe Getter for Numeric Settings (Updated for Tax Groups)
CREATE OR REPLACE FUNCTION public.get_store_setting_numeric(
    p_store_id uuid,
    p_path text[],
    p_default numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_settings jsonb;
    v_val jsonb;
    v_def_group text;
BEGIN
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    
    IF v_settings IS NULL THEN
        RETURN p_default;
    END IF;
    
    -- Special fallback for vat_default -> resolve from tax_groups via vat_default_group
    IF p_path = ARRAY['tax', 'vat_default'] THEN
        v_def_group := v_settings #>> ARRAY['tax', 'vat_default_group'];
        IF v_def_group IS NOT NULL AND v_settings -> 'tax' ? 'tax_groups' THEN
            SELECT elem -> 'percent' INTO v_val
            FROM jsonb_array_elements(v_settings -> 'tax' -> 'tax_groups') elem
            WHERE elem ->> 'group' = v_def_group
            LIMIT 1;
        END IF;
    ELSE
        v_val := v_settings #> p_path;
    END IF;
    
    -- Fallback for legacy keys if path is simple
    IF v_val IS NULL AND array_length(p_path, 1) = 2 THEN
        IF p_path[1] = 'fiscal' AND p_path[2] = 'workpoint_number' THEN
            v_val := v_settings -> 'workpointNumber';
        END IF;
    END IF;
    
    IF v_val IS NULL OR jsonb_typeof(v_val) != 'number' THEN
        RETURN p_default;
    END IF;
    
    RETURN (v_val::text)::numeric;
END;
$$;


-- 5. Utility Function: Safe Getter for Boolean Settings
CREATE OR REPLACE FUNCTION public.get_store_setting_boolean(
    p_store_id uuid,
    p_path text[],
    p_default boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_settings jsonb;
    v_val jsonb;
BEGIN
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    
    IF v_settings IS NULL THEN
        RETURN p_default;
    END IF;
    
    v_val := v_settings #> p_path;
    
    IF v_val IS NULL OR jsonb_typeof(v_val) != 'boolean' THEN
        RETURN p_default;
    END IF;
    
    RETURN v_val::boolean;
END;
$$;


-- 6. Legacy to Nested Settings Migrator (Updated for Romania Tax Groups)
CREATE OR REPLACE FUNCTION public.migrate_stores_legacy_settings()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_row record;
    v_fiscal jsonb;
    v_tax jsonb;
    v_stock jsonb;
    v_pos jsonb;
    v_documents jsonb;
    v_reports jsonb;
    v_alerts jsonb;
    v_new_settings jsonb;
BEGIN
    FOR v_row IN SELECT id, settings, fiscal_code FROM public.stores
    LOOP
        -- Check if it's already using the new schema structure (has 'fiscal' key)
        IF v_row.settings ? 'fiscal' THEN
            CONTINUE;
        END IF;

        -- Extract legacy data with defaults
        v_fiscal := jsonb_build_object(
            'workpoint_number', COALESCE(v_row.settings -> 'workpointNumber', '1'::jsonb),
            'display_code', to_jsonb(COALESCE(v_row.settings ->> 'displayCode', COALESCE(v_row.fiscal_code, 'FARA_CUI') || ' / 1')),
            'company_name', COALESCE(v_row.settings -> 'companyName', 'SC COMPANIE SRL'::jsonb),
            'notes', COALESCE(v_row.settings -> 'notes', 'Migrat automat'::jsonb)
        );

        v_tax := jsonb_build_object(
            'vat_default_group', 'A',
            'price_tax_policy', 'inclusive',
            'tax_groups', jsonb_build_array(
                jsonb_build_object('group', 'A', 'percent', 21, 'label', 'TVA 21% (Cota Standard)'),
                jsonb_build_object('group', 'B', 'percent', 11, 'label', 'TVA 11% (Cota Redusa)'),
                jsonb_build_object('group', 'C', 'percent', 11, 'label', 'TVA 11% (Servicii/Horeca)'),
                jsonb_build_object('group', 'D', 'percent', 0, 'label', 'TVA 0% (Scutit cu deducere)'),
                jsonb_build_object('group', 'E', 'percent', 0, 'label', 'Scutit fara deducere / Neplatitor')
            )
        );

        v_stock := jsonb_build_object(
            'stock_min_default', 5,
            'allow_negative_stock', false,
            'expiry_warning_days', 30
        );

        v_pos := jsonb_build_object(
            'default_payment_method', 'cash',
            'allow_mixed_payment', true,
            'require_active_shift', true,
            'require_manager_for_void', true,
            'require_manager_for_return', true
        );

        v_documents := jsonb_build_object(
            'pos_receipt_prefix', 'BF',
            'return_prefix', 'RET',
            'reception_prefix', 'NIR',
            'waste_prefix', 'PIE',
            'transfer_prefix', 'TRF'
        );

        v_reports := jsonb_build_object(
            'business_day_start_hour', 6,
            'timezone', 'Europe/Bucharest'
        );

        v_alerts := jsonb_build_object(
            'alert_low_stock_enabled', true,
            'alert_expiry_enabled', true,
            'alert_cash_difference_limit', 50
        );

        -- Build the complete nested JSONB
        v_new_settings := jsonb_build_object(
            'fiscal', v_fiscal,
            'tax', v_tax,
            'stock', v_stock,
            'pos', v_pos,
            'documents', v_documents,
            'reports', v_reports,
            'alerts', v_alerts
        );

        -- Update the store settings safely
        UPDATE public.stores
        SET settings = v_new_settings
        WHERE id = v_row.id;
    END LOOP;
END;
$$;


-- 7. RPC: Get Store Settings
CREATE OR REPLACE FUNCTION public.get_store_settings(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings jsonb;
    v_fiscal jsonb;
    v_tax jsonb;
    v_stock jsonb;
    v_pos jsonb;
    v_documents jsonb;
    v_reports jsonb;
    v_alerts jsonb;
    v_store_name text;
    v_fiscal_code text;
BEGIN
    -- Authorization: must be a store member or platform owner
    IF NOT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'gestionar', 'casier']) OR public.is_platform_owner()) THEN
        RAISE EXCEPTION 'Acces interzis. Nu sunteti membru al acestui magazin.';
    END IF;

    SELECT settings, name, fiscal_code INTO v_settings, v_store_name, v_fiscal_code 
    FROM public.stores 
    WHERE id = p_store_id;

    IF v_settings IS NULL OR v_settings = '{}'::jsonb OR NOT (v_settings ? 'fiscal') THEN
        -- Build defaults if empty or legacy (migrate structure on the fly)
        v_fiscal := jsonb_build_object(
            'workpoint_number', COALESCE((v_settings ->> 'workpointNumber')::integer, 1),
            'display_code', COALESCE(v_settings ->> 'displayCode', COALESCE(v_fiscal_code, 'FARA_CUI') || ' / 1'),
            'company_name', COALESCE(v_settings ->> 'companyName', COALESCE(v_store_name, 'SC COMPANIE SRL')),
            'notes', COALESCE(v_settings ->> 'notes', 'Initializat automat')
        );

        v_tax := jsonb_build_object(
            'vat_default_group', 'A',
            'price_tax_policy', 'inclusive',
            'tax_groups', jsonb_build_array(
                jsonb_build_object('group', 'A', 'percent', 21, 'label', 'TVA 21% (Cota Standard)'),
                jsonb_build_object('group', 'B', 'percent', 11, 'label', 'TVA 11% (Cota Redusa)'),
                jsonb_build_object('group', 'C', 'percent', 11, 'label', 'TVA 11% (Servicii/Horeca)'),
                jsonb_build_object('group', 'D', 'percent', 0, 'label', 'TVA 0% (Scutit cu deducere)'),
                jsonb_build_object('group', 'E', 'percent', 0, 'label', 'Scutit fara deducere / Neplatitor')
            )
        );

        v_stock := jsonb_build_object(
            'stock_min_default', 5,
            'allow_negative_stock', false,
            'expiry_warning_days', 30
        );

        v_pos := jsonb_build_object(
            'default_payment_method', 'cash',
            'allow_mixed_payment', true,
            'require_active_shift', true,
            'require_manager_for_void', true,
            'require_manager_for_return', true
        );

        v_documents := jsonb_build_object(
            'pos_receipt_prefix', 'BF',
            'return_prefix', 'RET',
            'reception_prefix', 'NIR',
            'waste_prefix', 'PIE',
            'transfer_prefix', 'TRF'
        );

        v_reports := jsonb_build_object(
            'business_day_start_hour', 6,
            'timezone', 'Europe/Bucharest'
        );

        v_alerts := jsonb_build_object(
            'alert_low_stock_enabled', true,
            'alert_expiry_enabled', true,
            'alert_cash_difference_limit', 50
        );

        v_settings := jsonb_build_object(
            'fiscal', v_fiscal,
            'tax', v_tax,
            'stock', v_stock,
            'pos', v_pos,
            'documents', v_documents,
            'reports', v_reports,
            'alerts', v_alerts
        );
    END IF;

    RETURN v_settings;
END;
$$;


-- 8. RPC: Update Store Settings
CREATE OR REPLACE FUNCTION public.update_store_settings(
    p_store_id uuid,
    p_settings jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_settings jsonb;
BEGIN
    -- Authorization: must be admin, manager or platform owner
    IF NOT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) THEN
        RAISE EXCEPTION 'Acces interzis. Doar managerii sau administratorii pot modifica setarile magazinului.';
    END IF;

    -- Schema validation
    IF NOT public.validate_store_settings_schema(p_settings) THEN
        RAISE EXCEPTION 'Schema de setari transmisa este invalida.';
    END IF;

    SELECT settings INTO v_old_settings FROM public.stores WHERE id = p_store_id;

    -- Update settings column
    UPDATE public.stores
    SET settings = p_settings,
        updated_at = NOW()
    WHERE id = p_store_id;

    -- Log transaction in audit_logs
    INSERT INTO public.audit_logs (
        store_id,
        profile_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data
    )
    VALUES (
        p_store_id,
        auth.uid(),
        'store.settings_update',
        'store',
        p_store_id,
        COALESCE(v_old_settings, '{}'::jsonb),
        p_settings
    );
END;
$$;


-- 9. RPC: Get Store Operational Config
CREATE OR REPLACE FUNCTION public.get_store_operational_config(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings jsonb;
    v_fiscal jsonb;
    v_tax jsonb;
    v_stock jsonb;
    v_pos jsonb;
    v_documents jsonb;
BEGIN
    -- Authorization: any store member or platform owner
    IF NOT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'gestionar', 'casier']) OR public.is_platform_owner()) THEN
        RAISE EXCEPTION 'Acces interzis.';
    END IF;

    -- Retrieve settings (using helper get_store_settings to guarantee schema completeness)
    v_settings := public.get_store_settings(p_store_id);
    
    v_fiscal := v_settings -> 'fiscal';
    v_tax := v_settings -> 'tax';
    v_stock := v_settings -> 'stock';
    v_pos := v_settings -> 'pos';
    v_documents := v_settings -> 'documents';

    -- Build flat operational schema for clients
    RETURN jsonb_build_object(
        'companyName', v_fiscal ->> 'company_name',
        'workpointNumber', (v_fiscal ->> 'workpoint_number')::integer,
        'displayCode', v_fiscal ->> 'display_code',
        'priceTaxPolicy', v_tax ->> 'price_tax_policy',
        'vatDefaultGroup', v_tax ->> 'vat_default_group',
        'taxGroups', v_tax -> 'tax_groups',
        'allowNegativeStock', (v_stock ->> 'allow_negative_stock')::boolean,
        'requireActiveShift', (v_pos ->> 'require_active_shift')::boolean,
        'requireManagerForVoid', (v_pos ->> 'require_manager_for_void')::boolean,
        'requireManagerForReturn', (v_pos ->> 'require_manager_for_return')::boolean,
        'posReceiptPrefix', v_documents ->> 'pos_receipt_prefix',
        'returnPrefix', v_documents ->> 'return_prefix'
    );
END;
$$;
