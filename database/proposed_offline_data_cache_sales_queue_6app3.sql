-- Proposed Database Schema and RPC Functions for Offline POS Sync (Stage 6APP.4 Hardening)
-- This file is a blueprint and is NOT applied directly to live Supabase during this stage.
-- It is designed for manual execution in the database SQL editor in a future rollout stage.

-- ============================================================================
-- 1. POS Devices Registry
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pos_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_device_fingerprint UNIQUE (store_id, device_fingerprint),
    CONSTRAINT check_device_fingerprint_len CHECK (length(trim(device_fingerprint)) >= 12),
    CONSTRAINT check_device_name_len CHECK (length(trim(device_name)) >= 2)
);

-- Indexing for performance and lookup speed
CREATE INDEX IF NOT EXISTS idx_pos_devices_store_active ON public.pos_devices(store_id, active);
CREATE INDEX IF NOT EXISTS idx_pos_devices_store_last_seen ON public.pos_devices(store_id, last_seen_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;

-- Triggers for automatic updated_at timestamp management
DROP TRIGGER IF EXISTS update_pos_devices_updated_at ON public.pos_devices;
CREATE TRIGGER update_pos_devices_updated_at
    BEFORE UPDATE ON public.pos_devices
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS Policies
DROP POLICY IF EXISTS pos_devices_select_policy ON public.pos_devices;
CREATE POLICY pos_devices_select_policy ON public.pos_devices
    FOR SELECT
    USING (is_platform_owner() OR public.has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']));

DROP POLICY IF EXISTS pos_devices_modify_policy ON public.pos_devices;
CREATE POLICY pos_devices_modify_policy ON public.pos_devices
    FOR ALL
    USING (is_platform_owner() OR public.has_store_role(store_id, ARRAY['admin', 'manager']));


-- ============================================================================
-- 2. Offline Sales Sync Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.offline_sale_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
    local_sale_id UUID NOT NULL,
    cashier_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.pos_shifts(id) ON DELETE CASCADE,
    payload_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    sale_id UUID NULL REFERENCES public.sales(id) ON DELETE SET NULL,
    error_code TEXT NULL,
    error_message TEXT NULL,
    payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_device_sale UNIQUE (store_id, device_id, local_sale_id),
    CONSTRAINT check_payload_hash_sha256 CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT check_sync_status CHECK (status IN ('received', 'finalized', 'duplicate', 'conflict', 'failed', 'rejected')),
    CONSTRAINT check_finalized_fields CHECK (status <> 'finalized' OR (sale_id IS NOT NULL AND finalized_at IS NOT NULL)),
    CONSTRAINT check_error_fields CHECK (status NOT IN ('conflict', 'failed', 'rejected') OR error_code IS NOT NULL),
    CONSTRAINT check_payload_summary_obj CHECK (jsonb_typeof(payload_summary) = 'object')
);

-- Indexing for sync queues and validation lookups
CREATE INDEX IF NOT EXISTS idx_offline_sync_log_store_status ON public.offline_sale_sync_log(store_id, status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_log_store_received ON public.offline_sale_sync_log(store_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_sync_log_lookup ON public.offline_sale_sync_log(store_id, device_id, local_sale_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_log_sale_id ON public.offline_sale_sync_log(sale_id) WHERE sale_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.offline_sale_sync_log ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at column
DROP TRIGGER IF EXISTS update_offline_sale_sync_log_updated_at ON public.offline_sale_sync_log;
CREATE TRIGGER update_offline_sale_sync_log_updated_at
    BEFORE UPDATE ON public.offline_sale_sync_log
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS Policies (Insert/Update only possible through RPC functions)
DROP POLICY IF EXISTS offline_sync_log_select_policy ON public.offline_sale_sync_log;
CREATE POLICY offline_sync_log_select_policy ON public.offline_sale_sync_log
    FOR SELECT
    USING (is_platform_owner() OR public.has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR (public.has_store_role(store_id, ARRAY['casier']) AND cashier_profile_id = auth.uid()));


-- ============================================================================
-- 3. Offline Sync Snapshots (Integrity monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.offline_sync_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
    entity TEXT NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_count INTEGER NOT NULL DEFAULT 0,
    checksum TEXT NULL,
    sync_type TEXT NOT NULL DEFAULT 'incremental',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_snapshot_entity CHECK (entity IN ('products', 'product_prices', 'stock_batches', 'categories', 'shifts', 'store_settings', 'fiscalnet_config', 'full_bundle')),
    CONSTRAINT check_snapshot_sync_type CHECK (sync_type IN ('full', 'incremental')),
    CONSTRAINT check_snapshot_row_count CHECK (row_count >= 0),
    CONSTRAINT check_snapshot_checksum CHECK (checksum IS NULL OR checksum ~ '^[a-f0-9]{64}$')
);

-- Indexing for sync audits
CREATE INDEX IF NOT EXISTS idx_offline_snapshots_lookup ON public.offline_sync_snapshots(store_id, device_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_snapshots_entity ON public.offline_sync_snapshots(store_id, entity, snapshot_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.offline_sync_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS offline_snapshots_select_policy ON public.offline_sync_snapshots;
CREATE POLICY offline_snapshots_select_policy ON public.offline_sync_snapshots
    FOR SELECT
    USING (is_platform_owner() OR public.has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar', 'casier']));


-- ============================================================================
-- 4. RPC: Register POS Device
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_pos_device(
    p_store_id UUID,
    p_device_fingerprint TEXT,
    p_device_name TEXT
)
RETURNS public.pos_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_fingerprint TEXT;
    v_clean_name TEXT;
    v_device public.pos_devices;
BEGIN
    -- 1. Input validations
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id must not be null';
    END IF;
    IF p_device_fingerprint IS NULL THEN
        RAISE EXCEPTION 'p_device_fingerprint must not be null';
    END IF;
    IF p_device_name IS NULL THEN
        RAISE EXCEPTION 'p_device_name must not be null';
    END IF;

    v_clean_fingerprint := lower(trim(p_device_fingerprint));
    v_clean_name := trim(p_device_name);

    IF length(v_clean_fingerprint) < 12 THEN
        RAISE EXCEPTION 'Fingerprint must be at least 12 characters long';
    END IF;
    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Device name must be at least 2 characters long';
    END IF;

    -- 2. Authorization check (admin or manager or platform_owner)
    IF NOT (public.is_platform_owner() OR public.has_store_role(p_store_id, ARRAY['admin', 'manager'])) THEN
        RAISE EXCEPTION 'Access denied. Admin or manager role required to register devices.';
    END IF;

    -- 3. Upsert device record
    INSERT INTO public.pos_devices (
        store_id, device_name, device_fingerprint, active, created_by, last_seen_at
    )
    VALUES (
        p_store_id, v_clean_name, v_clean_fingerprint, TRUE, auth.uid(), now()
    )
    ON CONFLICT (store_id, device_fingerprint)
    DO UPDATE SET
        device_name = EXCLUDED.device_name,
        last_seen_at = now(),
        active = TRUE
    RETURNING * INTO v_device;

    -- 4. Audit logging
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
    VALUES (
        p_store_id,
        auth.uid(),
        'pos_device_registered',
        'pos_device',
        v_device.id,
        jsonb_build_object('device_name', v_clean_name, 'device_fingerprint', v_clean_fingerprint)
    );

    RETURN v_device;
END;
$$;


-- ============================================================================
-- 5. RPC: Get Offline Cache Bundle
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_offline_cache_bundle(
    p_store_id UUID,
    p_device_id UUID,
    p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_products JSONB;
    v_prices JSONB;
    v_stocks JSONB;
    v_categories JSONB;
    v_active_shift JSONB;
    v_store_settings JSONB;
    v_row_counts JSONB;
    v_checksum TEXT;
    v_result JSONB;
BEGIN
    -- 1. Input Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id must not be null';
    END IF;
    IF p_device_id IS NULL THEN
        RAISE EXCEPTION 'p_device_id must not be null';
    END IF;

    -- 2. Authorization Check
    IF NOT (public.is_platform_owner() OR EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_id = p_store_id AND profile_id = auth.uid() AND active = true
    )) THEN
        RAISE EXCEPTION 'Access denied. Active store membership required.';
    END IF;

    -- 3. Device Active check
    IF NOT EXISTS (
        SELECT 1 FROM public.pos_devices
        WHERE id = p_device_id AND store_id = p_store_id AND active = true
    ) THEN
        RAISE EXCEPTION 'Device unauthorized, inactive, or not found.';
    END IF;

    -- 4. Fetch Products (filter by p_since if present)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_products FROM (
        SELECT id, name, barcode, category_id, sgr_enabled, sgr_type, active
        FROM public.products
        WHERE store_id = p_store_id
          AND active = TRUE
          AND (p_since IS NULL OR updated_at >= p_since)
    ) t;

    -- 5. Fetch Prices (filter by p_since if present)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_prices FROM (
        SELECT product_id, store_id, price_sale, vat_group, vat_percent
        FROM public.product_prices
        WHERE store_id = p_store_id
          AND (p_since IS NULL OR updated_at >= p_since)
    ) t;

    -- 6. Fetch Stocks (aggregating stock_batches zone = 'magazin' group by product_id)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_stocks FROM (
        SELECT product_id, SUM(quantity) AS total_stock
        FROM public.stock_batches
        WHERE store_id = p_store_id AND zone = 'magazin'
        GROUP BY product_id
    ) t;

    -- 7. Fetch Categories (filter by p_since if present)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_categories FROM (
        SELECT id, parent_id, name
        FROM public.categories
        WHERE store_id = p_store_id
          AND (p_since IS NULL OR updated_at >= p_since)
    ) t;

    -- 8. Fetch Active Shift (open shift for current cashier user)
    SELECT COALESCE(jsonb_build_object(
        'id', id,
        'opened_by', opened_by,
        'opened_at', opened_at,
        'status', status
    ), 'null'::jsonb) INTO v_active_shift FROM public.pos_shifts
    WHERE store_id = p_store_id
      AND opened_by = auth.uid()
      AND status = 'open'
    LIMIT 1;

    -- 9. Fetch Store Settings (sanitized: only tax settings and general metadata, no private credentials)
    -- NOTE: fiscalnet_config is configured exclusively local on each client PC storage and is NOT stored on the server.
    SELECT jsonb_build_object(
        'store_id', id,
        'name', name,
        'tax', settings->'tax'
    ) INTO v_store_settings
    FROM public.stores
    WHERE id = p_store_id;

    -- 10. Generate Row Counts
    v_row_counts := jsonb_build_object(
        'products', jsonb_array_length(v_products),
        'prices', jsonb_array_length(v_prices),
        'stocks', jsonb_array_length(v_stocks),
        'categories', jsonb_array_length(v_categories)
    );

    -- 11. Compute checksum of the returned products and prices to verify package integrity
    v_checksum := encode(digest(v_products::text || v_prices::text, 'sha256'), 'hex');

    -- 12. Log Snapshot creation
    INSERT INTO public.offline_sync_snapshots (
        store_id, device_id, entity, row_count, checksum, sync_type
    )
    VALUES (
        p_store_id,
        p_device_id,
        'full_bundle',
        (jsonb_array_length(v_products) + jsonb_array_length(v_prices) + jsonb_array_length(v_stocks) + jsonb_array_length(v_categories)),
        v_checksum,
        CASE WHEN p_since IS NULL THEN 'full' ELSE 'incremental' END
    );

    -- 13. Audit Log
    INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id)
    VALUES (
        p_store_id,
        auth.uid(),
        'offline_cache_bundle_requested',
        'pos_device',
        p_device_id
    );

    -- 14. Build output
    v_result := jsonb_build_object(
        'products', v_products,
        'prices', v_prices,
        'stocks', v_stocks,
        'categories', v_categories,
        'active_shift', v_active_shift,
        'store_settings', v_store_settings,
        'metadata', jsonb_build_object(
            'generated_at', now(),
            'sync_type', CASE WHEN p_since IS NULL THEN 'full' ELSE 'incremental' END,
            'row_counts', v_row_counts,
            'checksum', v_checksum
        )
    );

    RETURN v_result;
END;
$$;


-- ============================================================================
-- 6. RPC: Sync Offline Sale
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_offline_sale(
    p_store_id UUID,
    p_device_id UUID,
    p_local_sale_id UUID,
    p_payload_hash TEXT,
    p_items JSONB,
    p_payments JSONB,
    p_shift_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_hash TEXT;
    v_log_id UUID;
    v_existing_status TEXT;
    v_existing_sale_id UUID;
    v_existing_hash TEXT;
    
    -- Cashier profile ID resolver
    v_cashier_id UUID := auth.uid();
    
    -- Totals validation variables
    v_recalc_total DECIMAL(12,2) := 0;
    v_payment_total DECIMAL(12,2) := 0;
    
    -- Loop item variables
    v_item JSONB;
    v_product_id UUID;
    v_qty DECIMAL(12,3);
    v_local_unit_price DECIMAL(12,2);
    v_server_unit_price DECIMAL(12,2);
    v_local_vat_group TEXT;
    v_server_vat_group TEXT;
    v_local_vat_rate DECIMAL(5,2);
    v_server_vat_rate DECIMAL(5,2);
    
    v_local_sgr_enabled BOOLEAN;
    v_server_sgr_enabled BOOLEAN;
    v_local_sgr_amount DECIMAL(12,2);
    
    -- Output variable from finalize_sale
    v_finalize_res JSONB;
    v_sale_id UUID;
BEGIN
    -- 1. Input Validations
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id must not be null';
    END IF;
    IF p_device_id IS NULL THEN
        RAISE EXCEPTION 'p_device_id must not be null';
    END IF;
    IF p_local_sale_id IS NULL THEN
        RAISE EXCEPTION 'p_local_sale_id must not be null';
    END IF;
    IF p_payload_hash IS NULL THEN
        RAISE EXCEPTION 'p_payload_hash must not be null';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'p_items must be a non-empty array';
    END IF;
    IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array' OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'p_payments must be a non-empty array';
    END IF;
    IF p_shift_id IS NULL THEN
        RAISE EXCEPTION 'p_shift_id must not be null';
    END IF;

    v_clean_hash := lower(trim(p_payload_hash));
    IF v_clean_hash !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'Invalid hash format. Must be a 64-character SHA-256 hex string.';
    END IF;

    -- 2. Device active check
    IF NOT EXISTS (
        SELECT 1 FROM public.pos_devices
        WHERE id = p_device_id AND store_id = p_store_id AND active = true
    ) THEN
        INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
        VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_rejected', 'offline_sale', p_local_sale_id, jsonb_build_object('reason', 'device_inactive_or_not_found', 'device_id', p_device_id));
        
        RETURN jsonb_build_object('success', false, 'status', 'device_inactive', 'error_message', 'Device inactive, unauthorized, or not found.');
    END IF;

    -- 3. Authorization check (admin, manager, or casier)
    IF NOT (public.is_platform_owner() OR public.has_store_role(p_store_id, ARRAY['admin', 'manager', 'casier'])) THEN
        RAISE EXCEPTION 'Access denied. POS sync requires active cashier, manager, or admin role.';
    END IF;

    -- 4. Idempotency Check
    SELECT status, sale_id, payload_hash INTO v_existing_status, v_existing_sale_id, v_existing_hash
    FROM public.offline_sale_sync_log
    WHERE store_id = p_store_id AND device_id = p_device_id AND local_sale_id = p_local_sale_id;

    IF FOUND THEN
        IF v_existing_status = 'finalized' THEN
            IF v_existing_hash = v_clean_hash THEN
                -- Duplicate submission (idempotent success)
                INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id)
                VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_duplicate', 'sale', v_existing_sale_id);

                RETURN jsonb_build_object(
                    'success', true,
                    'sale_id', v_existing_sale_id,
                    'status', 'duplicate'
                );
            ELSE
                -- Conflict: same transaction ID but different payload hashes
                INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
                VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_conflict', 'offline_sale', p_local_sale_id, jsonb_build_object('reason', 'payload_mismatch', 'existing_hash', v_existing_hash, 'new_hash', v_clean_hash));

                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'payload_mismatch',
                    'error_message', 'Idempotency conflict: A synchronized sale with this local_sale_id already exists but has a different payload hash.'
                );
            END IF;
        ELSE
            -- Existing pending/failed logs will be updated
            v_log_id := (SELECT id FROM public.offline_sale_sync_log WHERE store_id = p_store_id AND device_id = p_device_id AND local_sale_id = p_local_sale_id);
        END IF;
    END IF;

    -- 5. Shift check (must be open)
    IF NOT EXISTS (
        SELECT 1 FROM public.pos_shifts
        WHERE id = p_shift_id AND store_id = p_store_id AND status = 'open'
    ) THEN
        IF v_log_id IS NULL THEN
            INSERT INTO public.offline_sale_sync_log (store_id, device_id, local_sale_id, cashier_profile_id, shift_id, payload_hash, status, error_code, error_message)
            VALUES (p_store_id, p_device_id, p_local_sale_id, v_cashier_id, p_shift_id, v_clean_hash, 'conflict', 'SHIFT_CLOSED', 'Associated POS shift is closed or invalid.');
        ELSE
            UPDATE public.offline_sale_sync_log
            SET status = 'conflict', error_code = 'SHIFT_CLOSED', error_message = 'Associated POS shift is closed or invalid.'
            WHERE id = v_log_id;
        END IF;

        INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
        VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_conflict', 'offline_sale', p_local_sale_id, jsonb_build_object('reason', 'shift_closed', 'shift_id', p_shift_id));

        RETURN jsonb_build_object('success', false, 'status', 'shift_closed', 'error_message', 'Associated POS shift is closed or invalid.');
    END IF;

    -- 6. Insert/Update sync log entry in 'received' state
    IF v_log_id IS NULL THEN
        INSERT INTO public.offline_sale_sync_log (
            store_id, device_id, local_sale_id, cashier_profile_id, shift_id, payload_hash, status, payload_summary
        )
        VALUES (
            p_store_id, p_device_id, p_local_sale_id, v_cashier_id, p_shift_id, v_clean_hash, 'received', jsonb_build_object('item_count', jsonb_array_length(p_items))
        )
        RETURNING id INTO v_log_id;
    ELSE
        UPDATE public.offline_sale_sync_log
        SET status = 'received', error_code = NULL, error_message = NULL
        WHERE id = v_log_id;
    END IF;

    -- 7. Recalculate totals and validate prices/VAT/SGR server-side (Zero Trust client details)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::DECIMAL;
        v_local_unit_price := (v_item->>'unit_price')::DECIMAL;
        v_local_vat_group := v_item->>'vat_group';
        v_local_vat_rate := (v_item->>'vat_rate')::DECIMAL;
        v_local_sgr_enabled := COALESCE((v_item->>'sgr_enabled')::BOOLEAN, false);
        v_local_sgr_amount := COALESCE((v_item->>'sgr_total_amount')::DECIMAL, 0.00);

        -- Check Product exists and is active
        IF NOT EXISTS (
            SELECT 1 FROM public.products WHERE id = v_product_id AND store_id = p_store_id AND active = true
        ) THEN
            UPDATE public.offline_sale_sync_log
            SET status = 'conflict', error_code = 'PRODUCT_INACTIVE', error_message = 'Product not found or inactive: ' || v_product_id::text
            WHERE id = v_log_id;

            RETURN jsonb_build_object('success', false, 'status', 'rejected', 'error_code', 'PRODUCT_INACTIVE', 'error_message', 'Product not found or inactive: ' || v_product_id::text);
        END IF;

        -- Get Server price and VAT config
        SELECT price_sale, vat_group, vat_percent INTO v_server_unit_price, v_server_vat_group, v_server_vat_rate
        FROM public.product_prices
        WHERE store_id = p_store_id AND product_id = v_product_id;

        IF v_server_unit_price IS NULL THEN
            UPDATE public.offline_sale_sync_log
            SET status = 'conflict', error_code = 'PRICE_NOT_FOUND', error_message = 'Server price not set for product: ' || v_product_id::text
            WHERE id = v_log_id;

            RETURN jsonb_build_object('success', false, 'status', 'conflict_price', 'error_code', 'PRICE_NOT_FOUND', 'error_message', 'Price not set for product.');
        END IF;

        -- Get Server SGR config
        SELECT COALESCE(sgr_enabled, false) INTO v_server_sgr_enabled
        FROM public.products
        WHERE id = v_product_id AND store_id = p_store_id;

        -- Validate Local price vs Server price
        IF ABS(v_local_unit_price - v_server_unit_price) > 0.01 THEN
            UPDATE public.offline_sale_sync_log
            SET status = 'conflict', error_code = 'PRICE_MISMATCH', error_message = 'Price mismatch for product: ' || v_product_id::text || ' (Local: ' || v_local_unit_price || ', Server: ' || v_server_unit_price || ')'
            WHERE id = v_log_id;

            RETURN jsonb_build_object('success', false, 'status', 'conflict_price', 'error_code', 'PRICE_MISMATCH', 'error_message', 'Price mismatch.');
        END IF;

        -- Validate VAT configuration
        IF v_local_vat_group <> v_server_vat_group OR ABS(v_local_vat_rate - v_server_vat_rate) > 0.01 THEN
            UPDATE public.offline_sale_sync_log
            SET status = 'conflict', error_code = 'VAT_MISMATCH', error_message = 'VAT mismatch for product: ' || v_product_id::text || ' (Local Group: ' || v_local_vat_group || ', Server Group: ' || v_server_vat_group || ')'
            WHERE id = v_log_id;

            RETURN jsonb_build_object('success', false, 'status', 'conflict_vat', 'error_code', 'VAT_MISMATCH', 'error_message', 'VAT config mismatch.');
        END IF;

        -- Validate SGR configuration
        IF v_local_sgr_enabled <> v_server_sgr_enabled THEN
            UPDATE public.offline_sale_sync_log
            SET status = 'conflict', error_code = 'SGR_MISMATCH', error_message = 'SGR enabled flag mismatch for product: ' || v_product_id::text
            WHERE id = v_log_id;

            RETURN jsonb_build_object('success', false, 'status', 'conflict_sgr', 'error_code', 'SGR_MISMATCH', 'error_message', 'SGR enabled mismatch.');
        END IF;

        -- Recalculate totals
        v_recalc_total := v_recalc_total + (v_qty * v_server_unit_price);
        IF v_server_sgr_enabled THEN
            v_recalc_total := v_recalc_total + (v_qty * 0.50);
        END IF;
    END LOOP;

    -- Recalculate payment total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_payment_total := v_payment_total + (v_item->>'amount')::DECIMAL;
    END LOOP;

    -- Validate payment matches recalculated totals
    IF ABS(v_payment_total - v_recalc_total) > 0.01 THEN
        UPDATE public.offline_sale_sync_log
        SET status = 'conflict', error_code = 'PAYMENT_MISMATCH', error_message = 'Payments total (' || v_payment_total || ') does not match server recalculated total (' || v_recalc_total || ')'
        WHERE id = v_log_id;

        RETURN jsonb_build_object('success', false, 'status', 'rejected', 'error_code', 'PAYMENT_MISMATCH', 'error_message', 'Recalculated totals do not match payments.');
    END IF;

    -- 8. Call the live finalize_sale function to execute transactional blocks (stock, sale insertion, audit)
    BEGIN
        v_finalize_res := public.finalize_sale(
            p_store_id,
            v_cashier_id,
            p_items,
            p_payments,
            p_shift_id
        );
        v_sale_id := (v_finalize_res->>'sale_id')::UUID;

        -- Update sync log status to finalized
        UPDATE public.offline_sale_sync_log
        SET status = 'finalized', sale_id = v_sale_id, finalized_at = now()
        WHERE id = v_log_id;

        -- Audit success
        INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id)
        VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_finalized', 'sale', v_sale_id);

        RETURN jsonb_build_object(
            'success', true,
            'sale_id', v_sale_id,
            'status', 'finalized'
        );
    EXCEPTION 
        WHEN OTHERS THEN
            -- Check for stock exceptions and classify appropriately
            IF SQLERRM LIKE '%Stoc insuficient%' THEN
                UPDATE public.offline_sale_sync_log
                SET status = 'conflict', error_code = 'INSUFFICIENT_STOCK', error_message = SQLERRM
                WHERE id = v_log_id;

                INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
                VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_conflict', 'offline_sale', p_local_sale_id, jsonb_build_object('reason', 'insufficient_stock', 'details', SQLERRM));

                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'conflict_stock',
                    'error_code', 'INSUFFICIENT_STOCK',
                    'error_message', SQLERRM
                );
            ELSE
                UPDATE public.offline_sale_sync_log
                SET status = 'failed', error_code = SQLSTATE, error_message = SQLERRM
                WHERE id = v_log_id;

                INSERT INTO public.audit_logs (store_id, profile_id, action, entity_type, entity_id, new_data)
                VALUES (p_store_id, v_cashier_id, 'offline_sale_sync_failed', 'offline_sale', p_local_sale_id, jsonb_build_object('error_code', SQLSTATE, 'error_message', SQLERRM));

                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'failed_retryable',
                    'error_code', SQLSTATE,
                    'error_message', SQLERRM
                );
            END IF;
    END;
END;
$$;


-- ============================================================================
-- 7. RPC: Get Offline Sync Status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_offline_sync_status(
    p_store_id UUID,
    p_device_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_device_active BOOLEAN;
    v_last_seen TIMESTAMPTZ;
    v_last_full_sync TIMESTAMPTZ;
    v_last_incr_sync TIMESTAMPTZ;
    v_counts JSONB;
    v_latest_errors JSONB;
    v_cache_health TEXT := 'ok';
    v_generated_at TIMESTAMPTZ := now();
    v_cache_age_hours INT;
BEGIN
    -- 1. Authorization check
    IF NOT (public.is_platform_owner() OR EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_id = p_store_id AND profile_id = auth.uid() AND active = true
    )) THEN
        RAISE EXCEPTION 'Access denied. Store membership required.';
    END IF;

    -- 2. Fetch device details
    SELECT active, last_seen_at INTO v_device_active, v_last_seen
    FROM public.pos_devices
    WHERE id = p_device_id AND store_id = p_store_id;

    IF v_device_active IS NULL THEN
        RAISE EXCEPTION 'Device not found.';
    END IF;

    -- 3. Fetch latest sync events
    SELECT MAX(snapshot_at) INTO v_last_full_sync
    FROM public.offline_sync_snapshots
    WHERE store_id = p_store_id AND device_id = p_device_id AND sync_type = 'full';

    SELECT MAX(snapshot_at) INTO v_last_incr_sync
    FROM public.offline_sync_snapshots
    WHERE store_id = p_store_id AND device_id = p_device_id AND sync_type = 'incremental';

    -- 4. Calculate Cache Health based on latest full sync
    IF v_last_full_sync IS NULL THEN
        v_cache_health := 'ok';
    ELSE
        v_cache_age_hours := EXTRACT(EPOCH FROM (now() - v_last_full_sync)) / 3600;
        IF v_cache_age_hours >= 48 THEN
            v_cache_health := 'expired_48h';
        ELSIF v_cache_age_hours >= 24 THEN
            v_cache_health := 'stale_24h';
        ELSE
            v_cache_health := 'ok';
        END IF;
    END IF;

    -- 5. Calculate Status Counts
    SELECT jsonb_build_object(
        'queued_received', COUNT(CASE WHEN status = 'received' THEN 1 END),
        'finalized', COUNT(CASE WHEN status = 'finalized' THEN 1 END),
        'duplicate', COUNT(CASE WHEN status = 'duplicate' THEN 1 END),
        'conflict', COUNT(CASE WHEN status = 'conflict' THEN 1 END),
        'failed', COUNT(CASE WHEN status = 'failed' THEN 1 END),
        'rejected', COUNT(CASE WHEN status = 'rejected' THEN 1 END)
    ) INTO v_counts
    FROM public.offline_sale_sync_log
    WHERE store_id = p_store_id AND device_id = p_device_id;

    -- 6. Fetch Latest Errors
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_latest_errors FROM (
        SELECT local_sale_id, status, error_code, error_message, created_at
        FROM public.offline_sale_sync_log
        WHERE store_id = p_store_id AND device_id = p_device_id AND status IN ('conflict', 'failed', 'rejected')
        ORDER BY created_at DESC
        LIMIT 5
    ) t;

    RETURN jsonb_build_object(
        'device_id', p_device_id,
        'active', v_device_active,
        'last_seen_at', v_last_seen,
        'last_full_sync_at', v_last_full_sync,
        'last_incremental_sync_at', v_last_incr_sync,
        'counts', v_counts,
        'latest_errors', v_latest_errors,
        'cache_health', v_cache_health,
        'generated_at', v_generated_at
    );
END;
$$;


-- ============================================================================
-- 8. Secure Grants and Permissions
-- ============================================================================
-- Revoke all default execution rights from public and anonymous users
REVOKE EXECUTE ON FUNCTION public.register_pos_device(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_pos_device(UUID, TEXT, TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_offline_cache_bundle(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_offline_cache_bundle(UUID, UUID, TIMESTAMPTZ) FROM anon;

REVOKE EXECUTE ON FUNCTION public.sync_offline_sale(UUID, UUID, UUID, TEXT, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_offline_sale(UUID, UUID, UUID, TEXT, JSONB, JSONB, UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_offline_sync_status(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_offline_sync_status(UUID, UUID) FROM anon;

-- Grant execution to authenticated store members
GRANT EXECUTE ON FUNCTION public.register_pos_device(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_offline_cache_bundle(UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_offline_sale(UUID, UUID, UUID, TEXT, JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_offline_sync_status(UUID, UUID) TO authenticated;
