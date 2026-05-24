# Sales History VAT Display Blueprint — Etapa 6D.5.3

Acest document descrie blueprint-ul tehnic și rezultatele auditului pentru implementarea snapshot-ului fiscal și a afișării cotelor TVA în istoricul vânzărilor.

---

## 1. Rezumat
*   **Problema actuală**: În acest moment, interfața de detalii a bonului (`SaleDetailsModal.tsx`) și istoricul tranzacțiilor afișează doar date comerciale brute (cantitate, preț unitar, total, plăți), dar nu oferă vizibilitate asupra cotelor și valorilor de TVA. Totodată, modelul de date actual nu stochează cota sau valoarea TVA în mod static pe fiecare linie din `sale_items`, forțând interfața să facă o interogare dinamică (lookup) în configurația curentă a produsului, ceea ce este greșit din punct de vedere fiscal.
*   **Ce vrem să afișăm**: Vrem ca la fiecare poziție din bon să fie vizibilă grupa TVA asociată și cota procentuală (ex: `TVA A · 21%`), iar la finalul bonului să avem un tabel de centralizare cu baza fără TVA, valoarea TVA și totalul general defalcat pe fiecare grupă de TVA.
*   **De ce este nevoie de snapshot fiscal**: Cota TVA a unui produs se poate modifica în timp (de exemplu, modificări legislative sau reîncadrări de produse). Un bon emis în trecut trebuie să reflecte cota de TVA din momentul vânzării, nu cota curentă configurată în catalogul de produse. Snapshot-ul în `sale_items` garantează această imunitate fiscală istorică.

---

## 2. Audit DB
Am auditat tabelele relevante în baza de date cu următoarele observații:
*   **`sales`**: Conține antetul tranzacției, inclusiv `total`, `status` ('finalized'), `created_at`, `store_id`, `shift_id` și `profile_id`.
*   **`sale_items`**: Reprezintă rândurile bonului. **În prezent, nu conține nicio coloană de taxare/TVA**:
    *   Lipsesc complet: `vat_group`, `vat_rate`, `vat_percent`, `tax_group`, `tax_rate`, `vat_amount`, `price_without_vat`, `price_includes_vat`, `total_without_vat`, `total_vat`.
*   **`product_prices`**: Conține `vat_group` și `vat_percent` actuale pentru fiecare produs asociat unui magazin. Acestea reprezintă exclusiv starea actuală și sunt dinamice.
*   **`products`**: Nomenclatorul de produse.
*   **`payments`**: Conține plățile efectuate pentru fiecare bon.
*   **`sale_returns` & `sale_return_items`**: Tabele folosite la procesarea retururilor. Legătura din `sale_return_items` se face direct cu `sale_items` original.
*   **`stock_batches`**: Loturile de stoc folosite pentru urmărirea stocurilor.

**Concluzie audit DB**: Istoricul bonurilor **nu poate** afișa TVA-ul corect pe termen lung fără modificarea bazei de date. Utilizarea unui snapshot fiscal în `sale_items` este **strict necesară**.

---

## 3. Audit `finalize_sale`
Am inspectat definiția stored procedure-ului `public.finalize_sale` (din `database/proposed_shift_management_6a2.sql`):
*   **Cum inserează în `sale_items`**: Inserează în bucla FEFO peste `stock_batches` folosind date luate exclusiv din tabela `product_prices` (doar unit_price).
*   **Ce date primește în `p_items`**: O listă JSONB cu `product_id` și `quantity`. Nu conține date financiare sau cote TVA din frontend (asigurând securitate împotriva manipulării prețurilor).
*   **Dacă citește `product_prices`**: Da, interoghează `price_sale` pe baza `store_id` și `product_id`.
*   **Dacă poate citi `product_prices.vat_group`**: Da, poate citi cu ușurință în același query.
*   **Dacă inserează deja `vat_percent`**: Nu, în prezent ignoră cotele de TVA.
*   **Dacă are acces la `store_id`**: Da, prin parametrul `p_store_id`.
*   **Dacă prețurile sunt considerate cu TVA inclus**: Da, prețul din `product_prices.price_sale` include TVA (inclusive), specific comerțului cu amănuntul (retail POS) din România.
*   **Dacă există deja folosirea `price_tax_policy`**: Nu, nu este referită în corpul actual al RPC-ului.
*   **Cum tratează plățile**: Suma plăților este validată cu suma bonului, se inserează în `payments` și se marchează `payment_method = 'mixed'` dacă sunt plăți multiple.
*   **Cum tratează `shift_id`**: Validează că tura este deschisă de casierul curent pe magazinul dat.

**Concluzie audit RPC**:
- Trebuie adăugate ca snapshot: `vat_group`, `vat_rate`, `vat_amount`, `price_without_vat`, `total_without_vat`, `price_includes_vat`.
- TVA-ul trebuie calculat pe server în interiorul RPC-ului (pentru fiecare sub-linie de batch inserată în `sale_items`).
- Se poate face fără a afecta atomicitatea tranzacției, deoarece interogarea setărilor magazinului și calculul matematic sunt extrem de rapide și nu blochează resurse suplimentare.
- **Riscuri**: Pentru vânzările existente, noile coloane vor fi `NULL`, ceea ce necesită tratament special de fallback în UI și la procesarea retururilor.

---

## 4. Audit Sales History UI
Am auditat componentele din `src/features/sales-history`:
*   **Cum se citește bonul**: Prin serviciul `salesHistoryService.getSaleDetails(storeId, saleId)`, care interoghează detaliile din `sales`, `sale_items` și `payments`.
*   **Query-urile din spate**: `sale_items` este unit prin `JOIN` cu tabela `products` pentru a afișa titlul produsului și cu `stock_batches` pentru lot.
*   **Dacă `vat_group` sau `vat_percent` există în tipuri**: Nu sunt definite în tipurile TS din `types.ts`.
*   **Unde se adaugă badge-ul în UI**: În `SaleDetailsModal.tsx`, în tabelul cu linii de bon, imediat sub numele produsului sau lângă coloana de preț.
*   **Unde se adaugă sumarul de TVA**: În interiorul modalului de detalii, deasupra zonei cu totalul de plată și metodele de plată, ca o secțiune compactă dedicată.
*   **Retururile și anulările**: Modalul de retur citește istoricul detaliilor. Dacă există un snapshot de TVA pe linie de bon, returul va ști cu exactitate valoarea taxelor colectate inițial, fără a fi afectat de schimbările ulterioare de TVA ale produsului.

---

## 5. Decizie arhitecturală
Am ales varianta **Column-Level Snapshot în `sale_items`**.
*   **Proprietăți**:
    *   `vat_group text`
    *   `vat_rate numeric(5,2)`
    *   `vat_amount numeric(12,2)`
    *   `price_without_vat numeric(12,2)`
    *   `total_without_vat numeric(12,2)`
    *   `price_includes_vat boolean`
*   **Motiv**: Asigură conformitatea fiscală istorică, sprijină retururile exacte și permite raportări statistice corecte în timp real, eliminând riscul alterării istoricului de tranzacții.
*   **Fallback pentru bonuri vechi**: Dacă snapshot-ul lipsește (`NULL`), UI-ul va prelua cota curentă din `product_prices.vat_group` și va afișa un badge discret de „TVA estimat din configurația curentă”.

---

## 6. Blueprint SQL
Codul complet se regăsește în:
*   [proposed_sales_history_vat_snapshot_6d53.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/proposed_sales_history_vat_snapshot_6d53.sql)

### Elemente Blueprint:
1.  **Modificări structură tabel**: `ALTER TABLE public.sale_items` pentru adăugarea coloanelor.
2.  **Constraint idempotent**: `CHECK (vat_group IN ('A','B','C','D','E') OR vat_group IS NULL)` (permite NULL pentru compatibilitate retroactivă).
3.  **Funcție helper `public.get_vat_rate_for_group(p_vat_group text)`**: Returnează cota numerică pe baza codului grupei (A=21, B=11, C=11, D=0, E=0) și aruncă excepție pentru input invalid.
4.  **Funcție helper `public.calculate_vat_breakdown`**: Calculează bazele nete și sumele TVA atât pentru prețuri cu TVA inclus, cât și fără TVA inclus, oferind un rezultat JSONB centralizat.
5.  **Patch pentru `finalize_sale`**: Actualizează procedura stocată pentru a citi taxa, a genera breakdown-ul și a insera valorile de snapshot pe fiecare linie din `sale_items`.
6.  **Script de Backfill (comentat)**: Permite actualizarea tranzacțiilor vechi utilizând datele curente ca cea mai bună aproximare.

---

## 7. Blueprint Frontend
Propunerile de implementare pentru etapa următoare:

### A. Tipuri TypeScript (`src/features/sales-history/types.ts`)
Adăugarea pe interfața `SaleItemDetails` (sau echivalentul ei):
```typescript
export interface SaleItemDetails {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalItem: number;
  batchNumber?: string;
  // Snapshot fiscal fields
  vatGroup?: string | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  priceWithoutVat?: number | null;
  totalWithoutVat?: number | null;
  priceIncludesVat?: boolean | null;
  vatIsFallback?: boolean;
}
```

### B. Servicii (`src/features/sales-history/services/salesHistoryService.ts`)
În `getSaleDetails`, se vor citi suplimentar noile coloane din `sale_items`.
*   **Fallback**:
    ```typescript
    const vatGroup = dbItem.vat_group ?? dbItem.products?.product_prices?.[0]?.vat_group ?? 'A';
    const vatRate = dbItem.vat_rate !== null ? Number(dbItem.vat_rate) : resolveVatRateFromGroup(vatGroup);
    const vatIsFallback = dbItem.vat_group === null;
    ```

### C. UI - `SaleDetailsModal.tsx`
*   În tabelul de produse:
    *   Se adaugă o mică etichetă sub numele produsului: `TVA ${item.vatGroup} (${item.vatRate}%)`
    *   Dacă `item.vatIsFallback = true`, se afișează o iconiță discretă (i) cu tooltip sau text: `* TVA estimat`.
*   În secțiunea de totaluri, se adaugă un centralizator TVA:
    ```tsx
    <div className="border-t pt-2 mt-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sumar TVA</h4>
      {/* Centralizare pe grupe de TVA */}
    </div>
    ```

---

## 8. Retururi și anulări
*   **`void_sale`**: Nu este afectat direct, dar starea de anulare trebuie să respecte valorile din snapshot.
*   **`return_sale_items`**: RPC-ul care gestionează retururile trebuie să citească `vat_group` și `vat_rate` originale direct din `sale_items` asociat, fără a interoga `product_prices`.
*   **Rapoarte**: Raportul de vânzări și retururi va scădea taxele pe aceeași grupă și rată din momentul vânzării, asigurând reconcilierea corectă a registrelor fiscale.
*   **Patch viitor**: La implementarea retururilor cu snapshot, RPC-urile vor fi actualizate pentru a folosi noile coloane.

---

## 9. Reguli fiscale
*   **Cote TVA utilizate**:
    *   `A` = 21% (Standard)
    *   `B` = 11% (Redus)
    *   `C` = 11% (Redus)
    *   `D` = 0% (Scutit cu drept de deducere)
    *   `E` = 0% / Neplătitor TVA
*   **Puncte de lucru**: Magazinele neplătitoare de TVA vor avea toate tranzacțiile forțate pe grupa `E` (0%).
*   **Metoda de calcul**: Implicit `inclusive` (TVA inclus în prețul de catalog).

---

## 10. Riscuri și limitări
*   **Înregistrări Legacy**: Vânzările istorice nu vor avea aceste date. Soluția de fallback previne crash-urile, dar rapoartele pe perioada respectivă vor fi estimative.
*   **Rotunjiri**: Pot apărea diferențe de $\pm 0.01$ LEI între suma TVA calculată pe fiecare linie și suma calculată global pe total bon. Se va folosi rotunjirea per linie pentru a asigura trasabilitatea perfectă a fiecărui articol.
*   **Fiscal Bridge**: Modulul de legătură cu casa de marcat va prelua direct valorile din snapshot, reducând la zero erorile de comunicare.

---

## 11. Pași următori
1.  **Etapa 6D.5.4 (Sales VAT Snapshot SQL Apply Verification)**: Aplicarea scriptului SQL și validarea structurii în baza de date.
2.  **Etapa 6D.5.5 (Sales History VAT Frontend Integration)**: Integrarea tipurilor, serviciilor și modalului de detalii cu suport pentru breakdown-ul TVA și centralizare în interfață.
3.  **Etapa 6D.5.6 (Sales History VAT E2E Test)**: Crearea testului de validare E2E Playwright pentru afișarea corectă a TVA-ului.

---

## 12. Decizie
**Ready for 6D.5.4 SQL Apply Verification**

---

## 13. Corecție 6D.5.3.1 — Pre-Apply Hardening

Înainte de aplicarea manuală a SQL-ului, blueprint-ul a fost întărit prin:

### Helper `get_vat_rate_for_group`
- Input normalizat cu `upper(trim(p_vat_group))` — tolerant la spații/minuscule
- Input `NULL` sau gol ridică `RAISE EXCEPTION` explicit (nu cade în ELSE ambiguu)
- `SET search_path = public` adăugat (securizare)
- `REVOKE EXECUTE FROM PUBLIC/anon/authenticated` — helper intern, neexpus frontend

### Helper `calculate_vat_breakdown`
- Validare `p_total IS NULL` → `RAISE EXCEPTION`
- Validare `p_total < 0` → `RAISE EXCEPTION`
- Normalizare `p_price_includes_vat IS NULL → true`
- `vat_amount` rotunjit explicit: `ROUND(p_total - v_base, 2)` (evită double-rounding)
- `SET search_path = public` adăugat
- `REVOKE EXECUTE FROM PUBLIC/anon/authenticated`

### Corecție `price_without_vat` în patch `finalize_sale`
- **Bug fix:** calculul era mereu `unit_price / (1 + rată)` chiar și pentru `exclusive`
- **Fix:** branching explicit pe `v_price_policy`:
  - `inclusive` → `ROUND(unit_price / (1 + rată/100), 4)`
  - `exclusive` → `ROUND(unit_price, 4)` (unit_price este deja baza netă)

### Structurare pe faze de aplicare
- **Faza 1 (safe):** ALTER TABLE + helperi — aplicabil în 6D.5.4 fără risc
- **Faza 2:** PATCH `finalize_sale` — după verificarea Fazei 1
- **Faza 3:** BACKFILL comentat — opțional, cu backup obligatoriu

### Notă `price_tax_policy = exclusive`
POS-ul actual trimite prețuri inclusive (prețuri de raft). Politica `exclusive` este suportată în calcul dar **neactivată în POS**. Impactul asupra totalului bonului necesită decizie separată de business. Totalul bonului nu a fost modificat în această etapă.
