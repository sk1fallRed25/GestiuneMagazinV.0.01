# RPC Legacy Grants Cleanup Verification — Etapa 5D.1.2

## 1. Rezumat Executiv
- hotfix aplicat manual: da
- funcții verificate: 8 (4 noi, 4 legacy)
- overload-uri legacy verificate: 4
- `anon_execute=false` pentru toate: da
- status: pass

## 2. Function Grants Matrix

| Funcție | Semnătură | `anon_execute` | `auth_execute` | `public_execute` | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `finalize_sale` | `(p_sale_data jsonb)` | False | True | False | Securizat |
| `finalize_sale` | `(p_store_id uuid, p_profile_id uuid, p_items jsonb, p_payments jsonb, p_shift_id uuid)` | False | True | False | Corect |
| `receive_stock` | `(p_data jsonb)` | False | True | False | Securizat |
| `receive_stock` | `(p_store_id uuid, p_profile_id uuid, p_document_number text, p_document_date date, p_supplier_name text, p_supplier_cui text, p_observations text, p_items jsonb)` | False | True | False | Corect |
| `record_waste` | `(p_waste_data jsonb)` | False | True | False | Securizat |
| `record_waste` | `(p_store_id uuid, p_profile_id uuid, p_product_id uuid, p_quantity numeric, p_source_zone text, p_reason text, p_description text)` | False | True | False | Corect |
| `transfer_stock` | `(p_data jsonb)` | False | True | False | Securizat |
| `transfer_stock` | `(p_store_id uuid, p_profile_id uuid, p_product_id uuid, p_quantity numeric, p_source_zone text, p_target_zone text)` | False | True | False | Corect |

## 3. Security Advisor Results
- **anon_security_definer_function_executable**: Funcțiile `finalize_sale`, `receive_stock`, `transfer_stock` și `record_waste` NU mai apar ca vulnerabile. Accesul public/anon a fost revocat cu succes.
- MVP blocker: no

## 4. Decizie
- **Ready for 5D.2 Transfer RPC migration.** Toate funcțiile țintă sunt acum securizate împotriva accesului neautentificat.

## 5. Note
- Overload-urile legacy rămân în baza de date temporar, dar fără acces `anon`.
- `DROP FUNCTION` pentru aceste overload-uri legacy va fi analizat și executat ulterior, abia după ce toate serviciile frontend sunt complet migrate pentru a folosi noile semnături.
