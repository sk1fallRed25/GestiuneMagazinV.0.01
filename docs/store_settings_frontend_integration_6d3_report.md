# Store Settings Frontend Integration — Raport (Etapa 6D.3)

## 1. Rezumat
* **Status**: **PASS** — Build trecut, integrare completă
* **Ruta**: `/setari-magazin`
* **RPC-uri utilizate**: `get_store_settings`, `update_store_settings`, `get_store_operational_config`
* **DB modificată**: Nu
* **SQL aplicat**: Nu
* **Frontend modificat**: Da — feature nou `src/features/store-settings/` + rută + navigație
* **Produse/POS/Recepție/Transfer/Pierderi modificate**: Nu
* **Export PDF/CSV**: Nu este inclus
* **Integrare TVA în produse**: Nu — va fi implementată în Etapa 6D.4

---

## 2. Structură Feature

### Fișiere create
| Fișier | Scop |
|--------|------|
| `src/features/store-settings/types.ts` | TypeScript types: VatGroupKey, VatGroup, StoreSettings, StoreSettingsResponse, DEFAULT_STORE_SETTINGS |
| `src/features/store-settings/services/storeSettingsService.ts` | Service: apeluri RPC, parsere JSONB snake↔camelCase, validare client-side, enforceVatPayerRules |
| `src/features/store-settings/hooks/useStoreSettings.ts` | Hook: state management, dirty tracking, canView/canEdit, auto-reload, save/reset |
| `src/features/store-settings/components/StoreFiscalSettingsPanel.tsx` | Panel: date firmă, punct de lucru, CUI read-only |
| `src/features/store-settings/components/StoreTaxSettingsPanel.tsx` | Panel: Plătitor/Neplătitor TVA, selector grupă, politică preț |
| `src/features/store-settings/components/StoreStockSettingsPanel.tsx` | Panel: stoc minim, expirare, stoc negativ |
| `src/features/store-settings/components/StorePosSettingsPanel.tsx` | Panel: plată implicită, ture, aprobare anulare/retur |
| `src/features/store-settings/components/StoreDocumentsSettingsPanel.tsx` | Panel: prefixe documente |
| `src/features/store-settings/components/StoreReportsAlertsPanel.tsx` | Panel: ora business, timezone, alerte stoc/expirare/casă |
| `src/features/store-settings/components/StoreSettingsSaveBar.tsx` | Bară sticky cu Salvează/Renunță |
| `src/features/store-settings/StoreSettingsPage.tsx` | Pagina principală cu toate panelurile |
| `src/features/store-settings/index.ts` | Barrel export |

### Fișiere modificate
| Fișier | Modificare |
|--------|------------|
| `src/app/AppRoutes.tsx` | Import StoreSettingsPage + rută `/setari-magazin` cu ProtectedRoute |
| `src/app/MainLayout.tsx` | Link navigație sidebar în secțiunea Administrare |
| `src/features/auth/permissions.ts` | Adăugat `/setari-magazin` în routePermissions |

---

## 3. Service și Parsere

### `storeSettingsService.getStoreSettings(storeId)`
- Apelează `supabase.rpc('get_store_settings', { p_store_id })`
- Parsează JSONB snake_case → camelCase TypeScript
- Completează fallback-uri din `DEFAULT_STORE_SETTINGS` dacă lipsesc chei
- Normalizează erori de permisiuni

### `storeSettingsService.updateStoreSettings(storeId, settings)`
- Aplică `enforceVatPayerRules()` înainte de trimitere
- Validează client-side (email, workpoint, stoc, ore, prefixe)
- Transformă camelCase → snake_case JSONB
- Apelează `supabase.rpc('update_store_settings', { p_store_id, p_settings })`
- Normalizează erori: acces refuzat, schemă invalidă, eroare necunoscută

### `storeSettingsService.getStoreOperationalConfig(storeId)`
- Apelează `get_store_operational_config`
- Returnează raw JSONB pentru reuse viitor

### Validări client-side
- `defaultVatGroup` ∈ {A, B, C, D, E}
- `vatPayer=false` → `defaultVatGroup` forțat E
- `vatPayer=true` + `defaultVatGroup=E` → forțat A
- `businessDayStartHour` ∈ [0, 23]
- `stockMinDefault` ≥ 0
- `expiryWarningDays` ≥ 0
- `alertCashDifferenceLimit` ≥ 0
- Prefixe documente: non-empty, max 10 caractere

---

## 4. Hook `useStoreSettings`
- Citește din AuthContext: `currentStoreId`, `role`
- `canView`: platform_owner, admin, manager
- `canEdit`: platform_owner, admin
- Auto-reload la schimbarea `currentStoreId`
- Dirty state tracking prin JSON.stringify comparație cu snapshot server
- Expune: `settings`, `setSettings`, `save`, `reset`, `reload`, `isDirty`, `saving`, `saveSuccess`, `canEdit`, `canView`

---

## 5. UI / Paneluri

### Date Fiscale
CUI (read-only din store), denumire firmă, nr. registru comerț, punct de lucru, telefon, email, județ, oraș, adresă, note.

### TVA & Prețuri (CRITIC)
Toggle Plătitor/Neplătitor TVA, selector grupă TVA implicită (A/B/C/D/E), tabel grupe TVA read-only, politică preț (inclusiv/exclusiv). Banner informativ pentru neplătitori.

### Stoc & Expirări
Stoc minim implicit, zile avertizare expirare, toggle stoc negativ cu recomandare pilot.

### POS & Retururi/Anulări
Metodă plată implicită, plată mixtă, tură activă, aprobare manager pentru anulare/retur.

### Documente
Prefixe: BON, RET, REC, PD, TRF. Uppercase auto, max 10 caractere.

### Rapoarte & Alerte
Ora start business, timezone, alertă stoc scăzut, alertă expirare, limită diferență numerar.

### Save Bar
Sticky bottom, apare la dirty state, butoane Salvează/Renunță, success feedback.

---

## 6. TVA Behavior

### Plătitor TVA (`vatPayer = true`)
- `defaultVatGroup` = A (implicit)
- Selectorul de grupă TVA este activ
- Tabelul de grupe TVA (A=21%, B=11%, C=11%, D=0%, E=0%) este afișat
- Produsele vor permite alegerea grupei TVA în Etapa 6D.4

### Neplătitor TVA (`vatPayer = false`)
- `defaultVatGroup` = E (forțat automat)
- Selectorul de grupă TVA este dezactivat/ascuns
- Banner informativ explicit
- Produsele nu vor afișa selector TVA în Etapa 6D.4

### Reguli de enforcement
- La save: dacă `vatPayer=false`, se forțează `defaultVatGroup=E`
- La save: dacă `vatPayer=true` + `defaultVatGroup=E`, se forțează `defaultVatGroup=A`
- Regulile se aplică atât la toggle cât și la submit

---

## 7. Securitate

| Rol | Poate vedea | Poate edita | Link sidebar |
|-----|-------------|-------------|--------------|
| `platform_owner` | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ |
| `manager` | ✓ (read-only) | ✗ | ✓ |
| `gestionar` | ✗ | ✗ | ✗ |
| `casier` | ✗ | ✗ | ✗ |

- Manager vede badge „Mod vizualizare"
- Casier/gestionar primesc pagina „Acces Interzis" dacă navighează direct
- Niciun apel cu `service_role`
- Niciun SQL direct
- RPC-urile verifică intern membershipul

---

## 8. Limitări
- Nu modifică Products / Quick Add / Reception — TVA pe produs vine în 6D.4
- Nu implementează numerotare automată documente
- Nu implementează Fiscal Bridge
- Nu implementează Offline Sync
- E2E va fi implementat în Etapa 6D.5 sau 6D.3.1

---

## 9. Build
```
npm run build → PASS
tsc && vite build → ✓ 2528 modules transformed, built in 2.67s
```

---

## 10. Decizie
**PASS** — Ready for **Etapa 6D.4 (Product VAT Group Integration)**.
