-- ############################################################################
-- STORE LIFECYCLE MANAGEMENT BLUEPRINT (ETAPA 6F.1.10 - HARDENED)
-- Project: Gestiune Magazin v2
--
-- IMPORTANT: This script is a BLUEPRINT (architectural proposal).
-- DO NOT apply directly to the live production database in this stage.
-- Hard delete operations have been neutralized (converted to a safe exception stub)
-- because of the cascading delete danger (ON DELETE CASCADE) on critical tables.
-- ############################################################################

-- ============================================================================
-- 1. SCHEMA EXTENSION FOR TABLE: public.stores
-- ============================================================================

-- Add lifecycle columns to track states and audit metadata
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archive_reason text,
ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deletion_reason text;

-- Add check constraint to enforce valid lifecycle statuses
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS check_stores_lifecycle_status;
ALTER TABLE public.stores ADD CONSTRAINT check_stores_lifecycle_status
    CHECK (lifecycle_status IN ('active', 'suspended', 'archived', 'pending_deletion', 'deleted'));

-- Add performance indexes for filtering stores by status
CREATE INDEX IF NOT EXISTS idx_stores_lifecycle_status
    ON public.stores(lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_stores_active_lifecycle
    ON public.stores(active, lifecycle_status);

-- Comments explaining columns
COMMENT ON COLUMN public.stores.lifecycle_status IS 'State of the store. Enforced values: active, suspended, archived, pending_deletion, deleted.';
COMMENT ON COLUMN public.stores.active IS 'Legacy compatibility flag. Sourced by trigger from lifecycle_status: true for active, false otherwise.';


-- ============================================================================
-- 2. COMPATIBILITY & STATE ALIGNMENT TRIGGER
-- ============================================================================
-- Ensures that any insert or update of lifecycle_status automatically synchronizes
-- the legacy `active` boolean column.
CREATE OR REPLACE FUNCTION public.sync_store_active_with_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.lifecycle_status = 'active' THEN
        NEW.active := true;
    ELSE
        NEW.active := false;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_store_active_with_lifecycle ON public.stores;
CREATE TRIGGER trigger_sync_store_active_with_lifecycle
    BEFORE INSERT OR UPDATE OF lifecycle_status ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.sync_store_active_with_lifecycle();


-- ============================================================================
-- 3. SECURE INTERFACES (RPC FUNCTIONS)
-- ============================================================================

-- A. get_store_lifecycle_status(p_store_id uuid)
-- Returns details about the store's lifecycle, audit info, and dependent table counts.
CREATE OR REPLACE FUNCTION public.get_store_lifecycle_status(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store record;
    v_counts jsonb;
    v_eligible jsonb;
BEGIN
    -- 1. Security Check: Only platform_owner is allowed to see lifecycle audits
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can inspect store lifecycle status.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    -- 3. Retrieve store details
    SELECT id, name, active, lifecycle_status,
           suspended_at, suspended_by, suspension_reason,
           archived_at, archived_by, archive_reason,
           deletion_requested_at, deletion_requested_by, deletion_reason
    INTO v_store
    FROM public.stores
    WHERE id = p_store_id;

    IF v_store IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. Calculate eligibility and table counts (includes is_platform_owner check inside)
    v_eligible := public.get_store_deletion_eligibility(p_store_id);

    RETURN jsonb_build_object(
        'ok', true,
        'storeId', v_store.id,
        'name', v_store.name,
        'active', v_store.active,
        'lifecycleStatus', v_store.lifecycle_status,
        'suspendedAt', v_store.suspended_at,
        'suspendedBy', v_store.suspended_by,
        'suspensionReason', v_store.suspension_reason,
        'archivedAt', v_store.archived_at,
        'archivedBy', v_store.archived_by,
        'archiveReason', v_store.archive_reason,
        'deletionRequestedAt', v_store.deletion_requested_at,
        'deletionRequestedBy', v_store.deletion_requested_by,
        'deletionReason', v_store.deletion_reason,
        'canDelete', v_eligible->'canDelete',
        'recommendedAction', v_eligible->'recommendedAction',
        'counts', v_eligible->'counts'
    );
END;
$$;


-- B. suspend_store(p_store_id uuid, p_reason text)
-- Temporarily suspends operational actions. Keep data, block logins/access.
CREATE OR REPLACE FUNCTION public.suspend_store(p_store_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_old_status text;
    v_trimmed_reason text;
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can suspend stores.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    v_user_id := auth.uid();
    v_trimmed_reason := trim(p_reason);

    IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
        RAISE EXCEPTION 'Suspension reason is mandatory and must be at least 3 characters long.';
    END IF;

    -- 3. Lock store row & Fetch current status
    SELECT lifecycle_status INTO v_old_status
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. State Transition Check
    IF v_old_status = 'suspended' THEN
        RETURN jsonb_build_object('ok', true, 'changed', false, 'message', 'Store is already suspended.');
    END IF;

    -- Suspend is only allowed from active status
    IF v_old_status <> 'active' THEN
        RAISE EXCEPTION 'Cannot suspend store. Store is in status: %', v_old_status;
    END IF;

    -- 5. Perform update
    UPDATE public.stores
    SET lifecycle_status = 'suspended',
        suspended_at = now(),
        suspended_by = v_user_id,
        suspension_reason = v_trimmed_reason,
        -- Clear other states' fields to keep schema clean
        archived_at = NULL, archived_by = NULL, archive_reason = NULL,
        deletion_requested_at = NULL, deletion_requested_by = NULL, deletion_reason = NULL
    WHERE id = p_store_id;

    -- 6. Audit Log
    INSERT INTO public.audit_logs (
        store_id, profile_id, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
        p_store_id, v_user_id, 'store.suspend', 'store', p_store_id,
        jsonb_build_object('lifecycle_status', v_old_status),
        jsonb_build_object('lifecycle_status', 'suspended', 'reason', v_trimmed_reason)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'changed', true,
        'storeId', p_store_id,
        'lifecycleStatus', 'suspended',
        'reason', v_trimmed_reason
    );
END;
$$;


-- C. reactivate_store(p_store_id uuid, p_reason text)
-- Restores store to 'active' status.
CREATE OR REPLACE FUNCTION public.reactivate_store(p_store_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_old_status text;
    v_trimmed_reason text;
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can reactivate stores.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    v_user_id := auth.uid();
    v_trimmed_reason := trim(p_reason);

    IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
        RAISE EXCEPTION 'Reactivation reason is mandatory and must be at least 3 characters long.';
    END IF;

    -- 3. Lock store row & Fetch current status
    SELECT lifecycle_status INTO v_old_status
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. State Transition Check
    IF v_old_status = 'active' THEN
        RETURN jsonb_build_object('ok', true, 'changed', false, 'message', 'Store is already active.');
    END IF;

    -- Reactivation is blocked if store is permanently deleted/tombstoned
    IF v_old_status = 'deleted' THEN
        RAISE EXCEPTION 'Cannot reactivate a permanently deleted store.';
    END IF;

    -- Reactivation is permitted from suspended, archived, or pending_deletion
    -- 5. Perform update
    UPDATE public.stores
    SET lifecycle_status = 'active',
        -- Clear audit trail for non-active states since store is now restored
        suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL,
        archived_at = NULL, archived_by = NULL, archive_reason = NULL,
        deletion_requested_at = NULL, deletion_requested_by = NULL, deletion_reason = NULL
    WHERE id = p_store_id;

    -- 6. Audit Log (History remains in audit_logs)
    INSERT INTO public.audit_logs (
        store_id, profile_id, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
        p_store_id, v_user_id, 'store.reactivate', 'store', p_store_id,
        jsonb_build_object('lifecycle_status', v_old_status),
        jsonb_build_object('lifecycle_status', 'active', 'reason', v_trimmed_reason)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'changed', true,
        'storeId', p_store_id,
        'lifecycleStatus', 'active',
        'reason', v_trimmed_reason
    );
END;
$$;


-- E. archive_store(p_store_id uuid, p_reason text)
-- Permanently archives store context for closed collaborations. Historical data remains read-only.
CREATE OR REPLACE FUNCTION public.archive_store(p_store_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_old_status text;
    v_trimmed_reason text;
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can archive stores.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    v_user_id := auth.uid();
    v_trimmed_reason := trim(p_reason);

    IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
        RAISE EXCEPTION 'Archive reason is mandatory and must be at least 3 characters long.';
    END IF;

    -- 3. Lock store row & Fetch current status
    SELECT lifecycle_status INTO v_old_status
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. State Transition Check
    IF v_old_status = 'archived' THEN
        RETURN jsonb_build_object('ok', true, 'changed', false, 'message', 'Store is already archived.');
    END IF;

    IF v_old_status = 'deleted' THEN
        RAISE EXCEPTION 'Cannot archive a permanently deleted store.';
    END IF;

    -- Archiving is permitted from active, suspended, or pending_deletion
    -- 5. Perform update
    UPDATE public.stores
    SET lifecycle_status = 'archived',
        archived_at = now(),
        archived_by = v_user_id,
        archive_reason = v_trimmed_reason,
        -- Clear other states' fields to keep schema clean
        suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL,
        deletion_requested_at = NULL, deletion_requested_by = NULL, deletion_reason = NULL
    WHERE id = p_store_id;

    -- 6. Audit Log
    INSERT INTO public.audit_logs (
        store_id, profile_id, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
        p_store_id, v_user_id, 'store.archive', 'store', p_store_id,
        jsonb_build_object('lifecycle_status', v_old_status),
        jsonb_build_object('lifecycle_status', 'archived', 'reason', v_trimmed_reason)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'changed', true,
        'storeId', p_store_id,
        'lifecycleStatus', 'archived',
        'reason', v_trimmed_reason
    );
END;
$$;


-- D. get_store_deletion_eligibility(p_store_id uuid)
-- Calculates if a physical hard-delete is permissible.
CREATE OR REPLACE FUNCTION public.get_store_deletion_eligibility(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Core counts
    v_sales_count bigint := 0;
    v_pos_shifts_count bigint := 0;
    v_cashier_shifts_count bigint := 0;
    v_movements_count bigint := 0;
    v_batches_qty_count bigint := 0;
    v_returns_count bigint := 0;
    v_waste_count bigint := 0;
    v_members_count bigint := 0;
    v_overrides_count bigint := 0;
    v_audit_logs_count bigint := 0;
    
    -- Additional table counts for exact schema alignment
    v_receptions_count bigint := 0;
    v_reception_items_count bigint := 0;
    v_waste_items_count bigint := 0;
    v_client_events_count bigint := 0;
    v_sync_conflicts_count bigint := 0;
    v_error_reports_count bigint := 0;
    v_products_count bigint := 0;
    v_product_prices_count bigint := 0;
    v_categories_count bigint := 0;
    v_devices_count bigint := 0;
    
    v_can_delete boolean := true;
    v_reason text := 'Store is eligible for permanent deletion.';
    v_recommended_action text := 'delete';
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can inspect store deletion eligibility.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    -- 3. Verify Store Existence
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. Count references across all 18 dependent tables in the live schema
    SELECT COALESCE(count(*), 0) INTO v_sales_count FROM public.sales WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_pos_shifts_count FROM public.pos_shifts WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_cashier_shifts_count FROM public.cashier_shifts WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_movements_count FROM public.stock_movements WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_batches_qty_count FROM public.stock_batches WHERE store_id = p_store_id AND quantity > 0;
    SELECT COALESCE(count(*), 0) INTO v_returns_count FROM public.sale_returns WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_waste_count FROM public.waste_events WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_members_count FROM public.store_members WHERE store_id = p_store_id AND active = true;
    SELECT COALESCE(count(*), 0) INTO v_overrides_count FROM public.store_module_access WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_audit_logs_count FROM public.audit_logs WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_receptions_count FROM public.receptions WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_reception_items_count FROM public.reception_items WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_waste_items_count FROM public.waste_items WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_client_events_count FROM public.client_events WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_sync_conflicts_count FROM public.sync_conflicts WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_error_reports_count FROM public.error_reports WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_products_count FROM public.products WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_product_prices_count FROM public.product_prices WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_categories_count FROM public.categories WHERE store_id = p_store_id;
    SELECT COALESCE(count(*), 0) INTO v_devices_count FROM public.devices WHERE store_id = p_store_id;

    -- Evaluate delete safety
    IF v_sales_count > 0 OR v_pos_shifts_count > 0 OR v_cashier_shifts_count > 0 OR 
       v_movements_count > 0 OR v_batches_qty_count > 0 OR v_returns_count > 0 OR 
       v_waste_count > 0 OR v_members_count > 0 OR v_overrides_count > 0 OR 
       v_audit_logs_count > 0 OR v_receptions_count > 0 OR v_reception_items_count > 0 OR
       v_waste_items_count > 0 OR v_client_events_count > 0 OR v_sync_conflicts_count > 0 OR
       v_error_reports_count > 0 OR v_products_count > 0 OR v_product_prices_count > 0 OR
       v_categories_count > 0 OR v_devices_count > 0 THEN
        v_can_delete := false;
        v_reason := 'Store has historical operational activity, inventory, active members, config, or logs. Hard delete is blocked.';
        v_recommended_action := 'archive';
    END IF;

    RETURN jsonb_build_object(
        'canDelete', v_can_delete,
        'reason', v_reason,
        'recommendedAction', v_recommended_action,
        'counts', jsonb_build_object(
            'sales', v_sales_count,
            'posShifts', v_pos_shifts_count,
            'cashierShifts', v_cashier_shifts_count,
            'stockMovements', v_movements_count,
            'stockBatchesWithQuantity', v_batches_qty_count,
            'returns', v_returns_count,
            'wasteEvents', v_waste_count,
            'storeMembers', v_members_count,
            'moduleOverrides', v_overrides_count,
            'auditLogs', v_audit_logs_count,
            'receptions', v_receptions_count,
            'receptionItems', v_reception_items_count,
            'wasteItems', v_waste_items_count,
            'clientEvents', v_client_events_count,
            'syncConflicts', v_sync_conflicts_count,
            'errorReports', v_error_reports_count,
            'products', v_products_count,
            'productPrices', v_product_prices_count,
            'categories', v_categories_count,
            'devices', v_devices_count
        )
    );
END;
$$;


-- F. request_store_deletion(p_store_id uuid, p_reason text)
-- Transitions store status to 'pending_deletion' if eligible.
CREATE OR REPLACE FUNCTION public.request_store_deletion(p_store_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_old_status text;
    v_trimmed_reason text;
    v_eligibility jsonb;
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can request store deletion.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    v_user_id := auth.uid();
    v_trimmed_reason := trim(p_reason);

    IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
        RAISE EXCEPTION 'Deletion request reason is mandatory and must be at least 3 characters long.';
    END IF;

    -- 3. Lock store row & Fetch current status
    SELECT lifecycle_status INTO v_old_status
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. State Transition Check
    IF v_old_status = 'pending_deletion' THEN
        RETURN jsonb_build_object('ok', true, 'changed', false, 'message', 'Store is already pending deletion.');
    END IF;

    IF v_old_status = 'deleted' THEN
        RAISE EXCEPTION 'Store is already permanently deleted.';
    END IF;

    -- Deletion request is permitted from active, suspended, or archived
    -- 5. Check Eligibility
    v_eligibility := public.get_store_deletion_eligibility(p_store_id);
    IF NOT (v_eligibility->>'canDelete')::boolean THEN
        -- Audit the blocked attempt
        INSERT INTO public.audit_logs (
            store_id, profile_id, action, entity_type, entity_id, old_data, new_data
        ) VALUES (
            p_store_id, v_user_id, 'store.hard_delete_blocked', 'store', p_store_id,
            jsonb_build_object('lifecycle_status', v_old_status),
            jsonb_build_object('reason', 'Store has activity counts', 'eligibility', v_eligibility)
        );

        RETURN jsonb_build_object(
            'ok', false,
            'canDelete', false,
            'reason', v_eligibility->>'reason',
            'recommendedAction', 'archive',
            'counts', v_eligibility->'counts'
        );
    END IF;

    -- 6. Perform update to pending_deletion
    UPDATE public.stores
    SET lifecycle_status = 'pending_deletion',
        deletion_requested_at = now(),
        deletion_requested_by = v_user_id,
        deletion_reason = v_trimmed_reason,
        -- Clear other states' fields to keep schema clean
        suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL,
        archived_at = NULL, archived_by = NULL, archive_reason = NULL
    WHERE id = p_store_id;

    -- 7. Audit Log
    INSERT INTO public.audit_logs (
        store_id, profile_id, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
        p_store_id, v_user_id, 'store.deletion_request', 'store', p_store_id,
        jsonb_build_object('lifecycle_status', v_old_status),
        jsonb_build_object('lifecycle_status', 'pending_deletion', 'reason', v_trimmed_reason)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'canDelete', true,
        'storeId', p_store_id,
        'lifecycleStatus', 'pending_deletion',
        'reason', v_trimmed_reason
    );
END;
$$;


-- G. cancel_store_deletion_request(p_store_id uuid, p_reason text)
-- Transitions store status from 'pending_deletion' back to 'active'.
CREATE OR REPLACE FUNCTION public.cancel_store_deletion_request(p_store_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_old_status text;
    v_trimmed_reason text;
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can cancel store deletion request.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    v_user_id := auth.uid();
    v_trimmed_reason := trim(p_reason);

    IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
        RAISE EXCEPTION 'Cancellation reason is mandatory and must be at least 3 characters long.';
    END IF;

    -- 3. Lock store row & Fetch current status
    SELECT lifecycle_status INTO v_old_status
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 4. State Transition Check: Cancel deletion request is permitted ONLY from pending_deletion
    IF v_old_status <> 'pending_deletion' THEN
        RAISE EXCEPTION 'Store is not in pending_deletion status. Current status: %', v_old_status;
    END IF;

    -- 5. Perform update to active
    UPDATE public.stores
    SET lifecycle_status = 'active',
        -- Clear deletion requested audits
        deletion_requested_at = NULL,
        deletion_requested_by = NULL,
        deletion_reason = NULL
    WHERE id = p_store_id;

    -- 6. Audit Log
    INSERT INTO public.audit_logs (
        store_id, profile_id, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
        p_store_id, v_user_id, 'store.cancel_deletion', 'store', p_store_id,
        jsonb_build_object('lifecycle_status', v_old_status),
        jsonb_build_object('lifecycle_status', 'active', 'reason', v_trimmed_reason)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'changed', true,
        'storeId', p_store_id,
        'lifecycleStatus', 'active',
        'reason', v_trimmed_reason
    );
END;
$$;


-- H. hard_delete_store_if_eligible(p_store_id uuid, p_confirmation text, p_reason text)
-- STUB: Performs physical cascade deletion check ONLY but does NOT run the delete query.
-- Raising an exception prevents accidental data loss due to ON DELETE CASCADE on financial and audit data.
CREATE OR REPLACE FUNCTION public.hard_delete_store_if_eligible(p_store_id uuid, p_confirmation text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_old_status text;
    v_trimmed_reason text;
    v_eligibility jsonb;
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Owner can hard delete stores.';
    END IF;

    -- 2. Param Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'p_store_id is required.';
    END IF;

    v_user_id := auth.uid();
    v_trimmed_reason := trim(p_reason);

    -- 3. Verify confirmation text
    IF p_confirmation <> 'STERG DEFINITIV MAGAZINUL' THEN
        RAISE EXCEPTION 'Invalid confirmation text. Must type exact text: STERG DEFINITIV MAGAZINUL';
    END IF;

    IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
        RAISE EXCEPTION 'Deletion reason is mandatory and must be at least 3 characters long.';
    END IF;

    -- 4. Lock store row & Fetch current status
    SELECT lifecycle_status INTO v_old_status
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Store not found.';
    END IF;

    -- 5. Run Eligibility Checks
    v_eligibility := public.get_store_deletion_eligibility(p_store_id);
    IF NOT (v_eligibility->>'canDelete')::boolean THEN
        -- Audit blocked attempt
        INSERT INTO public.audit_logs (
            store_id, profile_id, action, entity_type, entity_id, old_data, new_data
        ) VALUES (
            p_store_id, v_user_id, 'store.hard_delete_blocked', 'store', p_store_id,
            jsonb_build_object('lifecycle_status', v_old_status),
            jsonb_build_object('reason', 'Store has activity counts', 'eligibility', v_eligibility)
        );

        RAISE EXCEPTION 'Cannot delete store: %. Archive is recommended.', v_eligibility->>'reason';
    END IF;

    -- 6. Raised exception stub to prevent actual deletion.
    -- Hard deletion will be implemented in a separate stage (e.g. 6F.1.14 with backups & exports).
    RAISE EXCEPTION 'Hard delete is disabled in this release. Use archive_store for real clients.';
END;
$$;


-- ============================================================================
-- 4. REVOKE AND GRANTS HARDENING
-- ============================================================================
-- Revoke execution from public roles
REVOKE EXECUTE ON FUNCTION public.get_store_lifecycle_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.suspend_store(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reactivate_store(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_store(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_deletion_eligibility(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_store_deletion(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_store_deletion_request(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.hard_delete_store_if_eligible(uuid, text, text) FROM PUBLIC, anon;

-- Grant execution to authenticated users (functions will perform role verification internal logic)
GRANT EXECUTE ON FUNCTION public.get_store_lifecycle_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_store(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_store(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_store(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_deletion_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_store_deletion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_store_deletion_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_store_if_eligible(uuid, text, text) TO authenticated;
