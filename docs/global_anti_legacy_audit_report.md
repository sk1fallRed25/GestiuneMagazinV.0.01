# Global Anti-Legacy Audit Report

## 1. Rezumat Executiv
În cadrul etapei 4A a fost efectuat un audit global pentru identificarea referințelor rămase la structura legacy (tabele, câmpuri, tipuri nesigure). 

- **Referințe la tabele legacy:** Au fost identificate referințe în servicii vechi și module nemigrate (`FastAdd`, `AiConsultant`, module `shared/services`). 
- **Câmpuri legacy:** S-au găsit multiple referințe (ex: `pret_vanzare`, `cod_bare`, `stoc_magazin`), majoritatea acceptabile temporar la nivel de UI sau DB Local (Dexie), însă `magazin_role` în localStorage reprezintă un risc de securitate ce trebuie migrat curând.
- **`any` / Type-safety issues:** S-au detectat tipuri `any` în servicii vechi, `MainLayout`, `AiConsultant` și `AppRoutes`.

## 2. Referințe la tabele legacy

| Fișier | Referință (tabel) | Severitate | Acțiune Recomandată |
|---|---|---|---|
| `shared/hooks/useProduse.ts` | `produse` | Medie | Eliminare completă (funcționalitate preluată de v2) |
| `shared/services/salesService.ts` | `vanzari`, `detalii_vanzare`, `produse` | Medie | Eliminare (modulul POS e pe v2) |
| `shared/services/statsService.ts` | `vanzari`, `produse`, `utilizatori`, `detalii_vanzare` | Medie | Eliminare (funcționalitate preluată de Dashboard v2) |
| `shared/services/shiftService.ts` | `ture` | Medie | Eliminare (vom folosi `cashier_shifts`) |
| `shared/services/userService.ts` | `utilizatori` | Medie | Eliminare (funcționalitate preluată de profile) |
| `shared/services/deliveryService.ts` | `livrari`, `produse` | Medie | Eliminare / Migrare la v2 |
| `FastAdd.tsx` | `produse` | **Critică** | Migrare la `products` / `product_prices` v2. Va crăpa la inserare. |
| `AiConsultant.tsx` | `produse` | Medie | Refactorizare pentru a citi din schema v2. |

## 3. Referințe la câmpuri legacy

| Fișier | Câmp | Motiv | Status |
|---|---|---|---|
| Multiple (ex: `transfers`, `reception`) | `cod_bare`, `stoc_magazin`, `stoc_depozit`, `pret_vanzare` | Compatibilitate UI intenționată | Acceptabil temporar |
| `Login.tsx`, `AppRoutes.tsx`, `ProtectedRoute.tsx` | `magazin_role`, `localStorage.getItem` | Sistem legacy de roluri | Trebuie migrat la roluri Supabase Auth |
| `shared/hooks/useProduse.ts` | `furnizor_id` | Relație legacy | Eliminare |
| `local-db/db.ts` | `cod_bare`, `pret_vanzare`, `stoc_magazin` | Offline sync legacy | Trebuie migrat la schema offline v2 mai târziu |

## 4. any / type-safety issues

| Fișier | Problemă | Risc | Corectat acum |
|---|---|---|---|
| `AppRoutes.tsx` | `localStorage.getItem('magazin_role') as any` | Scăzut | Da (`as UserRole`) |
| `MainLayout.tsx` | Prop-uri UI (`event: any`, `NavLink: any`) | Scăzut | Nu (necesită refactor UI minor) |
| `IstoricPierderi.tsx` | `useState<any[]>([])` | Mediu | Nu (va fi rescris în v2) |
| `FastAdd.tsx` | `catch (err: any)` | Scăzut | Nu (va fi rescris în v2) |
| `AiConsultant.tsx` | Multiple `(h: any)` pe date legacy | Ridicat | Nu (va fi rescris în v2) |

## 5. Module rămase de migrat

Ordine recomandată pentru continuarea migrării:

1. **FastAdd v2**: Este esențial să funcționeze corect pe schema v2 (`products`, `product_prices`, `stock_batches`) pentru a permite adăugarea de produse noi.
2. **Istoric Pierderi v2**: Folosește date v2, necesită doar adaptare UI.
3. **Curățare Auth / localStorage legacy**: Centralizare autentificare și eliminare completă a rolurilor din localStorage.
4. **AI Consultant v2 data adapter**: Modificare interogări pentru a compila statistici pe date din `sales`, `stock_movements`.
5. **Offline/Dexie v2**: Adaptare sync offline, planificat pentru finalul procesului.
6. **Fiscal Bridge**: Integrare după stabilizarea fluxurilor.
7. **Owner Console / approve admin**: Mai târziu.

## 6. Rute și navigație
S-au inspectat rutele în `AppRoutes.tsx`.
- Toate rutele active duc către module existente (migrare v2 sau în curs).
- Nu există linkuri către module șterse complet (ex: Furnizori, Agenți).
- Rolurile definite (`admin`, `platform_owner`, `manager`, `gestionar`, `casier`) sunt corecte pe direcția nouă.

## 7. Decizie următoare recomandată
Recomandăm inițierea imediată a **Etapei 4B: Migrare FastAdd la schema v2**, având în vedere că adăugarea produselor este un flux critic blocat în prezent (referințe către tabela inexistentă `produse`).
