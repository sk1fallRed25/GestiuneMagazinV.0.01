-- ############################################################################
-- PROPOSED RLS HARDENING - STAGE 4H.1
-- Scop: Corectarea breșelor de securitate identificate în auditul 4H
-- ############################################################################

-- 1. SECURIZARE RECEPTION_ITEMS
-- Motiv: Anterior permitea ALL oricărui membru al magazinului.
-- Nou: Permite SELECT tuturor membrilor, dar INSERT/UPDATE/DELETE doar Staff-ului.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "ReceptionItems: access" ON public.reception_items;
END $$;

CREATE POLICY "ReceptionItems: view" ON public.reception_items 
    FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

CREATE POLICY "ReceptionItems: staff manage" ON public.reception_items 
    FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());


-- 2. SECURIZARE WASTE_ITEMS
-- Motiv: Anterior permitea ALL oricărui membru al magazinului.
-- Nou: Permite SELECT tuturor membrilor, dar INSERT/UPDATE/DELETE doar Staff-ului.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "WasteItems: access" ON public.waste_items;
END $$;

CREATE POLICY "WasteItems: view" ON public.waste_items 
    FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

CREATE POLICY "WasteItems: staff manage" ON public.waste_items 
    FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());


-- 3. PERMISIUNE SELF-UPDATE PROFILES
-- Motiv: Utilizatorii trebuie să își poată actualiza propriul nume/setări.
CREATE POLICY "Profiles: self update" ON public.profiles 
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- 4. PERMISIUNE INSERT AUDIT_LOGS
-- Motiv: Permite sistemului să înregistreze acțiuni în jurnal.
CREATE POLICY "Audit: insert" ON public.audit_logs 
    FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());


-- 5. TIGHTEN ERROR_REPORTS
-- Motiv: Limitează insert-ul doar la utilizatori autentificați.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Errors: create" ON public.error_reports;
END $$;

CREATE POLICY "Errors: authenticated create" ON public.error_reports 
    FOR INSERT TO authenticated WITH CHECK (true);


-- ############################################################################
-- INSTRUCȚIUNI APLICARE:
-- 1. Rulați acest script în SQL Editor Supabase.
-- 2. Verificați că politicile vechi au fost șterse corect (DROP POLICY).
-- 3. Testați cu un cont de Casier că nu poate șterge recepții.
-- ############################################################################
