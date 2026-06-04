-- Proposed Database Schema and RPC Functions for Offline POS Sync (Stage 6APP.3)
-- This file is a blueprint and is NOT applied directly to live Supabase during this stage.

-- 1. POS Devices Registry
CREATE TABLE IF NOT EXISTS public.pos_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;

-- 2. Offline Sales Sync Log
CREATE TABLE IF NOT EXISTS public.offline_sale_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
    local_sale_id UUID NOT NULL,
    cashier_profile_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    payload_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('received', 'finalized', 'duplicate', 'conflict', 'failed')),
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    error_code TEXT,
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT now(),
    finalized_at TIMESTAMPTZ,
    CONSTRAINT unique_device_sale UNIQUE (device_id, local_sale_id)
);

-- Enable RLS
ALTER TABLE public.offline_sale_sync_log ENABLE ROW LEVEL SECURITY;

-- 3. Offline Sync Snapshots (Integrity monitoring)
CREATE TABLE IF NOT EXISTS public.offline_sync_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
    entity TEXT NOT NULL, -- 'products', 'prices', 'stocks', 'categories'
    snapshot_at TIMESTAMPTZ DEFAULT now(),
    row_count INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offline_sync_snapshots ENABLE ROW LEVEL SECURITY;

-- Indexing for fast sync queries
CREATE INDEX IF NOT EXISTS idx_devices_store ON public.pos_devices(store_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_device ON public.offline_sale_sync_log(device_id, local_sale_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON public.offline_sale_sync_log(status);

-- 4. RPC: Register POS Device
CREATE OR REPLACE FUNCTION public.register_pos_device(
    p_store_id UUID,
    p_device_fingerprint TEXT,
    p_device_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_device_id UUID;
BEGIN
    -- Authorization check
    IF NOT EXISTS (
        SELECT 1 FROM public.store_employees
        WHERE store_id = p_store_id 
          AND profile_id = auth.uid()
          AND role IN ('admin', 'platform_owner')
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required to register devices.';
    END IF;

    -- Upsert POS device
    INSERT INTO public.pos_devices (store_id, device_name, device_fingerprint, active, last_seen_at)
    VALUES (p_store_id, p_device_name, p_device_fingerprint, TRUE, now())
    ON CONFLICT (device_fingerprint)
    DO UPDATE SET 
        device_name = EXCLUDED.device_name,
        last_seen_at = now()
    RETURNING id INTO v_device_id;

    RETURN v_device_id;
END;
$$;

-- 5. RPC: Get Offline Cache Bundle (For Products, Prices, Stocks & Categories)
CREATE OR REPLACE FUNCTION public.get_offline_cache_bundle(
    p_store_id UUID,
    p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    products JSON,
    prices JSON,
    stocks JSON,
    categories JSON,
    server_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify role-based store access
    IF NOT EXISTS (
        SELECT 1 FROM public.store_employees
        WHERE store_id = p_store_id AND profile_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied. You do not belong to this store.';
    END IF;

    RETURN QUERY
    SELECT 
        -- Products JSON
        (
            SELECT json_agg(t) FROM (
                SELECT id, name, barcode, category_id, sgr_enabled, sgr_type, active
                FROM public.products
                WHERE active = TRUE 
                  AND (p_since IS NULL OR updated_at >= p_since)
            ) t
        ) AS products,
        -- Prices JSON
        (
            SELECT json_agg(t) FROM (
                SELECT product_id, store_id, price, vat_group, vat_rate
                FROM public.product_prices
                WHERE store_id = p_store_id 
                  AND (p_since IS NULL OR updated_at >= p_since)
            ) t
        ) AS prices,
        -- Stock snapshot JSON
        (
            SELECT json_agg(t) FROM (
                SELECT product_id, store_id, total_stock, warehouse_stock, store_stock
                FROM public.product_stock_snapshots
                WHERE store_id = p_store_id
            ) t
        ) AS stocks,
        -- Categories JSON
        (
            SELECT json_agg(t) FROM (
                SELECT id, parent_id, name
                FROM public.categories
                WHERE (p_since IS NULL OR updated_at >= p_since)
            ) t
        ) AS categories,
        now() AS server_time;
END;
$$;

-- 6. RPC: Sync Offline Sale (Idempotent submission of individual offline sale)
CREATE OR REPLACE FUNCTION public.sync_offline_sale(
    p_store_id UUID,
    p_device_id UUID,
    p_local_sale_id UUID,
    p_payload_hash TEXT,
    p_cashier_id UUID,
    p_shift_id UUID,
    p_items JSONB,
    p_payments JSONB,
    p_totals JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id UUID;
    v_log_id UUID;
    v_existing_status TEXT;
    v_existing_sale_id UUID;
    v_item RECORD;
    v_payment RECORD;
BEGIN
    -- 1. Check Device authorization
    IF NOT EXISTS (
        SELECT 1 FROM public.pos_devices
        WHERE id = p_device_id AND store_id = p_store_id AND active = TRUE
    ) THEN
        RAISE EXCEPTION 'Device unauthorized or inactive.';
    END IF;

    -- 2. Idempotency Check
    SELECT status, sale_id INTO v_existing_status, v_existing_sale_id
    FROM public.offline_sale_sync_log
    WHERE device_id = p_device_id AND local_sale_id = p_local_sale_id;

    IF FOUND THEN
        -- If already successfully synchronized, return early
        IF v_existing_status = 'finalized' THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'sale_id', v_existing_sale_id,
                'status', 'duplicate'
            );
        END IF;
    END IF;

    -- 3. Register Sync log entry in 'received' state
    INSERT INTO public.offline_sale_sync_log (
        store_id, device_id, local_sale_id, cashier_profile_id, shift_id, payload_hash, status
    )
    VALUES (
        p_store_id, p_device_id, p_local_sale_id, p_cashier_id, p_shift_id, p_payload_hash, 'received'
    )
    ON CONFLICT (device_id, local_sale_id) 
    DO UPDATE SET status = 'received', received_at = now()
    RETURNING id INTO v_log_id;

    -- 4. Process transaction items, recalculate, and insert into central Sales table
    -- (Validation details: check local prices vs server, check stock levels)
    -- Insert into sales table (Mock behavior for transaction block blueprint)
    INSERT INTO public.sales (
        store_id, cashier_id, shift_id, total_amount, payment_status, created_at
    )
    VALUES (
        p_store_id, p_cashier_id, p_shift_id, (p_totals->>'total')::NUMERIC, 'completed', now()
    )
    RETURNING id INTO v_sale_id;

    -- Update log status to finalized
    UPDATE public.offline_sale_sync_log
    SET status = 'finalized', sale_id = v_sale_id, finalized_at = now()
    WHERE id = v_log_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'sale_id', v_sale_id,
        'status', 'synced'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log transaction failure details
        INSERT INTO public.offline_sale_sync_log (
            store_id, device_id, local_sale_id, cashier_profile_id, shift_id, payload_hash, status, error_code, error_message
        )
        VALUES (
            p_store_id, p_device_id, p_local_sale_id, p_cashier_id, p_shift_id, p_payload_hash, 'failed', SQLSTATE, SQLERRM
        )
        ON CONFLICT (device_id, local_sale_id)
        DO UPDATE SET 
            status = 'failed',
            error_code = SQLSTATE,
            error_message = SQLERRM;

        RETURN jsonb_build_object(
            'success', FALSE,
            'error_code', SQLSTATE,
            'error_message', SQLERRM
        );
END;
$$;

-- 7. RPC: Get Offline Sync Status
CREATE OR REPLACE FUNCTION public.get_offline_sync_status(
    p_store_id UUID,
    p_device_id UUID
)
RETURNS TABLE (
    total_synced BIGINT,
    total_failed BIGINT,
    last_sync_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN status = 'finalized' THEN 1 END) AS total_synced,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS total_failed,
        MAX(finalized_at) AS last_sync_time
    FROM public.offline_sale_sync_log
    WHERE store_id = p_store_id AND device_id = p_device_id;
END;
$$;
