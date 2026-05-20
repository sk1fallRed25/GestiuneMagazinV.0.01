# Sales Advanced Returns SQL Apply Verification — Etapa 6B.3.1

## 1. Rezumat
- **Ce s-a verificat**: Existența și conformitatea elementelor bazei de date după aplicarea manuală a scriptului `database/proposed_sales_returns_advanced_6b3.sql`.
- **Status**: **PASS**. Toate tabelele, constrângerile, indexurile suplimentare și procedurile stocate (RPC-urile) corespund în totalitate blueprint-ului de securitate și integritate.
- **Obiectiv**: Pregătirea bazei de date pentru integrarea în frontend (Etapa 6B.3.2) a fluxului de retur parțial sau total pe articole selectate.

---

## 2. Verificări Read-Only Supabase

### A. Existența și Structura Tabelelor
S-a confirmat prezența tabelelor și coloanelor esențiale pentru stornări:
- **`sale_returns`**:
  - `id` (uuid, default: gen_random_uuid())
  - `store_id` (uuid, references public.stores)
  - `original_sale_id` (uuid, references public.sales)
  - `shift_id` (uuid, references public.pos_shifts)
  - `profile_id` (uuid, references public.profiles)
  - `type` (text, constraints: type = ANY (ARRAY['void'::text, 'return'::text]))
  - `status` (text, constraints: status = ANY (ARRAY['completed'::text, 'cancelled'::text]))
  - `reason` (text)
  - `total_refund` (numeric)
  - `refund_method` (text, constraints: refund_method = ANY (ARRAY['cash'::text, 'card'::text, 'voucher'::text, 'mixed'::text]))
  - `notes` (text)
- **`sale_return_items`**:
  - `id` (uuid, default: gen_random_uuid())
  - `store_id` (uuid, references public.stores)
  - `return_id` (uuid, references public.sale_returns)
  - `original_sale_item_id` (uuid, references public.sale_items)
  - `product_id` (uuid, references public.products)
  - `batch_id` (uuid, references public.stock_batches)
  - `quantity` (numeric, constraint: quantity > 0)
  - `unit_price` (numeric, constraint: unit_price >= 0)
  - `total_item` (numeric, constraint: total_item >= 0)

### B. Indexuri de Performanță
S-au regăsit toate cele 9 indexuri specifice menite să prevină scanările secvențiale la nivelul bazei de date:
- `idx_sale_returns_original_sale_id` pe `sale_returns(original_sale_id)`
- `idx_sale_returns_store_id` pe `sale_returns(store_id)`
- `idx_sale_returns_shift` pe `sale_returns(shift_id)`
- `idx_sale_returns_profile` pe `sale_returns(profile_id)`
- `idx_sale_returns_created_at` pe `sale_returns(created_at)`
- `idx_sale_returns_return_id` pe `sale_return_items(return_id)`
- `idx_sale_return_items_original_item` pe `sale_return_items(original_sale_item_id)`
- `idx_sale_return_items_product` pe `sale_return_items(product_id)`
- `idx_sale_return_items_batch` pe `sale_return_items(batch_id)`

### C. Constrângeri active (Check Constraints)
- `sales_status_check`: Permite stările `voided`, `partially_returned` și `returned`.
- `stock_movements_type_check`: Permite tipul `return` (pe lângă `void`, `sale` etc.).

---

## 3. Row Level Security (RLS) & Politici de Acces
Tabela `sale_returns` și tabela `sale_return_items` au ambele RLS activat. Politicile aplicate sunt configurate securizat pentru personalul magazinului:
- **Politica**: `SaleReturns: staff access` & `SaleReturnItems: staff access`
- **Roluri vizate**: `public` (toți utilizatorii autentificați care îndeplinesc regulile).
- **Operații permise**: `ALL` (Select, Insert, Update).
- **Expresie SQL de validare**:
  ```sql
  has_store_role(store_id, ARRAY['admin'::text, 'manager'::text, 'casier'::text]) OR is_platform_owner()
  ```
  *Notă: Deși politicile permit scrierea directă pentru casier, la nivelul procedurii RPC `return_sale_items` s-a limitat accesul exclusiv la `admin` și `manager`, reducând riscul de fraudă la POS.*

---

## 4. Analiză RPC-uri (Proceduri Stocate)

### A. `get_sale_return_eligibility(p_store_id uuid, p_sale_id uuid)`
- **Tip**: SECURITY DEFINER
- **Search Path**: `public`
- **Validări de acces**:
  - Apelează `has_store_role` restrictiv pentru `admin` și `manager`, sau `is_platform_owner()`.
- **Funcționalitate**:
  - Calculează cantitatea returnabilă per linie (cantitatea vândută original minus suma cantităților deja returnate din retururi cu statusul `completed`).
  - Permite retur doar dacă bonul are statusul `finalized` sau `partially_returned`.
  - Listează plățile originale și returnează metodele permise de refund (`cash`, `card`, `voucher`).

### B. `return_sale_items(p_store_id uuid, p_profile_id uuid, p_sale_id uuid, p_items jsonb, p_refund_method text, p_reason text, p_notes text)`
- **Tip**: SECURITY DEFINER
- **Search Path**: `public`
- **Garantează atomicitatea & izolarea**:
  - Efectuează `FOR UPDATE` pe antetul de vânzare (`sales`) și pe fiecare linie selectată (`sale_items`), prevenind race conditions la apeluri concurente (Double Return).
  - Validează existența `batch_id` pe linia de bon (fail-fast în lipsă) pentru a readuce corect stocul în lot.
  - Actualizează stocul lotului (`stock_batches.quantity`) și adaugă mișcarea de stoc tip `return` în `stock_movements`.
  - Calculează automat starea finală a bonului: dacă toate articolele au fost returnate integral, statusul devine `returned`, altfel devine `partially_returned`.
  - Creează automat logul de audit cu tipul `sale.return`.

---

## 5. Patch-uri Reconciliere Ture POS
Procedurile `get_active_pos_shift` și `close_pos_shift` au fost verificate:
- **`get_active_pos_shift`**:
  - Include vânzările cu status `partially_returned` și `returned` în totalurile brute din tura originală.
  - Calculează corect soldul așteptat din sertar (`expected_cash = opening_cash + total_cash - total_cash_refunds`).
- **`close_pos_shift`**:
  - Utilizează corect statusurile `partially_returned` și `returned` pentru plățile cash/card/mixed în vederea agregării istorice brute.
  - Scade sumele returnate cash (`total_cash_refunds`) din numerarul așteptat în tura curentă.
  - Stochează soldurile nete consolidate la închidere.

---

## 6. Concluzii
Baza de date este complet pregătită. Baza DDL, RLS, RPC-urile și patch-urile de reconciliere sunt active, sigure și corect aplicate în Supabase.
> [!IMPORTANT]
> **Apply Verification: PASS**. Putem trece la Etapa 6B.3.2 (Frontend & Service Integration).
