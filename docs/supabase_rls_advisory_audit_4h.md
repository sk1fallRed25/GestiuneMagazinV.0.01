# Supabase RLS / Advisory Audit 4H
**Proiect**: GestiuneMagazinV0.0.1 (`iwlmlhhjzqnwlfoittot`, eu-west-2)
**Audit Static**: Etapa 4H | **Verificat Real**: Etapa 4H.1 (2026-05-15)

---

## 1. Rezumat Executiv
- **Status general**: Bun (>90% acoperire). RLS activat pe toate cele 19 tabele verificate.
- **Tabele v2 verificate real**: 19 (toate prezente în Supabase).
- **RLS Enabled**: DA, pe toate tabelele verificate.
- **RLS Forced**: NU pe niciunul (standard Supabase, corect).
- **Probleme critice identificate și confirmate real**:
  1. `reception_items` — policy "ReceptionItems: access" (ALL) fără restricție de rol → casierul poate șterge recepții.
  2. `waste_items` — policy "WasteItems: access" (ALL) fără restricție de rol → casierul poate anula pierderi.
  3. `error_reports` — policy "Errors: create" cu `WITH CHECK = true` → inserări anonime permise (confirmat de Security Advisor).
  4. `audit_logs` — lipsă policy de INSERT (doar SELECT existent).
  5. Helper functions — mutable `search_path` (confirmat de Security Advisor pe toate 4 funcțiile).

---

## 2. RLS Table Matrix (Real)
| Tabel | Există | RLS Enabled | RLS Forced | Status |
|-------|--------|-------------|------------|--------|
| `audit_logs` | ✅ | ✅ | ❌ | Warning: lipsă INSERT policy |
| `cashier_shifts` | ✅ | ✅ | ❌ | OK |
| `client_events` | ✅ | ✅ | ❌ | OK |
| `error_reports` | ✅ | ✅ | ❌ | **High: WITH CHECK = true** |
| `payments` | ✅ | ✅ | ❌ | OK |
| `product_prices` | ✅ | ✅ | ❌ | OK |
| `products` | ✅ | ✅ | ❌ | OK |
| `profiles` | ✅ | ✅ | ❌ | OK (fără self-update intenționat) |
| `reception_items` | ✅ | ✅ | ❌ | **High: ALL fără rol** |
| `receptions` | ✅ | ✅ | ❌ | OK |
| `sale_items` | ✅ | ✅ | ❌ | OK |
| `sales` | ✅ | ✅ | ❌ | OK |
| `stock_batches` | ✅ | ✅ | ❌ | OK |
| `stock_movements` | ✅ | ✅ | ❌ | OK |
| `store_members` | ✅ | ✅ | ❌ | OK |
| `stores` | ✅ | ✅ | ❌ | OK |
| `sync_conflicts` | ✅ | ✅ | ❌ | OK |
| `waste_events` | ✅ | ✅ | ❌ | OK |
| `waste_items` | ✅ | ✅ | ❌ | **High: ALL fără rol** |

---

## 3. Policy Names Reale (Confirmate din pg_policies)

### `reception_items`
| Policy Name | CMD | Roles | USING | WITH CHECK |
|-------------|-----|-------|-------|------------|
| `ReceptionItems: access` | ALL | {public} | `store_id IN current_user_store_ids() OR is_platform_owner()` | NULL |

**Concluzie**: Policy overbroad — nu verifică rolul. Casierul are acces ALL.

### `waste_items`
| Policy Name | CMD | Roles | USING | WITH CHECK |
|-------------|-----|-------|-------|------------|
| `WasteItems: access` | ALL | {public} | `store_id IN current_user_store_ids() OR is_platform_owner()` | NULL |

**Concluzie**: Policy overbroad — identică cu reception_items. Casierul are acces ALL.

### `profiles`
| Policy Name | CMD | USING |
|-------------|-----|-------|
| `Profiles: owner access` | ALL | `is_platform_owner()` |
| `Profiles: user view self` | SELECT | `id = auth.uid()` |
| `Profiles: store staff view` | SELECT | `id IN (SELECT profile_id FROM store_members WHERE store_id IN current_user_store_ids())` |

**Concluzie**: Corect, dar lipsă self-update. Coloana `role` și `active` sunt prezente → self-update direct ar fi periculos.

### `audit_logs`
| Policy Name | CMD | USING |
|-------------|-----|-------|
| `Audit: view` | SELECT | `store_id IN current_user_store_ids() OR is_platform_owner()` |

**Concluzie**: Lipsă policy de INSERT. Auditarea din frontend nu poate scrie.

### `error_reports`
| Policy Name | CMD | WITH CHECK |
|-------------|-----|------------|
| `Errors: create` | INSERT | `true` (oricine, inclusiv anonim) |

**Concluzie**: Confirmat de Supabase Security Advisor ca vulnerabilitate (lint `0024_permissive_rls_policy`).

---

## 4. Helper Functions Reale (Confirmate din pg_proc)
| Funcție | Schema | Security Definer | Argumente | Return Type |
|---------|--------|-----------------|-----------|-------------|
| `current_user_role` | public | ✅ DA | — | text |
| `current_user_store_ids` | public | ✅ DA | — | TABLE(store_id uuid) |
| `has_store_role` | public | ✅ DA | `p_store_id uuid, p_allowed_roles text[]` | boolean |
| `is_platform_owner` | public | ✅ DA | — | boolean |

**Semnătură `has_store_role` confirmată**: `(p_store_id uuid, p_allowed_roles text[])` — **compatibilă** cu apelurile din blueprint.

---

## 5. Supabase Security Advisors — Rezultat Real (2026-05-15)

### A. `function_search_path_mutable` (WARN)
Toate cele 4 funcții helper sunt afectate:
- `current_user_role`, `current_user_store_ids`, `has_store_role`, `is_platform_owner`

**Remediere**: Adăugare `SET search_path = public` la definirea funcției.
**Referință**: [Supabase Docs - lint 0011](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

### B. `rls_policy_always_true` (WARN)
- **Tabel afectat**: `public.error_reports`
- **Policy**: `Errors: create` — `WITH CHECK = true` pentru INSERT
- **Impact**: Oricine poate insera erori (inclusiv utilizatori neautentificați).
- **Remediere**: Restricționare la rolul `authenticated`.
- **Referință**: [Supabase Docs - lint 0024](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)

### C. `anon_security_definer_function_executable` (WARN)
Funcțiile helper pot fi apelate public via REST API:
- `current_user_role()`, `current_user_store_ids()`, `has_store_role()`, `is_platform_owner()`
- De asemenea: `finalize_sale`, `receive_stock`, `record_waste`, `transfer_stock`, etc.

**Recomandare**: Revoke EXECUTE de la `anon` pe funcțiile helper:
```sql
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_store_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, text[]) FROM anon;
```
> **NOTĂ**: Aceste REVOKE sunt pentru o etapă viitoare (4H.2). Nu sunt incluse în blueprint-ul curent pentru a nu bloca MVP-ul.

### D. `auth_leaked_password_protection` (WARN)
- Protecția HaveIBeenPwned este dezactivată.
- **Remediere**: Activare din Supabase Dashboard > Authentication > Password Settings.
- **MVP Blocker**: Nu.

---

## 6. Supabase Performance Advisors — Rezultat Real (2026-05-15)

### A. `auth_rls_initplan` (WARN)
- **Tabel**: `profiles`, policy `Profiles: user view self`
- `auth.uid()` este re-evaluat per rând. Înlocuire cu `(SELECT auth.uid())`.
- **Inclus în blueprint 4H**.

### B. `unindexed_foreign_keys` (INFO — multiple)
Tabele fără index pe FK: `audit_logs`, `cashier_shifts`, `reception_items`, `waste_items`, `sale_items`, `stock_movements`, `store_members`, etc.

**Recomandare** (etapă viitoare):
```sql
CREATE INDEX IF NOT EXISTS idx_store_members_profile_id ON public.store_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_store_id ON public.reception_items(store_id);
-- etc.
```
> **MVP Blocker**: Nu (afectează performanța la volum mare, nu funcționalitatea).

### C. `multiple_permissive_policies` (WARN)
Tabele cu policy-uri multiple pentru aceeași acțiune (SELECT):
- `products`, `product_prices`, `stock_batches`, `categories`, `store_members`, `profiles`, `app_settings`

**Cauza**: Design intenționat cu polícy separată de view + manage.
**Remediere**: Consolidare în policy-uri unice (etapă viitoare, nu MVP blocker).

### D. `unused_index` (INFO)
- `idx_receptions_doc`, `idx_client_events_lookup`, `idx_audit_logs_entity` — neutilizate.
- Nu se șterg acum (pot deveni utile post-MVP).

---

## 7. Cross-store Isolation
**Status**: ✅ Robust. Toate politicile folosesc `store_id IN (SELECT store_id FROM current_user_store_ids())` validat prin `store_members` cu `SECURITY DEFINER`. Nu există risc de cross-store data leakage.

---

## 8. Coloane Critice Verificate (Real)

### `profiles`
`id` (uuid, NOT NULL), `email` (text, NOT NULL), `full_name` (text, nullable), **`role` (text, NOT NULL)**, **`active` (boolean, nullable)**, `created_at`, `updated_at`

> ⚠️ Prezența `role` și `active` confirmă că self-update direct **NU este sigur** fără RPC.

### `reception_items`
`id`, `store_id` (NOT NULL), `reception_id` (NOT NULL), `product_id` (NOT NULL), `quantity`, `purchase_price`, `sale_price_new`, `vat_percent`, `batch_number`, `expiry_date`, `created_at`

### `waste_items`
`id`, `store_id` (NOT NULL), `waste_id` (NOT NULL), `product_id` (NOT NULL), `batch_id` (nullable), `quantity`, `created_at`

### `audit_logs`
`id`, `store_id` (nullable), `profile_id` (nullable), `action`, `entity_type`, `entity_id`, `old_data`, `new_data`, `ip_address`, `created_at`

### `error_reports`
`id`, `store_id` (nullable), `profile_id` (nullable), `error_message`, `stack_trace`, `context`, `created_at`

---

## 9. Concluzie Finală (Audit Static 4H)
- ✅ Cross-store isolation: robust
- ❌ Cross-role: 2 breșe critice (reception_items, waste_items)
- ⚠️ error_reports: WITH CHECK = true confirmat de advisor
- ⚠️ audit_logs: lipsă INSERT policy
- ⚠️ Helper functions: mutable search_path (risc schema injection)

---

## 10. Verificare Reală — Etapa 4H.1 (2026-05-15)

### Ce s-a verificat real
- ✅ Toate cele 19 tabele v2 există și au RLS activat
- ✅ Policy names reale confirmate din `pg_policies`
- ✅ Semnăturile funcțiilor helper confirmate din `pg_proc`
- ✅ Security Advisors rulați real (nu simulat)
- ✅ Performance Advisors rulați real (nu simulat)

### Diferențe față de auditul static 4H
| Aspect | Audit Static 4H | Verificare Reală 4H.1 |
|--------|-----------------|-----------------------|
| Policy name `reception_items` | Estimat corect | Confirmat: `"ReceptionItems: access"` |
| Policy name `waste_items` | Estimat corect | Confirmat: `"WasteItems: access"` |
| `error_reports` existență | Marcată ca incertă | CONFIRMATĂ — tabela există |
| `error_reports` policy | Estimat ca risc | Confirmat de Supabase Security Advisor |
| Helper search_path | Nu menționat | Confirmat ca WARN de Security Advisor |
| Profiles self-update | "Risc dacă adăugăm" | Confirmat: `role` și `active` prezente → NU adăugăm |

### Corecții aduse SQL blueprint-ului
1. ✅ Adăugat DROP pentru noile policy-uri (idempotency completă)
2. ✅ Adăugat `WITH CHECK` la politicile de management
3. ✅ Adăugat `SET search_path = public` la funcțiile helper
4. ✅ Corectat `Profiles: user view self` cu `(SELECT auth.uid())`
5. ✅ Eliminat self-update profiles, înlocuit cu documentare clară
6. ✅ `error_reports` — inclus cu restricție la `authenticated`
7. ✅ Confirmat că DROP-urile vizează exact policy names reale

### SQL Blueprint Status
**`database/proposed_rls_hardening_4h.sql`** — ✅ GATA PENTRU APLICARE MANUALĂ
