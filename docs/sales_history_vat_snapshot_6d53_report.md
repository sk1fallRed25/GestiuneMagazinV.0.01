# Audit & Blueprint Report: Sales History VAT Snapshot (Stage 6D.5.3)

This report documents the audit findings and the structural blueprint for adding a robust VAT snapshot mechanism to `sale_items`. By recording the precise fiscal state (VAT group, rate, amount, and net prices) at the moment of transaction, we secure historical reporting integrity and enable exact returned VAT calculation, preventing drift from subsequent product or price updates.

---

## 1. Database Schema Audit

We audited the existing tables in the `public` schema of our Supabase project `iwlmlhhjzqnwlfoittot` to understand their exact structure:

*   **`public.sales`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `shift_id` (uuid), `profile_id` (uuid), `total` (numeric), `payment_method` (text), `status` (text), `client_event_id` (uuid), `created_at` (timestamptz).
    *   *Role*: Holds the transaction header, payment method, shift reference, and total sale value.
*   **`public.sale_items`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `sale_id` (uuid), `product_id` (uuid), `batch_id` (uuid), `quantity` (numeric), `unit_price` (numeric), `total_item` (numeric), `created_at` (timestamptz).
    *   *Role*: Represents individual items sold. **Currently does not contain any VAT group, rate, or tax amount columns.**
*   **`public.product_prices`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `product_id` (uuid), `price_sale` (numeric), `price_purchase` (numeric), `vat_percent` (numeric), `vat_group` (text), `updated_at` (timestamptz).
    *   *Role*: Stores current prices and VAT rules per store/product. It is dynamic and reflects only the *present* state, which is why it cannot be used for historical lookups.
*   **`public.payments`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `sale_id` (uuid), `method` (text), `amount` (numeric), `created_at` (timestamptz).
    *   *Role*: Stores granular payment breakdowns (e.g. splitting Cash and Card for MIXT transactions).
*   **`public.sale_returns`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `original_sale_id` (uuid), `shift_id` (uuid), `profile_id` (uuid), `type` (text), `status` (text), `reason` (text), `total_refund` (numeric), `refund_method` (text), `notes` (text), `created_at` (timestamptz).
    *   *Role*: Header for returned or voided transactions.
*   **`public.sale_return_items`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `return_id` (uuid), `original_sale_item_id` (uuid), `product_id` (uuid), `batch_id` (uuid), `quantity` (numeric), `unit_price` (numeric), `total_item` (numeric), `created_at` (timestamptz).
    *   *Role*: Individual returned lines, pointing back to the original `sale_items` rows.
*   **`public.stock_batches`**:
    *   *Columns*: `id` (uuid), `store_id` (uuid), `product_id` (uuid), `batch_number` (text), `expiry_date` (date), `zone` (text), `quantity` (numeric), `purchase_price` (numeric), `created_at` (timestamptz).
    *   *Role*: Tracks batch quantities and locations.

---

## 2. RPC `finalize_sale` Audit

We audited the stored procedure `public.finalize_sale` (located in `database/proposed_shift_management_6a2.sql`):

### Audit Answers
1.  **Insertion into `sale_items`**: It occurs inside the FEFO batch allocation loop:
    ```sql
    INSERT INTO public.sale_items (store_id, sale_id, product_id, batch_id, quantity, unit_price, total_item)
    VALUES (p_store_id, v_sale_id, v_product_id, v_batch.id, v_qty_to_take, v_unit_price, v_qty_to_take * v_unit_price);
    ```
2.  **Input Parameters**: It receives `p_items` as a `JSONB` array of objects (containing `product_id` and `quantity`) and `p_payments` as a `JSONB` array of objects (containing `method` and `amount`).
3.  **Pricing Lookup**: It does not receive price or tax data from the frontend. Instead, it reads `price_sale` directly from `public.product_prices` inside the validation and processing loops.
4.  **VAT Resolution**: Currently, it does not query `vat_group` or `vat_percent` from `product_prices`, nor does it record any tax details in `sale_items`.
5.  **Store Context**: It has access to `p_store_id` (UUID).
6.  **Tax Policy & Inclusive Prices**:
    *   Prices in `product_prices.price_sale` are stored as **VAT-inclusive** (representing the actual shelf/shelf-edge price for consumers, which is standard in Romanian retail).
    *   To snapshot VAT details, we assume a VAT-inclusive policy. The net amounts are calculated from the gross amounts using:
        $$\text{Net Price} = \frac{\text{Gross Price}}{1 + \frac{\text{VAT Rate}}{100}}$$
        $$\text{VAT Amount} = \text{Gross Price} - \text{Net Price}$$
7.  **Payment Processing**: It checks if the sum of all elements in `p_payments` equals the calculated sale total (within `0.01` tolerance), inserts into `public.payments`, and maps `payment_method` to `'mixed'` (if there are multiple payments) or to the single payment method.
8.  **Shift Management**: It requires an active open shift (`p_shift_id`) belonging to the cashier and the store.

### Proposed Snapshot Modifications
To add snapshot capabilities without affecting transaction atomicity or runtime performance:
- We fetch the store settings from `public.stores.settings`.
- We extract the `tax` configuration namespace (`vat_payer`, `price_tax_policy`, and `vat_groups` mapping).
- In the item loop, when retrieving `price_sale` from `product_prices`, we also select `vat_group`.
- If `vat_payer = false`, we force the VAT group to `'E'` and the rate to `0.00%`.
- If `vat_payer = true`, we resolve the VAT rate for that group (e.g. from the store settings, fallback to Romanian default rates: A=21%, B=11%, C=11%, D=0%, E=0%).
- We calculate:
  *   `total_item` (Gross) = `quantity * price_sale`
  *   `total_without_vat` (Net) = `ROUND(total_item / (1 + vat_rate / 100), 2)`
  *   `vat_amount` = `total_item - total_without_vat`
  *   `price_without_vat` (Net Unit Price) = `ROUND(price_sale / (1 + vat_rate / 100), 4)`
- We insert these computed fields directly alongside the items in `sale_items`.

---

## 3. Sales History Frontend Audit

We audited the sales history modules:

1.  **Bill Loading**: `salesHistoryService.getSaleDetails(storeId, saleId)` queries the transaction header from `sales` (joining `profiles` for the cashier name), then queries `sale_items` (joining `products` and `stock_batches`), and queries the payments.
2.  **Type Definitions**: Currently, `SaleItemDetails` in `src/features/sales-history/types.ts` does not contain `vatGroup`, `vatRate`, `vatAmount`, `priceWithoutVat`, `totalWithoutVat`, or `priceIncludesVat`. These must be added in the implementation stage.
3.  **UI Item Detail Layout**: In `SaleDetailsModal.tsx`, we can display the VAT group code next to the product name or unit price in the items table (e.g. `Produs (TVA A)` or `Price: 10.00 LEI (TVA 21%)`).
4.  **UI VAT Summary Layout**: In the modal, we can render a dedicated **VAT Breakdown Summary Table** before the final totals block. This table will display:
    *   VAT Group (A, B, C, D, E)
    *   VAT Rate (21%, 11%, 0%)
    *   Net Base (Total without VAT)
    *   VAT Amount
    *   Gross Total
    *   Example:
        | Group | Rate | Net Base (LEI) | VAT Value (LEI) | Gross Total (LEI) |
        | :---: | :---: | :---: | :---: | :---: |
        | A | 21% | 100.00 | 21.00 | 121.00 |
5.  **Returns & Voids**: The return service maps returned items to the original `sale_items` rows. The existence of a VAT snapshot on `sale_items` ensures returns can easily and accurately refund the exact tax base and tax amount that was recorded during the sale, even if the store's settings or the product's current VAT group changed in the meantime.

---

## 4. Architectural Design Decision

We select the **Column-Level Snapshot in `sale_items`** strategy.

### Advantages
*   **Fiscal Accuracy**: Retains the exact tax rate applied at the moment of the transaction, ensuring compliance with auditing rules.
*   **Audit Independence**: The store can change its VAT status (e.g. becoming a VAT payer, or changing standard rates) without corrupting previous sales history.
*   **Exact Refunds**: Returns can look up the original `sale_items` row to determine exactly how much VAT was collected for that unit, preventing tax calculation mismatch.
*   **Performance**: Avoids joining complex config schemas at runtime for history display.

### Fallback Strategy (Legacy Records)
For historical transactions entered before this migration where the snapshot columns are `NULL`:
- The API/RPC will return `NULL` for these columns.
- The frontend client will gracefully fallback:
  - Default `vat_group` to `'A'` (or the store's current default VAT group).
  - Default `vat_rate` by looking up the current group rate from the store settings, or fallback to standard Romanian rates.
  - Compute net and VAT values on-the-fly for display purposes only.
  - Clearly mark or tolerate legacy records in reporting engines.

---

## 5. SQL Blueprint Reference

The complete idempotent SQL migration script is located at:
*   [proposed_sales_history_vat_snapshot_6d53.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/proposed_sales_history_vat_snapshot_6d53.sql)

It adds the necessary columns, constraints, and indexes, and provides the fully hardened PL/pgSQL implementation of the `finalize_sale` RPC function.
