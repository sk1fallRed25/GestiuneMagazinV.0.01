# Owner Console v2 Dashboard & Profiles — Etapa 5E.2

## 1. Rezumat
- **Status**: PASS / IMPLEMENTED
- **Ce s-a implementat**:
  - Extinderea arhitecturală a modulului Owner Console v2 cu un sistem modern de navigare pe tab-uri (Overview, Magazine, Profile Utilizatori, Membri Magazin).
  - Dashboard global de monitorizare care sintetizează starea întregului ecosistem (număr total și activ de magazine, profile, membri).
  - Panouri dedicate pentru detectarea și afișarea utilizatorilor nealocați și a magazinelor rămase fără administrator activ.
  - Tabel complet de vizualizare a tuturor profilelor globale din baza de date.
- **Ce poate face `platform_owner` acum**:
  - Poate vizualiza dintr-o singură privire starea de sănătate a întregii platforme prin metrici agregate.
  - Poate inspecta lista completă a conturilor înregistrate în sistem (`public.profiles`), indiferent dacă sunt sau nu asociate vreunui magazin.
  - Poate identifica imediat conturile inactive, conturile nealocate și magazinele vulnerabile (fără personal de administrare).
  - Poate naviga facil între vizualizarea globală și gestiunea detaliată a membrilor per magazin.
- **Ce nu s-a implementat încă**:
  - Nu s-a implementat funcționalitatea de alocare efectivă a utilizatorilor existenți la magazine (aceasta face obiectul Etapei 5E.3).
  - Nu s-a implementat crearea sau editarea magazinelor (Etapa 5E.4).
  - Nu s-a introdus `service_role` în frontend și nu se creează conturi Auth direct din interfață.

---

## 2. Date și tabele folosite
Interogările Supabase din serviciul `ownerConsoleService.ts` utilizează exclusiv clientul standard (anon/authenticated) și se bazează pe următoarele tabele relaționale:
- **`public.stores`**: Utilizat pentru extragerea listei de magazine, calcularea numărului total/activ de unități și verificarea stării de administrare.
- **`public.profiles`**: Utilizat ca sursă primară pentru lista globală de utilizatori. Extrage informații de bază (id, email, fullName, rol global, stare de activare, data creării).
- **`public.store_members`**: Utilizat ca tabel de legătură (junction table) pentru a determina ce utilizatori sunt alocați căror magazine, ce roluri specifice dețin (ex. `admin`, `manager`, `cashier`) și dacă asocierea este activă sau inactivă.

---

## 3. Dashboard global
Modulul de date calculează și expune în timp real următoarele metrici agregate, afișate prin carduri premium cu glassmorphism și iconițe intuitive:
- **`totalStores`**: Numărul total de magazine înregistrate în sistem.
- **`activeStores`**: Numărul de magazine cu status `active = true`.
- **`totalProfiles`**: Numărul total de conturi de utilizator din tabelul `profiles`.
- **`activeProfiles`**: Numărul de utilizatori cu status `active = true`.
- **`totalStoreMembers`**: Numărul total de asocieri (rânduri) din `store_members`.
- **`activeStoreMembers`**: Numărul de asocieri active din `store_members`.
- **`totalStoreAdmins`**: Numărul total de membri activi care dețin rolul de `admin` în cel puțin un magazin.
- **`unassignedProfiles`**: Numărul de utilizatori care nu au nicio asociere activă sau inactivă în `store_members` (cu excepția conturilor `platform_owner`).
- **`storesWithoutAdmin`**: Numărul de magazine active care nu au niciun membru activ cu rolul de `admin`.

---

## 4. Profiles View
Tabelul `OwnerProfilesTable.tsx` oferă o vizualizare completă și structurată a utilizatorilor, documentând pentru fiecare rând:
- **`email`**: Adresa de email a utilizatorului.
- **`fullName`**: Numele complet (dacă este disponibil în profil).
- **`globalRole`**: Rolul la nivel de platformă (ex. `platform_owner`, `user`).
- **`active`**: Starea contului (Activ / Inactiv).
- **`createdAt`**: Data și ora înregistrării contului în sistem.
- **`storeCount`**: Numărul total de magazine la care utilizatorul este asociat.
- **`assignedStores`**: Lista detaliată a magazinelor alocate (nume magazin, rol specific, stare asociere).

**Aspecte esențiale din logica de business**:
- Utilizatorii fără magazin sunt detectați automat și evidențiați clar.
- Conturile cu rolul `platform_owner` care nu au magazin alocat direct sunt tratate ca stare normală/informativă (nu ca eroare sau avertisment), deoarece acești utilizatori guvernează întreaga platformă.
- Conturi precum `magazin@magazin.com` apar în mod corect ca profile nealocate dacă nu au încă un rând creat în `store_members`.

---

## 5. Stores Without Admin
Panoul `StoresWithoutAdminPanel.tsx` monitorizează continuitatea conducerii operative a magazinelor:
- **Detectare**: Un magazin este considerat „fără administrator” dacă este activ, dar în tabelul `store_members` nu există niciun rând cu `store_id` respectiv având `role = 'admin'` și `active = true`.
- **Afișare**: Magazinele afectate sunt listate cu un avertisment clar (roșu/warning) și buton de navigare rapidă către gestiunea membrilor.
- **Empty State Pozitiv**: Dacă toate magazinele active dispun de cel puțin un administrator activ, panoul afișează un mesaj de stare optimă (verde/succes).

---

## 6. Securitate
Arhitectura respectă cu strictețe principiile de minim privilegiu și securitate în profunzime:
- **Restricționare Acces**: Accesul la dashboard-ul global și vizualizarea profilelor este permis exclusiv utilizatorilor autentificați care dețin `role === 'platform_owner'` în hook-ul și serviciul dedicat.
- **Fără Service Role**: Nu există chei de tip `service_role` stocate sau utilizate în frontend. Toate interogările Supabase folosesc clientul standard și trec prin filtrele de securitate RLS.
- **Fără Modificări Directe de Privilegii**: În această etapă nu se creează utilizatori în Supabase Auth, nu se modifică câmpul `profiles.role` și nu se alterează `profiles.active`.
- **Gestiunea Rolurilor**: Rolurile operaționale reale per magazin se vor gestiona exclusiv prin tabelul de asocieri `store_members` în Etapa 5E.3.

---

## 7. Limitări
- Alocarea conturilor existente la magazine (asocierea în `store_members`) va fi implementată în **Etapa 5E.3**.
- Funcționalitățile de creare și editare a magazinelor vor fi dezvoltate în **Etapa 5E.4**.
- Jurnalul de audit global (Audit Logs) va fi integrat în **Etapa 5E.5**.
- Funcția serverless (Edge Function) pentru invitarea utilizatorilor noi rămâne opțională, planificată pentru **Etapa 5E.6**.

---

## 8. Build
Verificarea integrității codului prin comanda `npm run build` confirmă că aplicația compilează fără nicio eroare TypeScript sau de împachetare:

```bash
> sistem-magazin@1.0.0 build
> tsc && vite build

vite v7.3.0 building client environment for production...
transforming...
✓ 2497 modules transformed.
rendering chunks...
computing gzip size...
dist/assets/manifest-BiwfgMN6.json    0.39 kB │ gzip:   0.22 kB
dist/index.html                       1.37 kB │ gzip:   0.65 kB
dist/assets/index-YeVZJ2zZ.css       56.95 kB │ gzip:   9.46 kB
dist/assets/index-CGGPpaSg.js       950.18 kB │ gzip: 265.33 kB
✓ built in 2.50s
```

---

## 9. Test recomandat
Pentru validarea manuală completă a noii interfețe, se recomandă parcurgerea următorilor pași:
1. Autentificare în aplicație folosind contul de proprietar: `admin@owner.com`.
2. Accesarea secțiunii Owner Console (`/owner`).
3. Verificarea tab-ului **Overview**: inspectarea cardurilor de statistici globale, a panoului de profile nealocate și a panoului de magazine fără administrator.
4. Comutarea pe tab-ul **Profile Utilizatori**: verificarea listei complete a utilizatorilor și a corectitudinii asocierilor afișate.
5. Confirmarea faptului că utilizatorul `admin@admin.com` apare corect alocat la *Magazin Principal* cu rolul de `admin`.
6. Confirmarea faptului că un cont nou sau neasociat (ex. `magazin@magazin.com`) apare în mod clar marcat ca nealocat în panoul de avertizare.
7. Confirmarea faptului că *Magazin Principal* nu apare listat în panoul magazinelor fără administrator, având deja un admin activ.

---

## 10. Decizie
Modulul îndeplinește toate criteriile de acceptanță arhitecturale și de securitate.
**Stare**: Ready for **Etapa 5E.3: Add Existing User to Store**.
