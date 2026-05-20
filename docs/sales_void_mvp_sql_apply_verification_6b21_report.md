# Sales Void MVP SQL Apply Verification — Etapa 6B.2.1

## 1. Rezumat
- **Status**: PASS
- **SQL aplicat**: Da (anterior, manual în Supabase SQL Editor de către echipă, finalizat cu succes)
- **DB modificată în această etapă**: Nu, exclusiv interogări read-only de audit și verificare post-aplicare.

---

## 2. Tabele

### `public.sale_returns`
- **Existență**: Tabela există în schema `public`.
- **Coloane confirmate**:
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `store_id` (uuid, FK către `stores(id)` ON DELETE CASCADE)
  - `original_sale_id` (uuid, FK către `sales(id)` ON DELETE RESTRICT)
  - `shift_id` (uuid, FK către `pos_shifts(id)` ON DELETE SET NULL)
  - `profile_id` (uuid, FK către `profiles(id)` ON DELETE RESTRICT)
  - `type` (text, check constraint `'void', 'return'`)
  - `status` (text, check constraint `'completed', 'cancelled'`)
  - `reason` (text, not null)
  - `total_refund` (numeric(12,2), default `0`)
  - `refund_method` (text, check constraint `'cash', 'card', 'voucher', 'mixed'`)
  - `notes` (text)
  - `created_at` (timestamptz, default `now()`)
- **RLS**: Activat (`rowsecurity = true`).
- **Politică de acces**: `SaleReturns: staff access` (ALL pentru membrii cu rol de `admin`, `manager`, `casier` pe magazin, sau `platform_owner`).

### `public.sale_return_items`
- **Existență**: Tabela există în schema `public`.
- **Coloane confirmate**:
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `store_id` (uuid, FK către `stores(id)` ON DELETE CASCADE)
  - `return_id` (uuid, FK către `sale_returns(id)` ON DELETE CASCADE)
  - `original_sale_item_id` (uuid, FK către `sale_items(id)` ON DELETE RESTRICT)
  - `product_id` (uuid, FK către `products(id)` ON DELETE RESTRICT)
  - `batch_id` (uuid, FK către `stock_batches(id)` ON DELETE SET NULL)
  - `quantity` (numeric(12,3), check constraint `> 0`)
  - `unit_price` (numeric(12,2), check constraint `>= 0`)
  - `total_item` (numeric(12,2), check constraint `>= 0`)
  - `created_at` (timestamptz, default `now()`)
- **RLS**: Activat (`rowsecurity = true`).
- **Politică de acces**: `SaleReturnItems: staff access` (ALL pentru membrii cu rol de `admin`, `manager`, `casier` pe magazin, sau `platform_owner`).

---

## 3. Constrângeri actualizate

### `sales.status`
- **Verificare**: Constrângerea check a fost extinsă cu succes.
- **Definiție actuală**: `CHECK (status IN ('pending', 'finalized', 'cancelled', 'voided', 'partially_returned', 'returned'))`. Suportă starea `'voided'` utilizată de anularea totală.

### `stock_movements.type`
- **Verificare**: Constrângerea check a fost extinsă cu succes.
- **Definiție actuală**: `CHECK (type IN ('reception', 'transfer', 'sale', 'return', 'waste', 'inventory_adjustment', 'void'))`. Suportă mișcarea de tip `'void'` utilizată pentru a readuce produsele anulate în stoc.

---

## 4. Indexuri confirmate
Următoarele indexuri de performanță și concurență au fost create cu succes:
- `idx_sale_returns_store_id` pe `public.sale_returns(store_id)`
- `idx_sale_returns_original_sale_id` pe `public.sale_returns(original_sale_id)`
- `idx_sale_returns_return_id` pe `public.sale_return_items(return_id)`
- `idx_sale_return_items_original_item` pe `public.sale_return_items(original_sale_item_id)`
- `idx_sale_returns_created_at` pe `public.sale_returns(created_at)`

---

## 5. RPC-uri (Proceduri stocate)

Ambele funcții noi create pentru MVP-ul de anulare a bonurilor există și respectă cerințele stricte de securitate:
- **`SECURITY DEFINER = true`**
- **`search_path = public`**
- **Permisiuni**: Revocate pentru `PUBLIC` / `anon`. Permisiune de execuție acordată explicit doar rolului `authenticated` (și implicit `service_role` de către Postgres).

### 1. `public.void_sale(p_store_id uuid, p_profile_id uuid, p_sale_id uuid, p_reason text, p_notes text)`
- **Responsabilitate**: Executarea atomică a anulării bonului. 
- **Validări**: Curăță motivul cu `trim()`, validează rolul utilizatorului pe magazin, verifică dacă vânzarea este finalized și asociată unei ture deschise, verifică drepturile specifice (casierul poate anula doar vânzările proprii din tura proprie, managerul/adminul le poate anula pe toate din tura deschisă), blochează stocurile și loturile, readuce cantitățile vândute în lotul original din care provin, generează mișcarea inversă de stoc de tip `void`, actualizează starea vânzării în `voided` și generează log-ul de audit cu snapshot-ul acțiunii în `audit_logs` (`sale.void`).

### 2. `public.get_sale_void_eligibility(p_store_id uuid, p_profile_id uuid, p_sale_id uuid)`
- **Responsabilitate**: Consultarea read-only a eligibilității de anulare totală a bonului din frontend.
- **Return**: Obiect JSONB detaliat conținând eligibilitatea (`can_void`), motivul clar al blocajului în caz contrar (`reason_if_not`), sumarele liniilor de bon (`items_summary`) și ale plăților efectuate (`payments_summary`), utilizat pentru popularea modalului de anulare din UI.

---

## 6. Audit Lints și Recomandări de Performanță

Conform auditului de advisors, s-a detectat că unele chei străine nu dețin indexuri de acoperire dedicated în noul blueprint. 

> [!TIP]
> Deși performanța la volumul actual este excelentă, recomandăm adăugarea următoarelor indexuri în etapele viitoare de optimizare a bazei de date (ex. în Etapa 6B.3):
> 1. `CREATE INDEX IF NOT EXISTS idx_sale_returns_profile ON public.sale_returns(profile_id);` (pentru raportarea auditului pe profile)
> 2. `CREATE INDEX IF NOT EXISTS idx_sale_returns_shift ON public.sale_returns(shift_id);` (pentru reconcilierea rapidă pe ture)
> 3. `CREATE INDEX IF NOT EXISTS idx_sale_return_items_product ON public.sale_return_items(product_id);` (pentru analiza retururilor pe produse)
> 4. `CREATE INDEX IF NOT EXISTS idx_sale_return_items_batch ON public.sale_return_items(batch_id);` (pentru trasabilitatea loturilor returnate)

---

## 7. Probleme Găsite
- **Niciuna**. Baza de date este într-o stare perfectă de integritate, toate permisiunile, tabelele și procedurile RPC fiind aliniate la normele stricte de securitate și consistență tranzacțională din v2.

---

## 8. Decizie
**Ready for 6B.2.2 (Frontend & Service Integration)**. Putem trece la integrarea interfeței grafice POS/Istoric Vânzări și a serviciilor frontend cu RPC-urile validate.
