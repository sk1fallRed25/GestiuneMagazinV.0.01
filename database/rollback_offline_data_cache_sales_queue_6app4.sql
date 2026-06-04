-- Rollback script for Offline POS Sync Schema and RPC Functions (Stage 6APP.4)
-- This file is a blueprint and is NOT run automatically.

-- 1. Drop Functions
DROP FUNCTION IF EXISTS public.get_offline_sync_status(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.sync_offline_sale(UUID, UUID, UUID, TEXT, JSONB, JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_offline_cache_bundle(UUID, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.register_pos_device(UUID, TEXT, TEXT) CASCADE;

-- 2. Drop Triggers on Tables
DROP TRIGGER IF EXISTS update_offline_sale_sync_log_updated_at ON public.offline_sale_sync_log;
DROP TRIGGER IF EXISTS update_pos_devices_updated_at ON public.pos_devices;

-- 3. Drop Policies (Cascaded through table drops, but explicitly listed for completeness)
DROP POLICY IF EXISTS offline_snapshots_select_policy ON public.offline_sync_snapshots;
DROP POLICY IF EXISTS offline_sync_log_select_policy ON public.offline_sale_sync_log;
DROP POLICY IF EXISTS pos_devices_modify_policy ON public.pos_devices;
DROP POLICY IF EXISTS pos_devices_select_policy ON public.pos_devices;

-- 4. Drop Tables in dependency order
DROP TABLE IF EXISTS public.offline_sync_snapshots CASCADE;
DROP TABLE IF EXISTS public.offline_sale_sync_log CASCADE;
DROP TABLE IF EXISTS public.pos_devices CASCADE;

-- Informational comment
-- NOTE: Running this script will completely delete all registered POS terminal identifiers
-- and transaction synchronization logs. Proceed with caution on production systems.
