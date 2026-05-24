# Product VAT Config Rates Hotfix Guide — Etapa 6D.4.1.1

## 1. Scop
- Repararea potențialelor nealinieri de rate în output-ul funcției `get_product_vat_config` cauzate de eventuale setări legacy 19/9/5 prezente în `stores.settings`.
- Garantarea conformității cu standardul fiscal curent din România la nivel de runtime:
  - Grupa A = 21%
  - Grupa B = 11%
  - Grupa C = 11%
  - Grupa D = 0%
  - Grupa E = 0% (Neplătitor TVA)
- Separarea strictă a configurabilității (label, active, default_vat_group) de logica ratelor de taxare, care sunt controlate rigid de sistem.

## 2. Fișier de aplicat
- `database/hotfix_product_vat_config_rates_6d411.sql`

## 3. Pași manuali Supabase
1. Conectează-te la dashboard-ul Supabase al proiectului.
2. Deschide **SQL Editor**.
3. Copiază întregul conținut din `database/hotfix_product_vat_config_rates_6d411.sql`.
4. Apasă pe **Run** pentru a executa scriptul.
5. > [!IMPORTANT]
   > Nu rula niciun script de backfill pe `product_prices` și nu efectua modificări în masă asupra prețurilor. Tranzacția redefinește doar funcția de merge, neafectând structura datelor existente.

## 4. Verificare după aplicare
Rulează următoarele interogări în editorul SQL pentru a valida aplicarea corectă:

```sql
-- 1. Testare merge cu input legacy care suprascrie ratele la 19/9/5
SELECT 
  (public.merge_store_settings_with_defaults('{
    "tax": {
      "vat_groups": {
        "A": {"rate": 19, "label": "Custom TVA A"},
        "B": {"rate": 9, "label": "Custom TVA B"},
        "C": {"rate": 5, "label": "Custom TVA C"}
      }
    }
  }'::jsonb) -> 'tax' -> 'vat_groups') as test_merged_groups;

-- Rezultat așteptat (ratele sunt forțate la 21, 11, 11, dar etichetele sunt păstrate):
-- {"A": {"rate": 21, "label": "Custom TVA A", "active": true, "fiscal_code": "A"}, ...}

-- 2. Verificare runtime pentru magazinul principal
SELECT public.get_product_vat_config('00000000-0000-0000-0000-000000000001'::uuid) as config_active;
```

## 5. Rollback
Dacă este necesar să reveniți la implementarea anterioară:
1. Re-aplicați definiția funcției `merge_store_settings_with_defaults` din blueprint-ul original `database/proposed_store_settings_6d1.sql`.
2. Nu sunt necesare operațiuni de rollback de date în tabele, deoarece acest hotfix nu modifică direct datele persistente.
