# Store Lifecycle Management Blueprint — Etapa 6F.1.9

## 1. Rezumat
Acest document definește blueprint-ul tehnic pentru gestionarea ciclului de viață al magazinelor (stores) în cadrul platformei. Platform Owner-ul are nevoie de un sistem robust și sigur pentru a controla starea operațională a magazinelor chiriașe/clienților, protejând în același timp integritatea datelor istorice și fiscale.

### De ce avem nevoie de acest sistem:
1. **Control financiar și operațional**: Dezactivarea temporară a magazinelor pentru neplată sau litigii.
2. **Conformitate și Audit**: Păstrarea datelor clienților care își închid colaborarea (arhivare) în mod read-only, prevenind ștergerea accidentală a datelor fiscale și contabile obligatorii prin lege.
3. **Curățenie în platformă**: Posibilitatea de a șterge definitiv magazine de test sau create din greșeală, dar **doar dacă** acestea nu au activitate reală înregistrată.

### Diferența între Suspendare, Arhivare și Ștergere:
- **Suspendarea**: O blocare temporară. Datele rămân intacte, magazinul poate fi reactivat oricând.
- **Arhivarea**: Închidere definitivă a colaborării. Datele sunt păstrate în format securizat read-only pentru audit/export, dar magazinul este exclus din fluxurile operaționale active.
- **Ștergerea**: Eliminarea fizică (hard delete) a înregistrărilor din baza de date, permisă exclusiv pentru instanțe fără activitate.

---

## 2. Audit schema actuală (Relații și Riscuri)
O analiză statică a schemei de date evidențiază faptul că majoritatea tabelelor operaționale depind direct de tabela `public.stores`.

### Tabele dependente (cu coloana `store_id`):
- `store_members` (ON DELETE CASCADE)
- `devices` (ON DELETE CASCADE)
- `categories` (ON DELETE CASCADE)
- `products` (ON DELETE CASCADE)
- `product_prices` (ON DELETE CASCADE)
- `stock_batches` (ON DELETE CASCADE)
- `stock_movements` (ON DELETE CASCADE)
- `pos_shifts` (sau `cashier_shifts`) (ON DELETE CASCADE)
- `sales` (ON DELETE CASCADE)
- `sale_items` (ON DELETE CASCADE)
- `payments` (ON DELETE CASCADE)
- `receptions` (ON DELETE CASCADE)
- `reception_items` (ON DELETE CASCADE)
- `waste_events` (ON DELETE CASCADE)
- `waste_items` (ON DELETE CASCADE)
- `sale_returns` (ON DELETE CASCADE)
- `sale_return_items` (ON DELETE CASCADE)
- `client_events` (ON DELETE CASCADE)
- `sync_conflicts` (ON DELETE CASCADE)
- `audit_logs` (ON DELETE CASCADE)
- `error_reports` (ON DELETE CASCADE)
- `store_module_access` (ON DELETE CASCADE)

### Chei Străine (FK) și comportament ON DELETE CASCADE:
Aproape toate tabelele de mai sus folosesc `ON DELETE CASCADE` pentru legătura cu `stores(id)`. 

### Riscuri Hard Delete:
> [!CAUTION]
> Deoarece constrângerile sunt setate pe `ON DELETE CASCADE`, o singură instrucțiune `DELETE FROM public.stores WHERE id = ...` va șterge automat și iremediabil toate vânzările, istoricul de stocuri, rapoartele de pierderi, documentele de recepție și jurnalele de audit asociate acelui magazin.
> 
> Acest comportament reprezintă un risc critic de pierdere de date fiscale și jurnale de audit pentru magazinele cu activitate comercială reală.

---

## 3. Lifecycle Status (Stări Propuși)
Se propun 5 stări distincte pentru coloana `lifecycle_status` din tabela `stores`:

1. `active`
   - **Descriere**: Magazin operațional normal.
   - **Acces**: Membrii magazinului pot efectua vânzări POS, recepții, transferuri și modificări de stoc conform rolurilor active și modulelor activate.
2. `suspended`
   - **Descriere**: Blocare temporară (ex. pentru neplată, litigiu comercial, pauză operațională).
   - **Acces**: Utilizatorii sunt blocați din POS și restul modulelor de gestiune. Proprietarul platformei poate reactiva magazinul.
3. `archived`
   - **Descriere**: Colaborare închisă definitiv cu un client real care a avut activitate comercială.
   - **Acces**: Datele sunt securizate ca read-only. Magazinul este ascuns din listele operaționale, dar datele rămân accesibile în Owner Console pentru rapoarte de audit și exporturi.
4. `pending_deletion`
   - **Descriere**: Magazin marcat explicit pentru ștergere fizică. 
   - **Acces**: Complet blocat. Stare intermediară destinată verificărilor finale de eligibilitate și aprobărilor suplimentare.
5. `deleted`
   - **Descriere**: Status logic ("tombstone") în cazul în care se dorește păstrarea unei înregistrări minimale (ex. ID, nume, motiv ștergere) fără datele tranzacționale asociate.

---

## 4. SQL Propus (Blueprint Structură)
Propunerea de modificare a tabelei `public.stores` constă în adăugarea stării de lifecycle și a metadatelor de audit asociate fiecărei tranziții.

```sql
-- Extindere stores cu stările de lifecycle
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archive_reason text,
ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deletion_reason text;

-- Constrângere pentru statusuri valide
ALTER TABLE public.stores ADD CONSTRAINT check_stores_lifecycle_status
    CHECK (lifecycle_status IN ('active', 'suspended', 'archived', 'pending_deletion', 'deleted'));

-- Indexuri pentru performanța căutărilor
CREATE INDEX IF NOT EXISTS idx_stores_lifecycle_status ON public.stores(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_stores_active_lifecycle ON public.stores(active, lifecycle_status);
```

### Compatibilitate cu coloana existentă `active` (Boolean):
Pentru a asigura retrocompatibilitatea cu codul actual din aplicație și politicile RLS existente:
- Când `lifecycle_status = 'active'`, valoarea coloanei `active` trebuie să fie `true`.
- Când `lifecycle_status` are orice altă valoare (`suspended`, `archived`, `pending_deletion`, `deleted`), valoarea coloanei `active` va fi setată automat pe `false` prin intermediul unui trigger la nivel de bază de date.
- Coloana `active` este tratată ca o etichetă de compatibilitate legacy, sursa completă de adevăr devenind `lifecycle_status`.

---

## 5. RPC-uri Securizate Propuse (Interfețe API)
Toate RPC-urile propuse rulează cu privilegii ridicate (`SECURITY DEFINER`), setează explicit `search_path = public`, revocă accesul implicit de la rolurile `PUBLIC` și `anon` și permit execuția doar utilizatorilor autentificați. În interiorul fiecărei funcții se verifică strict dacă apelantul este Platform Owner (`public.is_platform_owner()`).

### A. `get_store_lifecycle_status(p_store_id uuid)`
- **Scop**: Returnează starea curentă, metadatele de audit și statisticile de activitate comercială ale magazinului.
- **Payload returnat**:
  ```json
  {
    "ok": true,
    "storeId": "uuid",
    "name": "Nume Magazin",
    "active": false,
    "lifecycleStatus": "suspended",
    "suspendedAt": "2026-05-25T10:00:00Z",
    "suspendedBy": "uuid-profile",
    "suspensionReason": "Plată neefectuată pe luna Mai",
    "archivedAt": null,
    "canDelete": false,
    "recommendedAction": "archive",
    "counts": { "sales": 150, "posShifts": 24, "stockMovements": 540 }
  }
  ```

### B. `suspend_store(p_store_id uuid, p_reason text)`
- **Reguli**: Setează `lifecycle_status='suspended'` și `active=false`. Înregistrează motivul (minim 3 caractere, trim-uit), data și utilizatorul platform_owner care a inițiat acțiunea. Salvează log de audit `store.suspend`.

### C. `reactivate_store(p_store_id uuid, p_reason text)`
- **Reguli**: Setează `lifecycle_status='active'` și `active=true`. Curăță câmpurile de audit ale suspensiei. Înregistrează motivul reactivării și salvează log de audit `store.reactivate`.

### D. `archive_store(p_store_id uuid, p_reason text)`
- **Reguli**: Setează `lifecycle_status='archived'` și `active=false`. Înregistrează data arhivării, utilizatorul owner și motivul arhivării. Salvează log de audit `store.archive`.

### E. `get_store_deletion_eligibility(p_store_id uuid)`
- **Reguli**: Rulează interogări de agregare pentru a determina dacă magazinul conține date în tabelele critice.
- **Validări efectuate**:
  - `sales count = 0`
  - `pos_shifts count = 0`
  - `stock_movements count = 0`
  - `stock_batches` cu `quantity > 0` count = 0
  - `sale_returns count = 0`
  - `waste_events count = 0`
  - `store_members` activi count = 0
  - `store_module_access` count = 0
  - `audit_logs` count = 0

### F. `request_store_deletion(p_store_id uuid, p_reason text)`
- **Reguli**: Apelează `get_store_deletion_eligibility`. Dacă eligibilitatea returnează `canDelete=false`, operațiunea este respinsă, returnează eroarea și înregistrează log `store.hard_delete_blocked`. Dacă este eligibil (`canDelete=true`), modifică statusul în `pending_deletion` și înregistrează log `store.deletion_request`.

### G. `hard_delete_store_if_eligible(p_store_id uuid, p_confirmation text, p_reason text)`
- **Reguli**: Verifică dacă textul de confirmare trimis este exact `"STERG DEFINITIV MAGAZINUL"`. Validează din nou eligibilitatea fizică. Dacă este validă, execută instrucțiunea `DELETE FROM public.stores WHERE id = p_store_id` (care va cascade-șterge tabelele conexe goale sau configurările de module). Înregistrează log de audit cu nivel critic `store.hard_delete`.

---

## 6. Reguli de Eligibilitate pentru Ștergere Fizică
Ștergerea fizică este o operațiune distructivă ireversibilă și este supusă unor criterii extrem de stricte:

### Ce blochează ștergerea fizică (Hard Delete):
1. **Prezența tranzacțiilor comerciale**: Orice vânzare înregistrată în `sales` (chiar dacă este anulată/stornată).
2. **Istoric de ture**: Orice tură de casă înregistrată în `pos_shifts` (sau `cashier_shifts`).
3. **Mișcări de stoc active sau istorice**: Înregistrări în `stock_movements`, `receptions`, `waste_events`.
4. **Stoc curent la raft/depozit**: Loturi în `stock_batches` care au o cantitate pozitivă (`quantity > 0`).
5. **Membri asociați**: Utilizatori activi asociați magazinului în tabela `store_members`.

### Ce permite ștergerea fizică:
- Numai lipsa completă a înregistrărilor în tabelele tranzacționale de mai sus. Această situație apare doar la magazine de test nou create, erori de introducere a datelor imediat după înregistrare, sau înregistrări abandonate înainte de configurare.

---

## 7. Comportamentul Aplicației în Funcție de Status
Fiecare stare influențează direct drepturile de acces ale utilizatorilor la nivel de backend (RLS și RPC-uri) și frontend (UI):

| Status | POS (Vânzare) | Recepție & Mișcări Stoc | Rapoarte & Audit | Vizibilitate în Owner Console |
| :--- | :--- | :--- | :--- | :--- |
| **active** | Permis | Permis | Permis complet | Vizibil normal |
| **suspended** | **Blocat** (Eroare RPC) | **Blocat** | **Blocat** | Vizibil cu badge "Suspendat" |
| **archived** | **Blocat** (Eroare RPC) | **Blocat** | **Read-Only** (Doar Platform Owner) | Vizibil sub filtru "Arhivate" |
| **pending_deletion**| **Blocat** | **Blocat** | **Blocat** | Vizibil doar pentru Platform Owner |
| **deleted** | **Blocat** | **Blocat** | **Blocat** | Ascuns complet în fluxurile standard |

---

## 8. Owner Console UI Viitor
Pentru gestionarea acestor stări se propun extensii vizuale în **Consola Proprietarului (Owner Console)**.

### Elemente în `StoresTable`:
- **Badge Status**:
  - `active` -> Badge Verde: `Activ`
  - `suspended` -> Badge Galben: `Suspendat`
  - `archived` -> Badge Gri/Albastru: `Arhivat`
  - `pending_deletion` -> Badge Portocaliu: `În așteptare ștergere`
- **Meniu Acțiuni contextuale per rând**:
  - `Suspendă` (afișat doar pentru starea active)
  - `Reactivează` (afișat pentru suspended sau archived)
  - `Arhivează` (afișat pentru active sau suspended)
  - `Verifică eligibilitate ștergere` (afișat pentru orice stare)
  - `Solicită ștergere` (afișat dacă eligibilitatea este pozitivă)
  - `Șterge definitiv` (afișat doar dacă magazinul este în starea pending_deletion și eligibilitatea este confirmată)

### Modale propuse în UI:
1. **`SuspendStoreModal`**: Solicită motivul suspendării. Buton de confirmare.
2. **`ReactivateStoreModal`**: Solicită motivul reactivării.
3. **`ArchiveStoreModal`**: Afișează un avertisment privind blocarea permanentă a operațiunilor de zi cu zi și conservarea datelor în format read-only. Cere motiv.
4. **`DeleteStoreEligibilityModal`**: Afișează în mod transparent tabelele tranzacționale și contorul de înregistrări găsite (ex. Vânzări: 14, Ture: 2). Dacă sunt înregistrări tranzacționale, butonul de ștergere este ascuns și se recomandă opțiunea de arhivare.
5. **`ConfirmHardDeleteStoreModal`**:
   - Afișează un avertisment critic de culoare roșie.
   - Cere introducerea unui motiv explicit.
   - Cere tastarea textului exact de confirmare: `STERG DEFINITIV MAGAZINUL`.
   - Butonul de execuție este `disabled` până când textul introdus se potrivește perfect.

---

## 9. Audit și Securitate
- **Platform Owner Only**: RLS și RPC-urile validează apelantul folosind `public.is_platform_owner()`. Niciun alt utilizator (chiar și admin de magazin) nu poate modifica statusurile de lifecycle sau vizualiza eligibilitatea de ștergere.
- **Reason Required**: Toate funcțiile de modificare a stării (suspendare, reactivare, arhivare, cerere ștergere, ștergere definitivă) necesită completarea unui motiv valid (non-empty, minim 3 caractere).
- **Audit Logs**: Fiecare operațiune creează o înregistrare în tabela `public.audit_logs` cu acțiunile dedicate:
  - `store.suspend`
  - `store.reactivate`
  - `store.archive`
  - `store.deletion_request`
  - `store.hard_delete_blocked`
  - `store.hard_delete`

---

## 10. Recomandări de Utilizare a Sistemului
- **Pentru Clienți Reali (cu activitate comercială)**: **NU se va folosi Hard Delete**. Colaborarea se va încheia prin starea de `archived`, asigurând conformitatea fiscală și păstrarea registrelor contabile.
- **Pentru Magazine de Test / Înregistrări eronate**: Se poate folosi ciclul `active` -> `pending_deletion` -> `hard_delete_store_if_eligible` dacă eligibilitatea este confirmată automat (toate contoarele tranzacționale sunt 0).

---

## 11. Etape Următoare (Roadmap)
- **Etapa 6F.1.10**: *Store Lifecycle SQL Pre-Apply Hardening* (analiza de impact a scriptului SQL propus, teste izolate pe structuri dummy).
- **Etapa 6F.1.11**: *Store Lifecycle SQL Apply Verification* (aplicarea efectivă a migrației SQL pe baza de date și testarea directă a RPC-urilor securizate în PostgreSQL).
- **Etapa 6F.1.12**: *Owner Console Store Lifecycle UI* (implementarea interfeței de utilizator în Owner Console, badge-uri, modale de acțiune și text de confirmare).
- **Etapa 6F.1.13**: *Store Lifecycle E2E* (scrierea și rularea scenariilor automate de testare de la cap la cap pentru validarea întregului flux de suspendare, arhivare și ștergere eligibilă).

---

## 12. Decizie
Alegeți opțiunea dorită pentru a avansa:

- [x] **Ready for 6F.1.10 SQL Pre-Apply Hardening** (Proiectarea este finalizată conform specificațiilor, structura RPC-urilor este securizată și gata pentru faza de pre-hardening).
- [ ] **Needs architecture review** (Sunt necesare modificări suplimentare la nivel de schema sau comportament).

---

## 13. Corecție 6F.1.10 — Pre-Apply Hardening
În faza de pre-apply hardening s-au realizat următoarele ajustări critice pentru a asigura imunitatea datelor și alinierea perfectă cu schema live:

### A. Securizarea funcției de eligibilitate
Funcția `get_store_deletion_eligibility(p_store_id)` a fost securizată:
- Adăugarea verificării explicite `public.is_platform_owner()`.
- Validarea `p_store_id IS NOT NULL` și verificarea existenței magazinului.
- Extinderea verificărilor la **18 tabele** din schema reală a bazei de date (inclusiv `receptions`, `reception_items`, `waste_items`, `client_events`, `sync_conflicts`, `error_reports`, `products`, `product_prices`, `categories`, `devices` și tabelele legacy de shift `cashier_shifts`).

### B. Blocarea / Neutralizarea funcției de Hard Delete
Operațiunea distructivă din `hard_delete_store_if_eligible` a fost blocată complet:
- S-a eliminat codul `DELETE FROM public.stores`.
- S-a transformat funcția într-un **stub securizat** care aruncă o excepție controlată:
  `RAISE EXCEPTION 'Hard delete is disabled in this release. Use archive_store for real clients.';`
- Motiv: Riscul imens de ștergere în cascadă a jurnalelor de audit și lipsa unui workflow formal de export. Ștergerea definitivă a fost amânată pentru o etapă viitoare separată (ex. `6F.1.14 Store Hard Delete Export/Tombstone & Final Deletion`).

### C. Adăugarea funcției de anulare a ștergerii
S-a introdus o nouă funcție RPC:
- `cancel_store_deletion_request(p_store_id uuid, p_reason text)` care permite Platform Owner-ului să întoarcă un magazin din starea `pending_deletion` în starea `active` cu un motiv valid și jurnalizare în `audit_logs` sub acțiunea `store.cancel_deletion`. Aceasta previne intrarea într-o stare de blocaj ireversibil.

### D. Securizarea și optimizarea tranzacțională a RPC-urilor
- Toate cele 8 RPC-uri folosesc `SECURITY DEFINER`, setează explicit `SET search_path = public` și își validează argumentele.
- RPC-urile care modifică stare (`suspend_store`, `reactivate_store`, `archive_store`, `request_store_deletion`, `cancel_store_deletion_request`) utilizează `SELECT FOR UPDATE` la nivelul rândului magazinului pentru a preveni accesul concurent destructiv.
- S-a implementat o matrice strictă de tranziții (ex. un magazin `archived` sau `deleted` nu poate fi suspendat direct; un magazin `deleted` nu poate fi reactivat).

### E. Alinierea trigger-ului
Trigger-ul `sync_store_active_with_lifecycle()` rulează cu `SET search_path = public` pentru a evita problemele semnalate de Supabase Advisors și nu are privilegii `SECURITY DEFINER` nejustificate.

