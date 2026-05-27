# SGR Returns E2E / Visual QA — Etapa 6D.6.13

## 1. Rezumat

**Status:** ✅ PASS

### Ce s-a validat
- **DOM/Test-ID Alignment**: Toate `data-testid` din `ReturnSaleModal.tsx` au fost auditate și corectate
- **E2E Scenarios**: Retur parțial SGR, retur final SGR, capping, previous returns, non-SGR regression, legacy safety
- **Visual QA**: Capturi pe 4 viewports (Desktop 1920×1080, Laptop 1366×768, Tablet 768×1024, Mobile 390×844)
- **Accessibility**: aria-labels pe butonul X, input-uri de cantitate, butoane plus/minus
- **Build**: `npm run build` PASS (Exit code: 0)
- **Payload Safety**: Submit-ul trimite strict `{saleItemId, quantity}` — fără SGR manual

### Ce s-a modificat
- **`ReturnSaleModal.tsx`**:
  - `data-testid="return-grand-refund-total"` mutat pe `grandRefundTotal` (era greșit pe `totalProductRefund`)
  - `data-testid="return-total-product-refund"` adăugat pe `totalProductRefund`
  - `aria-label="Închide dialog"` pe butonul X
  - `aria-label` pe inputul de cantitate și butoanele plus/minus
- **Test E2E creat**: `test_sgr_returns_visual_qa_6d613.py`
- **Documentație**: acest raport

### Ce NU s-a modificat
- Backend SQL / RPC-uri live
- `finalize_sale`
- `return_sale_items` RPC
- `get_sale_return_eligibility` RPC
- POS Checkout
- Product Forms
- Owner Console, Store Lifecycle, Module Entitlements
- Fiscal Bridge, Offline Sync

---

## 2. DOM/Test Alignment

### Audit `data-testid`

| `data-testid` | Element | Valoare afișată | Status |
|---|---|---|---|
| `return-sgr-info-{saleItemId}` | Bloc SGR per item | Container | ✅ OK |
| `return-sgr-unit-{saleItemId}` | Label tip SGR | Include garanție SGR - PLASTIC: 0.50 lei / buc | ✅ OK |
| `return-sgr-available-{saleItemId}` | SGR disponibil | SGR disponibil pentru retur: X.XX lei | ✅ OK |
| `return-item-product-refund-{saleItemId}` | Produs returnat | Produs returnat: X.XX lei | ✅ OK |
| `return-sgr-refund-{saleItemId}` | SGR returnat | SGR returnat: X.XX lei | ✅ OK |
| `return-item-total-refund-{saleItemId}` | Total linie | Total linie: X.XX lei | ✅ OK |
| `return-total-product-refund` | Total produse | `totalProductRefund` | ✅ **CORECTAT** (era `return-grand-refund-total`) |
| `return-total-sgr-refund` | Total SGR | `totalSgrRefund` | ✅ OK |
| `return-grand-refund-total` | **Total final** | `grandRefundTotal` | ✅ **CORECTAT** (mutat pe valoarea corectă) |

### Corecția aplicată

**Problema:** `data-testid="return-grand-refund-total"` era aplicat pe `totalProductRefund.toFixed(2)` (linia cu "Total produse returnate"), nu pe `grandRefundTotal.toFixed(2)` (linia "Total de rambursat").

**Fix:**
```diff
- <span data-testid="return-grand-refund-total">{totalProductRefund.toFixed(2)} LEI</span>  <!-- Total produse -->
+ <span data-testid="return-total-product-refund">{totalProductRefund.toFixed(2)} LEI</span>  <!-- Total produse -->

- <span>{grandRefundTotal.toFixed(2)} LEI</span>  <!-- Total de rambursat -->
+ <span data-testid="return-grand-refund-total">{grandRefundTotal.toFixed(2)} LEI</span>  <!-- Total de rambursat -->
```

### Payload Safety
Submit-ul `ReturnSaleItemInput[]` conține strict:
```json
[{ "saleItemId": "uuid", "quantity": 1 }]
```
**NU** se trimit: `sgr_refund_amount`, `sgr_type`, `sgr_vat_group`. Backend calculează SGR automat din snapshot.

---

## 3. E2E Scenarios

### A. Static DOM Checks
- Toate `data-testid` necesare prezente în `ReturnSaleModal.tsx`
- `return-grand-refund-total` corect asociat cu `grandRefundTotal`
- `return-total-product-refund` corect asociat cu `totalProductRefund`
- Payload fără câmpuri SGR manual
- `aria-label` prezente

### B–D. Setup: Login + Seed + Navigation
- Login `admin@admin.com`
- Produs SGR plastic (10.00 lei, qty=2, total bon=21.00 lei)
- Navigare Sales History → detalii bon → ReturnSaleModal

### E. UI înainte de retur
- Bloc SGR vizibil
- Label: `Include garanție SGR - PLASTIC: 0.50 lei / buc`
- TVA SGR: `D — 0%`
- SGR disponibil pentru retur: `1.00 lei`
- SGR deja returnat: `0.00 lei`

### F. Selectare qty=1 — Breakdown
- Produs returnat: `10.00 lei`
- SGR returnat: `0.50 lei`
- Total linie: `10.50 lei`
- Total produse returnate: `10.00 lei`
- Total garanții SGR returnate: `0.50 lei`
- Total de rambursat: `10.50 lei`

### G. Retur parțial
- Confirmat cu succes
- Status bon actualizat la `partially_returned`
- Previous returns history afișat

### H. Redeschidere modal post-retur
- Cantitate disponibilă: 1
- SGR disponibil: `0.50 lei`
- SGR deja returnat: `0.50 lei`

### I. Retur final
- Total rambursat: `10.50 lei`
- Status bon: `returned`

### J. Capping
- După retur integral:
  - "Fără unități" afișat / confirm button disabled / bon ineligibil
  - Nu se permite retur peste cantitatea disponibilă

### K. Non-SGR Regression
- Bon fără SGR deschis în modal
- Bloc SGR absent
- Total SGR line absent
- Grand total = produs (15.00 lei)
- Retur funcționează corect

### L. Legacy/No-SGR Safety
- Modal nu generează erori pentru produse fără SGR
- Fallback graceful funcțional

---

## 4. Visual QA

### Viewports testate

| Viewport | Dimensiune | Screenshot |
|---|---|---|
| Desktop | 1920×1080 | `artifacts/6d613/returns_sgr_desktop.png` |
| Laptop | 1366×768 | `artifacts/6d613/returns_sgr_laptop.png` |
| Tablet | 768×1024 | `artifacts/6d613/returns_sgr_tablet.png` |
| Mobile | 390×844 | `artifacts/6d613/returns_sgr_mobile.png` |
| Mobile (non-SGR) | 390×844 | `artifacts/6d613/returns_non_sgr_mobile.png` |

### Verificări vizuale
- ✅ Modalul nu iese din viewport pe niciun ecran
- ✅ Tabelul are scroll vertical controlat (`overflow-y-auto`)
- ✅ Textul SGR nu se suprapune
- ✅ Butoanele sunt accesibile pe toate viewporturile
- ✅ Totalurile sunt vizibile
- ✅ Pe mobil, layout-ul este utilizabil
- ✅ Close button și confirm button sunt accesibile pe toate rezoluțiile

---

## 5. Accessibility / UX

### aria-labels adăugate
- `aria-label="Închide dialog"` pe butonul X (header modal)
- `aria-label="Cantitate retur pentru {productName}"` pe inputul de cantitate
- `aria-label="Scade cantitatea pentru {productName}"` pe butonul minus
- `aria-label="Crește cantitatea pentru {productName}"` pe butonul plus

### Disabled States
- Butonul CONFIRMĂ RETURUL este disabled când:
  - ✅ `reason.trim().length < 3`
  - ✅ `grandRefundTotal <= 0`
  - ✅ `!eligibility.canReturn`
  - ✅ `actionLoading === true`
  - ✅ `loading === true`

### Error States
- ✅ Mesaj validare: "Motivul returului este obligatoriu"
- ✅ Mesaj validare: "Motivul trebuie să conțină cel puțin 3 caractere"
- ✅ Mesaj validare: "Selectați cel puțin un produs..."
- ✅ Mesaje de eroare sunt vizibile și clare (roșu pe fundal roșu deschis)

### Informație SGR
- ✅ SGR nu este transmis doar prin culoare — se folosesc label-uri text explicite
- ✅ Icon Recycle alături de text descriptiv

---

## 6. Build & Regression

| Test | Status |
|---|---|
| `npm run build` | ✅ PASS (Exit code: 0, 14.04s) |
| `test_sgr_returns_visual_qa_6d613.py` | ✅ PASS |
| `test_sgr_returns_frontend_6d612.py` | ✅ PASS |
| `test_sgr_returns_backend_6d611.py` | ✅ PASS |
| `test_sales_returns_6b33.py` | ✅ PASS |
| `test_sgr_pos_checkout_e2e_6d67.py` | Optional — rulat dacă timpul permite |
| `test_sgr_sales_history_receipt_6d68.py` | Optional — rulat dacă timpul permite |

---

## 7. Limitări

- **FiscalBridge print** pentru bonul de retur cu SGR nu este implementat
- **Returnare ambalaje fără produs/bon** nu este inclusă în această etapă
- **Product Ready** nu este declarat — necesită pilot hardware/fiscal real
- `previous_returns.sgr_refund_total` poate fi `null` dacă backend nu îl include explicit (graceful fallback cu `N/A`)
- Visual QA este automatizat — inspecția manuală finală este recomandată pe device-uri fizice

---

## 8. Decizie

> **✅ Ready for 6G.0 FiscalBridge Discovery & Integration Blueprint**

Fluxul de retururi SGR este validat E2E, UI-ul este aliniat, accessibility este implementat, iar testele de regresie trec.
Următorii pași sugerați:
1. **6G.0** — FiscalBridge Discovery & Integration Blueprint
2. **Pilot hardware/fiscal** — validare pe device-uri reale înainte de Product Ready
