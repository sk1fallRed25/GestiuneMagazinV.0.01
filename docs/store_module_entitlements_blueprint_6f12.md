# Blueprint: Store Module Entitlements (Etapa 6F.1.2)

## 1. Introducere și Obiective
Sistemul **Store Module Entitlements** (Abonamente și Drepturi Module Magazin) are rolul de a decupla autorizarea bazată pe roluri (RBAC — ce are voie să facă un utilizator) de autorizarea bazată pe funcționalități (Entitlements — ce module sunt activate pentru magazinul/clientul respectiv). 

Acest sistem permite Platform Owner-ului să activeze sau să dezactiveze individual module (ex: POS, Consultant AI, Rapoarte Fiscale) pentru fiecare magazin în parte, stând la baza viitoarei monetizări prin planuri tarifare comerciale.

---

## 2. Auditul Sistemului Actual de Permisiuni & Rute

### Rutare și Gardă de Acces (Route Guard)
- Rutele sunt declarate centralizat în `src/app/AppRoutes.tsx` și protejate prin intermediul componentei `<ProtectedRoute>`.
- `ProtectedRoute.tsx` preia utilizatorul curent și rolul lui din `AuthContext`. Dacă o rută definește un set de `allowedRoles`, se verifică dacă rolul utilizatorului este inclus în listă.
- Rolurile definite în `src/features/auth/types.ts` sunt: `platform_owner`, `admin`, `manager`, `gestionar` și `casier`.
- Permisiunile pe rute sunt catalogate și static în `src/features/auth/permissions.ts` prin intermediul obiectului `routePermissions`.

### Sidebar-ul adaptiv (`MainLayout.tsx`)
- Sidebar-ul generează dinamic meniurile apelând funcții utilitare din `permissions.ts` (ex: `isManagerLike`, `isStockOperator`, `isCashierLike`).
- În plus, pentru `platform_owner` există un tratament special implementat în Etapa 6F.1.1: dacă nu este selectat niciun magazin din `StoreContextSwitcher`, secțiunile specifice magazinului (Catalog, Setări, Rapoarte) apar ca elemente inactive (disabled), iar owner-ul este restricționat la `/owner`.

### Riscuri de Securitate ale Ascunderii în UI
> [!WARNING]
> Ascunderea unui element din sidebar este o măsură pur estetică. Dacă ruta din `AppRoutes.tsx` nu verifică entitlement-ul magazinului curent, orice utilizator care cunoaște calea URL (ex: `/ai-consultant`) o poate accesa direct în browser. 
> De asemenea, un client rău-intenționat poate trimite requesturi direct către RPC-urile bazei de date. Prin urmare, validarea trebuie făcută obligatoriu pe 3 straturi:
> 1. **UI (Sidebar / Meniuri)**: Ascundere pentru a nu induce utilizatorul în eroare.
> 2. **Frontend Route Guard (`ProtectedRoute`)**: Interceptarea navigării directe și afișarea unui ecran cu mesaj restrictiv personalizat.
> 3. **Database Guard (RLS / RPC)**: Baza de date (prin funcțiile RPC securizate cu `SECURITY DEFINER` și `search_path`) trebuie să verifice dacă magazinul asociat acțiunii are modulul activat înainte de a procesa datele.

---

## 3. Registry-ul Oficial de Module (Platform Modules)

Fiecare modul al platformei este înregistrat în tabela `platform_modules` cu următoarele proprietăți:
- **`module_key`**: Identificator unic string (lowercase snake_case).
- **`name`**: Numele comercial al modulului.
- **`description`**: Detalii despre funcționalitatea oferită.
- **`category`**: core, stock, sales, admin, reports, ai, fiscal, offline, platform.
- **`route_paths`**: Array de rute asociate (JSONB) pentru a permite Route Guard-ului să facă maparea automată.
- **`default_enabled`**: Boolean. Starea implicită a modulului la crearea unui magazin nou.
- **`requires_store_context`**: Boolean. Specifică dacă modulul acționează în contextul unui magazin sau este global (ex: `owner_console`).
- **`owner_only`**: Identifică modulele exclusive pentru Platform Owner.
- **`minimum_roles`**: Array de roluri (RBAC) care pot accesa acest modul.
- **`dependencies`**: Array de chei de module de care depinde funcționarea acestui modul (ex: `expiration_tracking` depinde de `products`).
- **`status`**: Starea de dezvoltare (`active`, `beta`, `disabled`, `planned`).

### Catalogul Celor 18 Module Platformă

| Nr | `module_key` | Denumire Modul | Categorie | Rute asociate | Roluri minime | Dependențe | Status | Descriere |
|----|--------------|----------------|-----------|---------------|---------------|------------|--------|-----------|
| 1 | `dashboard` | Tablou de Bord | `core` | `["/"]` | admin, manager | - | `active` | Statistici generale și rezumatul activității magazinului. |
| 2 | `products` | Catalog Produse | `stock` | `["/produse"]` | admin, manager, gestionar | - | `active` | Gestiunea catalogului de produse, prețuri și categorii. |
| 3 | `expiration_tracking` | Urmărire Expirare | `stock` | `["/expirari"]` | admin, manager, gestionar | `products` | `active` | Monitorizarea termenelor de valabilitate pentru loturile de produse. |
| 4 | `loss_reporting` | Raportare Pierderi | `stock` | `["/pierderi"]` | admin, gestionar | `products` | `active` | Înregistrarea produselor deteriorate, expirate sau pierdute. |
| 5 | `reception` | Recepție Marfă | `stock` | `["/receptie"]` | admin, gestionar | `products` | `active` | Înregistrarea intrărilor de stoc și recepția produselor. |
| 6 | `transfer` | Transfer Stocuri | `stock` | `["/transfer"]` | admin, gestionar | `products` | `active` | Transferul de stocuri între puncte de lucru / magazine. |
| 7 | `waste_audit` | Audit Pierderi | `admin` | `["/istoric-pierderi"]` | admin, manager | `loss_reporting` | `active` | Istoricul și analiza pierderilor și rebuturilor. |
| 8 | `commercial_reports` | Rapoarte Comerciale | `reports` | `["/rapoarte"]` | admin, manager | - | `active` | Rapoarte detaliate de vânzări, stocuri și profitabilitate. |
| 9 | `store_settings` | Setări Magazin | `admin` | `["/setari-magazin"]` | admin, manager | - | `active` | Configurarea profilului magazinului și a caselor de marcat. |
| 10 | `ai_consultant` | Consultant AI | `ai` | `["/ai-consultant"]` | admin, manager | - | `active` | Asistent inteligent pentru optimizarea stocurilor și prețurilor. |
| 11 | `pos` | Punct de Vânzare (POS) | `sales` | `["/pos", "/vanzare"]` | admin, casier | `products` | `active` | Interfața de vânzare rapidă, scanare coduri și bonuri. |
| 12 | `sales_history` | Istoric Vânzări | `reports` | `["/istoric-vanzari"]` | admin, manager | `pos` | `active` | Istoricul tranzacțiilor POS și gestiunea bonurilor emise. |
| 13 | `quick_add` | Adăugare Rapidă | `admin` | `["/fast-add"]` | admin | `products` | `active` | Interfață simplificată pentru adăugarea rapidă a produselor la raft. |
| 14 | `owner_console` | Consolă Proprietar | `platform` | `["/owner"]` | platform_owner | - | `active` | Administrarea globală a chiriașilor, magazinelor și modulelor. |
| 15 | `fiscal_bridge` | Fiscal Bridge | `fiscal` | `[]` | admin | `pos` | `planned` | Conectare directă cu case de marcat fizice și transmitere rapoarte Z. |
| 16 | `offline_sync` | Sincronizare Offline | `offline` | `[]` | admin | - | `planned` | Funcționare offline a POS-ului și sincronizare ulterioară la rețea. |
| 17 | `advanced_returns` | Retururi Avansate | `sales` | `[]` | admin, manager | `pos` | `beta` | Sistem extins pentru procesarea retururilor de produse și vouchere. |
| 18 | `vat_reports` | Rapoarte TVA | `reports` | `[]` | admin, manager | `commercial_reports` | `beta` | Rapoarte detaliate privind cotele de TVA colectate și deduse. |

---

## 4. Analiză Model Stocare: Dedicated Tables vs JSONB

Pentru stocarea asocierii dintre magazine și modulele active au fost luate în considerare două opțiuni:

### Varianta A: Proprietate JSONB în tabela `stores` (`stores.settings.modules`)
- **Avantaje**: Schema DB simplificată (nu apar tabele noi); citire rapidă a setărilor de magazin la pachet cu alte configurări.
- **Dezavantaje**: 
  - Extrem de greu de indexat și interogat eficient peste toate magazinele (ex: „Care magazine au modulul AI activat?”).
  - Lipsa constrângerilor referențiale (se pot introduce chei invalide sau scrise greșit în JSON).
  - Dificil de auditat istoric (nu putem ști ușor cine, când și de ce a schimbat starea unui modul).
  - Nu se pot aplica cu ușurință politici RLS la nivel de modul individual.

### Varianta B: Tabele dedicate (`platform_modules` & `store_module_access`) [RECOMANDATĂ]
- **Avantaje**:
  - **Integritate Referențială**: Cheile modulelor sunt verificate prin Foreign Key față de tabela catalog (`platform_modules`).
  - **Auditabilitate Completă**: Tabela `store_module_access` stochează informații despre cine a făcut modificarea (`enabled_by`), data (`enabled_at`/`disabled_at`), motivul explicit (`reason`) și opțiunea de a adăuga parametri suplimentari (`metadata`).
  - **Performanță ridicată**: Folosirea indexurilor parțiale (`WHERE enabled = true`) permite interogări extrem de rapide.
  - **Securitate Granulară**: Permite atașarea de politici RLS stricte pe ambele tabele.
  - **Extensibilitate**: În viitor se pot adăuga cu ușurință coloane noi (ex: preț modul, perioadă de trial etc.).
- **Decizie**: Am ales **Varianta B** pentru a asigura auditabilitatea și standardizarea specifică unei platforme SaaS premium enterprise.

---

## 5. Strategia de Integrare în Frontend

### A. Route Guard Adaptiv (`ProtectedRoute.tsx`)
1. În `ProtectedRoute.tsx`, pe lângă verificarea de rol (`allowedRoles`), se va injecta verificarea de modul.
2. Un utilitar frontend `findModuleByPath(pathname)` va mapa calea curentă la cheia modulului corespunzător (ex: `/expirari` -> `expiration_tracking`).
3. Dacă ruta solicitată aparține unui modul și magazinul curent nu îl are activat (verificat în starea locală/context), utilizatorul este oprit din randare și se afișează un ecran elegant de acces restricționat:
   
> **Acces Restricționat**  
> Modulul **[Nume Modul]** nu este inclus în abonamentul magazinului dumneavoastră curent.  
> *Motiv dezactivare administrativă:* [Motiv din DB / Neplată / Standard Plan]  
> 
> *Dacă aveți nevoie de această funcționalitate, contactați administratorul platformei.*  
> [ Buton: Înapoi la Dashboard ]

### B. Sidebar Filtering (`MainLayout.tsx`)
1. Înainte de a randa elementele din sidebar, se va apela o funcție de filtrare `isModuleEnabled(moduleKey)`.
2. Dacă un modul este dezactivat pentru magazinul curent, elementul din meniu este ascuns complet din interfață pentru a nu aglomera vizual spațiul de lucru al angajaților magazinului.
3. Excepție: Pentru `platform_owner`, dacă nu are magazin selectat, vor apărea toate ca dezactivate cu tooltip-ul corespunzător. Dacă selectează un magazin, meniul se va restrânge strict la modulele activate pentru acel magazin.

### C. State Management & Caching
- Pentru a evita interogarea serverului (Supabase) la fiecare schimbare de rută sau randare a sidebar-ului, lista de module activate pentru magazinul curent va fi încărcată o singură dată la schimbarea contextului de magazin în `AuthContext`.
- Aceasta va fi stocată în starea reactivă a `AuthContext` (ex: `enabledModules: string[]`) și distribuită prin hook-ul `useAuth()`.
- În caz de actualizare din Owner Console, se poate declanșa o reîmprospătare a contextului.

---

## 6. Planificarea UI-ului din Owner Console (`OwnerConsolePage.tsx`)

Interfața de gestionare a modulelor din Consola Proprietarului va conține:
1. **Un Tab Nou: „Module Magazin”**:
   - Secțiune dedicată care se adaugă lângă Tab-urile existente (Magazine, Utilizatori).
2. **Selector Magazin**:
   - Un dropdown elegant pentru a alege magazinul client care urmează să fie configurat.
3. **Panou Categorii Module**:
   - Modulele vor fi grupate vizual pe categorii: Core, Stocuri, Vânzări, Rapoarte, AI/Avansate.
   - Fiecare modul va afișa: Denumire, Descriere scurtă, Status în platformă și dependințele necesare (dacă există).
4. **Switch-uri de Activare cu loader și confirmare**:
   - Fiecare rând va avea un switch toggle.
   - La schimbarea stării, se deschide o casetă de confirmare care conține un câmp text opțional pentru specificarea motivului (ex: „Upgrade la pachetul Premium”, „Dezactivat la cererea clientului”).
   - În timpul salvării, switch-ul va fi înlocuit temporar de un loader, prevenind dubla trimitere.
5. **Preset-uri Comerciale (Planuri)**:
   - Pentru a evita configurarea manuală modul cu modul, interfața va oferi butoane rapide pentru aplicarea unor template-uri comerciale (Planuri):

| Plan | Module incluse | Destinație |
|------|----------------|------------|
| **Basic** | `dashboard`, `products`, `pos`, `sales_history` | Magazine mici, POS simplu fără gestiune avansată de stocuri. |
| **Standard** | *Basic* + `reception`, `loss_reporting`, `waste_audit`, `store_settings` | Gestiune operațională standard, recepție marfă și raportare pierderi. |
| **Premium** | *Standard* + `expiration_tracking`, `transfer`, `commercial_reports`, `quick_add` | Magazine multi-punct, monitorizare valabilitate stocuri și analize comerciale. |
| **Enterprise** | *Premium* + `ai_consultant`, `advanced_returns`, `vat_reports` + opțional `offline_sync`, `fiscal_bridge` | Clienți mari care doresc predicții AI, retururi complexe, rapoarte TVA și fiscalizare avansată. |

- La selectarea unui plan, interfața va apela RPC-ul `bulk_set_store_modules`, configurând toate modulele corespunzător planului într-o singură tranzacție atomică.

---

## 7. Corecție 6F.1.3 — Pre-Apply Hardening

În cadrul Etapei 6F.1.3, blueprint-ul a fost securizat și întărit suplimentar pentru a asigura stabilitatea la runtime și prevenirea breșelor de securitate:

### A. Securitate RLS și Grants Restrânse (RPC-only DML)
- **RLS cu WITH CHECK explicit**: Atât pe `platform_modules` cât și pe `store_module_access`, politicile de DML folosesc `WITH CHECK (public.is_platform_owner())` pentru a bloca orice mutație neautorizată la scriere.
- **DML Blocate direct**: S-au revocat drepturile `INSERT`, `UPDATE` și `DELETE` pe tabele de la utilizatorul `authenticated`. Toate operațiunile de scriere se efectuează obligatoriu prin RPC-urile securizate (`set_store_module_access` și `bulk_set_store_modules`).

### B. Effective Access în `get_store_module_access`
- Funcția a fost refăcută pentru a returna registrul complet al modulelor platformei prin `LEFT JOIN` cu override-urile din `store_module_access`.
- Se calculează starea `effective_enabled` direct în baza de date ca fallback la `default_enabled` (și forțare `false` dacă modulul are status-ul `disabled` sau `planned`). Acest lucru scutește frontend-ul de logică de fallback vulnerabilă și simplifică randarea în Owner Console.

### C. Gestiunea Corectă a Contextului Platform Owner
- În funcția `user_can_access_store_module`, dacă utilizatorul este `platform_owner` și încearcă să acceseze un modul de magazin (unde `requires_store_context = true`), funcția returnează `false` dacă `p_store_id` este null.
- În cazul în care ownerul are un magazin selectat, accesul lui respectă valoarea `effective_enabled` a magazinului respectiv. Astfel, ownerul poate testa aplicația exact în condițiile de licențiere ale clientului respectiv, fără a simula un acces bypass nefiresc în route guard-ul de operare.

### D. Verificarea Dependențelor (Dependency Validation)
- La **activarea** unui modul, RPC-ul verifică recursiv dacă toate dependențele lui (ex: `products` pentru `expiration_tracking`) sunt deja active. În caz contrar, activarea este blocată cu eroare specifică.
- La **dezactivare**, RPC-ul scanează dacă există alte module active pe magazin care depind de modulul curent și blochează dezactivarea pentru a evita stări inconsistente în UI.

### E. Structură Audit Logs & Output JSONB
- Salvarea în `audit_logs` a fost mapată pe coloanele reale din baza de date live: `old_data` și `new_data` (JSONB) pentru a păstra istoricul schimbărilor.
- RPC-urile de scriere returnează răspunsuri structurate JSONB cu proprietățile `ok`, `changed`, `effectiveEnabled`, etc.

### F. Seeding Idempotent și Fără Backfill în Masă
- Datele de seed folosesc `ON CONFLICT (module_key) DO UPDATE` pentru a permite actualizări sigure, iar modulul comercial `ai_consultant` a fost setat implicit pe `default_enabled = false`.
- Nu se efectuează backfill automat în tabele la migrare; sistemul folosește `default_enabled` dynamic, economisind spațiu și permițând funcționarea instantanee a magazinelor existente.
