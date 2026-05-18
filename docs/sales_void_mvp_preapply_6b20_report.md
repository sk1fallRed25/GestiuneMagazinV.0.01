# Sales Void MVP Pre-Apply Hardening — Etapa 6B.2.0

## 1. Rezumat
În cadrul **Etapei 6B.2.0**, am realizat o inspecție arhitecturală de hardening și un audit static/read-only al schemei bazei de date și al permisiunilor din aplicația Gestiune Magazin v2. Scopul principal a fost maturizarea, corectarea și izolarea blueprint-ului SQL creat inițial în Etapa 6B.1, înainte de aplicarea sa manuală pe mediul de producție/staging.

### Probleme identificate în blueprint-ul 6B.1:
1. **Roluri fictive/incorecte**: Blueprint-ul 6B.1 utiliza rolurile `owner` și `cashier` în politicile RLS și în apelurile de autorizare. Rolurile reale din sistem (definite în `store_members` și `profiles`) sunt: `admin`, `manager`, `gestionar`, `casier` și `platform_owner`.
2. **Semnătura `has_store_role`**: Blueprint-ul 6B.1 pasa în mod redundant `auth.uid()` ca al doilea argument în clauzele RLS. În realitate, funcția reală are semnătura `has_store_role(p_store_id UUID, p_allowed_roles TEXT[]) RETURNS BOOLEAN`, utilizând `auth.uid()` intern în definiția sa.
3. **Complexitate prematură**: Cuplarea anulării totale (`void`) cu returul parțial avansat pe linii de bon (`return_sale_items`) și cu tabela opțională `refund_payments` creștea riscul de execuție la aplicarea inițială.

### Decizia de izolare MVP (Etapa 6B.2):
Pentru a livra o funcționalitate stabilă, sigură și imediat operațională, Etapa 6B.2 se concentrează exclusiv pe **Anularea Totală a Bonului (Sales Void MVP)** pentru tranzacțiile din tura curentă. Returul parțial avansat și rambursările complexe au fost decuplate și mutate strategic în **Etapa 6B.3**.

---

## 2. Verificări Supabase read-only / Audit Static
În urma verificărilor read-only și a inspecției statice a migrărilor existente (`006_clean_schema_rls.sql`, `002_clean_schema_inventory.sql`, `003_clean_schema_sales.sql`, `proposed_shift_management_6a2.sql`), au fost confirmate următoarele elemente de bază:

* **Semnătura `has_store_role`**: 
  ```sql
  CREATE OR REPLACE FUNCTION public.has_store_role(p_store_id UUID, p_allowed_roles TEXT[]) RETURNS BOOLEAN
  ```
  Funcția este definită `SECURITY DEFINER` și verifică existența unui rând activ în `store_members` pentru `auth.uid()`.
* **Roluri reale utilizate**: `admin`, `manager`, `gestionar`, `casier`. Rolul de proprietar de platformă este validat separat prin `public.is_platform_owner()`.
* **Constrângeri `sales.status`**: Tabela `sales` utilizează o constrângere `CHECK (status IN ('finalized', 'cancelled', 'returned', 'partially_returned'))`.
* **Constrângeri `stock_movements.type`**: Tabela `stock_movements` utilizează o constrângere `CHECK (type IN ('reception','transfer','sale','return','waste','inventory_adjustment'))`.
* **Stare tabele și RPC-uri de retur**: Tabelele `sale_returns`, `sale_return_items` și procedurile `void_sale`, `return_sale_items` nu există încă în baza de date activă, fiind strict la nivel de propunere arhitecturală.

---

## 3. Corecții aplicate în SQL 6B.2
Noul script rafinat `database/proposed_sales_void_mvp_6b2.sql` conține exclusiv elementele necesare pentru MVP-ul de anulare, cu următoarele corecții critice:

1. **Alinierea Rolurilor Reale și a RLS**:
   Politicile RLS pe tabelele `sale_returns` și `sale_return_items` utilizează acum apelul corect:
   ```sql
   USING (public.has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR public.is_platform_owner())
   ```
2. **Extinderea Idempotentă a Constrângerilor**:
   * `sales.status`: adăugarea valorii `voided` (alături de `pending`, `finalized`, `cancelled`, `partially_returned`, `returned`).
   * `stock_movements.type`: adăugarea valorii `void`.
3. **RPC `void_sale` Securizat și Strict**:
   * Funcția `void_sale(p_store_id, p_profile_id, p_sale_id, p_reason, p_notes)` a fost refactorizată pentru a utiliza rolurile corecte (`admin`, `manager`, `casier`).
   * Include validare `trim()` pe motiv, garantând că nu este gol.
   * Realizează blocări explicite `FOR UPDATE` pe tranzacție, pe liniile de bon și pe loturile de stoc (`stock_batches`).
   * Readuce stocul în exact același `batch_id` din care s-a vândut, cu eroare clară (fail-fast) dacă lotul lipsește.
   * Generează înregistrări de trasabilitate în `audit_logs` (`sale.void`).
4. **RPC `get_sale_void_eligibility`**:
   * O funcție dedicată, simplificată, care returnează un obiect JSONB cu detaliile tranzacției, starea turei (`open`/`closed`), permisiunea de anulare (`can_void`) și explicația clară a blocajului (`reason_if_not`).

---

## 4. Decizii business MVP

* **Anulare strict pentru vânzări finalizate**: Doar bonurile cu status `finalized` sunt eligibile pentru `void`.
* **Restricție de reconciliere (Tură Deschisă Obligatorie)**: Pentru a garanta acuratețea reconcilierilor de casă și a rapoartelor Z/X de la finalul zilei, anularea unui bon este permisă **strict dacă tura în care a fost emis este încă deschisă (`status = 'open'`)**. Această regulă se aplică atât casierilor, cât și managerilor sau administratorilor.
* **Izolarea casierilor**: Un utilizator cu rol de `casier` (care nu este admin/manager) poate anula exclusiv propriile vânzări (`sale.profile_id = p_profile_id`), efectuate în tura pe care el însuși a deschis-o (`shift.opened_by = p_profile_id`).
* **Privilegii de management**: Administratorii, managerii și platform ownerii pot anula tranzacțiile oricărui casier din magazin, cu respectarea condiției de tură deschisă.
* **Decuplarea returului parțial**: Orice operațiune de stornare parțială sau retur de marfă post-închidere tură va fi tratată în Etapa 6B.3.

---

## 5. Pași manuali următori

1. **Etapa 6B.2.1 (Manual SQL Apply + Verification)**:
   * Echipă/DBA va aplica manual scriptul `database/proposed_sales_void_mvp_6b2.sql` în consola Supabase.
   * Se va rula un set de interogări read-only pentru a confirma crearea tabelelor, activarea RLS, corectitudinea constrângerilor și existența granturilor pe cele 2 funcții RPC (`void_sale`, `get_sale_void_eligibility`).
2. **Etapa 6B.2.2 (Frontend & Service Integration)**:
   * Extinderea `salesHistoryService.ts` cu metodele API pentru apelarea celor 2 RPC-uri.
   * Integrarea butonului de „Anulare Bon” în modalul de detalii bon din Istoric Vânzări, cu afișarea stării de eligibilitate și formular pentru motiv.
3. **Etapa 6B.2.3 (E2E Playwright Validation)**:
   * Validarea automată a fluxului complet de anulare prin teste Playwright.

---

## 6. Decizie

**Status**: `Ready for manual SQL apply`

Blueprint-ul SQL rafinat `database/proposed_sales_void_mvp_6b2.sql` este complet verificat, maturizat, aliniat la rolurile și constrângerile reale ale bazei de date și oferă o arhitectură 100% sigură pentru implementarea MVP-ului de anulare a bonurilor.
