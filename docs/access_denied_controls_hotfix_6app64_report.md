# Hotfix Report: Access Denied Logout + Close App Controls (6APP.6.4)

## Problema raportată

Când un utilizator cu rol **casier** ajunge pe ecranul „ACCES INTERZIS" (de ex. la navigarea accidentală sau forțată pe `/setari-magazin`, `/rapoarte`, `/ai-consultant` etc.), apare doar butonul **„Înapoi la Dashboard"** — care și el este restricționat pentru casier.

**Rezultat**: Casierul rămâne blocat pe un ecran fără acțiuni utile, fără posibilitate de:
- Deconectare din cont
- Închidere a aplicației desktop (POS)
- Navigare înapoi la POS

## Cauza UX

Ecranul Access Denied era un card minimal cu un singur buton care apela `window.history.back()`. Nu conținea:
- Logout
- Close app Electron
- Navigare role-aware (POS vs Dashboard)

Ecranul era randat **în interiorul** MainLayout (sidebar-ul rămâne vizibil), dar sidebar-ul casierului are opțiuni limitate (doar POS/Offline Sales), iar casierul nu avea garantat un „back" util.

## Butoane adăugate pe ecranul Access Denied

### 1. „Înapoi la POS" (casier) / „Înapoi la Dashboard" (altele)
- **Casier**: Navighează la `/pos` — ruta principală a casierului
- **Admin/Manager/Gestionar**: Navighează la `/` (Dashboard)
- `data-testid="access-denied-back-pos-button"`

### 2. „Deconectare"
- Apelează funcția `logout()` din `useAuth()` hook
- Redirecționează la login
- Curăță sesiunea normal
- `data-testid="access-denied-logout-button"`

### 3. „Închide aplicația"
- **Electron**: Afișează dialog de confirmare, apoi apelează `window.electronAPI.appControls.quitApp()`
- **Browser**: Butonul este dezactivat (`disabled`) cu tooltip explicativ
- `data-testid="access-denied-close-app-button"`
- Dialog confirmare: `data-testid="access-denied-close-app-confirm-dialog"`
- Buton confirmare: `data-testid="access-denied-close-app-confirm-button"`
- Buton anulare: `data-testid="access-denied-close-app-cancel-button"`

## Comportament pe roluri

| Rol | Buton principal | Mesaj suplimentar |
|-----|----------------|-------------------|
| **casier** | Înapoi la POS | „Pentru operațiuni de administrare, autentifică-te cu un cont autorizat." |
| **admin/manager/gestionar** | Înapoi la Dashboard | — |

## Electron vs Browser

| Funcție | Electron | Browser |
|---------|----------|---------|
| Închide aplicația | ✅ Activ + dialog confirmare | ❌ Dezactivat + tooltip |
| Deconectare | ✅ Funcțional | ✅ Funcțional |
| Back to POS/Dashboard | ✅ Funcțional | ✅ Funcțional |

## Fișier modificat

- `src/features/auth/ProtectedRoute.tsx` — Extras `AccessDeniedCard` ca subcomponentă cu state intern pentru dialogul de confirmare, detecție Electron, role-aware navigation, și logout integrat din `useAuth()`.

## Teste rulate și rezultate

| Test | Rezultat |
|------|----------|
| `npm run build` | ✅ PASS (2581 modules, 0 errors) |
| `test_access_denied_controls_6app64.py` (static checks) | ✅ PASS (9/9) |
| `test_access_denied_controls_6app64.py` (E2E scenarios A-F) | ⚠️ Necesită dev server (nu e pornit în sesiunea curentă) |
| `test_packaged_electron_sqlite_service_6app61.py` | ✅ PASS |

### Verificări statice test 6APP.6.4:
1. ✅ Toate 7 `data-testid`-uri prezente
2. ✅ Navigare role-aware `/pos` pentru casier
3. ✅ Funcția `logout` din `useAuth` utilizată
4. ✅ `electronAPI.quitApp` integrat
5. ✅ Browser fallback (disabled button)
6. ✅ Dialog de confirmare pentru închidere
7. ✅ Heading „Acces Interzis" păstrat
8. ✅ Mesaj ghidare casier prezent
9. ✅ Build trece

## .exe-ul NU a fost generat

Conform cerința utilizatorului, **nu s-a rulat `npm run electron:build`** și **nu s-a generat niciun fișier `.exe`** în această etapă.

## Instrucțiuni post-pull

După ce faci `git pull`, rulează manual:

```bash
npm install
npm run electron:build
```
