# Plan de Migrare: Securizare Autentificare & RLS

## 1. Situația actuală
În prezent, autentificarea în **GestiuneMagazinV.0.01** funcționează printr-un sistem custom, vulnerabil, implementat direct în frontend:
- **Login logic:** Localizat în [Login.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/Login.tsx).
- **Sursă date:** Interogări directe în tabelele `utilizatori` și `agenti` (fără Supabase Auth).
- **Verificare parolă:** Se face prin comparare de text clar în clauza `where` a interogării SQL.
- **Persistență:** Rolul utilizatorului este salvat în `localStorage` sub cheia `magazin_role`, iar ID-ul sub `magazin_agent_id` în [App.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/App.tsx).
- **Autorizare:** Controlul accesului la rute și meniuri se bazează exclusiv pe starea `userRole` din React, care este populată din `localStorage`.

## 2. Probleme de securitate
1.  **Parole Plain Text:** Parolele sunt stocate și transmise necriptat. Orice breșă a bazei de date sau interceptare de trafic (fără HTTPS) expune toate conturile.
2.  **Hardcoded Users:** Conturile `admin/admin`, `casier/1234` și `gestionar/gestionar` reprezintă puncte de intrare nesecurizate (backdoors).
3.  **localStorage Role Escalation:** Orice utilizator poate deschide consola browserului, să modifice `localStorage.setItem('magazin_role', 'admin')`, să reîncarce pagina și să obțină acces la funcții administrative.
4.  **Lipsă Supabase Auth:** Nu se folosesc JWT-uri (JSON Web Tokens) securizate, sesiunile nu pot fi invalidate de pe server.
5.  **Lipsă RLS:** Fără Row Level Security, orice utilizator (sau oricine are cheia `anon`) poate interoga și modifica orice tabelă dacă cunoaște structura acesteia.

## 3. Ținta tehnică
Obiectivul este trecerea la o arhitectură **Secure-by-Design**:
- **Supabase Auth:** Gestionarea identității, hashing-ul parolelor și managementul sesiunilor prin standardul JWT.
- **Tabel `profiles`:** Stocarea datelor de business (nume, telefon) legate de `auth.users.id`.
- **Roluri pe server:** Rolurile vor fi stocate în tabelul `profiles` și verificate prin RLS.
- **Izolare Multi-tenant:** Introducerea unui tabel `tenants` și a coloanei `tenant_id` în toate tabelele pentru a asigura separarea datelor între diferite organizații/magazine.
- **RLS Policies:** Filtrarea datelor la nivel de bază de date pe baza `tenant_id` și `role` din profile.

## 4. Tabele necesare (Propuse)
1.  **`tenants`**: Identifică organizația mamă (ex: Lanț de magazine).
2.  **`stores`**: Identifică punctul de lucru (magazinul fizic).
3.  **`profiles`**: Leagă utilizatorul de Auth de o organizație și un rol.
4.  **`utilizatori` (Existent -> Depreciat)**: Va fi înlocuit de `profiles` după migrarea datelor.

## 5. Roluri recomandate
| Rol | Descriere & Permisiuni |
|-----|-------------------------|
| **platform_owner** | Super-admin (tu). Acces total, gestionare tenants. |
| **tenant_admin** | Proprietar afacere. Gestionează magazinele și managerii proprii. |
| **manager** | Administrator de magazin. Rapoarte, stocuri, gestionare personal local. |
| **gestionar** | Recepție marfă (NIR), transferuri, inventar. |
| **casier** | Acces POS, vânzare, rapoarte de tură. |
| **agent** | Vizualizare stocuri, plasare comenzi în numele furnizorilor. |
| **furnizor** | Acces la propriile comenzi și stocuri alocate. |

## 6. Strategie de migrare fără downtime
1.  **Pregătire Schema (Shadow Tables):** Crearea tabelelor `tenants`, `stores` și `profiles` în paralel cu cele existente.
2.  **Creare Utilizatori Auth:** Înregistrarea utilizatorilor existenți în sistemul de Autentificare Supabase (manual sau prin script).
3.  **Mapping:** Corelarea `auth.users.id` cu noile înregistrări din `profiles`.
4.  **Hybrid Login:** Modificarea `Login.tsx` pentru a încerca întâi `supabase.auth.signInWithPassword()`. Dacă eșuează (utilizator ne-migrat), se face fallback pe tabela veche.
5.  **AuthContext Implementation:** Introducerea unui provider React pentru a gestiona starea sesiunii global și sigur.
6.  **RLS Activation:** Activarea RLS pe tabelele noi, apoi gradual pe cele existente (`produse`, `vanzari`).
7.  **Sunset:** Dezactivarea definitivă a login-ului custom și ștergerea coloanelor de parole din tabelele vechi.

## 7. Ce trebuie modificat în frontend (Etapa 2)
- **[supabaseClient.ts](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/supabaseClient.ts):** Adăugare logică pentru auto-refresh token.
- **[App.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/App.tsx):** Înlocuirea `useState` pentru role cu un `AuthContext`. Protejarea rutelor prin check-uri server-side.
- **[Login.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/Login.tsx):** Refactorizare completă pentru utilizarea `supabase.auth`.
- **NEW `src/context/AuthContext.tsx`:** Crearea provider-ului de autentificare.
- **Toate componentele de vizualizare:** Actualizarea interogărilor pentru a nu mai depinde de ID-uri din `localStorage`.

## 8. Riscuri
- **Acces Blocat:** Riscul ca administratorul să piardă accesul dacă RLS-ul este configurat greșit. (Soluție: Testare pe o bază de staging).
- **Mismatch Roluri:** Neconcordanțe între denumirile vechi și cele noi. (Soluție: Mapping strict în `profiles`).
- **Inconsistență Date:** Tabelele existente (ex: `produse`) nu au `tenant_id`. (Soluție: Script de populare default înainte de activarea RLS strict).
- **POS Offline:** Dexie.js trebuie să poată funcționa în continuare fără un token valid pe termen scurt.

## 11. Checklist de testare
- [ ] Login cu cont migrat (Supabase Auth).
- [ ] Încercare login cu parolă greșită (trebuie să eșueze).
- [ ] Accesarea paginii `/admin` manual din URL de către un `casier` (trebuie să redirecționeze).
- [ ] Modificarea `localStorage` (nu trebuie să mai permită accesul la date).
- [ ] Verificare în Supabase Dashboard că interogările `anon` returnează 0 rânduri fără token valid.
- [ ] Testare POS în mod Offline (asigurarea că datele locale sunt încă accesibile).
