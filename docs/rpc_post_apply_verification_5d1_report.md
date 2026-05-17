# RPC Post-Apply Verification — Etapa 5D.1

## 1. Rezumat Executiv
- SQL RPC aplicat manual: da
- funcții noi găsite: 4/4
- funcții noi securizate: da
- problemă găsită: overload-uri vechi JSONB cu `anon_execute=true`
- status: partial pass
- decizie: necesită 5D.1.1 grants cleanup înainte de frontend migration

## 2. Function Matrix — New RPCs

| Funcție | Semnătură | Return Type | Security Definer | Search Path Public | Anon Execute | Auth Execute | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `finalize_sale` | `(p_store_id uuid, p_profile_id uuid, p_items jsonb, p_payments jsonb, p_shift_id uuid)` | `jsonb` | True | True | False | True | Corect |
| `receive_stock` | `(p_store_id uuid, p_profile_id uuid, p_document_number text, p_document_date date, p_supplier_name text, p_supplier_cui text, p_observations text, p_items jsonb)` | `uuid` | True | True | False | True | Corect |
| `transfer_stock` | `(p_store_id uuid, p_profile_id uuid, p_product_id uuid, p_quantity numeric, p_source_zone text, p_target_zone text)` | `numeric` | True | True | False | True | Corect |
| `record_waste` | `(p_store_id uuid, p_profile_id uuid, p_product_id uuid, p_quantity numeric, p_source_zone text, p_reason text, p_description text)` | `uuid` | True | True | False | True | Corect |

## 3. Legacy Overload Matrix

| Funcție | Legacy Signature | Security Definer | Anon Execute | Risc | Acțiune |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `finalize_sale` | `(p_sale_data jsonb)` | True | **True** | Ridicat | REVOKE anon |
| `receive_stock` | `(p_data jsonb)` | True | **True** | Ridicat | REVOKE anon |
| `transfer_stock` | `(p_data jsonb)` | True | **True** | Ridicat | REVOKE anon |
| `record_waste` | `(p_waste_data jsonb)` | True | **True** | Ridicat | REVOKE anon |

## 4. Grants Verification
- Noile RPC-uri au permisiunile corecte și nu pot fi executate de `anon`.
- Overload-urile vechi (`jsonb`) reprezintă un risc de securitate, permițând acces `anon` la funcții `SECURITY DEFINER`. Este necesară revocarea dreptului de `EXECUTE` pentru `anon` pentru aceste funcții vechi.

## 5. SQL Hotfix
A fost generat un script pentru curățarea acestor permisiuni vechi:
`database/proposed_rpc_legacy_grants_cleanup_5d11.sql`

## 6. Decision
- Nu se va începe Etapa 5D.2 (migrarea serviciilor frontend) până când `anon_execute=false` nu este asigurat pentru toate overload-urile sensibile vizate de acest hotfix.
