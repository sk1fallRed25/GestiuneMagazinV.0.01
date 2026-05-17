/*
  =============================================================================
  BLUEPRINT: AUTH TRIGGER LEGACY CLEANUP (Etapa 5D.1.3)
  Proiect: Gestiune Magazin V.0.01
  Fișier: database/proposed_auth_trigger_v2_cleanup_5d13.sql
  =============================================================================

  Descriere:
  Acest script înlocuiește funcția legacy `public.handle_new_user()`, care bloca
  crearea utilizatorilor în Supabase Auth deoarece încerca să insereze în tabela
  inexistentă (legacy) `public.utilizatori`.

  Noua funcție creează doar profilul global minimal în tabela `public.profiles`,
  fără asignare automată la un magazin în `public.store_members`.

  Reguli de siguranță aplicate:
  - Funcția are SECURITY DEFINER și search_path = public.
  - Folosește exclusiv tabele v2 (public.profiles).
  - Nu inserează automat în `store_members` (asocierea se va face din Owner Console sau manual).
  - Previne escaladarea privilegiilor: nu permite setarea rolului de `platform_owner` din metadata.
  - Rolurile permise sunt validate împotriva constrângerii din `profiles` ('admin', 'manager', 'gestionar', 'casier').
  - Păstrează trigger-ul existent `on_auth_user_created` de pe `auth.users`, actualizând doar funcția.
  - Nu face DROP TABLE, nu șterge utilizatori și nu modifică structura auth.users.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'manager', 'gestionar', 'casier') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'casier'
    END,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Nota privind trigger-ul:
-- Trigger-ul existent `on_auth_user_created` pe `auth.users` apelează deja `public.handle_new_user()`.
-- Prin urmare, redefinirea funcției de mai sus este suficientă. Nu este necesar DROP TRIGGER / CREATE TRIGGER.

/*
-- ============================================================================
-- SECȚIUNE DE VERIFICARE READ-ONLY (Comentată, nu se execută automat)
-- ============================================================================

-- 1. Verificare definiție nouă funcție
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 2. Verificare trigger activ pe auth.users
SELECT tgname, proname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- 3. Pași manuali de verificare (Smoke Test):
-- a. Creați un utilizator nou din Supabase Dashboard cu email test (ex: test_cleanup@magazin.ro).
-- b. Rulați interogarea de mai jos pentru a verifica înregistrarea corectă în public.profiles:
--    SELECT id, email, full_name, role, active, created_at FROM public.profiles WHERE email = 'test_cleanup@magazin.ro';
-- c. Verificați că nu există o înregistrare automată nedorită în store_members:
--    SELECT * FROM public.store_members WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'test_cleanup@magazin.ro');
*/
