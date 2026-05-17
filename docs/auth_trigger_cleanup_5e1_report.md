# Auth Trigger Cleanup Verification — Etapa 5E.1

## 1. Rezumat Executiv
- **Status**: `blueprint ready` (și `needs apply` pentru a aduce baza de date la forma strictă și finală de siguranță v2).
- **SQL aplicat**: Nu (niciun query DDL/DML nu a fost executat automat pe baza de date).
- **DB modificată**: Nu.
- **Decizie securitate**: S-a stabilit prin consens de arhitectură că toți utilizatorii noi primesc implicit rolul de bază `casier` la crearea contului în Supabase Auth. Se ignoră complet orice rol trimis prin metadata pentru a preveni atacurile de escaladare a privilegiilor la nivel global.

---

## 2. Trigger & Function Audit

În urma inspecției read-only a catalogului PostgreSQL din instanța Supabase de producție, s-a obținut următorul tablou de configurare:

| Parametru Auditat | Valoare Identificată în DB | Conformitate V2 | Observații |
| :--- | :--- | :--- | :--- |
| **Trigger Name** | `on_auth_user_created` | Da | Execută `AFTER INSERT ON auth.users FOR EACH ROW`. |
| **Function Called**| `public.handle_new_user()` | Da | Este corect legată de trigger-ul de autentificare. |
| **Security Definer**| `SECURITY DEFINER` | Da | Permite funcției să ruleze cu privilegiile proprietarului schemei. |
| **Search Path** | `SET search_path TO 'public'` | Da | Previne atacurile de tip search path hijacking. |
| **Inserts Into** | `public.profiles` | Da | Nu mai încearcă inserarea în vechea tabelă legacy `utilizatori`. |
| **Role Behavior** | Forțează `'casier'` | Da (Parțial) | Versiunea curentă din DB hardcodează 'casier', dar clauza ON CONFLICT necesită rafinare conform blueprint. |
| **Status** | `needs apply` | Pending | Blueprint-ul 5D.1.3 conține varianta finală, perfect securizată. |

---

## 3. Schema `profiles`

Structura tabelei `public.profiles` pe care se bazează întregul mecanism de autorizare globală a fost auditată și se prezintă astfel:

### Coloane Relevante
- `id` (uuid, NOT NULL): Cheia primară și cheie externă către `auth.users(id)`.
- `email` (text, NOT NULL): Adresa de email a utilizatorului.
- `full_name` (text, NULLABLE): Numele complet al utilizatorului.
- `role` (text, NOT NULL): Rolul global în platformă.
- `active` (boolean, DEFAULT true): Starea contului (activ/inactiv).
- `created_at`, `updated_at` (timestamptz, DEFAULT now()): Marcaje de timp.

### Constrângeri Relevante
- **Primary Key (`profiles_pkey`)**: `PRIMARY KEY (id)`
- **Foreign Key (`profiles_id_fkey`)**: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`
- **Unique Constraint (`profiles_email_key`)**: `UNIQUE (email)`
- **Check Constraint (`profiles_role_check`)**: `CHECK (role = ANY (ARRAY['platform_owner', 'admin', 'manager', 'gestionar', 'casier']))`

---

## 4. Blueprint Review

Fișierul blueprint `database/proposed_auth_trigger_v2_cleanup_5d13.sql` a fost re-examinat și adus la forma perfectă de siguranță:
- **Ce a fost confirmat și corectat**: S-a eliminat orice logică de preluare a rolului din `raw_user_meta_data`. S-a implementat sanitizarea adresei de email prin `lower(NEW.email)` și preluarea fallback a numelui din prima parte a emailului în caz de lipsă a metadatelor. Clauza `ON CONFLICT (id)` a fost restricționată să actualizeze exclusiv emailul, `updated_at` și numele (doar dacă cel din DB era null sau gol), protejând complet coloanele `role` și `active`.
- **De ce `metadata.role` este ignorată**: Permiterea setării rolului din metadate la înregistrare ar reprezenta o vulnerabilitate critică. Un atacator sau un utilizator neautorizat care își creează cont (sau este invitat) ar putea injecta `{"role": "admin"}` sau `{"role": "platform_owner"}` în payload-ul de înregistrare, obținând instantaneu drepturi depline în aplicație. Ignorarea metadatelor și forțarea rolului de `casier` asigură că acordarea de privilegii superioare rămâne un proces strict controlat de proprietarul platformei.

---

## 5. Safe User Creation Flow (Fluxul Sigur de Creare)

Pentru arhitectura MVP a Owner Console v2, ciclul de viață al unui nou cont de utilizator urmează un flux strict, decuplat și sigur în 4 pași:

```
+-----------------------------------------------------------------------------------+
|                        SAFE USER CREATION FLOW (ETAPA 5E.1)                       |
+-----------------------------------------------------------------------------------+
| 1. Supabase Dashboard  | platform_owner creează cont nou în secțiunea Auth.       |
|                        | (Adresă email + parolă temporară + opțional nume).       |
|                        |                                                          |
| 2. Auth Trigger v2     | on_auth_user_created apelează handle_new_user() care     |
|                        | inserează automat în public.profiles (role='casier').    |
|                        |                                                          |
| 3. Owner Console v2    | platform_owner accesează consola web, vede noul profil   |
|                        | în lista "Utilizatori Fără Magazin" și apasă "Alocă".    |
|                        |                                                          |
| 4. Alocare & Rol Real  | Se creează intrarea în public.store_members alegând      |
|                        | magazinul, rolul de lucru (ex: admin) și statusul activ. |
+-----------------------------------------------------------------------------------+
```

---

## 6. Ce NU Se Face

Pentru a garanta securitatea absolută a platformei și a respecta bunele practici de arhitectură cloud-native, următoarele acțiuni sunt **strict interzise** în această etapă și în arhitectura curentă:
1. **Fără creare de conturi din frontend**: Nu se expun formulare publice de înregistrare sau apeluri directe către Supabase Auth din client pentru crearea de conturi noi.
2. **Fără `service_role` în client**: Nu se stochează și nu se utilizează cheia de `service_role` în nicio componentă React, serviciu frontend sau fișier `.env` de client.
3. **Fără inserare automată în `store_members`**: Trigger-ul de autentificare nu face `insert` în `store_members`, păstrând decuplarea completă între identitatea globală (profil) și autorizarea locală (calitatea de membru în magazin).
4. **Fără `platform_owner` din metadata**: Rolul de proprietar de platformă nu poate fi atribuit niciodată automat la crearea unui cont.

---

## 7. Decizie Finală

**Ready for manual apply/test**
Baza de date, schemele și fișierele blueprint au fost complet auditate și aliniate la cele mai înalte standarde de securitate. Proiectul este pregătit pentru ca echipa să aplice manual blueprint-ul 5D.1.3 în Supabase SQL Editor și să valideze fluxul prin crearea unui utilizator de test în Supabase Dashboard, deschizând calea către implementarea interfeței Owner Console v2 (Etapele 5E.2 și 5E.3).
