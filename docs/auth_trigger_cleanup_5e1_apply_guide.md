# Auth Trigger Cleanup Apply Guide — Etapa 5E.1

## 1. Scop
- **De ce trebuie `handle_new_user` v2**: La crearea oricărui cont nou în Supabase Auth, trigger-ul de sistem `on_auth_user_created` apelează funcția `public.handle_new_user()`. Pentru a garanta crearea corectă și sigură a conturilor, această funcție trebuie să populeze exclusiv tabela v2 `public.profiles`, preluând numele din metadata, dar protejând sistemul de escaladări de privilegii.
- **De ce NU folosim `metadata.role` pentru roluri ridicate**: Într-o arhitectură securizată (MVP controlat), metadatele trimise la crearea contului nu trebuie să aibă autoritatea de a acorda automat roluri de administrare (`platform_owner`, `admin`, `manager`). Prin decizie arhitecturală de securitate, orice cont nou este creat ca profil global minimal cu rolul de bază `'casier'`. Alocarea rolului real de administrare sau gestiune pentru un anumit magazin se realizează ulterior, în mod explicit și auditat, de către `platform_owner` prin intermediul tabelei `public.store_members` din Owner Console v2.

---

## 2. Stare Curentă
- **Trigger existent**: Tabela `auth.users` are configurat trigger-ul `on_auth_user_created` care se execută `AFTER INSERT` și apelează `public.handle_new_user()`.
- **Funcție curentă**: Funcția existentă în baza de date inserează deja în `public.profiles` (rezolvând vechea eroare legată de tabela legacy `utilizatori`), dar are o limitare: forțează hardcodat rolul `'casier'` și la conflict suprascrie numele existent cu cel din EXCLUDED.
- **Risc / Limitare**: Deși versiunea curentă din baza de date nu blochează crearea conturilor, ea nu respectă în totalitate standardul de siguranță v2 la clauza `ON CONFLICT` (unde ar trebui să protejeze numele existent dacă nu e nul, rolul și starea de activare) și nu preia `full_name` din metadata la fel de robust. Blueprint-ul actualizat rezolvă definitiv aceste aspecte.

---

## 3. SQL de Aplicat Manual
Codul complet și securizat se află în fișierul blueprint:
[database/proposed_auth_trigger_v2_cleanup_5d13.sql](../database/proposed_auth_trigger_v2_cleanup_5d13.sql)

### Instrucțiuni de Aplicare:
1. Accesați panoul de administrare Supabase (Dashboard) al proiectului.
2. Navigați la secțiunea **SQL Editor**.
3. Deschideți un tab nou de interogare (New Query).
4. Copiați întregul conținut al fișierul blueprint menționat mai sus (sau doar blocul `CREATE OR REPLACE FUNCTION` de mai jos).
5. Apăsați butonul **Run** (sau `Cmd/Ctrl + Enter`) pentru a executa scriptul.

```sql
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
    lower(NEW.email),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(lower(NEW.email), '@', 1)
    ),
    'casier',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      NULLIF(public.profiles.full_name, ''),
      EXCLUDED.full_name
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$;
```

---

## 4. Test Manual După Aplicare

Pentru a valida funcționarea corectă și sigură a noului flux de creare a utilizatorilor, urmați acești pași de verificare:

### Pasul 1: Creare cont din Supabase Dashboard
1. În Supabase Dashboard, navigați la secțiunea **Authentication** -> **Users**.
2. Apăsați butonul **Add User** -> **Create User**.
3. Introduceți adresa de email: `test-owner-flow@magazin.ro`
4. Setați o parolă temporară sigură (ex: `ParolaTest5E!@#`).
5. (Opțional, dacă interfața Supabase permite introducerea de metadata în formularul de creare sau prin API) transmiteți: `{"full_name": "Test Owner Flow"}`. Apăsați **Create User**.

### Pasul 2: Verificare în `public.profiles`
Deschideți SQL Editor în Supabase și rulați:
```sql
SELECT id, email, full_name, role, active, created_at 
FROM public.profiles 
WHERE email = 'test-owner-flow@magazin.ro';
```
**Rezultat Așteptat**:
- `email`: `test-owner-flow@magazin.ro` (salvat cu litere mici / lower-case).
- `full_name`: `Test Owner Flow` (sau `test-owner-flow` dacă nu s-au transmis metadata).
- `role`: `casier` (rolul minim de siguranță acordat implicit).
- `active`: `true`.

### Pasul 3: Verificare în `public.store_members`
Rulați următoarea interogare pentru a vă asigura că nu există nicio alocare automată nedorită:
```sql
SELECT * FROM public.store_members 
WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'test-owner-flow@magazin.ro');
```
**Rezultat Așteptat**: `0 rows returned` (Nu apare automat nicio asociere în magazin).

### Pasul 4: Integrare în Owner Console
- După confirmarea pașilor de mai sus, în **Etapa 5E.3**, Owner Console v2 va permite selectarea acestui profil din lista "Utilizatori Fără Magazin" și asignarea sa explicită la un magazin, setându-i rolul real de lucru (`admin`, `manager`, `gestionar`, `casier`).

---

## 5. Rollback

În cazul extrem și improbabil în care noua definiție a funcției generează erori neașteptate, puteți reveni la versiunea anterioară executând scriptul de rollback de mai jos în Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    lower(NEW.email),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(lower(NEW.email), '@', 1)
    ),
    'casier',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$function$
```
*Recomandare*: Nu efectuați rollback dacă testul manual trece cu succes, deoarece noua versiune este superioară din punct de vedere al siguranței și consistenței datelor.

---

## 6. Decizie
După aplicarea scriptului și confirmarea succesului testului manual de creare user:
**Ready for 5E.2 / 5E.3** (Se poate trece la implementarea Dashboard-ului Global și a fluxului de alocare în Owner Console v2).
