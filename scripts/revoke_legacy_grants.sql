-- SQL Security Cleanup: Revoke Execute privileges for PUBLIC and anon roles on legacy/deprecated database functions
-- Applied on 2026-06-18 as part of Stage 6OPS.2

REVOKE EXECUTE ON FUNCTION public.adauga_stoc_depozit(integer, integer, double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aproba_comanda_agent(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_license(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_cashier_shift(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_inventory_session(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_audit_log(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_depozit(bigint, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalizare_receptie_si_update_stoc(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalizeaza_comanda_agent(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_stock(bigint, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inregistreaza_pierdere(bigint, integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reglare_inventar(bigint, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.scade_stoc_la_vanzare() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.scade_stoc_magazin(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.scadere_stoc_vanzare() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_cashier_shift(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_inventory_session(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_client_event(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_la_magazin(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_stoc_depozit_magazin(bigint, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_stoc_receptie() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verifica_stoc_minim() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vinde_produs_fefo(bigint, integer) FROM PUBLIC, anon;
