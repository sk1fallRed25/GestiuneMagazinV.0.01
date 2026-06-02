# AI Server-Side Aggregation & Consent SQL Hardening — Etapa 6AI.3

Acest raport descrie auditul de compatibilitate live și consolidările de securitate aplicate blueprint-ului SQL pentru modulul **AI Consultant**.

---

## 1. Audit Live Schema Compatibility

S-a auditat compatibilitatea blueprint-ului cu schema actuală a bazei de date live:

- **Incompatibilitate corectată (RLS Helper)**:
  - În blueprint-ul inițial, politicile RLS foloseau funcția helper `current_user_store_id()` (singular).
  - Auditarea tabelelor din baza de date live a dezvăluit că funcția corectă este **`public.current_user_store_ids()`** (plural), care returnează o tabelă/set de UUID-uri.
  - Toate politicile RLS din blueprint au fost corectate pentru a folosi:
    `store_id IN (SELECT store_id FROM public.current_user_store_ids())`
- **Trigger auto-update timestamp**:
  - Funcția live `public.update_updated_at_column()` a fost identificată ca fiind prezentă în schema core.
  - S-a montat un trigger `BEFORE UPDATE` pe tabela `store_ai_consent` pentru a actualiza automat coloana `updated_at`.
- **Compatibilitate tabele**:
  - Tabelele `stores`, `profiles`, `audit_logs`, `products`, `product_prices`, `stock_batches`, `sales`, `sale_items` și `waste_events` folosite în interogările RPC corespund întocmai cu structura existentă în nomenclator.

---

## 2. Hardening Constraints (Constrângeri Întărite)

S-au adăugat constrângeri de validare stricte la nivelul structurii tabelelor pentru a preveni stările inconsistente:

1. **`store_ai_consent`**:
   - `CONSTRAINT chk_consent_signature`: Asigură că dacă `allow_model_improvement` sau `allow_external_ai_processing` sunt activate, semnătura administratorului (`accepted_at` și `accepted_by_profile_id`) este obligatorie (NOT NULL).
   - `CONSTRAINT chk_model_improvement_active`: Asigură că `revoked_at` este NULL dacă îmbunătățirea modelului este activă.
2. **`store_ai_snapshots`**:
   - `CONSTRAINT chk_period_days`: Validează ca perioada analizată să fie cuprinsă strict între 1 și 365 de zile.
   - Constrângeri non-negative (`>= 0`) pe toate coloanele agregate (stoc total, vânzări total, pierderi, low stock, riscuri expirare).
   - `CONSTRAINT chk_snapshot_object`: Validează ca obiectul de snapshot să fie JSONB de tip `object`.
   - `CONSTRAINT chk_recommendations_array`: Validează ca recomandările transmise să fie de tip JSONB `array`.
3. **`store_ai_training_snapshots`**:
   - `CONSTRAINT chk_training_period`: Previne intervalele de timp invalide (`period_start <= period_end`).
   - `CONSTRAINT chk_aggregation_level` & `chk_anonymization_level`: Whitelist-uri stricte pentru nivelurile analitice permise.
   - `CONSTRAINT chk_payload_json_object`: Previne transmiterea payload-urilor goale (`{}`) sau a structurilor non-object.

---

## 3. RLS & Security Definer Hardening

- **POLICIES**:
  - Tabela `store_ai_training_snapshots` a fost securizată printr-o politică RLS blocantă care permite citirea exclusiv rolului de `platform_owner`. Membrii simpli ai magazinului nu au acces.
  - Generarea de training datasets este delegată exclusiv prin RPC-uri verificate, nefiind permisă inserarea directă de rânduri de către clienți.
- **RPC Validation & Hardening**:
  - Toate funcțiile au clauzele `SECURITY DEFINER` și `SET search_path = public` specificate explicit pentru a preveni escaladarea privilegiilor prin atacuri de tip *Search Path Hijacking*.
  - În `update_store_ai_consent`, s-a implementat o verificare strictă a cheilor din patch-ul JSONB (`jsonb_object_keys(p_patch)`). Orice cheie neidentificată în nomenclatorul permis determină respingerea tranzacției cu excepție.
  - În `refresh_store_ai_snapshot`, s-a impus verificarea parametrilor de perioadă (`p_period_days BETWEEN 1 AND 365`) și validarea opt-in-ului magazinului (`ai_data_preparation_enabled = true`).
  - În `create_training_snapshot_if_consented`, exportul de date este complet interzis dacă consimțământul este retras (`revoked_at IS NOT NULL`) sau dezactivat.

---

## 4. Idempotency & Rollback Script

- **Rollback Script**:
  - S-a creat blueprint-ul [rollback_ai_server_side_aggregation_consent_6ai3.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/rollback_ai_server_side_aggregation_consent_6ai3.sql).
  - Acesta șterge tabelele, funcțiile, triggerii și politicile RLS în ordinea inversă a dependențelor lor.
  - Conține un avertisment clar privind pierderea definitivă a datelor istorice de consimțământ și cache snapshots, păstrând în același timp jurnalele de audit log intacte.
- **Idempotency**:
  - Blueprint-ul SQL conține instrucțiuni defensive `DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS` și `CREATE OR REPLACE FUNCTION` pentru a putea fi executat de mai multe ori fără erori de duplicare.

---

## 5. Ce NU s-a aplicat live

> [!IMPORTANT]
> Conform directivelor etapei, **nicio modificare SQL sau RLS nu a fost aplicată pe baza de date live**. Toate modificările din `proposed_ai_server_side_aggregation_consent_6ai2.sql` și `rollback_ai_server_side_aggregation_consent_6ai3.sql` sunt stocate ca scripturi blueprint și au fost validate exclusiv static.

---

## 6. Următorul pas

- **`6AI.4 SQL Manual Apply Verification`** (Executarea manuală a migrației SQL pe baza de date în mediu securizat/rollout).
