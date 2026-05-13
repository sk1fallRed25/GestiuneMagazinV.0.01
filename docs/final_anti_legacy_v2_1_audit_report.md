# Final Anti-Legacy v2.1 Audit Report

## 1. Rezumat Executiv
- **Status global**: Curat (Aproape 100% migrat în fluxurile active).
- **Număr referințe legacy critice**: 0 (toate referințele active către tabele vechi au fost mutate în `features/`).
- **Număr referințe docs/comment**: ~15 (comentarii istorice și documentație).
- **Număr any critic**: Redus semnificativ (corectat în `MainLayout`, `AiConsultant` și `lossService`).
- **Recomandare următoare**: **Etapa 4G: Dead Code Cleanup** (Eliminarea fizică a fișierelor din `src/shared/services` și `src/shared/hooks` care nu mai sunt importate).

## 2. Tabele legacy
Toate tabelele listate mai jos sunt referențiate doar în fișiere de tip "Dead Code" (servicii vechi care nu mai sunt importate de nicio componentă activă).

| Tabel | Referință | Fișier | Severitate | Status | Acțiune |
|-------|-----------|--------|------------|--------|---------|
| `produse` | `from('produse')` | `shared/services/salesService.ts` | Scăzută | Dead Code | Propunere ștergere fișier |
| `vanzari` | `from('vanzari')` | `shared/services/statsService.ts` | Scăzută | Dead Code | Propunere ștergere fișier |
| `utilizatori`| `from('utilizatori')`| `shared/services/userService.ts` | Scăzută | Dead Code | Propunere ștergere fișier |
| `detalii_vanzare` | `from('detalii_vanzare')` | `shared/services/statsService.ts` | Scăzută | Dead Code | Propunere ștergere fișier |

## 3. Auth legacy / localStorage
| Referință | Fișier | Severitate | Explicație |
|-----------|--------|------------|------------|
| `magazin_role` | `AppRoutes.tsx` | Informațional | Folosit doar în `handleLogout` pentru curățarea cheilor vechi din browserul utilizatorului. |
| `agent_id` | `AppRoutes.tsx` | Informațional | Parte din lista de cleanup la logout. |

**Notă**: Nu s-au găsit citiri (`getItem`) sau scrieri (`setItem`) active pentru roluri sau user IDs în afara fluxului Supabase Auth v2.

## 4. Type-safety / any
| Fișier | Problemă | Criticitate | Corectat acum |
|--------|----------|-------------|---------------|
| `lossService.ts` | `batchesByZone: Record<string, any[]>` | Medie | **DA** (Etapa 4F) |
| `MainLayout.tsx` | `notifications: any[]`, `event: any` | Scăzută | **DA** (Etapa 4F) |
| `AiConsultantPage.tsx` | `recommendation: any`, `product: any` | Scăzută | **DA** (Etapa 4F) |

## 5. Rute și navigație
- **Status**: Curat.
- **Ce este curat**:
    - Nu există rute către "Furnizori", "Agenți" sau "Comenzi".
    - `MainLayout` afișează meniurile condiționat pe baza permisiunilor v2.
    - Rutele protejate folosesc exclusiv setul de roluri v2: `platform_owner`, `admin`, `manager`, `gestionar`, `casier`.

## 6. Servicii vechi / dead code
Următoarele fișiere au fost identificate ca fiind nefolosite și au fost **ȘTERSE** în Etapa 4G:
- `src/shared/services/statsService.ts` [ȘTERS]
- `src/shared/services/salesService.ts` [ȘTERS]
- `src/shared/services/userService.ts` [ȘTERS]
- `src/shared/services/deliveryService.ts` [ȘTERS]
- `src/shared/services/anafService.js` [ȘTERS]
- `src/shared/hooks/useProduse.ts` [ȘTERS]
- `src/core/hooks/useProduse.ts` [ȘTERS]
- `src/services/` (wrapper-e legacy) [ȘTERS COMPLET]
- `src/screens/` (interfețe MUI legacy) [ȘTERS COMPLET]

## 7. Aliasuri UI acceptate temporar
- `cod_bare`, `um`, `stoc_magazin`, `pret_vanzare`: Acestea persistă în interfețele de tip `Types` din folderele `features/` pentru a asigura compatibilitatea cu UI-ul existent și cu baza de date locală (Dexie). Maparea lor către schema v2 (ex: `barcode` -> `cod_bare`) se face corect în adaptoarele de date.

## 8. Decizie următoare
**Etapa 4G Finalizată**.
Dead Code Cleanup a fost executat. Aplicația este acum mult mai suplă și nu mai conține referințe către tabele legacy în codul activ.

## 9. Build
- **Rezultat**: `npm run build` a finalizat cu succes (**Exit code: 0**) după eliminarea fișierelor moarte.

