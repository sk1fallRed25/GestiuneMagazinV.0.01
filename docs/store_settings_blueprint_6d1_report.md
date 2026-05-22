# Store Settings Blueprint Report (Etapa 6D.1.1)

This report details the architectural audit and proposed design for operational settings in **Gestiune Magazin v2**, aligned with Romanian fiscal Tax Groups and complete database-level RPC APIs.

---

## 1. Current State Audit

A static audit of the codebase was conducted to map existing configurations, database columns, and hardcoded values.

### A. Database Settings Column
The table `public.stores` has a column `settings` of type `jsonb` defaulting to `'{}'::jsonb`. Currently, active store settings utilize a flat schema containing:
* `workpointNumber`: integer (between 1 and 999) representing the workpoint ID.
* `displayCode`: string formatted as `CUI / PunctLucru` (e.g. `RO12345678 / 1`).
* `companyName`: string representing the legal entity name (e.g., `SC TEST SRL`).
* `notes`: optional administrator comments.

These properties are parsed in `ownerConsoleService.ts` via the helper `parseStoreSettings`.

### B. Hardcoded Values in the Codebase
The audit identified several values currently hardcoded at the frontend and backend service layers:
1. **VAT / TVA Percentages**:
   * **Receptions**: `useReception.ts` defaults the VAT percent state to `19` (`useState<number>(19)`). It also contains a fallback inside reception creation payloads.
   * **Fast Add**: `useFastAdd.ts` registers a default string value `'19'` for `vatPercent`.
   * **POS Operations**: `posService.ts` checks product prices; if the price is missing or the VAT value is null, it defaults to `19`.
   * **Products Management**: `productService.ts` defaults `vatPercent` to `19` when upserting prices if no prior pricing record is present.
2. **Payment Methods**:
   * POS sales default to `'cash'` (`usePos.ts` line 16). Supported methods are cash, card, and mixed, but they are defined statically.
3. **CUI and Workpoints**:
   * CUI is stored directly in `stores.fiscal_code` (and normalized to uppercase, stripped of whitespace).
   * The workpoint number is stored flat in `stores.settings.workpointNumber`.

### C. Gaps for a Production Pilot
The following settings must be configurable per-store to support a real-world environment:
* **Romanian VAT Tax Groups**: Support for Romanian fiscal printer tax groups:
  * **Group A**: 21% (Standard VAT)
  * **Group B**: 11% (Reduced VAT)
  * **Group C**: 11% (Reduced VAT - Services/Horeca)
  * **Group D**: 0% (Exempt VAT with deduction)
  * **Group E**: 0% / NEPLĂTITOR TVA (Exempt VAT without deduction)
* **Tax Policy**: Inclusive vs. Exclusive pricing flags (retail POS is inclusive, wholesale or B2B is exclusive).
* **Stock Controls**: Customizable low-stock alert thresholds, negative stock allowance toggles, and expiry alert windows.
* **POS Security**: cashier override permissions (requiring manager role) for voids and returns.
* **Document Series & Prefixes**: Prefix sequences for receipts (`BF`), returns (`RET`), receptions (`NIR`), waste/losses (`PIE`), and transfers (`TRF`).
* **Reporting Intervals**: Core operational daily boundaries (business day start offset, timezone definition).

---

## 2. Proposed JSONB Schema for `stores.settings`

To avoid database bloat and maintain flexibility, a nested JSONB structure inside the existing `stores.settings` column is proposed:

```json
{
  "fiscal": {
    "workpoint_number": 1,
    "workpoint_name": "Magazin Principal",
    "company_name": "SC ALFA BETA SRL",
    "display_code": "RO12345678 / 1",
    "reg_number": "J40/12345/2026",
    "phone": "0722000000",
    "email": "contact@alfabeta.ro",
    "city": "Bucuresti",
    "county": "Sector 1",
    "address_full": "Str. Florilor Nr. 12, Corp A",
    "notes": "Magazin pilot"
  },
  "tax": {
    "vat_default_group": "A",
    "price_tax_policy": "inclusive",
    "tax_groups": [
      {
        "group": "A",
        "percent": 21,
        "label": "TVA 21% (Cota Standard)"
      },
      {
        "group": "B",
        "percent": 11,
        "label": "TVA 11% (Cota Redusa)"
      },
      {
        "group": "C",
        "percent": 11,
        "label": "TVA 11% (Servicii/Horeca)"
      },
      {
        "group": "D",
        "percent": 0,
        "label": "TVA 0% (Scutit cu deducere)"
      },
      {
        "group": "E",
        "percent": 0,
        "label": "Scutit fara deducere / Neplatitor"
      }
    ]
  },
  "stock": {
    "stock_min_default": 5.0,
    "allow_negative_stock": false,
    "expiry_warning_days": 30
  },
  "pos": {
    "default_payment_method": "cash",
    "allow_mixed_payment": true,
    "require_active_shift": true,
    "require_manager_for_void": true,
    "require_manager_for_return": true
  },
  "documents": {
    "pos_receipt_prefix": "BF",
    "return_prefix": "RET",
    "reception_prefix": "NIR",
    "waste_prefix": "PIE",
    "transfer_prefix": "TRF"
  },
  "reports": {
    "business_day_start_hour": 6,
    "timezone": "Europe/Bucharest"
  },
  "alerts": {
    "alert_low_stock_enabled": true,
    "alert_expiry_enabled": true,
    "alert_cash_difference_limit": 50.0
  }
}
```

---

## 3. Database Layer Architecture (SQL Blueprint)

The SQL blueprint in `database/proposed_store_settings_6d1.sql` provides:
1. **Schema Validation Function (`validate_store_settings_schema`)**: Evaluates new or updated JSONB payloads against typing and structure rules. Supports validation of the `tax_groups` array structure.
2. **Access Helpers**:
   * `get_store_setting_text(store_id, path, default_value)`
   * `get_store_setting_numeric(store_id, path, default_value)` — Enhanced to dynamically resolve default VAT percentage from `tax_groups` when querying for `['tax', 'vat_default']`.
   * `get_store_setting_boolean(store_id, path, default_value)`
   They fallback to old flat legacy keys if the new sections do not exist yet.
3. **Idempotent Migrator (`migrate_stores_legacy_settings`)**: Safely updates existing records, shifting `workpointNumber`, `companyName`, and `displayCode` to the new nested `fiscal` structure, appending default pilot parameters for the other categories.

### 4. Planned RPC APIs
* **`get_store_settings(p_store_id uuid) RETURNS jsonb`**:
  * Retrieves the store's settings.
  * If settings do not exist or are in legacy format, returns on-the-fly initialized default settings (including aligned Romanian VAT groups).
  * *Access Control*: Restricted to store members (`admin`, `manager`, `gestionar`, `casier`) or `platform_owner`.
* **`update_store_settings(p_store_id uuid, p_settings jsonb) RETURNS void`**:
  * Validates the schema using `validate_store_settings_schema`.
  * Saves the setting changes and logs a corresponding audit row in `public.audit_logs`.
  * *Access Control*: Restricted to store `admin`, `manager` or `platform_owner`.
* **`get_store_operational_config(p_store_id uuid) RETURNS jsonb`**:
  * Extracts a flattened operational settings object containing core properties needed at checkout, receptions, or stock actions.
  * Extracted fields: `companyName`, `workpointNumber`, `displayCode`, `priceTaxPolicy`, `vatDefaultGroup`, `taxGroups` array, `allowNegativeStock`, `requireActiveShift`, `requireManagerForVoid`, `requireManagerForReturn`, `posReceiptPrefix`, `returnPrefix`.
  * *Access Control*: Restricted to store members or `platform_owner`.

---

## 5. Next Implementation Steps (Phase 6D.2)

1. **Apply database migrator & helper functions**: Execute the blueprint script in the Supabase SQL Editor.
2. **Attach settings schema validation constraint**: Enable database-level safety checks on `stores.settings`.
3. **Replace Hardcoded Frontend Hooks**:
   * Map `useReception.ts` VAT selection options to `store.settings.tax.tax_groups`.
   * Map `useFastAdd.ts` VAT selection options to `store.settings.tax.tax_groups`.
   * Fetch `price_tax_policy` and use it to determine UI pricing displays.
4. **Enforce POS Stock Rules**:
   * Integrate the `allow_negative_stock` flag inside `usePos.ts` cart verification routines.
5. **Role-Based Authorizations**:
   * Add manager role validations before calling void/return routines if `require_manager_for_void`/`require_manager_for_return` are enabled.
6. **Store Settings Panel UI**:
   * Create a Store Settings view inside the Owner Console to allow authorized administrators (`admin`, `platform_owner`) to configure these values.
