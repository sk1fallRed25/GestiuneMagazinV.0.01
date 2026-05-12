-- ############################################################################
-- ȘTERGERE TABELE LEGACY & NEDORITE (NEAPLICATĂ)
-- !!! RULEAZĂ DOAR DUPĂ BACKUP ȘI MIGRARE CONFIRMATĂ !!!
-- ############################################################################

/*
-- A. ELIMINARE MODULE ELIMINATE DEFINITIV (FURNIZORI, AGENȚI)
DROP TABLE IF EXISTS public.furnizor_produse CASCADE;
DROP TABLE IF EXISTS public.acces_furnizor CASCADE;
DROP TABLE IF EXISTS public.cereri_furnizori CASCADE;
DROP TABLE IF EXISTS public.comenzi_furnizor CASCADE;
DROP TABLE IF EXISTS public.comenzi_catre_furnizor CASCADE;
DROP TABLE IF EXISTS public.retururi_furnizor_detalii CASCADE;
DROP TABLE IF EXISTS public.retururi_furnizor CASCADE;
DROP TABLE IF EXISTS public.furnizori CASCADE;

DROP TABLE IF EXISTS public.agent_produse CASCADE;
DROP TABLE IF EXISTS public.comenzi_agenti_detalii CASCADE;
DROP TABLE IF EXISTS public.comenzi_agenti CASCADE;
DROP TABLE IF EXISTS public.agenti CASCADE;

DROP TABLE IF EXISTS public.comenzi_aprovizionare_detalii CASCADE;
DROP TABLE IF EXISTS public.comenzi_aprovizionare CASCADE;
DROP TABLE IF EXISTS public.lista_cumparaturi CASCADE;
DROP TABLE IF EXISTS public.livrari CASCADE;
DROP TABLE IF EXISTS public.detalii_livrare CASCADE;


-- B. ELIMINARE TABELE LEGACY ÎNLOCUITE DE v2 (DUPĂ MIGRARE)
-- ATENȚIE: Aceste tabele conțin datele istorice care trebuie să fie deja în v2!
DROP TABLE IF EXISTS public.produse CASCADE;
DROP TABLE IF EXISTS public.vanzari CASCADE;
DROP TABLE IF EXISTS public.detalii_vanzare CASCADE;
DROP TABLE IF EXISTS public.receptii CASCADE;
DROP TABLE IF EXISTS public.receptii_detalii CASCADE;
DROP TABLE IF EXISTS public.pierderi CASCADE;
DROP TABLE IF EXISTS public.utilizatori CASCADE;
DROP TABLE IF EXISTS public.bonuri_detalii CASCADE;
DROP TABLE IF EXISTS public.bonuri CASCADE;
DROP TABLE IF EXISTS public.nir_detalii CASCADE;
DROP TABLE IF EXISTS public.niruri CASCADE;

*/

-- VERIFICARE TABELE RĂMASE (SCHEMA CURATĂ v2)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
