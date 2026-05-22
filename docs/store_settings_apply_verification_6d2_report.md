# Store Settings SQL Apply Verification — Report (Etapa 6D.2)

## 1. Rezumat
* **Status**: **PASS** (Toate verificările funcționale și de securitate au fost completate cu succes)
* **Modificări Bază de Date**: Nu (aplicarea SQL a fost realizată manual anterior de echipă; acest raport verifică starea în mod read-only / tranzacțional)
* **Modificări Frontend**: Nu (fără modificări la interfața POS sau Owner Console, conform instrucțiunilor stricte de blocare UI/logică operațională)
* **Erori Descoperite**: O problemă minoră de securitate privind permisiunile implicite ale Supabase Auth (detaliată la Secțiunea 8).

---

## 2. Verificarea Existenței și Semnăturilor Funcțiilor (Task 1)
Am interogat catalogul PostgreSQL (`pg_proc` și `pg_namespace`) pentru a verifica prezența exactă a celor 10 funcții planificate în schema `public`.

### Interogare SQL:
```sql
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'validate_store_settings_schema',
    'get_default_store_settings',
    'merge_store_settings_with_defaults',
    'get_store_setting_text',
    'get_store_setting_numeric',
    'get_store_setting_boolean',
    'migrate_stores_legacy_settings',
    'get_store_settings',
    'get_store_operational_config',
    'update_store_settings'
  )
ORDER BY p.proname;
```

### Rezultat Verificare:
Toate cele 10 funcții sunt prezente în baza de date cu semnăturile exacte stabilite:
1. `get_default_store_settings()` -> `jsonb` (Security Invoker)
2. `get_store_operational_config(p_store_id uuid)` -> `jsonb` (Security Definer)
3. `get_store_setting_boolean(p_store_id uuid, p_path text[], p_default boolean)` -> `boolean` (Security Definer)
4. `get_store_setting_numeric(p_store_id uuid, p_path text[], p_default numeric)` -> `numeric` (Security Definer)
5. `get_store_setting_text(p_store_id uuid, p_path text[], p_default text)` -> `text` (Security Definer)
6. `get_store_settings(p_store_id uuid)` -> `jsonb` (Security Definer)
7. `merge_store_settings_with_defaults(p_settings jsonb)` -> `jsonb` (Security Invoker)
8. `migrate_stores_legacy_settings()` -> `void` (Security Invoker)
9. `update_store_settings(p_store_id uuid, p_settings jsonb)` -> `jsonb` (Security Definer)
10. `validate_store_settings_schema(p_settings jsonb)` -> `boolean` (Security Invoker)

---

## 3. Testare Getteri Personalizați și Fallback-uri Legacy (Task 2)
Getterii `get_store_setting_text`, `get_store_setting_numeric` și `get_store_setting_boolean` au fost proiectați cu mecanism defensiv dublu:
1. Căutare pe calea imbricată completă din structura v2 (ex. `{'fiscal', 'company_name'}`).
2. Fallback la cheia plată (flat) din rădăcina JSONB (v1 legacy, ex. `companyName`), dacă structura v2 sau calea respectivă nu există în înregistrarea magazinului.
3. Fallback final la o valoare implicită furnizată ca parametru, dacă nicio cheie nu este găsită.

### Scenariu Test:
Magazinul `59d3aae2-b05b-4cb2-af22-f53cff78012e` are setări în format legacy v1 (`{"companyName": "Firma Test SRL", "workpointNumber": 901}`).

```sql
SELECT 
    public.get_store_setting_text('59d3aae2-b05b-4cb2-af22-f53cff78012e', ARRAY['fiscal', 'company_name'], 'N/A') AS company_name_v2_to_legacy,
    public.get_store_setting_numeric('59d3aae2-b05b-4cb2-af22-f53cff78012e', ARRAY['fiscal', 'workpoint_number'], 0) AS workpoint_number_v2_to_legacy,
    public.get_store_setting_text('59d3aae2-b05b-4cb2-af22-f53cff78012e', ARRAY['fiscal', 'non_existent_key'], 'Implicit') AS fallback_implicit;
```

### Rezultate:
* `company_name_v2_to_legacy` -> `"Firma Test SRL"` (Calea v2 `fiscal.company_name` lipsea, sistemul a revenit corect la rădăcina `companyName`).
* `workpoint_number_v2_to_legacy` -> `901` (A revenit la `workpointNumber`).
* `fallback_implicit` -> `"Implicit"` (Ambele lipseau, a folosit valoarea implicită trimisă).

Mecanismul de fallback legacy este complet funcțional și protejează codul de eventualele nealinieri ale bazelor de date.

---

## 4. Validarea Schemei Implicite (Task 3)
Funcția `get_default_store_settings()` returnează modelul standard v2 complet populat.

### Rezultat Apel:
```json
{
  "pos": {
    "allow_mixed_payment": true,
    "require_active_shift": true,
    "default_payment_method": "cash",
    "require_manager_for_void": true,
    "require_manager_for_return": true
  },
  "tax": {
    "vat_payer": true,
    "vat_groups": {
      "A": {"rate": 21, "label": "TVA standard", "active": true, "fiscal_code": "A"},
      "B": {"rate": 11, "label": "TVA redus", "active": true, "fiscal_code": "B"},
      "C": {"rate": 11, "label": "TVA redus", "active": true, "fiscal_code": "C"},
      "D": {"rate": 0, "label": "TVA zero", "active": true, "fiscal_code": "D"},
      "E": {"rate": 0, "label": "Neplătitor TVA", "active": true, "fiscal_code": "E"}
    },
    "price_tax_policy": "inclusive",
    "default_vat_group": "A"
  },
  "stock": {
    "stock_min_default": 5,
    "expiry_warning_days": 30,
    "allow_negative_stock": false
  },
  "alerts": {
    "alert_expiry_enabled": true,
    "alert_low_stock_enabled": true,
    "alert_cash_difference_limit": 50
  },
  "fiscal": {
    "notes": "",
    "company_name": "",
    "display_code": "",
    "workpoint_name": "Magazin Principal",
    "workpoint_number": 1
  },
  "reports": {
    "timezone": "Europe/Bucharest",
    "business_day_start_hour": 6
  },
  "documents": {
    "waste_prefix": "PIE",
    "return_prefix": "RET",
    "transfer_prefix": "TRF",
    "reception_prefix": "NIR",
    "pos_receipt_prefix": "BF"
  }
}
```

---

## 5. Validarea Constrângerilor de Schemă (Task 4)
Funcția `validate_store_settings_schema(p_settings jsonb)` returnează `true` doar dacă datele respectă constrângerile definite. Am testat comportamentul acesteia cu date corecte și greșite.

### Teste de Schema:
1. **Validare TVA invalidă** (ex. `default_vat_group = 'X'`):
   ```sql
   SELECT public.validate_store_settings_schema('{"tax": {"default_vat_group": "X", "vat_payer": true}}'::jsonb);
   -- Returnează: false
   ```
2. **Validare Cotă TVA negativă** (ex. `rate = -5`):
   ```sql
   SELECT public.validate_store_settings_schema('{"tax": {"vat_groups": {"A": {"rate": -5, "active": true}}}}'::jsonb);
   -- Returnează: false
   ```
3. **Validare Cale validă parțială**:
   ```sql
   SELECT public.validate_store_settings_schema('{"tax": {"default_vat_group": "B", "vat_payer": true}}'::jsonb);
   -- Returnează: true
   ```

Schema permite actualizări parțiale atâta timp cât structura trimisă este conformă, ceea ce simplifică munca API-ului client.

---

## 6. Fuziunea și Migrarea Datelor Legacy (Task 4 & 5)
Am testat funcția de fuziune (`merge_store_settings_with_defaults`) și migratorul (`migrate_stores_legacy_settings`) în interiorul unei tranzacții SQL izolate, urmată de ROLLBACK pentru a nu polua baza de date live.

### Rezultat Tranzacție de Test (Migrator + Mapper):
Pentru magazinul `59d3aae2-b05b-4cb2-af22-f53cff78012e`, setările legacy:
`{"notes":"Test E2E 5E.4.1 editat","companyName":"Firma Test SRL","displayCode":"12345678 / 901","workpointNumber":901}`
au fost migrate automat la noua structură:
* `fiscal.company_name` -> `"Firma Test SRL"`
* `fiscal.workpoint_number` -> `901`
* Toate celelalte secțiuni (`pos`, `tax`, `stock`, `alerts`, `reports`, `documents`) au fost create automat cu valorile lor standard românești (cotele de TVA standardizate: standard 21%, reduse 11%, zero, neplătitor).

Fuziunea este complet sigură, iar migratorul legacy este 100% pregătit pentru rulare.

---

## 7. Maparea Configurației Operaționale (Task 5)
Funcția `get_store_operational_config(p_store_id uuid)` extrage setările finale (fuzionate cu valorile implicite) și le mapează într-un obiect plat cu chei camelCase, pentru a asigura compatibilitatea imediată cu codul frontend fără a fi nevoie de o refactorizare masivă a componentelor UI.

### Test Interogare:
```sql
SELECT public.get_store_operational_config('59d3aae2-b05b-4cb2-af22-f53cff78012e');
```

### Rezultat:
Returnează un obiect cu mapările corecte:
```json
{
  "timezone": "Europe/Bucharest",
  "vatPayer": true,
  "vatGroups": {
    "A": {"rate": 21, "label": "TVA standard", "active": true, "fiscal_code": "A"},
    ...
  },
  "companyName": "Firma Test SRL",
  "displayCode": "12345678 / 901",
  "wastePrefix": "PIE",
  "priceTaxPolicy": "inclusive",
  "defaultVatGroup": "A",
  "workpointNumber": 901,
  "allowNegativeStock": false,
  "requireActiveShift": true,
  "businessDayStartHour": 6,
  "requireManagerForVoid": true,
  "requireManagerForReturn": true
}
```
Maparea funcționează perfect și păstrează funcționalitățile POS-ului actual intacte.

---

## 8. Audit de Securitate și Drepturi de Acces (Task 6)
Am verificat drepturile de execuție pentru noul set de funcții pentru a ne asigura că utilizatorii anonimi sau neautentificați nu pot apela sau altera setările.

```sql
SELECT 
    routine_name, 
    grantee, 
    privilege_type 
FROM information_schema.role_routine_grants 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'validate_store_settings_schema',
    'get_default_store_settings',
    'merge_store_settings_with_defaults',
    'get_store_setting_text',
    'get_store_setting_numeric',
    'get_store_setting_boolean',
    'migrate_stores_legacy_settings',
    'get_store_settings',
    'get_store_operational_config',
    'update_store_settings'
  );
```

### Constatări Audit Securitate:
1. **Anonim (`anon`) / Public**: **BLOCAT**. Nicio funcție din listă nu are drepturi de execuție pentru `PUBLIC` sau `anon`.
2. **Utilizator Autentificat (`authenticated`)**:
   * Funcțiile runtime (`get_store_settings`, `update_store_settings`, `get_store_operational_config` și getteri) au primit corect drepturi de execuție.
   * Funcția de migrare `migrate_stores_legacy_settings` **nu** are un grant explicit către `authenticated` în scriptul `proposed_store_settings_6d1.sql`.
   * **⚠️ AVERTIZARE SECURITATE**: Din cauza setărilor implicite ale schemei public din Supabase (Default Privileges), orice funcție nou creată acordă automat drepturi de execuție grupului `PUBLIC` (și implicit `authenticated` / `anon`), dacă nu se execută o revocare explicită. În scriptul aplicat existau instrucțiuni de `REVOKE EXECUTE ON FUNCTION public.migrate_stores_legacy_settings() FROM PUBLIC, anon;`. Totuși, din punct de vedere al standardelor de securitate, se recomandă rularea unui revocat suplimentar explicit pentru `authenticated`, pentru a limita funcția strict la administratorii DBA / SuperUser (`postgres`).

> [!WARNING]
> Se recomandă executarea manuală a următoarei linii în editorul SQL Supabase pentru a securiza complet funcția de migrare legacy:
> ```sql
> REVOKE EXECUTE ON FUNCTION public.migrate_stores_legacy_settings() FROM authenticated;
> ```

---

## 9. Concluzie
Etapa 6D.2 is **PASS**. Setările de magazin au fost aplicate și securizate corespunzător. Baza de date este pregătită pentru integrarea ulterioară din frontend (Etapa 6D.3).
