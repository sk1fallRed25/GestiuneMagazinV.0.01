-- ============================================================================
-- SQL Blueprint: Gestiune Magazin v2 Store Settings (Etapa 6D.1.2)
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
    v_group_key text;
    v_group_val jsonb;
BEGIN
    -- Allow empty settings if default is set
    IF p_settings IS NULL OR p_settings = '{}'::jsonb THEN
        RETURN true;
    END IF;

    -- Validate top-level keys if they exist
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

    -- Validate "tax" section if present (Updated for Romania VAT Groups object model)
    IF p_settings ? 'tax' THEN
        IF jsonb_typeof(p_settings -> 'tax') != 'object' THEN
            RETURN false;
        END IF;
        FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings -> 'tax')
        LOOP
            -- Tolerate vat_default and vat_rates for legacy compatibility
            IF v_key NOT IN ('default_vat_group', 'vat_payer', 'price_tax_policy', 'vat_groups', 'vat_default', 'vat_rates') THEN
                RETURN false;
            END IF;
        END LOOP;

        -- default_vat_group validation (must be A, B, C, D, or E)
        IF (p_settings -> 'tax' ? 'default_vat_group') AND 
           (p_settings -> 'tax' ->> 'default_vat_group' NOT IN ('A', 'B', 'C', 'D', 'E')) THEN
            RETURN false;
        END IF;

        -- vat_payer validation (must be boolean)
        IF (p_settings -> 'tax' ? 'vat_payer') AND
           (jsonb_typeof(p_settings -> 'tax' -> 'vat_payer') != 'boolean') THEN
            RETURN false;
        END IF;

        -- price_tax_policy validation
        IF (p_settings -> 'tax' ? 'price_tax_policy') AND
           (p_settings -> 'tax' ->> 'price_tax_policy' NOT IN ('inclusive', 'exclusive')) THEN
            RETURN false;
        END IF;

        -- vat_groups validation (must be object)
        IF (p_settings -> 'tax' ? 'vat_groups') THEN
            IF jsonb_typeof(p_settings -> 'tax' -> 'vat_groups') != 'object' THEN
                RETURN false;
            END IF;
            -- Each key must be one of 'A', 'B', 'C', 'D', 'E'
            FOR v_group_key, v_group_val IN SELECT * FROM jsonb_each(p_settings -> 'tax' -> 'vat_groups')
            LOOP
                IF v_group_key NOT IN ('A', 'B', 'C', 'D', 'E') THEN
                    RETURN false;
                END IF;
                IF jsonb_typeof(v_group_val) != 'object' THEN
                    RETURN false;
                END IF;
                -- Validate group properties
                IF NOT (v_group_val ? 'rate') OR (jsonb_typeof(v_group_val -> 'rate') != 'number' OR (v_group_val ->> 'rate')::numeric < 0)
                   OR NOT (v_group_val ? 'label') OR (jsonb_typeof(v_group_val -> 'label') != 'string')
                   OR NOT (v_group_val ? 'fiscal_code') OR (v_group_val ->> 'fiscal_code' NOT IN ('A', 'B', 'C', 'D', 'E'))
                   OR NOT (v_group_val ? 'active') OR (jsonb_typeof(v_group_val -> 'active') != 'boolean') THEN
                    RETURN false;
                END IF;
            END LOOP;
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

        -- allow_mixed_payment validation
        IF (p_settings -> 'pos' ? 'allow_mixed_payment') AND
           (jsonb_typeof(p_settings -> 'pos' -> 'allow_mixed_payment') != 'boolean') THEN
            RETURN false;
        END IF;

        -- require_active_shift validation
        IF (p_settings -> 'pos' ? 'require_active_shift') AND
           (jsonb_typeof(p_settings -> 'pos' -> 'require_active_shift') != 'boolean') THEN
            RETURN false;
        END IF;

        -- require_manager_for_void validation
        IF (p_settings -> 'pos' ? 'require_manager_for_void') AND
           (jsonb_typeof(p_settings -> 'pos' -> 'require_manager_for_void') != 'boolean') THEN
            RETURN false;
        END IF;

        -- require_manager_for_return validation
        IF (p_settings -> 'pos' ? 'require_manager_for_return') AND
           (jsonb_typeof(p_settings -> 'pos' -> 'require_manager_for_return') != 'boolean') THEN
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
        IF (p_settings -> 'reports' ? 'timezone') AND
           (jsonb_typeof(p_settings -> 'reports' -> 'timezone') != 'string') THEN
            RETURN false;
        END IF;
    END IF;

    -- Validate "alerts" section if present
    IF p_settings ? 'alerts' THEN
        IF jsonb_typeof(p_settings -> 'alerts') != 'object' THEN
            RETURN false;
        END IF;
        IF (p_settings -> 'alerts' ? 'alert_low_stock_enabled') AND
           (jsonb_typeof(p_settings -> 'alerts' -> 'alert_low_stock_enabled') != 'boolean') THEN
            RETURN false;
        END IF;
        IF (p_settings -> 'alerts' ? 'alert_expiry_enabled') AND
           (jsonb_typeof(p_settings -> 'alerts' -> 'alert_expiry_enabled') != 'boolean') THEN
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


-- 3. Unified default settings source of truth
CREATE OR REPLACE FUNCTION public.get_default_store_settings()
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN jsonb_build_object(
        'fiscal', jsonb_build_object(
            'workpoint_number', 1,
            'workpoint_name', 'Magazin Principal',
            'company_name', 'SC COMPANIE SRL',
            'display_code', 'FARA_CUI / 1',
            'notes', 'Initializat automat'
        ),
        'tax', jsonb_build_object(
            'default_vat_group', 'A',
            'vat_payer', true,
            'price_tax_policy', 'inclusive',
            'vat_groups', jsonb_build_object(
                'A', jsonb_build_object('rate', 21, 'label', 'TVA standard', 'fiscal_code', 'A', 'active', true),
                'B', jsonb_build_object('rate', 11, 'label', 'TVA redus', 'fiscal_code', 'B', 'active', true),
                'C', jsonb_build_object('rate', 11, 'label', 'TVA redus', 'fiscal_code', 'C', 'active', true),
                'D', jsonb_build_object('rate', 0, 'label', 'TVA zero', 'fiscal_code', 'D', 'active', true),
                'E', jsonb_build_object('rate', 0, 'label', 'Neplătitor TVA', 'fiscal_code', 'E', 'active', true)
            )
        ),
        'stock', jsonb_build_object(
            'stock_min_default', 5,
            'allow_negative_stock', false,
            'expiry_warning_days', 30
        ),
        'pos', jsonb_build_object(
            'default_payment_method', 'cash',
            'allow_mixed_payment', true,
            'require_active_shift', true,
            'require_manager_for_void', true,
            'require_manager_for_return', true
        ),
        'documents', jsonb_build_object(
            'pos_receipt_prefix', 'BF',
            'return_prefix', 'RET',
            'reception_prefix', 'NIR',
            'waste_prefix', 'PIE',
            'transfer_prefix', 'TRF'
        ),
        'reports', jsonb_build_object(
            'business_day_start_hour', 6,
            'timezone', 'Europe/Bucharest'
        ),
        'alerts', jsonb_build_object(
            'alert_low_stock_enabled', true,
            'alert_expiry_enabled', true,
            'alert_cash_difference_limit', 50
        )
    );
END;
$$;


-- 4. Deep merger function with legacy mappings and defaults
CREATE OR REPLACE FUNCTION public.merge_store_settings_with_defaults(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_defaults jsonb;
    v_fiscal jsonb;
    v_tax jsonb;
    v_stock jsonb;
    v_pos jsonb;
    v_documents jsonb;
    v_reports jsonb;
    v_alerts jsonb;
    
    -- Legacy fields
    v_legacy_wp integer;
    v_legacy_dc text;
    v_legacy_cn text;
    v_legacy_notes text;
    v_legacy_vat_default numeric;
    
    -- Input values
    v_in_fiscal jsonb;
    v_in_tax jsonb;
    v_in_stock jsonb;
    v_in_pos jsonb;
    v_in_documents jsonb;
    v_in_reports jsonb;
    v_in_alerts jsonb;
    
    v_vat_payer boolean;
BEGIN
    v_defaults := public.get_default_store_settings();
    
    IF p_settings IS NULL OR p_settings = '{}'::jsonb THEN
        RETURN v_defaults;
    END IF;
    
    -- Extract legacy flat keys if they exist in root
    v_legacy_wp := (p_settings ->> 'workpointNumber')::integer;
    v_legacy_dc := p_settings ->> 'displayCode';
    v_legacy_cn := p_settings ->> 'companyName';
    v_legacy_notes := p_settings ->> 'notes';
    
    -- Extract namespaces from input
    v_in_fiscal := p_settings -> 'fiscal';
    v_in_tax := p_settings -> 'tax';
    v_in_stock := p_settings -> 'stock';
    v_in_pos := p_settings -> 'pos';
    v_in_documents := p_settings -> 'documents';
    v_in_reports := p_settings -> 'reports';
    v_in_alerts := p_settings -> 'alerts';

    -- 1. Merge fiscal
    v_fiscal := v_defaults -> 'fiscal';
    IF v_in_fiscal IS NOT NULL AND jsonb_typeof(v_in_fiscal) = 'object' THEN
        v_fiscal := v_fiscal || v_in_fiscal;
    END IF;
    -- Apply legacy overrides if fiscal fields not set
    IF v_legacy_wp IS NOT NULL AND NOT (v_fiscal ? 'workpoint_number') THEN
        v_fiscal := jsonb_set(v_fiscal, '{workpoint_number}', to_jsonb(v_legacy_wp));
    END IF;
    IF v_legacy_dc IS NOT NULL AND NOT (v_fiscal ? 'display_code') THEN
        v_fiscal := jsonb_set(v_fiscal, '{display_code}', to_jsonb(v_legacy_dc));
    END IF;
    IF v_legacy_cn IS NOT NULL AND NOT (v_fiscal ? 'company_name') THEN
        v_fiscal := jsonb_set(v_fiscal, '{company_name}', to_jsonb(v_legacy_cn));
    END IF;
    IF v_legacy_notes IS NOT NULL AND NOT (v_fiscal ? 'notes') THEN
        v_fiscal := jsonb_set(v_fiscal, '{notes}', to_jsonb(v_legacy_notes));
    END IF;

    -- 2. Merge tax
    v_tax := v_defaults -> 'tax';
    IF v_in_tax IS NOT NULL AND jsonb_typeof(v_in_tax) = 'object' THEN
        -- Strip legacy properties from v_in_tax to keep the namespace clean
        v_in_tax := v_in_tax - 'vat_default' - 'vat_rates';
        v_tax := v_tax || v_in_tax;
    END IF;
    
    -- Legacy VAT mapping (e.g. mapping 19, 9, 5 to Romanian tax groups standard A-E)
    v_legacy_vat_default := (p_settings -> 'tax' ->> 'vat_default')::numeric;
    IF v_legacy_vat_default IS NOT NULL THEN
        IF v_legacy_vat_default IN (19, 21, 24, 20) THEN
            v_tax := jsonb_set(v_tax, '{default_vat_group}', '"A"');
        ELSIF v_legacy_vat_default IN (9, 11) THEN
            v_tax := jsonb_set(v_tax, '{default_vat_group}', '"B"');
        ELSIF v_legacy_vat_default = 5 THEN
            v_tax := jsonb_set(v_tax, '{default_vat_group}', '"C"');
        ELSIF v_legacy_vat_default = 0 THEN
            v_tax := jsonb_set(v_tax, '{default_vat_group}', '"E"');
        END IF;
    END IF;
    
    -- Enforce vat_payer alignment
    v_vat_payer := (v_tax ->> 'vat_payer')::boolean;
    IF v_vat_payer = false THEN
        v_tax := jsonb_set(v_tax, '{default_vat_group}', '"E"');
    ELSE
        -- If vat_payer is true and group is E (which is neplatitor/TVA 0), fallback default group to A
        IF v_tax ->> 'default_vat_group' = 'E' THEN
            v_tax := jsonb_set(v_tax, '{default_vat_group}', '"A"');
        END IF;
    END IF;

    -- 3. Merge stock
    v_stock := v_defaults -> 'stock';
    IF v_in_stock IS NOT NULL AND jsonb_typeof(v_in_stock) = 'object' THEN
        v_stock := v_stock || v_in_stock;
    END IF;

    -- 4. Merge pos
    v_pos := v_defaults -> 'pos';
    IF v_in_pos IS NOT NULL AND jsonb_typeof(v_in_pos) = 'object' THEN
        v_pos := v_pos || v_in_pos;
    END IF;

    -- 5. Merge documents
    v_documents := v_defaults -> 'documents';
    IF v_in_documents IS NOT NULL AND jsonb_typeof(v_in_documents) = 'object' THEN
        v_documents := v_documents || v_in_documents;
    END IF;

    -- 6. Merge reports
    v_reports := v_defaults -> 'reports';
    IF v_in_reports IS NOT NULL AND jsonb_typeof(v_in_reports) = 'object' THEN
        v_reports := v_reports || v_in_reports;
    END IF;

    -- 7. Merge alerts
    v_alerts := v_defaults -> 'alerts';
    IF v_in_alerts IS NOT NULL AND jsonb_typeof(v_in_alerts) = 'object' THEN
        v_alerts := v_alerts || v_in_alerts;
    END IF;

    RETURN jsonb_build_object(
        'fiscal', v_fiscal,
        'tax', v_tax,
        'stock', v_stock,
        'pos', v_pos,
        'documents', v_documents,
        'reports', v_reports,
        'alerts', v_alerts
    );
END;
$$;


-- 5. Utility Function: Safe Getter for Text Settings
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


-- 6. Utility Function: Safe Getter for Numeric Settings (Updated for Tax Groups)
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
    
    -- Special fallback for vat_default -> resolve from vat_groups via default_vat_group
    IF p_path = ARRAY['tax', 'vat_default'] THEN
        v_def_group := v_settings #>> ARRAY['tax', 'default_vat_group'];
        -- If settings is legacy and lacks default_vat_group, try to read legacy vat_default first
        IF v_def_group IS NULL AND v_settings -> 'tax' ? 'vat_default' THEN
            v_val := v_settings -> 'tax' -> 'vat_default';
        ELSIF v_def_group IS NOT NULL AND v_settings -> 'tax' ? 'vat_groups' THEN
            v_val := v_settings -> 'tax' -> 'vat_groups' -> v_def_group -> 'rate';
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


-- 7. Utility Function: Safe Getter for Boolean Settings
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


-- 8. Legacy to Nested Settings Migrator (Updated for Romania Tax Groups)
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
    FOR v_row IN SELECT id, settings, fiscal_code, name FROM public.stores
    LOOP
        -- Check if it's already using the new schema structure (has 'fiscal' key)
        IF v_row.settings ? 'fiscal' THEN
            -- Update existing structure with any missing defaults (ensuring idempotency)
            v_new_settings := public.merge_store_settings_with_defaults(v_row.settings);
        ELSE
            -- Extract legacy data with defaults
            v_fiscal := jsonb_build_object(
                'workpoint_number', COALESCE((v_row.settings ->> 'workpointNumber')::integer, 1),
                'display_code', COALESCE(v_row.settings ->> 'displayCode', COALESCE(v_row.fiscal_code, 'FARA_CUI') || ' / 1'),
                'company_name', COALESCE(v_row.settings ->> 'companyName', COALESCE(v_row.name, 'SC COMPANIE SRL')),
                'notes', COALESCE(v_row.settings ->> 'notes', 'Migrat automat')
            );

            v_tax := jsonb_build_object(
                'default_vat_group', 'A',
                'vat_payer', true,
                'price_tax_policy', 'inclusive',
                'vat_groups', jsonb_build_object(
                    'A', jsonb_build_object('rate', 21, 'label', 'TVA standard', 'fiscal_code', 'A', 'active', true),
                    'B', jsonb_build_object('rate', 11, 'label', 'TVA redus', 'fiscal_code', 'B', 'active', true),
                    'C', jsonb_build_object('rate', 11, 'label', 'TVA redus', 'fiscal_code', 'C', 'active', true),
                    'D', jsonb_build_object('rate', 0, 'label', 'TVA zero', 'fiscal_code', 'D', 'active', true),
                    'E', jsonb_build_object('rate', 0, 'label', 'Neplătitor TVA', 'fiscal_code', 'E', 'active', true)
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

            -- Build the complete nested JSONB and merge to resolve any other fields
            v_new_settings := public.merge_store_settings_with_defaults(
                jsonb_build_object(
                    'fiscal', v_fiscal,
                    'tax', v_tax,
                    'stock', v_stock,
                    'pos', v_pos,
                    'documents', v_documents,
                    'reports', v_reports,
                    'alerts', v_alerts
                )
            );
        END IF;

        -- Update the store settings safely
        UPDATE public.stores
        SET settings = v_new_settings
        WHERE id = v_row.id;
    END LOOP;
END;
$$;


-- 9. RPC: Get Store Settings
CREATE OR REPLACE FUNCTION public.get_store_settings(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings jsonb;
    v_store_name text;
    v_fiscal_code text;
    v_active boolean;
BEGIN
    -- Authorization: must be store admin, manager or platform owner
    IF NOT (public.has_store_role(p_store_id, ARRAY['admin', 'manager']) OR public.is_platform_owner()) THEN
        RAISE EXCEPTION 'Acces interzis. Nu sunteti administrator sau manager al acestui magazin.';
    END IF;

    SELECT settings, name, fiscal_code, active INTO v_settings, v_store_name, v_fiscal_code, v_active
    FROM public.stores 
    WHERE id = p_store_id;

    IF v_settings IS NULL THEN
        v_settings := '{}'::jsonb;
    END IF;

    -- Return the settings merged with defaults
    RETURN jsonb_build_object(
        'storeId', p_store_id,
        'storeName', v_store_name,
        'fiscalCode', v_fiscal_code,
        'active', COALESCE(v_active, true),
        'settings', public.merge_store_settings_with_defaults(v_settings)
    );
END;
$$;


-- 10. RPC: Update Store Settings
CREATE OR REPLACE FUNCTION public.update_store_settings(
    p_store_id uuid,
    p_settings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_settings jsonb;
    v_final_settings jsonb;
BEGIN
    -- Authorization: must be admin or platform owner (strictly admin/owner, manager excluded)
    IF NOT (public.has_store_role(p_store_id, ARRAY['admin']) OR public.is_platform_owner()) THEN
        RAISE EXCEPTION 'Acces interzis. Doar platform_owner sau administratorul magazinului pot modifica setările.';
    END IF;

    -- Schema validation of input settings
    IF NOT public.validate_store_settings_schema(p_settings) THEN
        RAISE EXCEPTION 'Schema de setări transmisă este invalidă.';
    END IF;

    -- Merge input settings with default settings
    v_final_settings := public.merge_store_settings_with_defaults(p_settings);

    SELECT settings INTO v_old_settings FROM public.stores WHERE id = p_store_id;

    -- Update settings column
    UPDATE public.stores
    SET settings = v_final_settings,
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
        'stores',
        p_store_id,
        COALESCE(v_old_settings, '{}'::jsonb),
        v_final_settings
    );

    RETURN jsonb_build_object(
        'storeId', p_store_id,
        'settings', v_final_settings
    );
END;
$$;


-- 11. RPC: Get Store Operational Config
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
    v_reports jsonb;
    v_alerts jsonb;
BEGIN
    -- Authorization: any store member or platform owner
    IF NOT (public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'gestionar', 'casier']) OR public.is_platform_owner()) THEN
        RAISE EXCEPTION 'Acces interzis.';
    END IF;

    -- Retrieve raw settings from stores
    SELECT settings INTO v_settings FROM public.stores WHERE id = p_store_id;
    
    -- Merge with defaults
    v_settings := public.merge_store_settings_with_defaults(v_settings);
    
    v_fiscal := v_settings -> 'fiscal';
    v_tax := v_settings -> 'tax';
    v_stock := v_settings -> 'stock';
    v_pos := v_settings -> 'pos';
    v_documents := v_settings -> 'documents';
    v_reports := v_settings -> 'reports';
    v_alerts := v_settings -> 'alerts';

    -- Return camelCase configuration
    RETURN jsonb_build_object(
        'companyName', v_fiscal ->> 'company_name',
        'workpointNumber', (v_fiscal ->> 'workpoint_number')::integer,
        'displayCode', v_fiscal ->> 'display_code',
        'priceTaxPolicy', v_tax ->> 'price_tax_policy',
        'defaultVatGroup', v_tax ->> 'default_vat_group',
        'vatPayer', (v_tax ->> 'vat_payer')::boolean,
        'vatGroups', v_tax -> 'vat_groups',
        'allowNegativeStock', (v_stock ->> 'allow_negative_stock')::boolean,
        'requireActiveShift', (v_pos ->> 'require_active_shift')::boolean,
        'requireManagerForVoid', (v_pos ->> 'require_manager_for_void')::boolean,
        'requireManagerForReturn', (v_pos ->> 'require_manager_for_return')::boolean,
        'posReceiptPrefix', v_documents ->> 'pos_receipt_prefix',
        'returnPrefix', v_documents ->> 'return_prefix',
        'receptionPrefix', v_documents ->> 'reception_prefix',
        'wastePrefix', v_documents ->> 'waste_prefix',
        'transferPrefix', v_documents ->> 'transfer_prefix',
        'businessDayStartHour', (v_reports ->> 'business_day_start_hour')::integer,
        'timezone', v_reports ->> 'timezone',
        'alertLowStockEnabled', (v_alerts ->> 'alert_low_stock_enabled')::boolean,
        'alertExpiryEnabled', (v_alerts ->> 'alert_expiry_enabled')::boolean,
        'alertCashDifferenceLimit', (v_alerts ->> 'alert_cash_difference_limit')::numeric
    );
END;
$$;


-- 12. Security Grants Configuration
-- Revoke all execute privileges on functions from PUBLIC & anon
REVOKE EXECUTE ON FUNCTION public.validate_store_settings_schema(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_default_store_settings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.merge_store_settings_with_defaults(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_setting_text(uuid, text[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_setting_numeric(uuid, text[], numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_setting_boolean(uuid, text[], boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.migrate_stores_legacy_settings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_settings(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_operational_config(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_store_settings(uuid, jsonb) FROM PUBLIC, anon;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_store_settings_schema(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_store_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_store_settings_with_defaults(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_setting_text(uuid, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_setting_numeric(uuid, text[], numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_setting_boolean(uuid, text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_operational_config(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_settings(uuid, jsonb) TO authenticated;
