# Auth Trigger Legacy Cleanup — Etapa 5D.1.3

## 1. Rezumat Executiv
- **Problema:** Crearea de noi utilizatori din Supabase Dashboard sau prin API eșuează cu mesajul de eroare: `"Failed to create user: Database error creating new user"`.
- **Cauza:** Există un trigger activ pe tabela `auth.users` (`on_auth_user_created`) care execută funcția legacy `public.handle_new_user()`. Această funcție încearcă să insereze datele noului utilizator în tabela legacy `public.utilizatori`. Deoarece tabela `public.utilizatori` nu mai există în noua schemă v2 (fiind înlocuită de `public.profiles`), tranzacția de creare a utilizatorului eșuează la nivel de bază de date.
- **Impact:** Blocaj total la înregistrarea și crearea de noi utilizatori în platformă. Utilizatorii existenți nu sunt afectați la autentificare, dar extinderea bazei de utilizatori este imposibilă.
- **Status:** **Blueprint only / Applied: NO**. Scriptul SQL de remediere a fost creat pentru auditare și aprobare, fără a fi aplicat direct pe baza de date.

## 2. Trigger Legacy Detectat
În urma auditului read-only efectuat în Supabase, au fost identificate următoarele elemente legacy:
- **Trigger Name:** `on_auth_user_created` (definit pe `auth.users`: `AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`).
- **Function Name:** `public.handle_new_user()`.
- **Tabela Afectată:** `public.utilizatori` (tabelă inexistentă în prezent).
- **Logică Veche:**
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER
  AS $function$
  BEGIN
    INSERT INTO public.utilizatori (id, email, nume, rol, aprobat)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'gestionar', false)
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
  $function$
  ```

## 3. Schema v2 Target
Arhitectura activă v2 decuplează profilul global al utilizatorului de apartenența la un anumit magazin, utilizând două tabele distincte:
- **`public.profiles` (Profil Global Minimal):**
  - `id` (uuid, PK, FK către `auth.users(id)` cu ON DELETE CASCADE)
  - `email` (text, UNIQUE, Not Null)
  - `full_name` (text, Nullable)
  - `role` (text, Not Null) — constrâns prin `profiles_role_check`: `CHECK (role IN ('platform_owner', 'admin', 'manager', 'gestionar', 'casier'))`
  - `active` (boolean, Default `true`)
  - `created_at`, `updated_at` (timestamptz, Default `now()`)
- **`public.store_members` (Asociere Magazin):**
  - `store_id` (uuid, PK, FK către `stores(id)` cu ON DELETE CASCADE)
  - `profile_id` (uuid, PK, FK către `profiles(id)` cu ON DELETE CASCADE)
  - `role` (text, Not Null) — constrâns prin `store_members_role_check`: `CHECK (role IN ('admin', 'manager', 'gestionar', 'casier'))`
  - `active` (boolean, Default `true`)
- **Roluri:** Sistemul de roluri este strict validat la nivel de bază de date prin clauze `CHECK`, asigurând integritatea ierarhiei de acces.

## 4. Noua Logică Propusă
Pentru a respecta arhitectura v2 și principiile de securitate (principiul celui mai mic privilegiu), noua funcție `public.handle_new_user()` implementează următoarele:
- **Creează doar `profiles`:** Inserarea se face exclusiv în `public.profiles`.
- **Nu creează `store_members` automat:** Nu se face nicio asociere automată la un magazin în momentul creării contului în Auth.
- **Nu setează `platform_owner` automat:** Se previne escaladarea privilegiilor prin interceptarea și înlocuirea rolului `platform_owner` (sau a oricărui rol invalid) transmis prin metadata, trecându-l în rolul de siguranță `casier`.
- **Default Role Propus:** `casier` (dacă nu se specifică un rol valid de angajat precum `admin`, `manager`, sau `gestionar` în `raw_user_meta_data`).

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, active)
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
```

## 5. SQL Blueprint
Blueprint-ul complet, incluzând comentariile de arhitectură și interogările de verificare, a fost salvat în fișierul:
- [`database/proposed_auth_trigger_v2_cleanup_5d13.sql`](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/proposed_auth_trigger_v2_cleanup_5d13.sql)

## 6. Test Recomandat
Pentru validarea soluției în regim controlat (Smoke Test), se recomandă următorii pași:
1. **Aplică manual blueprint:** Execută scriptul SQL din `database/proposed_auth_trigger_v2_cleanup_5d13.sql` în consola Supabase SQL.
2. **Creează user test în Supabase Auth:** Din Supabase Dashboard -> Authentication -> Users -> Add User, creează un utilizator nou (ex: `test_cleanup@magazin.ro`).
3. **Verifică rând în `public.profiles`:** Rulează interogarea:
   ```sql
   SELECT id, email, full_name, role, active, created_at FROM public.profiles WHERE email = 'test_cleanup@magazin.ro';
   ```
4. **Asociază userul la magazin:** Prin Owner Console (dacă suportă adăugarea de membri) sau manual prin SQL controlat:
   ```sql
   INSERT INTO public.store_members (store_id, profile_id, role, active)
   VALUES ('<store_uuid>', '<profile_uuid>', 'casier', true);
   ```
5. **Login test:** Autentifică-te în aplicația frontend cu noile credențiale și verifică accesul la dashboard-ul magazinului.

## 7. Riscuri
- **Owner Console Gap:** Dacă Owner Console actual gestionează doar membrii existenți și nu are încă un UI finalizat pentru invitarea/adăugarea de noi membri (`add member`), asocierea utilizatorilor noi la magazine va trebui făcută temporar prin SQL manual. Acest gap este documentat pentru a fi rezolvat în Etapa 5E.
- **Vizibilitate Magazin:** Utilizatorii noi creați în Auth care nu au încă o înregistrare în `store_members` nu vor putea vedea și accesa dashboard-ul niciunui magazin, respectând izolarea strictă de tenant/magazin.
- **Gestiunea Rolului Global:** Rolul global din `profiles` determină permisiunile de bază, motiv pentru care validarea strictă din trigger (`CASE WHEN...`) este critică pentru a preveni acordarea accidentală de drepturi administrative majore.

## 8. Decizie Următoare
- **Aplicare manuală SQL:** Aprobarea și aplicarea manuală a funcției din `proposed_auth_trigger_v2_cleanup_5d13.sql`.
- **Apoi 5D.1.4:** Verificarea efectivă a creării unui utilizator nou din Supabase Dashboard și confirmarea înregistrării în `profiles`.
- **Apoi 5D.2 / 5D.3:** Continuarea planului de implementare cu etapele de RLS și funcții RPC.
