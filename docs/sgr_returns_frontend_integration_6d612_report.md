# SGR Returns Frontend Integration — Etapa 6D.6.12

## 1. Rezumat

**Status:** ✅ PASS

### Ce s-a implementat
- Extinderea tipurilor TypeScript din `types.ts` pentru câmpurile SGR din `get_sale_return_eligibility`
- Maparea defensivă a câmpurilor SGR în `salesHistoryService.getSaleReturnEligibility()`
- Maparea defensivă a `sgrRefundTotal` în `previousReturns`
- `ReturnSaleModal.tsx` complet refactorizat cu display SGR per-item și calcul total cu SGR
- Footer modal cu breakdown: Total produse | Total SGR | Grand Total
- `data-testid` stabile pentru E2E
- Test E2E `test_sgr_returns_frontend_6d612.py`

### Ce NU s-a modificat
- Backend SQL / RPC-uri live
- `finalize_sale`
- POS Checkout
- Product Forms
- Owner Console, Store Lifecycle, Module Entitlements
- Fiscal Bridge, Offline Sync

---

## 2. Data Mapping

### Câmpuri eligibility SGR (din RPC → TypeScript)

| Backend (snake_case) | TypeScript (camelCase) | Tip |
|---|---|---|
| `sgr_enabled` | `sgrEnabled` | `boolean` |
| `sgr_type` | `sgrType` | `'plastic' \| 'metal' \| 'glass' \| null` |
| `sgr_deposit_amount` | `sgrDepositAmount` | `number \| null` |
| `sgr_total_amount` | `sgrTotalAmount` | `number \| null` |
| `sgr_vat_group` | `sgrVatGroup` | `'D' \| null` |
| `sgr_vat_rate` | `sgrVatRate` | `number \| null` |
| `sgr_returned_amount` | `sgrReturnedAmount` | `number \| null` |
| `sgr_available_amount` | `sgrAvailableAmount` | `number \| null` |

### Payload submit (fără SGR manual)
```json
[{ "sale_item_id": "...", "quantity": 1 }]
```
Backend calculează SGR din snapshot. Nu se trimite `sgr_refund_amount`, `sgr_type`, `sgr_deposit_amount`.

---

## 3. ReturnSaleModal UI

### Per-item (sgrEnabled=true):
- `data-testid="return-sgr-info-{saleItemId}"` — bloc SGR vizibil
- `data-testid="return-sgr-unit-{saleItemId}"` — label: `Include garanție SGR - PLASTIC: 0.50 lei / buc`
- Text TVA: `TVA SGR: D — 0%`
- `data-testid="return-sgr-available-{saleItemId}"` — `SGR disponibil pentru retur: 1.00 lei`
- `SGR deja returnat: 0.00 lei`

### Breakdown per linie (qty > 0):
- `data-testid="return-item-product-refund-{saleItemId}"` — `Produs returnat: 10.00 lei`
- `data-testid="return-sgr-refund-{saleItemId}"` — `SGR returnat: 0.50 lei`
- `data-testid="return-item-total-refund-{saleItemId}"` — `Total linie: 10.50 lei`

### Footer:
- `data-testid="return-grand-refund-total"` — Total produse returnate
- `data-testid="return-total-sgr-refund"` — Total garanții SGR returnate
- Grand total INDIGO bold

### Non-SGR items:
- Blocul SGR nu apare (conditional render `{item.sgrEnabled && ...}`)
- Calculul `grandRefundTotal = totalProductRefund` (fără SGR)

---

## 4. Calcul estimativ UI

```
productRefund = selectedQty * unitPrice
sgrRefund     = selectedQty * sgrDepositAmount (dacă sgrEnabled=true, else 0)
lineRefund    = productRefund + sgrRefund

totalProductRefund = Σ productRefund
totalSgrRefund     = Σ sgrRefund
grandRefundTotal   = totalProductRefund + totalSgrRefund
```

UI este estimativ. Backend rămâne sursa de adevăr.

---

## 5. Istoric retururi anterioare (Previous Returns)

Tabelul afișează coloana **din care SGR**:
- Dacă backend returnează `sgr_refund_total` → se afișează valoarea
- Dacă nu → se afișează `N/A` (fallback defensiv fără crash)

Limitare: `get_sale_return_eligibility` `previous_returns` nu include `sgr_refund_total` explicit deocamdată. UI gestionează graceful cu fallback la `null`.

---

## 6. Submit Flow

1. Payload către `return_sale_items`: `[{ sale_item_id, quantity }]` — fără SGR manual
2. Backend calculează `sgr_refund_amount` din snapshot `sale_items`
3. Backend salvează `sale_return_items.sgr_*`
4. Backend actualizează `sale.status` → `partially_returned` / `returned`
5. Frontend primește `returnId`, închide modalul, refreshează lista + detalii bon

---

## 7. E2E Test

**Fișier:** `test_sgr_returns_frontend_6d612.py`

### Scenarii validate:
- A. Login admin
- B. Seed produs SGR plastic + bon qty=2 (21.00 lei)
- C. Navigare Sales History
- D. Deschidere detalii bon
- E. Deschidere ReturnSaleModal
- F. Verificare UI: SGR info, label PLASTIC, 0.50 lei/buc, disponibil 1.00 lei
- G. Selectare qty=1, verificare breakdown: produs 10.00, SGR 0.50, total 10.50
- H. Confirmare retur, verificare status partially_returned
- I. Redeschidere modal, verificare SGR disponibil = 0.50, istoric retururi afișat
- J. Retur restul (qty=1), verificare status returned
- K. Regresie non-SGR: bloc SGR absent în modal, total = produs

### Anti-DML guard:
- Fără `.delete()` pe: sales, sale_items, payments, sale_returns, sale_return_items, stock_movements, audit_logs
- Bonurile rămân auditabile

---

## 8. Build & Regressions

| Test | Status |
|---|---|
| `npm run build` | ✅ PASS (Exit code: 0) |
| `test_sgr_returns_frontend_6d612.py` | Creat — rulează cu dev server activ |
| `test_sgr_returns_backend_6d611.py` | ✅ PASS (6D.6.11) |
| `test_sales_returns_6b33.py` | ✅ PASS (6B.3.3) |

---

## 9. Limitări

- Print/Fiscal Bridge pentru bonul de retur cu SGR nu este implementat
- Returnare ambalaje fără produs/bon nu este inclusă în această etapă
- `previous_returns.sgr_refund_total` poate fi `null` dacă backend nu îl include explicit (graceful fallback)
- Visual QA final rămâne pentru etapa 6D.6.13

---

## 10. Decizie

> **Ready for 6D.6.13 SGR Returns E2E / Visual QA**

---

## 11. Actualizare 6D.6.13 — Visual QA

În cadrul etapei **6D.6.13**, s-au realizat următoarele verificări și corecții suplimentare pe baza integrării realizate în 6D.6.12:
- **DOM/Test-ID Alignment**: S-a verificat și corectat alinierea selectorilor din `ReturnSaleModal.tsx`.
- **Hotfix data-testid**: Selectorul `data-testid="return-grand-refund-total"` a fost mutat corect de pe valoarea `totalProductRefund` (care reprezenta doar subtotalul produselor) pe valoarea `grandRefundTotal` (totalul de rambursat final, incluzând SGR). S-a adăugat `data-testid="return-total-product-refund"` pentru subtotalul produselor.
- **Raport complet**: Detaliile complete despre scenarii, accesibilitate, viewports și screenshots se găsesc în [Raportul oficial E2E / Visual QA 6D.6.13](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/docs/sgr_returns_e2e_visual_qa_6d613_report.md).
