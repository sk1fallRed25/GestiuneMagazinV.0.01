# Commercial Reports SQL Pre-Apply Hardening — Etapa 6C.2.0

## 1. Rezumat
*   **Ce s-a verificat**: S-a verificat prin interogări de test și analiză statică a fișierelor de schemă compatibilitatea directă a codului SQL din blueprint-ul 6C.1 cu tabelele, coloanele, statusurile și funcțiile helper active în baza de date.
*   **Dacă blueprint-ul 6C.1 era aplicabil direct**: Era în mare parte compatibil, însă s-a identificat necesitatea de a converti raportul `get_product_performance_report` dintr-o interogare ce returna o tabelă plată (`RETURNS TABLE`) într-o funcție care returnează `JSONB`, conform cerințelor de consistență în API și specificului utilizării din frontend-ul React. De asemenea, s-au adus optimizări privind utilizarea de aliasuri neambigue în clauzele de join pentru `profiles` (înlocuind aliasul generic `p` pentru a evita posibile conflicte cu alți parametri) și s-a asigurat calificarea completă a tuturor coloanelor.
*   **Status**: **Ready for manual SQL apply**.

---

## 2. Verificări Supabase read-only
Verificarea structurii fizice a bazei de date a fost efectuată cu succes:
*   **Tabele & Coloane confirmed**:
    *   `sales`: `id`, `store_id`, `shift_id`, `profile_id`, `total`, `payment_method`, `status`, `created_at` (toate confirmate).
    *   `sale_items`: `id`, `store_id`, `sale_id`, `product_id`, `batch_id`, `quantity`, `unit_price`, `total_item`, `created_at` (toate confirmate).
    *   `payments`: `id`, `store_id`, `sale_id`, `method`, `amount` (toate confirmate).
    *   `sale_returns`: `id`, `store_id`, `original_sale_id`, `shift_id`, `profile_id`, `type`, `status`, `reason`, `total_refund`, `refund_method`, `created_at` (toate confirmate).
    *   `sale_return_items`: `id`, `store_id`, `return_id`, `original_sale_item_id`, `product_id`, `batch_id`, `quantity`, `unit_price`, `total_item` (toate confirmate).
    *   `pos_shifts`: `id`, `store_id`, `cash_register_id`, `opened_by`, `closed_by`, `status`, `opened_at`, `closed_at`, `opening_cash`, `expected_cash`, `declared_cash`, `cash_difference`, `total_cash`, `total_card`, `transactions_count` (toate confirmate).
    *   `stock_batches`: `id`, `store_id`, `product_id`, `zone`, `quantity`, `purchase_price` (toate confirmate).
    *   `products`: `id`, `store_id`, `name`, `barcode`, `unit`, `status` (toate confirmate).
    *   `product_prices`: `id`, `store_id`, `product_id`, `price_sale`, `price_purchase` (toate confirmate).
    *   `waste_events`: `id`, `store_id`, `profile_id`, `reason`, `description`, `created_at` (toate confirmate).
    *   `waste_items`: `id`, `store_id`, `waste_id`, `product_id`, `batch_id`, `quantity` (toate confirmate).
    *   `stock_movements`: `id`, `store_id`, `product_id`, `batch_id`, `type`, `quantity`, `source_zone`, `target_zone` (toate confirmate).
*   **Statusuri reale confirmed**:
    *   `sales.status` poate fi: `'finalized'`, `'cancelled'`, `'returned'`, `'partially_returned'` și `'voided'`.
    *   `sale_returns.type` poate fi: `'return'`, `'void'`.
    *   `sale_returns.status` poate fi: `'completed'`, `'cancelled'`.
    *   `payments.method` poate fi: `'cash'`, `'card'`.
    *   `pos_shifts.status` poate fi: `'open'`, `'closed'`, `'cancelled'`.
*   **Helper functions confirmed**:
    *   `public.has_store_role(p_store_id UUID, p_allowed_roles TEXT[]) RETURNS BOOLEAN` — este activă, declarată cu `SECURITY DEFINER`.
    *   `public.is_platform_owner() RETURNS BOOLEAN` — este activă, declarată cu `SECURITY DEFINER`.
*   **RPC-uri existente**:
    *   Cele 6 RPC-uri din blueprint-ul 6C.1 **nu** sunt prezente în baza de date (apelurile returnează eroare de schema cache în mod controlat), ceea ce confirmă că baza de date nu conține variante parțiale sau de conflict.

---

## 3. Probleme identificate în 6C.1
1.  **Format Return get_product_performance_report**: În 6C.1 se returna o tabelă plată (`RETURNS TABLE (...)`), ceea ce contravine consistenței de design pentru API-ul din frontend (celelalte 5 rapoarte returnează direct obiecte structurate `JSONB`).
    *   *Soluție*: În 6C.2 funcția a fost reimplementată pentru a returna `JSONB` în formatul `{ "products": [...] }`.
2.  **Calificare/Ambivalențe în Join-uri**: Folosirea aliasului scurt `p` în `JOIN public.profiles p` la interogarea din `get_shift_report` ar fi putut genera erori de shadowing dacă s-ar fi referit accidental parametri cu prefixul `p_`.
    *   *Soluție*: S-a redenumit aliasul în `prof` pentru o claritate deplină.
3.  **Calificări Explicite**: S-a asigurat calificarea completă a tuturor coloanelor în interogările complexe de grup (ex: `s.store_id`, `pay.method` etc.) pentru a elimina complet riscurile de ambiguitate la nivelul motorului de execuție PostgreSQL.

---

## 4. SQL rafinat 6C.2
S-a creat fișierul de implementare:
[proposed_commercial_reports_6c2.sql](file:///c:/Users/stefan/WebstormProjects/GestiuneMagazinV.0.01/database/proposed_commercial_reports_6c2.sql)

Acesta conține cele 6 funcții rafinate:
1.  `get_sales_summary_report(p_store_id uuid, p_date_from date, p_date_to date) returns jsonb`
2.  `get_product_performance_report(p_store_id uuid, p_date_from date, p_date_to date, p_limit int default 20) returns jsonb`
3.  `get_shift_report(p_store_id uuid, p_shift_id uuid) returns jsonb`
4.  `get_daily_cash_report(p_store_id uuid, p_date date) returns jsonb`
5.  `get_inventory_value_report(p_store_id uuid) returns jsonb`
6.  `get_losses_report(p_store_id uuid, p_date_from date, p_date_to date) returns jsonb`

### Diferențe față de 6C.1:
*   Standardizarea completă pe tipul de retur `JSONB` pentru toate funcțiile de raportare.
*   CamelCase consistent al cheilor de ieșire (ex: `quantitySoldGross`, `estimatedCogs`, `marginPercent`).
*   Eliminarea posibilelor shadowing-uri de parametri prin aliasuri distincte.
*   Tratarea cazului special de retur parțial la nivel de performanță produs prin calcularea corectă a `quantitySoldNet = Gross - Returned` și a `netRevenue`.

---

## 5. KPI-uri finale
*   **grossSales**: Vânzările brute contorizate doar din tranzacțiile finalizate/cu retur (`finalized`, `partially_returned`, `returned`).
*   **returnAmount**: Totalul restituit clienților la retur.
*   **netSales**: Vânzările nete reale (`Gross Sales - Return Amount`).
*   **cash/card net**: Sumele nete încasate pe fiecare canal de plată în parte (Brut încasat minus Brut returnat pe același canal).
*   **COGS estimat**: Cantitatea netă vândută înmulțită cu prețul de achiziție al lotului specific (cu fallback pe prețul implicit al produsului).
*   **profit**: Profitul brut de marjă, calculat ca `Net Sales - Estimated COGS`.
*   **stock value**: Valoarea evaluată la preț de achiziție și preț de vânzare a stocului existent (separat Magazin vs Depozit).
*   **losses**: Valoarea evaluată la preț de achiziție a tuturor produselor distruse sau pierdute (`waste_items`).

---

## 6. Securitate
*   Toate procedurile sunt securizate prin clauza `SECURITY DEFINER` pentru a asigura executarea cu drepturi de citire în tabelele protejate de RLS, dar verifică explicit permisiunile utilizatorului în interiorul funcției.
*   S-a fixat explicit `SET search_path = public` pentru a preveni atacurile de deturnare a path-ului de căutare.
*   S-au blocat drepturile de execuție pentru `PUBLIC` și `anon` prin `REVOKE ALL ON FUNCTION ...`, acordându-se acces doar rolului `authenticated`.
*   Roluri reale permise: doar membrii magazinului care au rolul de `'admin'` sau `'manager'` (respectiv `platform_owner` global) pot interoga rapoartele de gestiune globale. Casierii (`'casier'`) pot interoga doar raportul de tură propriu în `get_shift_report`.

---

## 7. Indexuri recomandate
### Existente în baza de date:
*   `idx_sales_store_date` pe `sales(store_id, created_at)`
*   `idx_sale_items_sale_id` pe `sale_items(sale_id)`
*   `idx_products_store_barcode` pe `products(store_id, barcode)`
*   `idx_stock_batches_lookup` pe `stock_batches(store_id, product_id, zone)`
*   `idx_pos_shifts_store_status` pe `pos_shifts(store_id, status)`

### Recomandate pentru performanță (se vor aplica în etapele ulterioare):
1.  `CREATE INDEX IF NOT EXISTS idx_sales_store_status_created_at ON public.sales(store_id, status, created_at);`
    *   *De ce*: Permite filtrarea și sumarea extrem de rapidă în `get_sales_summary_report` unde filtrăm vânzările pe baza statusului și a intervalului.
2.  `CREATE INDEX IF NOT EXISTS idx_payments_sale_id_method ON public.payments(sale_id, method);`
    *   *De ce*: Grăbește determinarea metodelor de plată (cash/card) asociate fiecărui bon tranzacționat.
3.  `CREATE INDEX IF NOT EXISTS idx_sale_returns_reporting ON public.sale_returns(store_id, type, status, created_at);`
    *   *De ce*: Accelerează calculul sumelor returnate sau anulate în intervale de raportare specifice.
4.  `CREATE INDEX IF NOT EXISTS idx_waste_items_waste_id_product ON public.waste_items(waste_id, product_id);`
    *   *De ce*: Optimizează join-ul dintre evenimentul de pierderi și liniile de produs asociate în raportul de pierderi.

---

## 8. Limitări
*   **Estimare Profit (COGS)**: Valoarea profitului depinde integral de calitatea datelor introduse la recepție (`purchase_price` în loturi). În caz de omitere, fallback-ul se face pe prețul implicit al produsului, iar dacă acesta este tot 0, profitul va fi supraevaluat.
*   **Fusul Orar (Timezones)**: Agregările zilnice convertesc `timestamptz` la `DATE` în funcție de fusul orar setat pe baza de date. Frontend-ul trebuie să trimită date calendaristice aliniate la timezone-ul local al magazinului.
*   **Volume foarte mari de date**: Deși interogările sunt optimizate cu indici, scanările secvențiale pentru sumări pe perioade foarte lungi (ex: raport anual) pot deveni lente. Pe viitor se poate lua în calcul o tabelă de agregare zilnică (materialized views).

---

## 9. Pași următori
1.  **Etapa 6C.2.1: Manual SQL Apply & Verification**: Aplicarea scriptului `database/proposed_commercial_reports_6c2.sql` în editorul SQL din Supabase și testarea directă prin apeluri SQL read-only pentru fiecare raport în parte.
2.  **Etapa 6C.3: Frontend Service & Route Integration**: Crearea serviciilor frontend și implementarea noii interfețe de vizualizare a rapoartelor `/rapoarte`.

---

## 10. Decizie
**Status: Ready for manual SQL apply.**
