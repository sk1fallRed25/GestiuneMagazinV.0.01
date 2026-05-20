# Sales Returns Frontend Integration — Etapa 6B.3.2

**Data**: 2026-05-20
**Stare**: ✅ REALIZAT
**Dependențe**: Etapa 6B.3.1 (PASS), RPC-uri `get_sale_return_eligibility` și `return_sale_items` validate

---

## 1. Rezumat

S-a integrat complet frontend-ul pentru procesarea retururilor parțiale și totale pe articole selectate, folosind RPC-urile deja validate în baza de date Supabase.

### Ce s-a integrat:
- Servicii type-safe pentru apelarea `get_sale_return_eligibility` și `return_sale_items`
- Parser JSONB defensiv (`unknown` + type casting explicit, fără `any`)
- Stare completă în hook-ul `useSalesHistory` cu loading, error, modal, și refresh tranzacțional
- Modal premium `ReturnSaleModal` cu selectare cantități, calcul live total refund, istoric retururi anterioare, metode refund și validări
- Buton `RETUR PRODUSE` în `SaleDetailsModal` pentru bonuri `finalized` sau `partially_returned`
- Badge-uri de status actualizate: `returned`, `partially_returned`

### RPC-uri folosite:
- `get_sale_return_eligibility(p_store_id, p_profile_id, p_sale_id)` → JSONB
- `return_sale_items(p_store_id, p_profile_id, p_sale_id, p_items, p_reason, p_refund_method, p_notes)` → UUID

### Ce NU este inclus în această etapă:
- Testare E2E (planificată în 6B.3.3)
- Split refund / mixed refund UI
- Rapoarte comerciale avansate cu stornări
- Fiscal Bridge
- Offline Sync

---

## 2. Service (`salesHistoryService.ts`)

### `getSaleReturnEligibility(storeId, profileId, saleId)`
- Apelează RPC-ul `get_sale_return_eligibility` cu parametrii corecți (`p_store_id`, `p_profile_id`, `p_sale_id`)
- Parsează răspunsul JSONB folosind `unknown` + `Record<string, unknown>`
- Mapare câmpuri snake_case → camelCase:
  - `sale_id` → `saleId`
  - `can_return` → `canReturn`
  - `reason_if_not` → `reasonIfNot`
  - `items` → `items[]` (cu mapare per element)
  - `payments` → `payments[]`
  - `previous_returns` → `previousReturns[]`
  - `allowed_refund_methods` → `allowedRefundMethods[]`
- Mapare items:
  - `sale_item_id` → `saleItemId`
  - `product_id` → `productId`
  - `product_name` → `productName`
  - `barcode` → `barcode`
  - `batch_id` → `batchId`
  - `quantity_sold` → `quantitySold`
  - `quantity_returned` → `quantityReturned`
  - `quantity_available_to_return` → `quantityAvailableToReturn`
  - `unit_price` → `unitPrice`
  - `total_item` → `totalItem`
- Folosește `toNumberSafe()` pentru toate valorile numerice, prevenind `NaN`

### `returnSaleItems(payload: ReturnSalePayload)`
- Validări frontend defensive:
  - Motiv obligatoriu, minim 3 caractere
  - Cel puțin un produs selectat
  - Cantitate > 0 pe fiecare articol
  - Metoda de refund validă (`cash`, `card`, `voucher`)
  - Store ID, Profile ID, Sale ID obligatorii
- Apelează RPC-ul `return_sale_items` cu parametrii numiți:
  - `p_store_id` ← `payload.storeId`
  - `p_profile_id` ← `payload.profileId`
  - `p_sale_id` ← `payload.saleId`
  - `p_items` ← array de `{ sale_item_id, quantity }` (**NU** `product_id`)
  - `p_reason` ← `payload.reason` (trimmed)
  - `p_refund_method` ← `payload.refundMethod`
  - `p_notes` ← `payload.notes ?? null`
- Erori normalizate în limba română:
  - Mesaje legate de tură → „Deschide o tură înainte de a procesa returul."
  - Mesaje de permisiuni → „Doar managerii sau administratorii pot procesa retururi."
  - Mesaje de cantitate → „Cantitatea returnată depășește cantitatea disponibilă."
  - Mesaje de lot → „Returul nu poate fi procesat deoarece lipsește lotul original."
  - Mesaje de eligibilitate → „Bonul nu este eligibil pentru retur."
  - Fallback generic → „Returul nu a putut fi procesat."

### Confirmare Mapping RPC
| Parametru RPC SQL        | Valoare Frontend Trimisă         | Corect? |
|--------------------------|----------------------------------|---------|
| `p_store_id`             | `payload.storeId`                | ✅      |
| `p_profile_id`           | `payload.profileId`              | ✅      |
| `p_sale_id`              | `payload.saleId`                 | ✅      |
| `p_items`                | `[{ sale_item_id, quantity }]`   | ✅      |
| `p_reason`               | `payload.reason` (trimmed)       | ✅      |
| `p_refund_method`        | `payload.refundMethod`           | ✅      |
| `p_notes`                | `payload.notes ?? null`          | ✅      |

---

## 3. Hook / State (`useSalesHistory.ts`)

### State-uri adăugate:
| State                      | Tip                              | Scop                                |
|----------------------------|----------------------------------|-------------------------------------|
| `returnEligibility`        | `ReturnEligibility \| null`      | Date eligibilitate retur            |
| `returnEligibilityLoading` | `boolean`                        | Loading la verificare eligibilitate |
| `returnActionLoading`      | `boolean`                        | Loading la procesare retur          |
| `returnError`              | `string \| null`                 | Erori de validare sau RPC           |
| `returnModalOpen`          | `boolean`                        | Starea modală retur                 |
| `selectedSaleForReturn`    | `SaleSummary \| null`            | Bonul selectat                      |

### Acțiuni expuse:
| Acțiune             | Semnătură                                                                       | Efect                                        |
|---------------------|---------------------------------------------------------------------------------|----------------------------------------------|
| `openReturnModal`   | `(sale: SaleSummary \| SaleDetails) => void`                                    | Deschide modal, resetează starea, lansează verificarea eligibilității |
| `closeReturnModal`  | `() => void`                                                                    | Închide modal, resetează complet starea                              |
| `confirmReturnSale` | `(items, refundMethod, reason, notes?) => Promise<void>`                        | Validează, apelează RPC, refresh tranzacțional la succes             |

### Flux post-confirmare:
1. Apelează `salesHistoryService.returnSaleItems()`
2. Toast de succes „Returul a fost procesat cu succes."
3. Închide modalul de retur
4. Reîncarcă lista completă de vânzări (`fetchSales()`)
5. Dacă modalul de detalii este deschis pe bonul procesat, reîncarcă detaliile (`openSaleDetails()`)

---

## 4. UI

### Buton `RETUR PRODUSE`
- Locație: footer-ul `SaleDetailsModal.tsx`
- Condiții de afișare: bonul are status `finalized` SAU `partially_returned` ȘI `onReturnClick` este furnizat
- Stil: indigo/albastru, cu icon `RefreshCw`
- Click: apelează `openReturnModal(sale)`

### `ReturnSaleModal.tsx`
- **Header**: Titlu „RETUR PRODUSE" cu ID-ul bonului trunchiat, icon pulsant `RefreshCw`
- **Banner informativ**: Avertisment indigo explicând că returul readuce produsele în stoc pe loturile originale
- **Sumar bon original**: Total, metodă plată, status, eligibilitate
- **Istoric retururi anterioare**: Tabel cu data, sumă stornată, metodă refund și motiv (afișat doar dacă există)
- **Tabel selecție produse**: Fiecare articol cu:
  - Nume produs + cod de bare
  - Cantitate vândută
  - Cantitate deja returnată
  - Cantitate disponibilă pentru retur
  - Preț unitar
  - Butoane `+` / `-` și input numeric pentru cantitatea de returnat
  - Validare: 0 ≤ cantitate ≤ `quantityAvailableToReturn`
  - Articole cu 0 unități disponibile sunt dezactivate vizual
- **Card total refund live**: Calculat dinamic ca `Σ(qty × unitPrice)`, afișat doar când > 0
- **Selecție metodă de rambursare**: Butoane toggle `cash` / `card` / `voucher`, cu dezactivare pentru metodele nepermise de backend
- **Motiv retur**: Textarea obligatorie, minim 3 caractere
- **Note adiționale**: Textarea opțională
- **Erori**: Afișate inline sub formular (validare locală + erori RPC)
- **Footer**: Butoane RENUNȚĂ + CONFIRMĂ RETURUL (cu loading spinner)
- **Dezactivare confirmare**: Dacă loading, eligibilitate falsă, motiv prea scurt, sau total refund ≤ 0

---

## 5. Securitate

- **Stocul este modificat exclusiv de RPC** — frontend-ul NU calculează niciun stoc final, NU face UPDATE/INSERT pe `stock_batches` sau `stock_movements`
- **Rolurile sunt validate în RPC** — funcția SQL `return_sale_items` verifică prin `has_store_role` că apelantul are rolul necesar (manager sau admin conform configurării curente)
- **Motivul este obligatoriu** — validare frontend (minim 3 caractere) + validare backend (NOT NULL, LENGTH >= 3)
- **Cantitățile sunt validate dublu**:
  - Frontend: 0 ≤ qty ≤ `quantityAvailableToReturn`
  - Backend: verificare contra-bilanț pe `sale_return_items` existente
- **Nu se folosesc parametri poziționali** — toți parametrii RPC sunt transmiși prin nume (`p_store_id`, `p_profile_id`, etc.)
- **Parser defensiv** — tipul `unknown` cu cast explicit, `toNumberSafe()` pentru numerice, fallback-uri pentru string-uri

---

## 6. Limitări

| Limitare                                | Status            | Etapă planificată |
|-----------------------------------------|-------------------|--------------------|
| Testare E2E / Playwright                | Neimplementat     | 6B.3.3            |
| Split refund / mixed refund UI          | Neimplementat     | Post-MVP          |
| Dashboard / rapoarte ajustate cu retururi| Neimplementat    | Post-6B            |
| Fiscal Bridge                           | Neimplementat     | Post-MVP (v3)     |
| Offline Sync                            | Neimplementat     | Post-MVP (v3)     |
| Fluxul `void_sale`                      | Nemodificat       | Validat E2E 6B.2.3|

---

## 7. Build

```
> tsc && vite build
✓ 2507 modules transformed.
dist/assets/index-CAzZsATK.js  1,060.04 kB │ gzip: 286.37 kB
✓ built in 2.63s
```

Compilare TypeScript: ✅ PASS
Vite Build: ✅ PASS
Erori: 0

---

## 8. Decizie

✅ **Etapa 6B.3.2 este REALIZATĂ.**

Următorul pas recomandat:
- **Etapa 6B.3.3 (Sales Advanced Returns E2E Test)** — validare Playwright a fluxului complet de retur parțial/total.
