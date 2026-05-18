# Shift Management Blueprint — Etapa 6A.1

## 1. Rezumat
Gestiunea Turelor de Casieri (Shift Management) reprezintă piatra de temelie a securității și reconcilierii financiare în cadrul platformei **Gestiune Magazin v2**. Etapa de audit operațional 6A.0 a identificat acest modul ca fiind o prioritate absolută **P0 (Blocaj Critic)** înaintea lansării pilotului într-un magazin fizic real.

**Scopul principal**: Asigurarea trasabilității complete a fiecărui leu intrat sau ieșit din sertarul de bani (sertarul POS fizic) prin asocierea strictă a oricărei tranzacții de vânzare la o tură activă, deschisă cu un sold inițial clar și închisă prin declararea încasărilor faptice de către casier.

**Ce se implementează acum vs. ulterior**:
* **În această etapă (6A.1)**: Se definește arhitectura completă (blueprint-ul tehnic și SQL) pentru tabelele `cash_registers`, `pos_shifts`, adaptarea relațională a tabelei `sales` și procedurile stocate atomice (`open_pos_shift`, `get_active_pos_shift`, `close_pos_shift`, `cancel_pos_shift`). Nu se aplică nicio modificare pe baza de date de producție și nu se creează interfață grafică.
* **În etapa următoare (6A.2)**: Se va executa aplicarea blueprint-ului SQL pe Supabase, se va crea interfața grafică (modal deschidere/închidere tură, raport tură, blocare POS) și se va integra validarea turei în fluxul POS existent.

---

## 2. Audit Existent
În urma analizei statice a codului sursă și a structurii bazei de date actuale, s-au constatat următoarele:
1. **Suportul în `posService.ts`**: Serviciul de frontend POS (`src/features/pos/services/posService.ts`) este deja pregătit arhitectural să primească un parametru `shiftId` în cadrul obiectului `CreateSalePayload`. La apelarea RPC-ului `finalize_sale`, acesta transmite parametrul `p_shift_id: shiftId || null`.
2. **Suportul în RPC-ul `finalize_sale`**: Procedura stocată `public.finalize_sale` acceptă deja parametrul `p_shift_id UUID DEFAULT NULL` și execută inserarea directă în antetul bonului: `INSERT INTO public.sales (..., shift_id, ...) VALUES (..., p_shift_id, ...)`.
3. **Structura bazei de date (Legacy `cashier_shifts`)**: Tabela `public.sales` conține o cheie externă `shift_id UUID REFERENCES public.cashier_shifts(id)`. Există o tabelă legacy `public.cashier_shifts` (cu coloanele `id`, `store_id`, `profile_id`, `device_id`, `start_time`, `end_time`, `opening_balance`, `closing_balance`, `status`), dar aceasta nu este susținută de proceduri stocate de calcul tranzacțional și nu este integrată în UI-ul aplicației React.
4. **Lipsuri Actuale (Gap-uri)**:
   * Casierii pot vinde în POS fără a avea o tură activă deschisă (deoarece `p_shift_id` este opțional/nullable).
   * Nu există o noțiune clară de Casă de Marcat / Sertar fizic (`cash_registers`) de care să fie legată tura.
   * Nu există proceduri stocate sigure care să calculeze automat diferențele de casă (așteptat vs. declarat) pe baza metodelor de plată defalcate din tabela `payments`.

---

## 3. Model de Date Propus
Pentru a rezolva deficiențele structurii legacy și a asigura suportul pentru mai multe case de marcat per magazin, se propune următorul model de date în `database/proposed_shift_management_6a1.sql`:

### A. `cash_registers` (Case de Marcat / Sertare Fizice)
Reprezintă punctul de lucru fizic unde se încasează numerarul. Un magazin (`store_id`) poate avea una sau mai multe case de marcat.
* `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `store_id`: UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE
* `name`: TEXT NOT NULL (ex. "Casa 1 - Parter", "Casa 2 - Etaj")
* `code`: TEXT NULLABLE (ex. "POS-01")
* `active`: BOOLEAN DEFAULT true
* `created_at`, `updated_at`: TIMESTAMPTZ

### B. `pos_shifts` (Turele de Casieri)
Înlocuiește tabela legacy `cashier_shifts`, adăugând trasabilitate completă a agregărilor financiare și a diferențelor de casă.
* `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `store_id`: UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE
* `cash_register_id`: UUID REFERENCES cash_registers(id)
* `opened_by`: UUID NOT NULL REFERENCES profiles(id)
* `closed_by`: UUID REFERENCES profiles(id)
* `status`: TEXT NOT NULL CHECK (status IN ('open', 'closed', 'cancelled'))
* `opened_at`: TIMESTAMPTZ DEFAULT NOW()
* `closed_at`: TIMESTAMPTZ NULLABLE
* `opening_cash`: DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0) (Numerar inițial în sertar)
* `expected_cash`: DECIMAL(12,2) NULLABLE (Calculat la închidere: `opening_cash + total_cash`)
* `declared_cash`: DECIMAL(12,2) NULLABLE CHECK (declared_cash >= 0) (Numerar faptic numărat de casier)
* `cash_difference`: DECIMAL(12,2) NULLABLE (`declared_cash - expected_cash`)
* `total_sales`: DECIMAL(12,2) NOT NULL DEFAULT 0 (Total rulaj bonuri)
* `total_cash`: DECIMAL(12,2) NOT NULL DEFAULT 0 (Total plăți numerar din `payments`)
* `total_card`: DECIMAL(12,2) NOT NULL DEFAULT 0 (Total plăți card din `payments`)
* `total_mixed`: DECIMAL(12,2) NOT NULL DEFAULT 0 (Total bonuri cu plată mixtă)
* `transactions_count`: INTEGER NOT NULL DEFAULT 0 (Număr bonuri emise)
* `notes`, `closing_notes`: TEXT NULLABLE
* `created_at`, `updated_at`: TIMESTAMPTZ

### C. Constrângeri de Integritate (Indexuri Parțiale Unice)
1. `idx_pos_shifts_unique_user_open`: `(store_id, opened_by) WHERE status = 'open'`. Garantează că un utilizator nu poate avea două ture deschise simultan în același magazin.
2. `idx_pos_shifts_unique_register_open`: `(cash_register_id) WHERE status = 'open'`. Garantează că o casă de marcat nu poate fi operată de doi casieri în același timp.

### D. Adaptare `sales.shift_id`
În Etapa 6A.2, se va executa migrarea cheii externe din `sales` pentru a puncta către noua tabelă:
```sql
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_shift_id_fkey,
ADD CONSTRAINT sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.pos_shifts(id);
```

---

## 4. RPC-uri Propuse
Toate calculele financiare și tranzițiile de stare se vor realiza exclusiv prin proceduri stocate atomice `SECURITY DEFINER`, blocând orice manipulare directă din frontend.

### A. `open_pos_shift`
* **Parametri**: `p_store_id`, `p_profile_id`, `p_cash_register_id`, `p_opening_cash`, `p_notes`
* **Validări**: Verifică rolul utilizatorului (`admin`, `manager`, `casier`), starea magazinului (`active`), apartenența și starea casei de marcat, validitatea sumei (`>= 0`) și unicitatea turei (fără altă tură deschisă pe user sau casă).
* **Efect**: Inserare în `pos_shifts` cu status `open`. Returnează `shift_id`.

### B. `get_active_pos_shift`
* **Parametri**: `p_store_id`, `p_profile_id`
* **Efect**: Caută tura activă (`status = 'open'`) a utilizatorului. Dacă există, calculează în timp real totalurile curente (`total_sales`, `total_cash`, `total_card`, `total_mixed`, `expected_cash`, `transactions_count`) interogând tabelele `sales` și `payments`. Returnează un obiect JSON detaliat.

### C. `close_pos_shift`
* **Parametri**: `p_store_id`, `p_profile_id`, `p_shift_id`, `p_declared_cash`, `p_closing_notes`
* **Validări**: Blochează rândul turei cu `FOR UPDATE` (prevenind race conditions). Verifică apartenența la magazin, statusul (`open`) și permisiunea (titularul turei sau un `admin`/`manager`).
* **Calcul Atomic**: 
  * `total_cash` = Suma plăților cu `method = 'cash'` asociate bonurilor finalizate din tură.
  * `total_card` = Suma plăților cu `method = 'card'`.
  * `expected_cash` = `opening_cash + total_cash`.
  * `cash_difference` = `declared_cash - expected_cash`.
* **Efect**: Actualizează tura la `status = 'closed'`, completând toate coloanele de agregare și diferență. Returnează un JSON de sinteză.

### D. `cancel_pos_shift` (Opțional)
* **Parametri**: `p_store_id`, `p_profile_id`, `p_shift_id`, `p_notes`
* **Validări**: Permisă doar dacă tura nu are nicio tranzacție de vânzare finalizată în `sales`.
* **Efect**: Trece tura în starea `cancelled`.

---

## 5. Integrare POS
Modificările necesare în Etapa 6A.2 asupra fluxului POS existent:
1. **Obligativitatea `shift_id` în UI**: Interfața POS nu va permite adăugarea de produse în coș sau apăsarea butonului de încasare dacă hook-ul `usePos.ts` nu are în state un `shiftId` valid.
2. **Validare în `finalize_sale`**: RPC-ul `finalize_sale` va fi modificat pentru a face din `p_shift_id` un parametru obligatoriu. Va verifica explicit ca tura să existe, să aibă `status = 'open'`, să aparțină magazinului curent și să fie deschisă de utilizatorul curent.

---

## 6. UX Propus
Interfața grafică ce va fi dezvoltată în Etapa 6A.2 va conține următoarele stări și componente:

### A. POS Fără Tură Activă (Ecran Blocat)
* **Vizual**: Overlay de tip glassmorphism peste întreg ecranul POS, dezactivând grila de produse și coșul.
* **Mesaj**: *"Nu ai o tură deschisă. Deschide tura pentru a putea vinde."*
* **Acțiune**: Buton principal *"Deschide Tură"*.

### B. Modal Deschidere Tură
* **Formular**: Selectoare pentru Casa de Marcat (din lista de case active ale magazinului), input numeric pentru *Numerar Inițial în Sertar* (implicit 0) și câmp opțional de note.

### C. POS Cu Tură Activă
* **Vizual**: În bara superioară a POS-ului apare un badge verde de stare: *"Tură Deschisă: Casa 1"*, alături de soldul inițial și butonul *"Închide Tură"*.

### D. Modal Închidere Tură (Reconciliere)
* **Afișare (Read-Only)**: Total Vânzări, Total Încasări Card, Total Încasări Numerar (din bonuri) și *Numerar Așteptat în Sertar* (Inițial + Încasări Cash).
* **Input Obligatoriu**: *Numerar Faptic Declarat* (sumă numărată fizic de casier).
* **Calcul Dinamic**: Diferență de casă (Afișată cu verde dacă este 0, cu roșu dacă este negativă/lipsă și cu galben dacă este pozitivă/plus de casă).
* **Acțiune**: Buton *"Confirmă Închiderea Turei"*.

### E. Raport Tură (Z-Report / Sinteză)
* **Vizualizare**: Document printabil sau afișabil în UI cu detalii complete despre casier, interval orar, număr tranzacții, defalcare metode plată, diferență de casă și lista bonurilor emise.

---

## 7. Reguli Business
1. **Roluri Permise**: Turele pot fi deschise de utilizatorii cu rol de `casier`, `manager` sau `admin`. Rolul de `gestionar` nu are acces în POS decât dacă i se alocă explicit și rolul de casier.
2. **Izolare per Magazin**: O tură este strict legată de un `store_id`. Dacă un utilizator lucrează la două puncte de lucru, comutarea magazinului din *Store Context Switcher* va încărca automat tura activă corespunzătoare magazinului selectat.
3. **Persistență la Logout**: Dacă un casier se deloghează accidental sau închide browserul, tura rămâne `open` în baza de date. La reautentificare, POS-ul va detecta automat tura deschisă prin apelul `get_active_pos_shift`.
4. **Ture Uitate Deschise (Overnight)**: Dacă la deschiderea POS-ului se detectează o tură deschisă din ziua anterioară, sistemul va afișa o alertă critică, blocând noi vânzări până când tura veche este închisă oficial.
5. **Plăți Mixte**: În cazul bonurilor cu plată mixtă (ex. 100 RON total = 30 RON cash + 70 RON card), tabela `payments` înregistrează două rânduri distincte. Procedura de închidere tură va prelua exact suma de 30 RON în calculul `expected_cash`, garantând o precizie matematică perfectă.

---

## 8. Securitate & RLS
* **Execuție Securizată**: Toate cele 4 RPC-uri sunt definite cu `SECURITY DEFINER` și `SET search_path = public`, asigurând că operațiunile de modificare a turelor ocolesc limitările RLS doar în interiorul tranzacției validate, prevenind injectările SQL sau escaladarea de privilegii.
* **Blocare Public / Anon**: Se aplică `REVOKE EXECUTE FROM PUBLIC; REVOKE EXECUTE FROM anon; GRANT EXECUTE TO authenticated;`.
* **Izolare RLS pe Tabele**: Politicile RLS de pe `cash_registers` și `pos_shifts` asigură că utilizatorii pot vedea și interacționa doar cu turele și casele magazinului în care sunt alocați (`current_user_store_ids()`).

---

## 9. Riscuri & Mitigări
1. **Risc: Ture uitate deschise la final de zi.**
   * *Mitigare*: Alerta de tură veche la deschiderea POS-ului în ziua următoare și posibilitatea ca un `manager` sau `admin` să închidă tura casierului din Owner Console / Dashboard.
2. **Risc: Diferențe mari de numerar nejustificate.**
   * *Mitigare*: Câmpul `cash_difference` stochează valoarea exactă, iar orice diferență (pozitivă sau negativă) va genera automat o intrare de audit sau va necesita o notă explicativă obligatorie (`closing_notes`).
3. **Risc: Retrocompatibilitatea vânzărilor vechi fără `shift_id`.**
   * *Mitigare*: Tabela `sales` permite temporar ca `shift_id` să fie nullable pentru a nu corupe istoricul existent. Doar din Etapa 6A.2 înainte, aplicația va forța prezența `shift_id` la tranzacțiile noi.

---

## 10. Plan 6A.2 (Implementare Efectivă)
Pentru etapa următoare, pașii exacți de execuție sunt:
1. **Aplicare SQL**: Rularea manuală în Supabase SQL Editor a scriptului `database/proposed_shift_management_6a1.sql`.
2. **Scaffolding UI**: Crearea componentelor React în `src/features/pos/components/`: `ShiftOpenModal.tsx`, `ShiftCloseModal.tsx`, `ShiftActiveBadge.tsx`, `PosLockScreen.tsx`.
3. **Integrare Service & Hook**: Extinderea `posService.ts` cu metodele de apelare pentru cele 4 RPC-uri de ture și actualizarea `usePos.ts` pentru a gestiona starea turei active.
4. **Hardening `finalize_sale`**: Modificarea RPC-ului `finalize_sale` pentru a impune `p_shift_id` obligatoriu.
5. **Testare E2E**: Crearea unui script Playwright (`test_shift_management_6a2.py`) pentru validarea completă a fluxului de tură.

---

## 11. Decizie
Blueprint-ul tehnic și propunerea arhitecturală SQL au fost auditate și acoperă toate cerințele de business, securitate și integritate tranzacțională.

**Stare**: **Ready for 6A.2 Shift Management Implementation**.
