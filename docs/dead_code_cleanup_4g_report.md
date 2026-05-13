# Dead Code Cleanup 4G Report

## 1. Rezumat
- **Fișiere analizate**: 14 (servicii shared, hooks shared, core hooks, wrapper services)
- **Fișiere șterse**: 14
- **Fișiere păstrate**: 0
- **Status**: Succes. Codul legacy identificat a fost eliminat fără a afecta fluxurile active.

## 2. Fișiere verificate
| Fișier | Importat activ | Decizie | Motiv |
|--------|----------------|---------|-------|
| `src/shared/services/statsService.ts` | Nu | Șters | Dead Code legacy |
| `src/shared/services/salesService.ts` | Nu | Șters | Dead Code legacy |
| `src/shared/services/userService.ts` | Nu | Șters | Dead Code legacy |
| `src/shared/services/deliveryService.ts` | Nu | Șters | Dead Code legacy |
| `src/shared/services/anafService.js` | Nu | Șters | Dead Code legacy |
| `src/shared/hooks/useProduse.ts` | Nu* | Șters | Dead Code legacy (*importat doar de core hook nefolosit) |
| `src/core/hooks/useProduse.ts` | Nu | Șters | Dead Code legacy |
| `src/services/` | Nu* | Șters | Wrapper-e legacy (*folosite doar de screens moarte) |
| `src/screens/` | Nu | Șters | Interfețe legacy MUI (nefolosite în v2) |


## 3. Referințe legacy după cleanup
- **Tabele legacy**: 0 referințe găsite în `.from()` în codul activ (`src/`).
- **Views legacy**: 0 referințe găsite în codul activ.
- **Documentație**: Referințele din `docs/` și SQL blueprints au fost păstrate pentru istoric (conform instrucțiunilor).

## 4. Auth legacy după cleanup
- `VITE_ALLOW_LEGACY_LOGIN`: 0 apariții în `src/`.
- `localStorage.getItem/setItem`: Utilizat exclusiv în `authService.ts` (v2) și logică de bază (temă, etc.). Nu se stochează roluri legacy.
- `localStorage.clear()`: Păstrat în `handleLogout` din `AppRoutes.tsx` pentru securitate (curățare completă la ieșire).

## 5. any/type-safety după cleanup
- `any[]`: Rămân câteva instanțe în componente UI (`StatCard.tsx`) care nu afectează integritatea datelor.
- `as any`: Utilizat în `SalesHistoryFilters.tsx` pentru cast-uri rapide de evenimente (non-critic).

## 6. Impact build
- **Comandă**: `npm run build`
- **Rezultat**: **Exit code: 0**
- **Observații**: Ștergerea fișierelor nu a cauzat erori de import în modulele active (`features/*`).

## 7. Recomandare următoare
**Etapa 4H: Supabase RLS/Advisory Audit**.
Înainte de a trece la testarea finală MVP (Smoke Test), trebuie să ne asigurăm că baza de date este protejată corect la nivel de RLS pentru noile tabele v2, prevenind accesul neautorizat la datele altor magazine.
