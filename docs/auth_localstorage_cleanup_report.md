# Raport de Migrare: Etapa 4E - Curățare Auth / localStorage Legacy

## Context
Aplicația a fost migrată la schema v2, dar sistemul de autentificare păstra încă mecanisme de fallback ("legacy login") bazate pe `localStorage` și conturi hardcodate. Acestea reprezentau o vulnerabilitate și o sursă de incoerență în gestionarea rolurilor.

## Obiectiv Realizat
Am eliminat complet dependența de `localStorage` pentru logica de autentificare și autorizare. Acum, sistemul se bazează exclusiv pe Supabase Auth v2.

## Modificări Implementate

### 1. Eliminare Legacy Login (`Login.tsx`)
- Am eliminat flag-ul `VITE_ALLOW_LEGACY_LOGIN`.
- Am șters conturile hardcodate (`admin/admin`, `casier/1234`).
- Am eliminat logica de scriere în `localStorage` a cheilor `magazin_role`.
- Procesul de login folosește acum exclusiv `AuthContext` (Supabase Auth).

### 2. Curățare Rutare (`AppRoutes.tsx` & `ProtectedRoute.tsx`)
- Am eliminat citirea `magazin_role` din `localStorage`.
- Variabila `userRole` este acum determinată exclusiv din contextul de autentificare (`authRole`).
- În `ProtectedRoute.tsx`, accesul este permis doar dacă există o sesiune Supabase validă și profilul corespunzător.

### 3. Optimizare Logout
- În loc de `localStorage.clear()`, care putea șterge preferințe legitime ale utilizatorului, procesul de logout acum:
    1. Apelează `authLogout()` (Supabase SignOut).
    2. Șterge explicit doar cheile legacy identificate: `magazin_role`, `magazin_user_id`, `magazin_user`, `agent_id`.

### 4. Integritate Roluri
- Rolurile sunt extrase în timp real din `profiles.role` sau `store_members.role`.
- Nu mai există posibilitatea de a "injecta" un rol manual în `localStorage` pentru a păcăli sistemul de permisiuni (deoarece Supabase RLS și contextul React verifică acum sursa autoritativă).

## Chei localStorage Eliminate/Dezactivate
- `magazin_role`
- `magazin_user_id`
- `magazin_user`
- `agent_id`

## Corecții Etapa 4E.1

- **Hardening Login**: Am înlocuit `catch (err: any)` cu `catch (err: unknown)` în `Login.tsx` și am implementat helper-ul `getErrorMessage` pentru o gestionare sigură a erorilor de tip.
- **Tipizare Strictă AuthService**: Am definit interfețele `StoreRow` și `RawStoreMembership` în `authService.ts`, eliminând complet utilizarea tipului `any`.
- **Curățare Semnături**: Am eliminat parametrul nefolosit `role` din funcția `getFirstAvailableStore` din `authService.ts`.
- **Eliminare Aliasuri Legacy**: Am șters proprietățile `tenantId` și `storeId` din `AuthState` (`types.ts`) și din logica de gestionare a stării din `AuthContext.tsx`, deoarece nu mai erau referențiate nicăieri în aplicație (confirmare prin audit global `grep`).
- **Refactor ProductsPage**: Am eliminat prop-ul `userRole` din componenta `ProductsPage` și din ruta corespunzătoare din `AppRoutes.tsx`. Componenta citește acum rolul direct din `useAuth`, simplificând fluxul de date.
- **Audit Final**: Am confirmat prin scanare automată eliminarea tuturor referințelor către `VITE_ALLOW_LEGACY_LOGIN`, `admin/admin`, `casier/1234` și `any` din modulele de autentificare.
- **Build Status**: Verificat prin `npm run build` (Exit code: 0).

