# Raport Migrare Frontend: Auth & Store Context (Etapa 2A)

**Status:** Finalizat (Gata pentru Etapa 2B)

## 1. Schimbări Majore în Structura Auth

Am adaptat sistemul de autentificare pentru a lucra exclusiv cu schema **v2**, eliminând complet dependența de `tenant_id` și rolurile legacy.

### Modificări Tipuri (`src/features/auth/types.ts`)
- **UserRole:** Actualizat la `platform_owner`, `admin`, `manager`, `gestionar`, `casier`. Eliminat `tenant_admin`, `agent`, `furnizor`.
- **AuthProfile:** Refactorizat pentru a reflecta tabela `public.profiles` v2.
- **Store & StoreMembership:** Introduse interfețe noi pentru a gestiona accesul la magazine multiple.
- **AuthState:** Include acum `currentStore`, `availableStores`, `currentStoreId` și `storeRole`. Păstrează alias-uri legacy (`tenantId`, `storeId`) pentru a preveni erori de build în restul aplicației.

### Serviciul Auth (`src/features/auth/authService.ts`)
- `getCurrentProfile(userId)`: Citește profilul v2, verifică statusul `active`.
- `getUserStoreMemberships(userId)`: Încarcă toate magazinele la care un utilizator are acces activ prin `store_members` JOIN `stores`.
- `getFirstAvailableStore(userId)`: Helper pentru selecția automată a primului magazin la login.

### Contextul Auth (`src/features/auth/AuthContext.tsx`)
- Fluxul de inițializare încarcă profilul și apoi asocierile cu magazinele.
- **Platform Owner:** Poate intra în aplicație chiar dacă nu este membru explicit într-un magazin (permite administrare globală).
- **Staff:** Este blocat la login dacă nu are nicio asociere activă cu un magazin (`store_members`).
- S-a adăugat metoda `switchStore(storeId)` pentru viitoarea funcționalitate multi-punct de lucru.

## 2. Adaptare UI & Permisiuni

### Permisiuni (`src/features/auth/permissions.ts`)
- Eliminat `tenant_admin` din toate regulile.
- `platform_owner` are acces total (super-admin).
- Restul rolurilor păstrează ierarhia: Admin > Manager > Gestionar > Casier.

### Layout (`src/app/MainLayout.tsx`)
- Folosește `useAuth()` pentru a afișa numele complet (`profile.full_name`) și numele magazinului curent (`currentStore.name`).
- Actualizat monitorizarea realtime pentru a asculta de `waste_events` (v2) în loc de `pierderi` (legacy).
- Interogările pentru notificări acum caută în `profiles` în loc de `utilizatori`.

## 3. Rezultat Build

- Comanda `npm run build` a finalizat cu succes (Exit code: 0).
- S-au reparat erorile de tipuri din `navigation.tsx` (roluri legacy) și `authService.ts` (mapping join magazine).

## 4. Următorii Pași (Etapa 2B)

- **Product Adaptor:** Crearea unui serviciu `ProductServiceV2` care să mapeze tabelele `products`, `product_prices` și `stock_batches` către interfața veche de `Product` pentru a menține UI-ul funcțional fără refactorizare masivă.
- **Stocuri:** Adaptarea calculului de stoc depozit/magazin din loturile v2.
