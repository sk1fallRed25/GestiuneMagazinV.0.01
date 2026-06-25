-- ======================================================================================
-- ETAPA 6SEC.1 — Licensing RPC Hardening
-- Explicit REVOKE for check_license and register_device RPCs
-- Ensures PUBLIC and anon roles cannot execute licensing functions
-- ======================================================================================

-- check_license: REVOKE from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.check_license(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_license(UUID) FROM anon;

-- register_device: REVOKE from PUBLIC and anon
-- Note: register_device was updated in 20260507 with signature (UUID, UUID, TEXT, TEXT)
REVOKE EXECUTE ON FUNCTION public.register_device(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_device(UUID, UUID, TEXT, TEXT) FROM anon;

-- Re-affirm grants for authenticated role only
GRANT EXECUTE ON FUNCTION public.check_license(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_device(UUID, UUID, TEXT, TEXT) TO authenticated;
