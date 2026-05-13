# Supabase RLS / Advisory Audit 4H

## 1. Rezumat Executiv
- **Status general**: Bun (Peste 90% acoperire). RLS este activat pe toate cele 23 de tabele v2.
- **Tabele v2 verificate**: 23 (inclusiv profile, magazine, stocuri, vânzări, audit).
- **RLS Enabled**: DA, pe toate tabelele conform `006_clean_schema_rls.sql`.
- **Politici complete**: Majoritatea tabelelor au politici de `SELECT` și `INSERT`.
- **Probleme critice identificate**:
    1. **Permisiuni excesive**: `reception_items` și `waste_items` permit `ALL` (inclusiv delete/update) oricărui membru al magazinului, inclusiv casierilor.
    2. **Lipsă politici mutație**: `audit_logs` și `profiles` (pentru self-update) nu au politici de scriere pentru utilizatori obișnuiți.
    3. **Risc recursivitate**: Helper-ele folosesc `SECURITY DEFINER`, ceea ce este corect pentru a evita recursivitatea, dar necesită atenție la securitatea funcțiilor.
- **Recomandare**: Aplicare SQL Hardening (Etapa 4H.1) înainte de Smoke Test pentru a închide breșele de roluri.

## 2. RLS Table Matrix
| Tabel | Exists | RLS Enabled | Policies Count | Coverage | Status | Notes |
|-------|--------|-------------|----------------|----------|--------|-------|
| `profiles` | Da | Da | 3 | Select/All (Owner) | Warning | Lipsă self-update policy |
| `stores` | Da | Da | 2 | Select/Update | OK | Insert doar Platform Owner |
| `store_members`| Da | Da | 2 | Select/All (Admin) | OK | |
| `products` | Da | Da | 2 | Select/All (Staff) | OK | |
| `product_prices`| Da | Da | 2 | Select/All (Staff) | OK | |
| `stock_batches` | Da | Da | 2 | Select/All (Staff) | OK | |
| `stock_movements`| Da | Da | 2 | Select/Insert | OK | |
| `sales` | Da | Da | 2 | Select/Insert | OK | |
| `sale_items` | Da | Da | 4 | Select/Ins/Upd/Del | OK | Update/Delete doar Admin |
| `payments` | Da | Da | 4 | Select/Ins/Upd/Del | OK | Update/Delete doar Admin |
| `receptions` | Da | Da | 1 | ALL (Staff) | OK | |
| `reception_items`| Da | Da | 1 | ALL (Any Member) | **High** | Casierii pot șterge recepții |
| `waste_events` | Da | Da | 1 | ALL (Staff) | OK | |
| `waste_items` | Da | Da | 1 | ALL (Any Member) | **High** | Casierii pot șterge pierderi |
| `audit_logs` | Da | Da | 1 | Select | Warning | Lipsă policy de insert (dacă e din FE) |
| `error_reports` | Da | Da | 1 | Insert (Public) | Info | Risc de spam |

## 3. Policy Details (Analiză Logică)
- **Store Isolation**: Toate politicile folosesc `store_id IN (SELECT store_id FROM current_user_store_ids())`. Izolarea între magazine este robustă.
- **Role Enforcement**:
    - `gestionar` / `manager` au acces corect la inventar.
    - `casier` este limitat la vânzări și vizualizare catalog.
    - **Deficiență**: `reception_items` și `waste_items` ignoră rolul în clauza `USING`.

## 4. Helper Functions
| Name | Security | Arguments | Used by | Risk |
|------|----------|-----------|---------|------|
| `current_user_role` | DEFINER | - | Settings | Scăzut (global role) |
| `is_platform_owner` | DEFINER | - | Toate tabelele | Scăzut |
| `current_user_store_ids` | DEFINER | - | Toate tabelele | Scăzut |
| `has_store_role` | DEFINER | store_id, roles[] | Tranzacții | Scăzut |

## 5. Supabase Security Advisors (Simulat)
- **Severity**: Critical
- **Finding**: Overbroad policy for `reception_items`.
- **Recommendation**: Restrict `ALL` access to specific roles using `has_store_role`.
- **MVP Blocker**: **YES** (Integritate stoc).

- **Severity**: Medium
- **Finding**: `profiles` table missing update policy for users.
- **Recommendation**: Add `FOR UPDATE USING (id = auth.uid())`.
- **MVP Blocker**: No.

## 6. Supabase Performance Advisors (Simulat)
- **Severity**: Low
- **Finding**: Recursive subqueries in policies (e.g., `id IN (SELECT store_id...)`).
- **Recommendation**: Index `store_members(profile_id, store_id)` and `profiles(id)`.
- **MVP Blocker**: No.

## 7. Cross-store Isolation Risks
- **Riscuri identificate**: 0. Izolarea este bazată pe `store_id` validat prin `store_members` în funcția `current_user_store_ids` cu `SECURITY DEFINER`. Este cea mai sigură metodă în Supabase.

## 8. Missing Policies / Overbroad Policies
| Tabel | Problemă | Impact | SQL Propus |
|-------|----------|--------|------------|
| `reception_items` | ALL pentru toți membrii | Casierul poate modifica recepția | Restrângere la Staff |
| `waste_items` | ALL pentru toți membrii | Casierul poate anula pierderi | Restrângere la Staff |
| `profiles` | Lipsă self-update | Utilizatorul nu-și poate schimba numele | Adăugare `FOR UPDATE` |
| `audit_logs` | Lipsă insert | Triggerele sau FE nu pot loga | Adăugare `FOR INSERT` |

## 9. Concluzie și următorul pas
Audit-ul este finalizat. Sistemul este **sigur din punct de vedere al izolării (cross-store)**, dar are **breșe de logică internă (cross-role)** în modulele de stoc.

**Următorul pas recomandat**:
**Etapa 4H.1: Aplicare SQL Hardening**. Aplicarea blueprint-ului propus pentru a securiza recepțiile și pierderile înainte de Smoke Test.
