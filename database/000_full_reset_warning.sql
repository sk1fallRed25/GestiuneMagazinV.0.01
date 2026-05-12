-- ############################################################################
-- !!! AVERTISMENT CRITIC: RESETARE COMPLETĂ BAZĂ DE DATE !!!
-- ############################################################################
-- EXECUTAREA ACESTUI SCRIPT VA ȘTERGE TOATE DATELE DIN BAZA DE DATE.
-- ASIGURAȚI-VĂ CĂ AVEȚI UN BACKUP RECENT ȘI CĂ SUNTEȚI PE PROIECTUL CORECT.
-- ############################################################################

/*
-- INSTRUCȚIUNE: DECOMENTAȚI MANUAL COMENZILE DE MAI JOS PENTRU A CURĂȚA SCHEMA public

-- 1. ELIMINARE TABELE LEGACY, HIBRIDE ȘI MODERNE (ORDINE ALFABETICĂ PENTRU VERIFICARE)
DROP TABLE IF EXISTS public.acces_furnizor CASCADE;
DROP TABLE IF EXISTS public.agent_produse CASCADE;
DROP TABLE IF EXISTS public.agenti CASCADE;
DROP TABLE IF EXISTS public.alocare_produse_agenti CASCADE;
DROP TABLE IF EXISTS public.app_versions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.bon_detalii CASCADE;
DROP TABLE IF EXISTS public.bonuri CASCADE;
DROP TABLE IF EXISTS public.bonuri_detalii CASCADE;
DROP TABLE IF EXISTS public.cashier_shifts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.cereri_furnizori CASCADE;
DROP TABLE IF EXISTS public.client_events CASCADE;
DROP TABLE IF EXISTS public.comenzi CASCADE;
DROP TABLE IF EXISTS public.comenzi_agenti CASCADE;
DROP TABLE IF EXISTS public.comenzi_agenti_detalii CASCADE;
DROP TABLE IF EXISTS public.comenzi_aprovizionare CASCADE;
DROP TABLE IF EXISTS public.comenzi_aprovizionare_detalii CASCADE;
DROP TABLE IF EXISTS public.comenzi_catre_furnizor CASCADE;
DROP TABLE IF EXISTS public.comenzi_furnizor CASCADE;
DROP TABLE IF EXISTS public.detalii_livrare CASCADE;
DROP TABLE IF EXISTS public.detalii_vanzare CASCADE;
DROP TABLE IF EXISTS public.device_sessions CASCADE;
DROP TABLE IF EXISTS public.device_sync_status CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.employee_access_codes CASCADE;
DROP TABLE IF EXISTS public.error_reports CASCADE;
DROP TABLE IF EXISTS public.furnizor_produse CASCADE;
DROP TABLE IF EXISTS public.furnizori CASCADE;
DROP TABLE IF EXISTS public.inventory_adjustments CASCADE;
DROP TABLE IF EXISTS public.inventory_counts CASCADE;
DROP TABLE IF EXISTS public.inventory_scope CASCADE;
DROP TABLE IF EXISTS public.inventory_scope_products CASCADE;
DROP TABLE IF EXISTS public.inventory_sessions CASCADE;
DROP TABLE IF EXISTS public.lista_cumparaturi CASCADE;
DROP TABLE IF EXISTS public.livrari CASCADE;
DROP TABLE IF EXISTS public.location_members CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;
DROP TABLE IF EXISTS public.nir_detalii CASCADE;
DROP TABLE IF EXISTS public.niruri CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organization_modules CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.pierderi CASCADE;
DROP TABLE IF EXISTS public.product_prices CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.produse CASCADE;
DROP TABLE IF EXISTS public.receptii CASCADE;
DROP TABLE IF EXISTS public.receptii_detalii CASCADE;
DROP TABLE IF EXISTS public.reception_items CASCADE;
DROP TABLE IF EXISTS public.receptions CASCADE;
DROP TABLE IF EXISTS public.return_items CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;
DROP TABLE IF EXISTS public.retururi_furnizor CASCADE;
DROP TABLE IF EXISTS public.retururi_furnizor_detalii CASCADE;
DROP TABLE IF EXISTS public.sale_item_batches CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.stock_batches CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.store_members CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.sync_conflicts CASCADE;
DROP TABLE IF EXISTS public.tax_rates CASCADE;
DROP TABLE IF EXISTS public.ture CASCADE;
DROP TABLE IF EXISTS public.ture_lucru CASCADE;
DROP TABLE IF EXISTS public.utilizatori CASCADE;
DROP TABLE IF EXISTS public.vanzari CASCADE;
DROP TABLE IF EXISTS public.waste_events CASCADE;
DROP TABLE IF EXISTS public.waste_items CASCADE;

-- 2. ELIMINARE FUNCȚII HELPER (VECHI ȘI NOI)
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_owner() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_store_ids() CASCADE;
DROP FUNCTION IF EXISTS public.has_store_role(UUID, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- 3. ELIMINARE TIPURI CUSTOM (ENUM-URI)
DROP TYPE IF EXISTS public.organization_status CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;
DROP TYPE IF EXISTS public.member_role CASCADE;
DROP TYPE IF EXISTS public.member_status CASCADE;
DROP TYPE IF EXISTS public.location_type CASCADE;
DROP TYPE IF EXISTS public.device_status CASCADE;
DROP TYPE IF EXISTS public.product_unit CASCADE;
DROP TYPE IF EXISTS public.product_status CASCADE;
DROP TYPE IF EXISTS public.payment_method_code CASCADE;
DROP TYPE IF EXISTS public.stock_zone CASCADE;
DROP TYPE IF EXISTS public.movement_type CASCADE;
DROP TYPE IF EXISTS public.movement_zone CASCADE;
DROP TYPE IF EXISTS public.sale_status CASCADE;
DROP TYPE IF EXISTS public.return_status CASCADE;
DROP TYPE IF EXISTS public.inventory_status CASCADE;
DROP TYPE IF EXISTS public.inventory_scope_type CASCADE;
DROP TYPE IF EXISTS public.waste_reason_type CASCADE;
DROP TYPE IF EXISTS public.sync_status CASCADE;
DROP TYPE IF EXISTS public.sync_conflict_status CASCADE;
DROP TYPE IF EXISTS public.livrare_status_type CASCADE;
DROP TYPE IF EXISTS public.actiune_tura_type CASCADE;

*/

-- ############################################################################
-- SFÂRȘIT SCRIPT CURĂȚARE
-- ############################################################################
