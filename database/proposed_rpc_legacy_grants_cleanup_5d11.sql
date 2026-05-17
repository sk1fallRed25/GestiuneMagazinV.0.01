-- Etapa 5D.1.1 — Legacy RPC Grants Cleanup
-- Scop: revocare EXECUTE pentru anon pe overload-urile RPC vechi JSONB.
-- Nu modifică tabele.
-- Nu șterge date.
-- Nu schimbă funcțiile noi.

REVOKE EXECUTE ON FUNCTION public.finalize_sale(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.receive_stock(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_stock(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_waste(jsonb) FROM anon;

-- Opțional, dar sigur, revocăm și din PUBLIC pentru a preveni viitoare vulnerabilități
REVOKE EXECUTE ON FUNCTION public.finalize_sale(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.receive_stock(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_stock(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_waste(jsonb) FROM PUBLIC;
