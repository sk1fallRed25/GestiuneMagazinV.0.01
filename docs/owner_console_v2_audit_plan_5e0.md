# Owner Console v2 Audit & Plan — Etapa 5E.0

## 1. Rezumat Executiv
- **De ce urmează Owner Console**: După finalizarea cu succes și stabilizarea tuturor fluxurilor operaționale de stoc și vânzări la nivel de magazin (Etapa 5D.6 având status **PASS** pe RPC-uri atomice), platforma necesită un nivel superior de administrare multi-store.
- **Status actual după 5D.6**: Aplicația garantează integritatea tranzacțională (ACID) și securitatea RLS pentru tranzacțiile de zi cu zi (recepții, transferuri, vânzări, casări).
- **Scopul pentru `admin@owner.com`**: Crearea unei console de administrare centralizate (Owner Console v2) care să permită utilizatorului cu rol de `platform_owner` să supervizeze întreaga rețea de magazine, să gestioneze entitățile de magazine, să auditeze profilele globale de utilizatori și să controleze granular accesul și rolurile acestora în fiecare magazin, având o trasabilitate completă prin loguri de audit.

---

## 2. Owner Console Existentă

În urma inspecției codului din `src/features/owner-console/`, `AppRoutes.tsx` și `MainLayout.tsx`, situația curentă este următoarea:

### Ce funcționează în prezent
- **Vizualizarea magazinelor**: Se obține lista magazinelor existente prin interogarea tabelei `public.stores`.
- **Vizualizarea membrilor per magazin**: Se obține lista membrilor asociați magazinului selectat prin join între `public.store_members` și `public.profiles`.
- **Controlul accesului per magazin**: Funcția `setStoreMemberActive` permite activarea sau dezactivarea accesului unui utilizator într-un magazin specific (modificând `store_members.active`).
- **Modificarea rolului per magazin**: Funcția `updateStoreMemberRole` permite schimbarea rolului unui membru în cadrul magazinului (`store_members.role`).

### Ce tabele folosește
- `public.stores` (select)
- `public.store_members` (select, update)
- `public.profiles` (select)

### Limitări și Lipsuri Majore
1. **Fără creare de magazine**: Nu există UI sau metodă în serviciu pentru a crea un magazin nou sau pentru a edita detaliile (nume, adresă, cod fiscal) unui magazin existent.
2. **Fără vizualizare globală a profilelor**: Interfața afișează exclusiv utilizatorii care au deja o asociere în `store_members` pentru magazinul selectat. `platform_owner` nu poate vedea lista totală a utilizatorilor din `profiles` (de exemplu, utilizatorii nou creați care nu au fost încă alocați unui magazin).
3. **Fără flux de asociere utilizatori existenți**: Nu există posibilitatea de a selecta un profil existent din sistem și a-l adăuga ca membru într-un magazin.
4. **Fără logare de audit**: Niciuna dintre modificările de rol sau de acces nu este înregistrată în tabela `audit_logs`.
5. **Dashboard sumar**: Statisticile actuale arată doar numărul total de magazine și membri, fără a evidenția stări critice (magazine fără administrator, utilizatori nealocați).

---

## 3. Verificări Supabase Read-Only

Interogările read-only executate pe instanța Supabase de producție au relevat următoarea stare a datelor și a schemelor:

### A. Structură și Date Tabele
- **`public.stores`**: Conține **1 magazin** (`Magazin Principal`, ID: `00000000-0000-0000-0000-000000000001`, active: true).
- **`public.profiles`**: Conține **3 utilizatori**:
  1. `admin@owner.com` (rol: `platform_owner`, active: true)
  2. `admin@admin.com` (rol: `admin`, active: true)
  3. `magazin@magazin.com` (rol: `admin`, active: true)
- **`public.store_members`**: Conține **1 singură asociere**: utilizatorul `admin@admin.com` este asociat magazinului `Magazin Principal` cu rolul de `admin`.
- **`public.audit_logs`**: Tabela există în schemă, are politici RLS corecte (`insert` și `view` permise pentru `platform_owner`), dar este în prezent **complet goală** (0 rânduri).

### B. Analiza stărilor de excepție
- **Utilizatori fără `store_members`**: Utilizatorul `magazin@magazin.com` (având rol de admin) nu este asociat niciunui magazin în `store_members`. De asemenea, `admin@owner.com` nu are o intrare în `store_members` (ceea ce este normal pentru un `platform_owner`, dar interfața trebuie să gestioneze clar această distincție).
- **Magazine fără admin activ**: Singurul magazin existent are un admin activ (`admin@admin.com`).

### C. Funcția Auth Trigger (`handle_new_user`)
- Trigger-ul `on_auth_user_created` de pe `auth.users` este activ și apelează funcția `public.handle_new_user()`.
- **Status Cleanup**: Funcția din baza de date a fost parțial actualizată în trecut: ea inserează corect în tabela nouă `public.profiles` (deci nu mai dă eroare cu vechea tabelă `utilizatori`). **TOTUȘI**, implementarea curentă din baza de date forțează hardcodat rolul `'casier'` pentru toți utilizatorii noi, ignorând metadata.
- **Concluzie Trigger**: Blueprint-ul propus în Etapa 5D.1.3 (`database/proposed_auth_trigger_v2_cleanup_5d13.sql`) este **pending** pentru aplicare manuală. Aplicarea sa este necesară pentru a permite preluarea rolului corect din `raw_user_meta_data`.

---

## 4. Gap-uri Critice

1. **Creare User**: Nu se poate realiza din frontend din cauza lipsei permisiunilor (Supabase Auth blochează crearea de conturi de către clienți neautentificați sau fără cheie de service). În plus, depinde de aplicarea blueprint-ului de curățare a trigger-ului.
2. **Asociere User Existent la Magazin**: Lipsesc componenta UI (modal de alocare) și funcția de serviciu (`insert`/`upsert` în `store_members`).
3. **Creare Magazin**: Lipsesc formularul de adăugare magazin și apelul de `insert` în tabela `stores`.
4. **Audit Acțiuni**: Metodele existente în `ownerConsoleService.ts` nu scriu în tabela `audit_logs`.
5. **Dashboard Global**: Interfața nu oferă o secțiune de analiză agregată a problemelor de alocare sau a stării rețelei.

---

## 5. Design Owner Console v2

Pentru a transforma consola într-un instrument profesional de administrare, propunem următoarea arhitectură a interfeței și a logicii de business:

```
+-----------------------------------------------------------------------------------+
|                         OWNER CONSOLE v2 - MAIN DASHBOARD                         |
+-----------------------------------------------------------------------------------+
|  [METRICI GLOBALE]                                                                |
|  Total Magazine: 1  |  Magazine Active: 1  |  Magazine Fără Admin: 0              |
|  Total Profile: 3   |  Membri Alocați: 1   |  Profile Fără Magazin: 1 (⚠️ Alerte) |
+-----------------------------------------------------------------------------------+
|  TAB NAVIGATION: [ 🏢 Management Magazine ] [ 👥 Profile & Alocări ] [ 📜 Audit ] |
+-----------------------------------------------------------------------------------+
```

### 1. Dashboard Global (Panou Sinteză)
- Afișarea metricilor de nivel superior: Total magazine, Magazine active, Total profile, Total membri unici activi în magazine, Total administratori de magazin.
- **Alerte operaționale rapide**: Lista magazinelor care nu au niciun membru cu rol de `admin` activ și lista utilizatorilor din `profiles` care nu sunt asociați niciunui magazin.

### 2. Management Magazine (`Stores View`)
- Tabel centralizat cu toate magazinele.
- Buton **"Adaugă Magazin Nou"** care deschide un modal de creare (câmpuri: Nume magazin, Adresă, Cod Fiscal, Status Activ).
- Opțiuni pe rând: Editare detalii magazin, Activare/Dezactivare magazin.

### 3. Management Utilizatori & Alocări (`Profiles & Allocations View`)
- **Tabela Globală de Profile**: Listarea tuturor conturilor din `public.profiles`, cu funcție de căutare după email sau nume.
- Buton **"Alocă la Magazin"** în dreptul fiecărui profil (sau pentru profilele nealocate): deschide un modal unde `platform_owner` alege magazinul de destinație, rolul (`admin`, `manager`, `gestionar`, `casier`) și statusul accesului.
- **Tabela de Membri per Magazin**: Vizualizarea și filtrarea membrilor pe magazin selectat, menținând opțiunile rapide de modificare a rolului și comutare a stării de activ/inactiv.

### 4. Modulul de Audit (`Audit Logs View`)
- Tabel dedicat de istoric care afișează cronologic acțiunile efectuate de `platform_owner` (dată, acțiune, tip entitate, ID entitate, detalii vechi/noi).

---

## 6. Strategie Creare Utilizatori

### Variantă MVP (Recomandată pentru etapa curentă)
1. **Creare cont**: Utilizatorul este creat direct de către `platform_owner` din **Supabase Dashboard** (secțiunea Authentication -> Users -> Add User), introducând adresa de email, parola temporară și opțional metadata (ex: `{"full_name": "Ion Popescu", "role": "manager"}`).
2. **Declanșare Trigger**: La crearea contului, trigger-ul `on_auth_user_created` (după aplicarea blueprint-ului 5D.1.3) inserează automat și sigur profilul în `public.profiles`.
3. **Asociere în Magazin**: `platform_owner` accesează Owner Console v2 în aplicație, găsește noul profil în lista "Profile Fără Magazin" și îl alocă magazinului dorit prin modalul de adăugare.

### Variantă Comercială (Pentru versiuni viitoare SaaS)
- Implementarea unei **Edge Function** Supabase securizate (`invite-user`).
- Frontend-ul apelează această funcție prin `supabase.functions.invoke()`, transmițând emailul, numele, rolul și ID-ul magazinului.
- Edge Function utilizează cheia de `service_role` (stocată exclusiv ca variabilă de mediu pe server) pentru a apela `supabase.auth.admin.inviteUserByEmail()`, inserează profilul și creează asocierea în `store_members`.

### ⚠️ Riscuri Majore Service Role în Frontend
Este **strict interzisă** plasarea cheii `service_role` (sau `SUPABASE_SERVICE_ROLE_KEY`) în codul frontend sau în fișierele `.env` ale clientului. Expunerea acestei chei în pachetul JavaScript descărcat de browser ar oferi oricărui utilizator acces complet de administrator asupra întregii baze de date și asupra sistemului de autentificare, ocolind complet RLS (Row Level Security).

---

## 7. Plan Sub-Etape de Implementare (5E.1 - 5E.6)

```
+-----------------------------------------------------------------------------------+
|                     ETAPA 5E - ROADMAP DE IMPLEMENTARE                            |
+-----------------------------------------------------------------------------------+
| [5E.1] Verificare & Curățare Auth Trigger (Manual în Supabase SQL Editor)         |
|   |                                                                               |
|   v                                                                               |
| [5E.2] Global Dashboard & Tabela Completă Profiles (Extindere UI & Serviciu)      |
|   |                                                                               |
|   v                                                                               |
| [5E.3] Flux Alocare Utilizator Existent la Magazin (Modal + Insert store_members) |
|   |                                                                               |
|   v                                                                               |
| [5E.4] Management Magazine (Creare Magazin Nou + Editare Detalii)                 |
|   |                                                                               |
|   v                                                                               |
| [5E.5] Logare Audit Automată & Testare E2E Playwright                             |
|   |                                                                               |
|   v                                                                               |
| [5E.6] (Opțional) Blueprint Edge Function pentru Invitație Utilizatori            |
+-----------------------------------------------------------------------------------+
```

### 5E.1 — Auth Trigger Cleanup Verification / Apply Guidance
- **Scop**: Asigurarea că mecanismul de creare a utilizatorilor populează corect `public.profiles` cu datele din metadata.
- **Acțiune**: Verificarea și aplicarea manuală a blueprint-ului `database/proposed_auth_trigger_v2_cleanup_5d13.sql` în Supabase SQL Editor.
- **Testare**: Crearea unui utilizator de test din Supabase Dashboard și verificarea apariției sale corecte în `public.profiles`.

### 5E.2 — Owner Console v2: Global Dashboard & Profiles View
- **Scop**: Îmbogățirea stării și a interfeței cu date globale.
- **Fișiere vizate**: `types.ts`, `ownerConsoleService.ts`, `useOwnerConsole.ts`, `OwnerConsolePage.tsx`.
- **Modificări**: Implementarea metodelor pentru extragerea tuturor rândurilor din `profiles`, identificarea magazinelor fără admin și a profilelor nealocate, crearea tab-ului / secțiunii de vizualizare globală.

### 5E.3 — Owner Console v2: Add Existing User to Store
- **Scop**: Permiterea asocierii utilizatorilor existenți la magazine.
- **Fișiere vizate**: `ownerConsoleService.ts`, `useOwnerConsole.ts`, componentă nouă `AssignMemberModal.tsx`.
- **Modificări**: Crearea metodei `assignStoreMember` (care face `insert` sau `update` în `store_members` fără a atinge `profiles.role`), integrarea modalului de alocare în UI.

### 5E.4 — Owner Console v2: Store Management
- **Scop**: Gestionarea ciclului de viață al magazinelor din UI.
- **Fișiere vizate**: `ownerConsoleService.ts`, `useOwnerConsole.ts`, componentă nouă `StoreModal.tsx`.
- **Modificări**: Crearea metodelor `createStore` și `updateStore`, adăugarea butoanelor și a formularelor de editare în tabela de magazine.

### 5E.5 — Owner Audit Log & E2E Test
- **Scop**: Asigurarea trasabilității acțiunilor și validarea E2E.
- **Fișiere vizate**: `ownerConsoleService.ts`, componentă nouă `AuditLogsTable.tsx`, script de test `test_owner_console_v2.py`.
- **Modificări**: Adăugarea funcției private de logare în `audit_logs` și apelarea ei la fiecare creare/modificare de magazin sau membru; crearea și rularea testului Playwright pentru `admin@owner.com`.

### 5E.6 — Optional: Edge Function Invite User Blueprint
- **Scop**: Pregătirea arhitecturii comerciale de onboarding.
- **Fișiere vizate**: `supabase/functions/invite-user/index.ts` (blueprint).
- **Modificări**: Redactarea codului TypeScript pentru Edge Function folosind Deno și Supabase JS SDK cu service role key.

---

## 8. Ce NU se Implementează Încă

Pentru a menține un scop clar și a livra rapid valoare operațională, următoarele funcționalități complexe sunt excluse din Faza 5E:
1. **Billing & Subscriptions**: Gestionarea abonamentelor SaaS, integrarea cu Stripe pentru plata per magazin sau per utilizator.
2. **SaaS Self-Service Public**: Pagina de înregistrare publică unde un client extern își creează cont și își deschide automat un magazin nou.
3. **Fiscal Bridge**: Integrarea directă cu driverele caselor de marcat fizice (aceasta rămâne o funcționalitate separată de POS).
4. **Offline Sync**: Sincronizarea avansată bidirecțională prin IndexedDB/Dexie pentru funcționarea complet offline a Owner Console.
5. **Trimitere Emailuri Invitație de Producție**: Configurarea de servere SMTP proprii pentru șabloane personalizate de email.

---

## 9. Decizie Finală

**Ready for 5E.1 Auth Trigger Cleanup Verification**
Proiectul dispune de toate premisele tehnice și de o schemă de date stabilă pentru a demara implementarea Owner Console v2, începând cu validarea și aplicarea curățării trigger-ului de autentificare.
