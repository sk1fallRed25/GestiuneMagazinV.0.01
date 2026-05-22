/*
  ============================================================================
  HOTFIX: Store Settings Migrator Grants Lockdown — Etapa 6D.2.1
  Proiect: Gestiune Magazin v2
  Scop:
  - Blochează execuția funcției administrative migrate_stores_legacy_settings()
    pentru rolurile aplicației.
  - Funcția trebuie rulată doar manual de DBA/admin din Supabase SQL Editor.
  - Nu modifică date.
  - Nu rulează migratorul.
  ============================================================================
*/

REVOKE EXECUTE ON FUNCTION public.migrate_stores_legacy_settings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migrate_stores_legacy_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.migrate_stores_legacy_settings() FROM authenticated;

/*
  Verificare read-only după aplicare:

  SELECT
      has_function_privilege('anon', 'public.migrate_stores_legacy_settings()', 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', 'public.migrate_stores_legacy_settings()', 'EXECUTE') AS authenticated_execute,
      has_function_privilege('public', 'public.migrate_stores_legacy_settings()', 'EXECUTE') AS public_execute;
*/
