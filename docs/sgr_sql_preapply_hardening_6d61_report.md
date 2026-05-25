# SGR SQL Pre-Apply Hardening Report — Etapa 6D.6.1

## 1. Rezumat
*   **Status:** Ready for 6D.6.2 SGR SQL Apply Verification.
*   **Baza de date modificată:** Nu (doar blueprint SQL actualizat).
*   **Cod frontend modificat:** Nu (fără modificări UI sau POS).

## 2. Audit Live Schema
*   **Products:** Tabelul `public.products` conține coloanele de bază: `id`, `store_id`, `category_id`, `name`, `barcode`, `unit`, `status`, `created_at`, `updated_at`. Momentan nu conține nicio coloană `sgr_*`.
*   **Sale Items:** Tabelul `public.sale_items` conține coloanele de bază și coloanele adăugate pentru snapshot TVA în etapa 6D.5.4 (`vat_group`, `vat_rate`, `vat_amount`, `price_without_vat`, `total_without_vat`, `price_includes_vat`). Nu există coloane `sgr_*`.
*   **Finalize Sale:** Semnătura funcției RPC `finalize_sale` este `(p_store_id uuid, p_profile_id uuid, p_items jsonb, p_payments jsonb, p_shift_id uuid)`. Aceasta inserează explicit în `sale_items` toate coloanele de snapshot TVA. Pentru integrarea SGR, va trebui patch-uită ulterior în bucla FEFO pentru a salva parametrii SGR din catalogul `products`.

## 3. Modificări aduse în Blueprint (`proposed_sgr_containers_6d60.sql`)
1.  **Constrângerea `sale_items_sgr_check`:** Întărită pentru a asigura consistența datelor:
    *   Când `sgr_enabled = false` => toate proprietățile SGR (`sgr_type`, `sgr_deposit_amount`, `sgr_total_amount`, `sgr_vat_group`, `sgr_vat_rate`) trebuie să fie nule/zero.
    *   Când `sgr_enabled = true` => `sgr_type` trebuie să fie valid (`plastic`, `metal`, `glass`), `sgr_deposit_amount` să fie exact `0.50`, `sgr_vat_group` să fie `'D'`, iar `sgr_vat_rate` să fie `0`.
2.  **Indexuri SGR pe `sale_items`:**
    *   `idx_sale_items_sgr_enabled` pe `(store_id, sgr_enabled)` pentru o scanare rapidă a articolelor participante la SGR.
    *   `idx_sale_items_sgr_type` pe `(store_id, sgr_type) WHERE sgr_enabled = true` pentru a facilita raportările volumetrice per tip de material.
3.  **Configurație Extinsă `get_sgr_deposit_config()`:** Funcția returnează acum un JSON mai complet pentru a fi folosit în clientul POS:
    *   `amount`: `0.50`
    *   `currency`: `'RON'`
    *   `vatGroup`: `'D'`
    *   `vatRate`: `0`
    *   `vatLabel`: `'Grupa D — 0%'`
    *   `depositLabel`: `'Garanție SGR'`
    *   `types`: Tipuri și etichete asociate.

## 4. Compatibilitate
*   **Fără DML de backfill:** Toate articolele din vânzările existente vor trece automat noul constraint deoarece valoarea lor implicită este `sgr_enabled = false`, iar celelalte câmpuri devin nule/zero.
*   **Fără patch live pe finalize_sale:** Nu se modifică comportamentul curent POS în această fază.

## 5. Decizie
**Ready for 6D.6.2 SGR SQL Apply Verification**.
