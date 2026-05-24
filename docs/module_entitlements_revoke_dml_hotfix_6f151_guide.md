# Guide: Module Entitlements Revoke DML Hotfix (6F.1.5.1)

This guide documents the database security hardening applied in **Etapa 6F.1.5.1** to enforce RPC-only writes for the module entitlements tables.

## Problem Description
Initially, the `authenticated` database role had direct table write privileges (`INSERT`, `UPDATE`, `DELETE`) on:
- `public.platform_modules`
- `public.store_module_access`

This allowed potential client-side bypass of validation logic by directly editing the registry or overrides, bypassing security safeguards like checking if a module is planned before activation.

## Hardening Applied
A minimal hotfix SQL script was created at `database/hotfix_module_entitlements_revoke_dml_6f151.sql` and applied to the database:

```sql
REVOKE INSERT, UPDATE, DELETE ON public.platform_modules FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_module_access FROM authenticated;

GRANT SELECT ON public.platform_modules TO authenticated;
GRANT SELECT ON public.store_module_access TO authenticated;
```

This enforces that:
1. Standard users (`authenticated` role) can only read (`SELECT`) directly from these tables.
2. All modifications to store access overrides must be performed via the authorized RPC `set_store_module_access`, which contains explicit validation rules.

## Verification
You can verify the active privileges by running:
```sql
SELECT 
  has_table_privilege('authenticated', 'public.platform_modules', 'SELECT') AS pm_select,
  has_table_privilege('authenticated', 'public.platform_modules', 'INSERT') AS pm_insert,
  has_table_privilege('authenticated', 'public.platform_modules', 'UPDATE') AS pm_update,
  has_table_privilege('authenticated', 'public.platform_modules', 'DELETE') AS pm_delete,
  has_table_privilege('authenticated', 'public.store_module_access', 'SELECT') AS sma_select,
  has_table_privilege('authenticated', 'public.store_module_access', 'INSERT') AS sma_insert,
  has_table_privilege('authenticated', 'public.store_module_access', 'UPDATE') AS sma_update,
  has_table_privilege('authenticated', 'public.store_module_access', 'DELETE') AS sma_delete;
```
Expected output:
* `pm_select`/`sma_select`: `true`
* `pm_insert`/`pm_update`/`pm_delete`/`sma_insert`/`sma_update`/`sma_delete`: `false`
