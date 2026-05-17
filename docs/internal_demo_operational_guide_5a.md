# Ghid Demo Intern — Gestiune Magazin v2

## 1. Scop
Acest ghid operațional este destinat echipei interne și stakeholderilor pentru susținerea demonstrațiilor de verificare și validare (Demo Intern) a platformei **Gestiune Magazin v2**. 

> [!IMPORTANT]
> Aplicația se află în stadiul **MVP-Ready** (Minimum Viable Product). Obiectivul acestui demo este validarea fluxurilor operaționale de bază (core retail workflows) și a arhitecturii de securitate (Supabase v2 cu RLS activ). Platforma nu este încă pregătită pentru producție comercială completă, facturare automată sau deschidere publică de tip self-service.

---

## 2. Conturi și roluri

Sistemul implementează un model avansat de control al accesului bazat pe roluri (RBAC) prin tabela `profiles` și asocieri multi-store prin `store_members`. Pentru demonstrație, se vor utiliza conturi predefinite corespunzătoare următoarei ierarhii:

1. **`platform_owner`** (Proprietar Platformă)
   - *Ce vede/face*: Are acces complet la toate modulele sistemului și, în mod exclusiv, la **Owner Console**. Poate monitoriza starea globală a tuturor magazinelor, numărul de membri și poate activa/dezactiva accesul sau modifica rolul personalului pe fiecare magazin.
2. **`admin`** (Administrator Magazin)
   - *Ce vede/face*: Gestionează un magazin specific. Are acces la Dashboard, Stocuri, Operațiuni (Recepție, Transfer, Pierderi), Audit (Istoric Pierderi, Istoric Vânzări), AI Consultant și setări de sistem (Adăugare Rapidă). Nu are acces la Owner Console.
3. **`manager`** (Manager Magazin)
   - *Ce vede/face*: Supervizează activitatea zilnică a magazinului. Vede Dashboard, Stocuri, Expirări, Istoric Pierderi, Istoric Vânzări și AI Consultant.
4. **`gestionar`** (Gestionar Stocuri)
   - *Ce vede/face*: Responsabil de fluxul de marfă. Are acces la Stocuri & Produse, Produse Expirate, Raportare Pierderi, Recepție Marfă și Transfer Marfă.
5. **`casier`** (Casier POS)
   - *Ce vede/face*: Operează exclusiv modulul de vânzare (POS / Casa de marcat). Interfața este optimizată și restricționată pentru operare rapidă, fără acces la funcții de management sau stocuri generale.

*(Notă: Din motive de securitate, parolele și cheile de acces nu sunt incluse în acest document; ele se regăsesc în managerul de parole intern al echipei de testare).*

---

## 3. Flux recomandat demo

Pentru a prezenta capabilitățile platformei într-o succesiune logică și coerentă, se recomandă parcurgerea următorilor 12 pași:

1. **Login**: Autentificare inițială folosind un cont de `admin` sau `manager`.
2. **Dashboard**: Prezentarea ecranului de sinteză (KPIs: Vânzări zilnice, Tranzacții, Alerte stoc minim, Produse expirate).
3. **Products**: Navigare în „Stocuri & Produse”. Demonstrarea filtrelor de căutare, afișarea stocului defalcat (Magazin vs. Depozit) și a prețurilor.
4. **FastAdd**: Accesare „Adăugare Rapidă”. Crearea unui produs nou de test pentru a demonstra rapiditatea fluxului de introducere a datelor.
5. **Recepție**: Efectuarea unei recepții de marfă pe produsul nou creat, adăugând cantitate în locația Depozit.
6. **Transfer**: Executarea unui transfer de marfă din locația Depozit către locația Magazin (raft), simulând aprovizionarea rafturilor.
7. **Pierderi**: Raportarea unei casări/pierderi din stocul de Magazin (ex. produs deteriorat).
8. **POS (Vânzare)**: Comutarea pe un cont de `casier` (sau deschiderea POS-ului). Scanarea/selectarea produsului, adăugarea pe bon și finalizarea tranzacției (simulare plată Cash sau Card).
9. **Istoric Vânzări**: Revenire pe contul de `manager`/`admin`. Verificarea tranzacției abia efectuate, vizualizarea detaliilor bonului și a articolelor vândute.
10. **Istoric Pierderi**: Verificarea înregistrării de casare din pasul 7 și auditarea motivului introdus.
11. **AI Consultant**: Accesarea modulului de inteligență artificială pentru generarea de recomandări operaționale bazate pe datele de vânzări și stocuri curente.
12. **Owner Console**: Delogare și relogare cu contul de `platform_owner`. Prezentarea panoului de control multi-store, vizualizarea statisticilor globale și demonstrarea modificării stării/rolului unui membru de magazin.

---

## 4. Date de test recomandate

Pentru a menține consistența bazei de date de test și a evita poluarea rapoartelor, utilizați următoarele date standardizate în timpul demonstrației:

- **Cod de bare (Barcode)**: `TEST-DEMO-001` (până la `TEST-DEMO-009`)
- **Nume Produs**: `Produs Demo Intern [#]`
- **Categorie**: `Demo` / `Test`
- **Cantități de intrare**: Mici, între `1` și `5` bucăți (pentru a urmări ușor trasabilitatea calculelor).
- **Prețuri**: Valori rotunde, ex. `10.00 RON` (achiziție) / `15.00 RON` (vânzare).
- **Motiv Pierdere / Casare**: `Test Demo Intern - [Data]`
- **Client POS**: `Client Standard Demo`

---

## 5. Ce NU se testează încă

Următoarele funcționalități fac parte din etapele post-MVP (v3/Comercial) și nu vor fi demonstrate sau testate în această sesiune:

- **Fiscal Bridge**: Conectarea directă cu casele de marcat fizice (imprimante fiscale) pentru tipărirea de bonuri fiscale reale ANAF.
- **Offline Sync (Dexie v2 complet)**: Sincronizarea bidirecțională avansată în cazul căderilor prelungite de conexiune la internet.
- **Retururi de marfă complexe**: Stornări parțiale sau fluxuri avansate de retur clienți pe POS.
- **Billing / Abonamente**: Sistemul de plată recurentă, emitere facturi de abonament pentru magazine sau limitări de plan tarifar (SaaS billing).
- **Invite User prin Email**: Fluxul de trimitere invitații prin email cu token de înrolare (momentan conturile sunt pre-generate de admin).
- **Multi-tenant comercial cu izolare completă pe baze de date separate**: (Izolarea actuală este logică, perfect securizată prin RLS în aceeași bază de date).
- **Teste de stres / Producție pe volum mare**: (Ex. zeci de mii de tranzacții simultane pe secundă).

---

## 6. Cum se validează succesul

| Modul | Ce trebuie să se vadă | Rezultat Așteptat |
| :--- | :--- | :--- |
| **Autentificare** | Formular de login curat, redirecționare pe baza rolului. | Login de succes; casierul ajunge direct în POS, adminul în Dashboard. |
| **Dashboard** | Carduri KPI, grafic de vânzări, liste de alerte stoc. | Datele reflectă stările reale din baza de date; fără timpi mari de încărcare. |
| **Stocuri & Produse** | Lista paginată de produse, stocuri Magazin/Depozit separate. | Căutarea după nume/cod de bare filtrează instantaneu rezultatele. |
| **FastAdd** | Formular compact de adăugare produs nou. | Produsul apare imediat în baza de date și în lista de stocuri. |
| **Recepție & Transfer** | Selectare produs, introducere cantitate și confirmare. | Cantitățile din `stock_batches` sunt actualizate corect matematic. |
| **POS / Vânzare** | Interfață de marcat, coș de cumpărături, butoane de plată. | Generare tranzacție, scădere stoc Magazin, înregistrare bon în istoric. |
| **Istoric (Vânzări/Pierderi)**| Tabele de audit cu detalii tranzacții și casări. | Înregistrările noi apar la începutul listei (sortate descrescător). |
| **AI Consultant** | Fereastră de chat / generare prompturi de analiză. | Răspunsuri coerente și pertinente formulate pe baza datelor de stoc. |
| **Owner Console** | Panou global de administrare, statistici, tabele membri. | Doar `platform_owner` are acces; modificările de stare/rol funcționează. |

---

## 7. Probleme cunoscute / limitări

1. **Profile Self-Update**: Utilizatorii nu își pot schimba singuri parola sau datele de profil din interfață (necesită intervenția administratorului).
2. **Creare Conturi în Owner Console**: Owner Console este destinat alocării și modificării permisiunilor membrilor existenți, nu creării de conturi noi de la zero.
3. **Afișare Produse Expirate**: Modulul de expirări afișează exclusiv produsele care au loturi cu `expiry_date` completat la recepție.
4. **Offline Dexie v2**: Suportul offline este parțial implementat, fiind conceput ca un mecanism de fallback temporar pentru POS, dar nesincronizat complet pentru toate operațiunile de management.
5. **Fiscal Bridge**: Neintegrat; tranzacțiile de POS emit doar bonuri interne de sistem (proforme/nefiscale).
6. **RLS `anon` execute**: Anumite funcții de utilitate (RPC) din Supabase pot păstra permisiuni `anon` din perioada de migrare; acestea vor fi restricționate complet în etapa de securizare extremă post-MVP.

---

## 8. Checklist înainte de demo

Înaintea începerii demonstrației, responsabilul tehnic va verifica îndeplinirea următoarelor puncte:

- [ ] **Fișierul `.env` configurat**: Variabilele `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` sunt setate corect către instanța v2.
- [ ] **Dependențe la zi**: Rulare `npm install` efectuată pentru a garanta pachetele corecte.
- [ ] **Validare Build**: Rulare `npm run build` executată cu succes (`Exit code: 0`), confirmând lipsa erorilor TypeScript.
- [ ] **Server Local**: Rulare `npm run dev` activă și funcțională.
- [ ] **Conturi Supabase Auth**: Conturile de test (proprietar, admin, manager, gestionar, casier) sunt create în Supabase Authentication.
- [ ] **Sincronizare DB**: Conturile au înregistrări valide și corelate în tabelele `profiles` și `store_members`.
- [ ] **Date Inițiale**: Există cel puțin 10-20 de produse, prețuri în `product_prices` și stocuri în `stock_batches` pentru a avea o interfață populată.
- [ ] **Console Browser Curată**: Inspectarea consolei din Developer Tools confirmă absența oricăror erori de rețea sau de React (excepție făcând avertizările standard de dezvoltare).
