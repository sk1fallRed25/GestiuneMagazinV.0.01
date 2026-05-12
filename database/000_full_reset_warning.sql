-- ############################################################################
-- !!! AVERTISMENT CRITIC: RESETARE COMPLETĂ BAZĂ DE DATE !!!
-- ############################################################################
-- EXECUTAREA ACESTUI SCRIPT VA ȘTERGE TOATE DATELE DIN BAZA DE DATE.
-- ASIGURAȚI-VĂ CĂ AVEȚI UN BACKUP RECENT ȘI CĂ SUNTEȚI PE PROIECTUL CORECT.
-- ############################################################################

/*
-- INSTRUCȚIUNE: DECOMENTAȚI MANUAL COMANDA DE MAI JOS PENTRU A CURĂȚA SCHEMA public

-- 1. ELIMINARE TABELE LEGACY (ROMÂNĂ)
DROP TABLE IF EXISTS public.produse CASCADE;
DROP TABLE IF EXISTS public.vanzari CASCADE;
DROP TABLE IF EXISTS public.detalii_vanzare CASCADE;
DROP TABLE IF EXISTS public.receptii CASCADE;
DROP TABLE IF EXISTS public.receptii_detalii CASCADE;
DROP TABLE IF EXISTS public.pierderi CASCADE;
DROP TABLE IF EXISTS public.utilizatori CASCADE;
DROP TABLE IF EXISTS public.bonuri CASCADE;
DROP TABLE IF EXISTS public.bon_detalii CASCADE;
DROP TABLE IF EXISTS public.bonuri_detalii CASCADE;
DROP TABLE IF EXISTS public.niruri CASCADE;
DROP TABLE IF EXISTS public.nir_detalii CASCADE;
DROP TABLE IF EXISTS public.furnizori CASCADE;
DROP TABLE IF EXISTS public.agent_produse CASCADE;
DROP TABLE IF EXISTS public.agenti CASCADE;
DROP TABLE IF EXISTS public.comenzi_furnizor CASCADE;
DROP TABLE IF EXISTS public.comenzi_catre_furnizor CASCADE;
DROP TABLE IF EXISTS public.comenzi_agenti CASCADE;
DROP TABLE IF EXISTS public.comenzi_agenti_detalii CASCADE;
DROP TABLE IF EXISTS public.comenzi_aprovizionare CASCADE;
DROP TABLE IF EXISTS public.comenzi_aprovizionare_detalii CASCADE;
DROP TABLE IF EXISTS public.livrari CASCADE;
DROP TABLE IF EXISTS public.detalii_livrare CASCADE;
DROP TABLE IF EXISTS public.retururi_furnizor CASCADE;
DROP TABLE IF EXISTS public.retururi_furnizor_detalii CASCADE;
DROP TABLE IF EXISTS public.lista_cumparaturi CASCADE;
DROP TABLE IF EXISTS public.acces_furnizor CASCADE;
DROP TABLE IF EXISTS public.cereri_furnizori CASCADE;
DROP TABLE IF EXISTS public.furnizor_produse CASCADE;

-- 2. ELIMINARE TABELE MODERNE (ENGLEZĂ - PENTRU RECONSTRUIRE CURATĂ)
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.product_prices CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.stock_batches CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.cashier_shifts CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.device_sessions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.error_reports CASCADE;
DROP TABLE IF EXISTS public.client_events CASCADE;
DROP TABLE IF EXISTS public.sync_conflicts CASCADE;
DROP TABLE IF EXISTS public.device_sync_status CASCADE;

-- 3. ELIMINARE TIPURI CUSTOM (ENUM-URI)
-- DROP TYPE IF EXISTS public.user_role;
-- DROP TYPE IF EXISTS public.movement_type;

*/

-- ############################################################################
-- SFÂRȘIT SCRIPT CURĂȚARE
-- ############################################################################
