-- ############################################################################
-- PROPUNERE CURĂȚARE TABELE LEGACY (NEAPLICATĂ)
-- Acest script este un BLUEPRINT pentru eliminarea modulelor vechi.
-- ############################################################################

/*
-- PASUL 1: Eliminarea constrângerilor de cheie externă (Foreign Keys)
-- Trebuie să rupem legăturile dintre tabelele pe care le păstrăm și cele pe care le ștergem.

-- 1.1. Relaxare legătură Produse -> Furnizori (dacă există)
ALTER TABLE produse DROP CONSTRAINT IF EXISTS produse_furnizor_id_fkey;
ALTER TABLE produse ALTER COLUMN furnizor_id DROP NOT NULL;

-- 1.2. Relaxare legătură Recepții -> Furnizori
ALTER TABLE receptii DROP CONSTRAINT IF EXISTS receptii_furnizor_id_fkey;
ALTER TABLE receptii ALTER COLUMN furnizor_id DROP NOT NULL;

-- 1.3. Eliminare referințe Agenți din Vânzări (dacă există)
ALTER TABLE vanzari DROP CONSTRAINT IF EXISTS vanzari_agent_id_fkey;
ALTER TABLE vanzari ALTER COLUMN agent_id DROP NOT NULL;


-- PASUL 2: Ștergerea tabelelor aferente modulelor eliminate
-- ATENȚIE: Această acțiune este ireversibilă fără backup!

-- 2.1. Module FURNIZORI
DROP TABLE IF EXISTS furnizor_produse;
DROP TABLE IF EXISTS acces_furnizor;
DROP TABLE IF EXISTS cereri_furnizori;
DROP TABLE IF EXISTS comenzi_furnizor;
DROP TABLE IF EXISTS comenzi_catre_furnizor;
DROP TABLE IF EXISTS retururi_furnizor_detalii;
DROP TABLE IF EXISTS retururi_furnizor;
DROP TABLE IF EXISTS furnizori;

-- 2.2. Module AGENȚI
DROP TABLE IF EXISTS agent_produse;
DROP TABLE IF EXISTS comenzi_agenti_detalii;
DROP TABLE IF EXISTS comenzi_agenti;
DROP TABLE IF EXISTS agenti;

-- 2.3. Module LOGISTICĂ / ALTELE
DROP TABLE IF EXISTS comenzi_aprovizionare_detalii;
DROP TABLE IF EXISTS comenzi_aprovizionare;
DROP TABLE IF EXISTS lista_cumparaturi;
DROP TABLE IF EXISTS livrari;
DROP TABLE IF EXISTS detalii_livrare;

-- PASUL 3: Curățare funcții SQL reziduale (Opțional)
-- DROP FUNCTION IF EXISTS get_supplier_stats();
-- DROP FUNCTION IF EXISTS sync_agent_stocks();

*/

-- NOTĂ FINALĂ: 
-- Înainte de a rula acest script, asigurați-vă că niciun cod din 'src/shared/services' 
-- nu mai face referire la aceste tabele.
