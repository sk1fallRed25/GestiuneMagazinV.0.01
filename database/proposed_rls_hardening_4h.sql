-- ############################################################################
-- RLS HARDENING BLUEPRINT v2 - ETAPA 4H.1
-- Verificat real cu Supabase MCP la: 2026-05-15
-- Proiect: GestiuneMagazinV0.0.1 (iwlmlhhjzqnwlfoittot)
--
-- INSTRUCȚIUNI:
-- 1. Copiați acest script în SQL Editor din Supabase Dashboard.
-- 2. Rulați integral. Este idempotent (safe de rerulat).
-- 3. NU include DROP TABLE, INSERT, UPDATE, DELETE.
-- 4. Verificați manual că policy-urile noi apar în Authentication > Policies.
-- ############################################################################

-- ============================================================================
-- SECȚIUNEA 1: SECURIZARE reception_items
-- Problemă: Policy reală "ReceptionItems: access" permite ALL oricărui
--           membru al magazinului, inclusiv casierilor.
-- Corecție: Separare SELECT (toți membrii) vs ALL (doar staff cu rol).
-- Confirmat real: policy name = "ReceptionItems: access" (ALL, {public})
-- ============================================================================

-- Ștergem politica overbroad cu numele real confirmat
DROP POLICY IF EXISTS "ReceptionItems: access" ON public.reception_items;

-- Asigurăm idempotency pentru noile policy-uri
DROP POLICY IF EXISTS "ReceptionItems: view" ON public.reception_items;
DROP POLICY IF EXISTS "ReceptionItems: staff manage" ON public.reception_items;

-- Toți membrii magazinului pot vizualiza recepțiile proprii
CREATE POLICY "ReceptionItems: view"
ON public.reception_items
FOR SELECT
USING (
  store_id IN (SELECT store_id FROM current_user_store_ids())
  OR is_platform_owner()
);

-- Doar staff-ul poate crea/modifica/șterge linii de recepție
CREATE POLICY "ReceptionItems: staff manage"
ON public.reception_items
FOR ALL
USING (
  has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar'])
  OR is_platform_owner()
)
WITH CHECK (
  has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar'])
  OR is_platform_owner()
);


-- ============================================================================
-- SECȚIUNEA 2: SECURIZARE waste_items
-- Problemă: Policy reală "WasteItems: access" permite ALL oricărui
--           membru al magazinului, inclusiv casierilor.
-- Corecție: Separare SELECT (toți membrii) vs ALL (doar staff cu rol).
-- Confirmat real: policy name = "WasteItems: access" (ALL, {public})
-- ============================================================================

-- Ștergem politica overbroad cu numele real confirmat
DROP POLICY IF EXISTS "WasteItems: access" ON public.waste_items;

-- Asigurăm idempotency pentru noile policy-uri
DROP POLICY IF EXISTS "WasteItems: view" ON public.waste_items;
DROP POLICY IF EXISTS "WasteItems: staff manage" ON public.waste_items;

-- Toți membrii magazinului pot vizualiza pierderile proprii
CREATE POLICY "WasteItems: view"
ON public.waste_items
FOR SELECT
USING (
  store_id IN (SELECT store_id FROM current_user_store_ids())
  OR is_platform_owner()
);

-- Doar staff-ul poate înregistra/modifica/șterge pierderi
CREATE POLICY "WasteItems: staff manage"
ON public.waste_items
FOR ALL
USING (
  has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar'])
  OR is_platform_owner()
)
WITH CHECK (
  has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar'])
  OR is_platform_owner()
);


-- ============================================================================
-- SECȚIUNEA 3: PERMISIUNE INSERT pe audit_logs
-- Problemă: Există doar policy "Audit: view" (SELECT). Lipsă policy de INSERT.
-- Corecție: Adaugă policy de INSERT pentru membrii magazinului.
-- NOTĂ: Nu adăugăm UPDATE/DELETE - jurnalul de audit trebuie să fie imutabil.
-- Confirmat real: tabela are coloane store_id (nullable), profile_id (nullable)
-- ============================================================================

DROP POLICY IF EXISTS "Audit: insert" ON public.audit_logs;

CREATE POLICY "Audit: insert"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  store_id IN (SELECT store_id FROM current_user_store_ids())
  OR is_platform_owner()
);


-- ============================================================================
-- SECȚIUNEA 4: RESTRICȚIONARE error_reports
-- Problemă (confirmată de Supabase Security Advisor): Policy "Errors: create"
--   are WITH CHECK = true, permițând inserări anonime (risc DoS/spam).
-- Corecție: Limităm inserarea la utilizatori autentificați.
-- Confirmat real: tabela EXISTĂ, policy reală = "Errors: create" (INSERT, true)
-- ============================================================================

DROP POLICY IF EXISTS "Errors: create" ON public.error_reports;
DROP POLICY IF EXISTS "Errors: authenticated create" ON public.error_reports;

-- Inserare permisă doar pentru utilizatori autentificați (nu anonimi)
CREATE POLICY "Errors: authenticated create"
ON public.error_reports
FOR INSERT
TO authenticated
WITH CHECK (true);


-- ============================================================================
-- SECȚIUNEA 5: PROFILES - Self-Update DECIZIE DE SECURITATE
-- Problemă: profiles conține coloanele "role" și "active".
-- Risc: O politică self-update largă ar permite utilizatorilor să-și schimbe
--       rolul (escaladare privilegii) sau să-și dezactiveze contul.
-- DECIZIE: NU adăugăm self-update direct prin RLS.
-- Recomandare: Implementați self-update printr-un RPC server-side care
--              EXCLUDE modificarea câmpurilor role și active.
--
-- Exemplu RPC (propus pentru Etapa ulterioară, nu aplicat acum):
-- CREATE OR REPLACE FUNCTION public.update_own_profile(p_full_name TEXT)
-- RETURNS VOID AS $$
--   UPDATE public.profiles
--   SET full_name = p_full_name, updated_at = NOW()
--   WHERE id = auth.uid();
-- $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
--
-- Politicile SELECT existente pe profiles sunt CORECTE și rămân neschimbate:
--   - "Profiles: owner access" (ALL pentru platform_owner)
--   - "Profiles: user view self" (SELECT id = auth.uid())
--   - "Profiles: store staff view" (SELECT pentru colegii din magazin)
-- ============================================================================

-- Nu se modifică nimic pe tabela profiles în acest script.
-- Self-update va fi implementat prin RPC în etapa viitoare.


-- ============================================================================
-- SECȚIUNEA 6: HELPER FUNCTIONS - search_path (Security Advisory)
-- Problemă (Supabase Security Advisor): Funcțiile helper au search_path
--   mutable, ceea ce prezintă risc de atac prin schema injection.
-- Funcții afectate: current_user_role, current_user_store_ids,
--                   has_store_role, is_platform_owner
-- Confirmat real: toate 4 funcții există, toate sunt SECURITY DEFINER
--
-- Corecție: Adaugă SET search_path = public la fiecare funcție.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN AS $$
  SELECT role = 'platform_owner' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_store_ids()
RETURNS TABLE (store_id UUID) AS $$
  SELECT sm.store_id FROM public.store_members sm
  WHERE sm.profile_id = auth.uid() AND sm.active = true;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_store_role(p_store_id UUID, p_allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = p_store_id
      AND sm.profile_id = auth.uid()
      AND sm.active = true
      AND sm.role = ANY(p_allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- SECȚIUNEA 7: PERFORMANCE - auth RLS initplan fix
-- Problemă (Supabase Performance Advisor): Policy "Profiles: user view self"
--   re-evaluează auth.uid() per rând în loc să-l evalueze o singură dată.
-- Corecție: Înlocuirim auth.uid() cu (SELECT auth.uid()) în clauza USING.
-- ============================================================================

DROP POLICY IF EXISTS "Profiles: user view self" ON public.profiles;

CREATE POLICY "Profiles: user view self"
ON public.profiles
FOR SELECT
USING (id = (SELECT auth.uid()));


-- ============================================================================
-- VERIFICARE FINALĂ (READ-ONLY - opțional după rulare)
-- Rulați separat pentru a confirma aplicarea corectă:
-- ============================================================================
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('reception_items','waste_items','audit_logs','error_reports','profiles')
-- ORDER BY tablename, policyname;
-- ============================================================================
