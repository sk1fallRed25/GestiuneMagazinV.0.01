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

## Rezultate Tehnice
- **Securitate**: Autentificarea este acum centralizată și securizată prin JWT (Supabase).
- **Consistență**: Nu mai există conflicte între un utilizator logat legacy și unul logat v2.
- **Build Status**: Verificat prin `npm run build` (Exit code: 0).

## Ce NU s-a modificat
- Nu s-au modificat tabelele de bază de date sau politicile RLS.
- Designul paginii de Login a rămas neschimbat, păstrând estetica premium.
- Funcționalitatea de "Switch Store" rămâne intactă, fiind deja bazată pe schema v2.
