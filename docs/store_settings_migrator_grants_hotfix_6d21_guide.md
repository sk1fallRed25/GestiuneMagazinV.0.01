# Store Settings Migrator Grants Hotfix Guide — Etapa 6D.2.1

## 1. Scop
* Securizarea funcției administrative `public.migrate_stores_legacy_settings()`.
* Blocarea permisiunii implicite de execuție pentru rolul `authenticated` și utilizatorii anonimi (`PUBLIC`, `anon`).
* Nu modifică date, nu inserează înregistrări noi și nu rulează în mod automat migratorul.

## 2. Fișier de aplicat
* [hotfix_store_settings_migrator_grants_6d21.sql](../database/hotfix_store_settings_migrator_grants_6d21.sql)

## 3. Pași manuali în Supabase
1. Conectează-te la consola Supabase.
2. Deschide meniul **SQL Editor** și creează un tab nou.
3. Copiază conținutul fișierului `database/hotfix_store_settings_migrator_grants_6d21.sql` în editor.
4. Rulează scriptul (**Run**).
5. Confirmă succesul execuției (mesajul `Success. No rows returned` sau echivalent).

## 4. Verificare după aplicare
Rulează următoarea interogare în SQL Editor pentru a confirma revocarea drepturilor:

```sql
SELECT
    has_function_privilege('anon', 'public.migrate_stores_legacy_settings()', 'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated', 'public.migrate_stores_legacy_settings()', 'EXECUTE') AS authenticated_execute,
    has_function_privilege('public', 'public.migrate_stores_legacy_settings()', 'EXECUTE') AS public_execute;
```

### Rezultat așteptat:
```
anon_execute | authenticated_execute | public_execute
-------------+-----------------------+---------------
false        | false                 | false
```

## 5. Rollback
Dacă vreodată se dorește rularea controlată a migratorului de către administratori:
* Funcția se rulează manual direct din Supabase SQL Editor ca DBA/admin (`postgres`).
* Nu este necesar și nu se recomandă acordarea unui drept permanent de execuție către rolul `authenticated`.
