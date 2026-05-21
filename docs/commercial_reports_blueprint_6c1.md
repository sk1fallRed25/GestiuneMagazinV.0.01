# Commercial Reports Upgrade Blueprint — Etapa 6C.1

## 1. Rezumat
Acest document definește blueprintul de modernizare și corectare a modului în care sunt calculate, agregate și raportate datele comerciale în cadrul aplicației **Gestiune Magazin v2**. 

În urma implementării fluxurilor tranzacționale avansate de vânzare (`finalize_sale`), anulare totală (`void_sale`), retururi parțiale/totale (`return_sale_items`), gestiune a turelor de casieri (`pos_shifts`) și a casărilor de produse (`waste_events`), este imperativ ca rapoartele comerciale și dashboardul să reflecte corect realitatea financiară și stocurile, luând în calcul anulările de sume și intrările/ieșirile aferente retururilor.

## 2. Audit existent
În urma auditării statice a modulelor de raportare și a interfețelor din frontend:
*   **Dashboard (`DashboardPage.tsx` / `dashboardService.ts`)**:
    *   **Calcule brute simpliste**: Vânzările zilei (`todaySalesTotal`) și ale lunii (`monthSalesTotal`) sunt determinate prin însumarea directă a câmpului `total` din tabela `sales` unde statusul este `'finalized'`. Acest mod ignoră complet vânzările care au statusul `'partially_returned'` sau `'returned'`.
    *   **Ignorarea retururilor**: Sumele returnate parțial sau total nu sunt scăzute din veniturile afișate, ducând la o supraestimare a vânzărilor nete reale.
    *   **Ignorarea anulărilor**: Vânzările anulate prin `void_sale` primesc statusul `'voided'`. Acestea sunt excluse corect de la vânzări brute deoarece interogarea filtrează după statusul `'finalized'`, însă nu există un indicator dedicat pentru volumul anulărilor (pentru a măsura incidența erorilor sau a fraudelor la casă).
    *   **Stocuri și Evaluare**: Valoarea stocului este calculată direct prin formula `quantity * purchase_price` la nivel de loturi. Dacă prețul de achiziție al lotului este lipsă, acesta devine 0, ducând la subevaluări ale stocului (nu există fallback pe `product_prices.price_purchase`).
    *   **Pierderi (Waste)**: Se contorizează numărul evenimentelor de pierdere dintr-o lună, dar nu și cantitățile absolute pierdute sau valoarea de achiziție totală pierdută.
*   **Istoric Vânzări (`SalesHistoryTable.tsx` / `salesHistoryService.ts`)**:
    *   Sinteza vânzărilor din istoric (`getSalesSummary`) însumează pur și simplu elementele `total`, `cashPart` și `cardPart` ale tuturor bonurilor afișate, indiferent de statusul bonului (`voided`, `returned`, `partially_returned`), raportând cifre eronate.
*   **Ce lipsește**:
    *   Rapoarte detaliate pe performanța produselor (cantități vândute net, venit net, COGS real și marjă de profit).
    *   Rapoarte complete de tură (Shift Report) care să includă reconcilierea corectă a soldului de casă după operarea de anulări și retururi în cadrul aceleiași ture.
    *   Raport zilnic centralizat de numerar (Daily Cash Report) pentru administrarea încasărilor.
    *   Analiză detaliată a pierderilor valorice și a stocurilor inactive (Dead Stock / Slow Movers).

## 3. Indicatori comerciali
Pentru a oferi o viziune clară asupra performanței comerciale, definim următorii indicatori cheie:
1.  **Gross Sales (Vânzări Brute)**: Totalul tranzacționat inițial către clienți, excluzând tranzacțiile anulate total direct (void/cancelled).
2.  **Void Amount (Valoare Anulată)**: Sumele anulate total la nivel de bon din motive de eroare operator în tura curentă.
3.  **Return Amount (Valoare Returnată)**: Valoarea bunurilor returnate de clienți post-vânzare.
4.  **Net Sales (Vânzări Nete)**: Venitul real generat (Vânzări Brute - Valoare Returnată).
5.  **Cash Gross / Cash Refunds / Net Cash**: Numerarul brut colectat, numerarul rambursat la retur și soldul net de numerar.
6.  **Card Gross / Card Refunds / Net Card**: Plățile electronice brute primite, plățile rambursate la retur pe card și soldul net de card.
7.  **COGS Estimativ (Cost of Goods Sold)**: Costul de achiziție al bunurilor vândute (calculat pe baza prețului de achiziție al lotului din care s-a vândut sau, în lipsa lui, prețul de achiziție implicit al produsului).
8.  **Gross Profit (Profit Brut)**: Venituri nete din vânzări minus COGS estimativ (și minus valoarea pierderilor/casărilor în versiuni avansate).
9.  **Margin Percent (Marja Brută %)**: Raportul procentual dintre Profitul Brut și Vânzările Nete.
10. **Top Products (Performanță Produse)**: Clasamentul produselor ordonate după venitul net sau cantitatea netă vândută (cantitate vândută brut - cantitate returnată).
11. **Stock Value (Valoare Stoc)**: Evaluarea stocurilor curente la preț de achiziție (Magazin + Depozit).
12. **Dead Stock (Candidat Stoc Inactiv)**: Produse care au stoc fizic pozitiv, dar nu au înregistrat nicio vânzare în ultimele 30 de zile.
13. **Waste Cost (Valoare Pierderi)**: Prețul total de achiziție al produselor casate.

## 4. Formule
Formulele matematice de calcul sunt implementate la nivel de interogare pe baza următoarelor reguli:

### A. Gross Sales
$$\text{Gross Sales} = \sum (\text{sales.total}) \quad \text{unde} \quad \text{sales.status} \in \{\text{'finalized'}, \text{'partially\_returned'}, \text{'returned'}\}$$

### B. Void Amount
$$\text{Void Amount} = \sum (\text{sale\_returns.total\_refund}) \quad \text{unde} \quad \text{type} = \text{'void'} \text{ și } \text{status} = \text{'completed'}$$

### C. Return Amount
$$\text{Return Amount} = \sum (\text{sale\_returns.total\_refund}) \quad \text{unde} \quad \text{type} = \text{'return'} \text{ și } \text{status} = \text{'completed'}$$

### D. Net Sales
$$\text{Net Sales} = \text{Gross Sales} - \text{Return Amount}$$
*(Notă: Vânzările cu status `'voided'` sunt deja excluse din Gross Sales).*

### E. Cash Gross
$$\text{Cash Gross} = \sum (\text{payments.amount}) \quad \text{unde} \quad \text{payments.method} = \text{'cash'} \text{ și } \text{sales.status} \in \{\text{'finalized'}, \text{'partially\_returned'}, \text{'returned'}\}$$

### F. Cash Refunds
$$\text{Cash Refunds} = \sum (\text{sale\_returns.total\_refund}) \quad \text{unde} \quad \text{refund\_method} = \text{'cash'}, \text{ type} = \text{'return'} \text{ și } \text{status} = \text{'completed'}$$

### G. Net Cash
$$\text{Net Cash} = \text{Cash Gross} - \text{Cash Refunds}$$

### H. Card Gross
$$\text{Card Gross} = \sum (\text{payments.amount}) \quad \text{unde} \quad \text{payments.method} = \text{'card'} \text{ și } \text{sales.status} \in \{\text{'finalized'}, \text{'partially\_returned'}, \text{'returned'}\}$$

### I. Card Refunds
$$\text{Card Refunds} = \sum (\text{sale\_returns.total\_refund}) \quad \text{unde} \quad \text{refund\_method} = \text{'card'}, \text{ type} = \text{'return'} \text{ și } \text{status} = \text{'completed'}$$

### J. Net Card
$$\text{Net Card} = \text{Card Gross} - \text{Card Refunds}$$

### K. COGS Estimativ per Linie Vânzare (COGS Net)
$$\text{COGS Net} = (\text{sale\_items.quantity} - \text{Returned Quantity}) \times \text{COALESCE}(\text{stock\_batches.purchase\_price}, \text{product\_prices.price\_purchase}, 0)$$

### L. Gross Profit
$$\text{Gross Profit} = \text{Net Sales} - \text{Estimated COGS}$$

### M. Gross Margin %
$$\text{Gross Margin \%} = \left( \frac{\text{Gross Profit}}{\text{Net Sales}} \right) \times 100$$

### N. Quantity Sold Net (per produs)
$$\text{Quantity Sold Net} = \text{Quantity Sold Gross} - \text{Quantity Returned}$$

### O. Waste Value (Valoare Pierderi)
$$\text{Waste Value} = \sum (\text{waste\_items.quantity} \times \text{COALESCE}(\text{stock\_batches.purchase\_price}, \text{product\_prices.price\_purchase}, 0))$$

### P. Stock Value
$$\text{Stock Value} = \sum (\text{stock\_batches.quantity} \times \text{COALESCE}(\text{stock\_batches.purchase\_price}, \text{product\_prices.price\_purchase}, 0))$$

---

## 5. Arhitectură SQL propusă
Toate agregările complexe și calculele de corelare sunt proiectate să fie executate pe serverul de bază de date prin RPC-uri dedicate (Remote Procedure Calls) securizate, evitând calculele client-side predispuse la erori și consumul excesiv de lățime de bandă.

Blueprintul complet a fost creat în fișierul:
[proposed_commercial_reports_6c1.sql](file:///c:/Users/stefan/WebstormProjects/GestiuneMagazinV.0.01/database/proposed_commercial_reports_6c1.sql)

Acesta conține procedurile:
1.  `public.get_sales_summary_report(p_store_id uuid, p_date_from date, p_date_to date) returns jsonb`
2.  `public.get_product_performance_report(p_store_id uuid, p_date_from date, p_date_to date, p_limit int)`
3.  `public.get_shift_report(p_store_id uuid, p_shift_id uuid) returns jsonb`
4.  `public.get_daily_cash_report(p_store_id uuid, p_date date) returns jsonb`
5.  `public.get_inventory_value_report(p_store_id uuid) returns jsonb`
6.  `public.get_losses_report(p_store_id uuid, p_date_from date, p_date_to date) returns jsonb`

---

## 6. Decizie RPC vs View
Pentru implementarea rapoartelor comerciale în **Gestiune Magazin v2**, s-a optat în mod exclusiv pentru **RPC-uri (Remote Procedure Calls)** în detrimentul **View-urilor SQL**, din următoarele motive:

1.  **Parametrizare Flexibilă**: Rapoartele comerciale depind critic de filtre dinamice (ex: `store_id`, `date_from`, `date_to`, `limit`). View-urile nu acceptă parametri de intrare direct, forțând filtrarea în clauza `WHERE` la nivel de client, ceea ce îngreunează optimizarea planului de execuție în Postgres.
2.  **Securitate Auditabilă (Row Level Security & Roles)**: RPC-urile permit verificarea explicită și centralizată a permisiunilor (ex: apelul `has_store_role` pentru `admin` sau `manager`) în corpul funcției, înainte de execuție. Acest lucru previne scurgerile de date accidentale și izolează strict datele chiriașilor (multi-tenant isolation).
3.  **Optimizare Performanță**: Utilizarea de structuri interne (ex: CTE-uri pre-agregate pe bază de indici ca `idx_sales_store_date`) în interiorul unei proceduri stocate permite planificatorului SQL să execute interogările optimizat.
4.  **Format Compact pentru UI**: RPC-urile pot asambla direct rezultate complexe sub formă de obiecte structurate `JSONB` (ex: `get_sales_summary_report`), reducând numărul de request-uri HTTP efectuate de client de la 5-10 la o singură interogare atomică.

---

## 7. UI viitor
Deși în această etapă **nu se modifică UI-ul existent**, arhitectura propusă pregătește terenul pentru următoarele integrări vizuale:

### A. Dashboard Upgrade
*   Înlocuirea indicatorilor simpli de vânzări cu carduri bazate pe KPI-urile nete (`Net Sales`, `Net Cash`, `Net Card`).
*   Adăugarea a două carduri de control: "Total Retururi (Azi)" și "Total Anulări (Azi)".
*   Graficul de evoluție a vânzărilor zilnice va afișa atât Vânzările Brute, cât și Vânzările Nete pe axe suprapuse.

### B. Pagina Nouă: Rapoarte Comerciale (`/rapoarte`)
*   Interfață tabbed:
    1.  **Vânzări**: Grafice și sinteze conform `get_sales_summary_report`.
    2.  **Produse**: Tabel cu performanțele, sortabil după profit sau cantitate, bazat pe `get_product_performance_report`.
    3.  **Ture**: Listă istorică a turelor (`get_daily_cash_report`), cu posibilitate de detaliere pe o tură specifică (`get_shift_report`).
    4.  **Stocuri**: Structura valorică a inventarului (`get_inventory_value_report`) și lista produselor inerte (Dead Stock) recomandate pentru campanii promoționale.
    5.  **Pierderi**: Sumarizarea pierderilor (`get_losses_report`) sortate după motiv (deșeuri, expirate, furturi etc.).

---

## 8. Securitate
*   **Restricționare Acces**: Toate funcțiile sunt marcate cu `REVOKE ALL ON FUNCTION ... FROM PUBLIC` și `anon`. Accesul este permis exclusiv utilizatorilor autentificați (`TO authenticated`).
*   **Roluri permise**: 
    *   Pentru rapoarte globale ale magazinului (vânzări, stocuri, profit): doar rolurile `admin`, `manager` și `platform_owner` (super-admin global).
    *   Pentru raportul de tură (`get_shift_report`): titularul de drept al turei (casierul asociat) poate vizualiza exclusiv propriul raport de tură. Administratorii și managerii pot vizualiza rapoartele oricărei ture din magazinul pe care îl gestionează.
*   **Context Securizat**: Funcțiile rulează sub contextul `SECURITY DEFINER` cu `search_path` fixat la `public` pentru a evita atacurile de tip search-path hijacking și pentru a permite interogarea tabelelor securizate prin RLS pe baza rolului intern verificat programatic.

---

## 9. Riscuri și limitări
1.  **Aproximarea Profitului (Estimated COGS)**: Dacă produsele din stoc sunt vândute fără ca lotul asociat să aibă definit un `purchase_price` în `stock_batches` (și prețul implicit din `product_prices.price_purchase` este lăsat pe 0), profitul net calculat va fi egal cu prețul de vânzare (marjă 100%). Aceasta este o limitare de date operaționale ce poate fi atenuată prin obligativitatea introducerii prețului de achiziție la recepție.
2.  **Date de Test în Producție**: Înainte de lansarea în producție (pilot), trebuie rulate scripturi de curățare a tranzacțiilor fictive de test pentru a nu polua statisticile oficiale.
3.  **Fusul Orar (Timezone-uri)**: Rapoartele folosesc conversia din `date` în `timestamptz`. Este critic ca interogările din frontend să trimită datele calendaristice raportate la fusul orar al magazinului, altfel tranzacțiile de la miezul nopții pot oscila între zile diferite.
4.  **Performanța la Volume Mari**: Agregarea la nivel de linii de bon (`sale_items` / `sale_return_items`) poate deveni lentă pe parcursul a sute de mii de tranzacții. În viitor, va fi necesară crearea de tabele de agregare zilnică (materialized views sau joburi cron de consolidare pe ore/zile).

---

## 10. Plan 6C.2
Următoarea etapă va cuprinde:
1.  **Etapa 6C.2: Commercial Reports SQL Implementation / Pre-Apply**:
    *   Aplicarea controlată a blueprintului SQL în baza de date Supabase de dezvoltare.
    *   Verificarea funcțională a RPC-urilor prin execuții manuale de test cu diverse date de tranzacție (finalizate, anulate, returnate).
2.  **Etapa 6C.3: Frontend Integration**:
    *   Crearea serviciului `commercialReportsService.ts` în frontend.
    *   Implementarea ecranului de raportare `/rapoarte` și a tab-urilor.
3.  **Etapa 6C.4: E2E Verification**:
    *   Scrierea unui set de teste Playwright care să valideze că datele afișate în rapoarte corespund matematic cu scenariile tranzacționale rulate.

---

## 11. Decizie
> [!NOTE]
> Proiectarea arhitecturală este finalizată. Structura este pregătită pentru implementarea SQL (Etapa 6C.2).
> **Status: Ready for 6C.2 Commercial Reports SQL Implementation.**
