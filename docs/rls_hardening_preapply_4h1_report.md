# RLS Hardening Pre-Apply Report — Etapa 4H.1
**Data**: 2026-05-15
**Proiect**: GestiuneMagazinV0.0.1 (`iwlmlhhjzqnwlfoittot`)
**Status**: ✅ SQL gata pentru aplicare manuală

---

## 1. Ce s-a verificat

Toate verificările au fost efectuate **real**, prin query-uri read-only via MCP Supabase tools:

| Verificare | Metodă | Rezultat |
|-----------|--------|---------|
| Existență tabele | `pg_tables + pg_class` | ✅ 19/19 tabele prezente, RLS activ |
| Policy names reale | `pg_policies` | ✅ Confirmate pentru 5 tabele critice |
| Semnături funcții helper | `pg_proc` | ✅ Toate 4 funcții prezente, SECURITY DEFINER |
| Security Advisors | MCP `get_advisors(security)` | ✅ Rulat real, 3 categorii de issues |
| Performance Advisors | MCP `get_advisors(performance)` | ✅ Rulat real, 4 categorii de issues |

---

## 2. Probleme Confirmate Real

### 🔴 Critice (MVP Blocker)
| # | Tabel | Policy Reală | Problemă | Remediere în Blueprint |
|---|-------|-------------|----------|----------------------|
| 1 | `reception_items` | `"ReceptionItems: access"` (ALL) | Casierul poate șterge recepții | ✅ Separare SELECT/ALL cu `has_store_role` |
| 2 | `waste_items` | `"WasteItems: access"` (ALL) | Casierul poate anula pierderi | ✅ Separare SELECT/ALL cu `has_store_role` |

### 🟡 Warnings (Recomandat înainte de MVP)
| # | Tabel | Problemă | Remediere în Blueprint |
|---|-------|----------|----------------------|
| 3 | `error_reports` | `WITH CHECK = true` — inserări anonime | ✅ Restricție la `authenticated` |
| 4 | `audit_logs` | Lipsă INSERT policy | ✅ Adăugată policy de INSERT |
| 5 | Helper functions | `search_path` mutable | ✅ `SET search_path = public` adăugat |
| 6 | `profiles` policy | `auth.uid()` per rând (performance) | ✅ Înlocuit cu `(SELECT auth.uid())` |

### 🔵 Info (Post-MVP)
| # | Problemă | Decizie |
|---|----------|---------|
| 7 | Unindexed foreign keys pe ~15 tabele | Lăsat pentru etapă post-MVP |
| 8 | Multiple permissive policies SELECT | Design intenționat, de revizuit |
| 9 | Helper functions accesibile `anon` via REST | REVOKE pentru etapă viitoare (4H.2) |
| 10 | Leaked Password Protection dezactivat | Activare manuală din Dashboard |

---

## 3. Ce NU s-a aplicat

> **NIMIC nu a fost aplicat în baza de date.**

- ❌ Nu s-au executat DDL statements
- ❌ Nu s-au modificat politici existente
- ❌ Nu s-au creat migrații
- ❌ Nu s-au rulat INSERT/UPDATE/DELETE

---

## 4. Corecții Aduse SQL Blueprint-ului

Față de versiunea inițială din Etapa 4H, blueprint-ul `proposed_rls_hardening_4h.sql` a fost corectat:

| Corecție | Detalii |
|---------|---------|
| **Idempotency completă** | DROP înainte de CREATE pentru TOATE policy-urile noi |
| **Policy names exacte** | DROP folosește exact `"ReceptionItems: access"` și `"WasteItems: access"` (confirmate real) |
| **WITH CHECK adăugat** | Politicile de management au și `WITH CHECK`, nu doar `USING` |
| **search_path fixat** | Funcțiile helper recreate cu `SET search_path = public` |
| **auth.uid() optimizat** | `Profiles: user view self` corectat cu `(SELECT auth.uid())` |
| **Self-update eliminat** | NU se adaugă self-update pe profiles (risc escaladare `role`) |
| **error_reports inclusă** | Tabela confirmată ca existentă → policy inclusă în blueprint |

---

## 5. Riscuri Rămase După Aplicare

| Risc | Severitate | Plan |
|------|------------|------|
| Helper functions accesibile via REST `anon` | Medium | REVOKE în Etapa 4H.2 |
| FK-uri neindexate (performanță) | Low | Post-MVP |
| Multiple permissive policies | Low | Consolidare post-MVP |
| Leaked password protection off | Medium | Activare manuală din Dashboard |
| `profiles` self-update lipsă | Low | RPC securizat în etapă viitoare |

---

## 6. Decizie Recomandată

> ✅ **SQL-ul este gata pentru aplicare manuală.**

### Instrucțiuni
1. Deschideți **Supabase Dashboard** → proiect `GestiuneMagazinV0.0.1`
2. Navigați la **SQL Editor**
3. Copiați conținutul din `database/proposed_rls_hardening_4h.sql`
4. Rulați integral
5. Verificați cu query-ul din comentariul final al scriptului

### Ordinea operațiunilor după aplicare
```
[4H.1] ✅ Verificare reală completată
[4H - SQL] Aplicare manuală proposed_rls_hardening_4h.sql
[4H.2]  REVOKE anon pe helper functions (opțional, post-MVP)
[4I]    MVP Smoke Test
```

---

## 7. Fișiere Modificate în Etapa 4H.1

| Fișier | Modificare |
|--------|-----------|
| `database/proposed_rls_hardening_4h.sql` | ✅ Corectat și complet (idempotent, real) |
| `docs/supabase_rls_advisory_audit_4h.md` | ✅ Actualizat cu date reale (secțiunile "Simulat" eliminate) |
| `docs/rls_hardening_preapply_4h1_report.md` | ✅ Creat (acest fișier) |
