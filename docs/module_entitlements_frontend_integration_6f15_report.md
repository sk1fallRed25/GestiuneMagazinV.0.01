# Module Entitlements Frontend Integration — Etapa 6F.1.5 & 6F.1.5.1

## 1. Rezumat
*   **Status**: PASS
*   **Descriere**: Frontend-ul a fost integrat complet cu sistemul de autorizare și entitlements din baza de date. Toate verificările de route guard și elementele de sidebar se aliniază dinamic cu înregistrările platformei din tabelele `platform_modules` și `store_module_access`.
*   **Modificări Database (DB)**: Nicio modificare de schemă. S-a aplicat un hotfix strict de securitate (`REVOKE DML`) pentru a bloca orice scrieri directe din partea rolului `authenticated`, asigurând un mediu RPC-only.
*   **SQL Aplicat**: `database/hotfix_module_entitlements_revoke_dml_6f151.sql` (aplicat cu succes).

## 2. Tipuri și Service
*   **Tipuri (`types.ts`)**: Defintește interfețele `PlatformModule`, `StoreModuleAccessItem` și `ModuleAccessMap`. Include parsere defensive (`parseStoreModuleAccessItem`, `parsePlatformModule`) pentru a preveni crash-urile din cauza valorilor nule/indefinite.
*   **Service (`moduleEntitlementsService.ts`)**: Oferă trei funcții de bază care apelează exclusiv RPC-urile securizate din PostgreSQL:
    *   `getPlatformModules()` -> `rpc('get_platform_modules')`
    *   `getStoreModuleAccess(storeId)` -> `rpc('get_store_module_access')`
    *   `canAccessStoreModule(storeId, moduleKey)` -> `rpc('user_can_access_store_module')`
*   **Securitate**: Service-ul este complet read-only și nu realizează scrieri (DML) directe pe tabele.

## 3. Hook / Provider
*   **Hook (`useModuleEntitlements.ts`)**: Gestionează starea și caching-ul local al permisiunilor per `storeId`. De asemenea, oferă funcția `isModuleEnabled(moduleKey)` care evaluează starea `effectiveEnabled` determinată de baza de date.
*   **Provider (`ModuleEntitlementsContext.tsx`)**: Expune contextul modulelor în întreaga aplicație React, fiind montat în `AppProviders.tsx` în interiorul `AuthProvider`.

## 4. Route Guard
*   **ProtectedRoute (`ProtectedRoute.tsx`)**:
    *   Interceptează accesul la nivel de rută folosind mapping-ul declarativ din `permissions.ts`.
    *   Dacă o rută necesită un `moduleKey`, verifică dacă modulul este `effectiveEnabled` pentru magazinul curent.
    *   Dacă modulul este dezactivat sau planificat, randează direct componenta `DisabledModulePage`.
    *   Asigură că utilizatorii fără context magazin nu pot accesa module operaționale (cu excepția owner-ului pe ruta de administrare `/owner`).
*   **Restricții UI (`DisabledModulePage.tsx`)**:
    *   Afișează un ecran premium de acces restricționat.
    *   Distinge vizual între un modul dezactivat (status `disabled` / lipsă override) și un modul planificat (status `planned`).

## 5. Sidebar Filtering
*   **Filtrare (`MainLayout.tsx`)**:
    *   Link-urile din sidebar sunt randate condiționat utilizând apelul `isModuleEnabled(moduleKey)`.
    *   Modulele dezactivate sunt complet ascunse din UI.
    *   Owner-ul platformei fără context magazin selectat are acces doar la secțiunea de administrare.
    *   Modulul `ai_consultant` este dezactivat implicit (deoarece are `default_enabled = false` în registry).

## 6. E2E Test
*   **Test (`test_module_entitlements_frontend_6f15.py`)**:
    *   A fost refactorizat pentru a elimina complet DML-ul direct (cum ar fi `.delete()` sau `.update()`).
    *   Folosește RPC-ul `set_store_module_access` pentru activare și dezactivare/cleanup controlat.
    *   Validează comportamentul initial dezactivat (link ascuns din sidebar, direct navigation redirecționează către `DisabledModulePage`).
    *   Validează activarea modulului (link vizibil, navigarea se face corect către pagină).
    *   Verifică statusul modulului planned (folosind `offline_sync` direct din baza de date fără modificări de registry, documentat ca `NOT TESTED IN ROUTER` deoarece nu are o pagină UI).
    *   Toate testele rulează cu succes (Exit code: 0).

## 7. Security Alignment
*   **Enforcement**: Rolul `authenticated` nu mai are privilegii direct de scriere pe tabelele de entitlements (`platform_modules` și `store_module_access`).
*   **Grants verificate**:
    *   `SELECT` direct: `true` (permis pentru citire din cache/hook).
    *   `INSERT`, `UPDATE`, `DELETE` direct: `false` (complet revocate).
*   Scrierile se fac exclusiv prin RPC-ul `set_store_module_access` (validat de sistem).

## 8. Limitări
*   UI-ul de management module în Owner Console nu este inclus în această etapă (este planificat pentru 6F.1.6).
*   Sincronizarea offline și Fiscal Bridge sunt momentan marcate ca `planned` (în curs de dezvoltare) și nu au rute UI mapate în cod.

## 9. Build
*   Comanda `npm run build` a compilat fără avertismente de compilare sau erori TypeScript:
    `✓ built in 2.66s`

## 10. Decizie
*   **Rezultat**: Pregătit pentru **Etapa 6F.1.6: Owner Console Module Management UI**. Sistemul de permisiuni este complet securizat și validat.
