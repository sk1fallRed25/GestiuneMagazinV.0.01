# SGR Sales History / Receipt Integration — Etapa 6D.6.8

## 1. Rezumat
- **Status**: **PASS**
- **Ce s-a implementat**:
  - Afișarea garanției SGR ca sub-linie distinctă sub fiecare produs în modalul de detalii bon (Receipt Modal).
  - Un helper utilitar de formatare și sumarizare `sgrDisplay.ts` în `src/features/sales-history/utils/`.
  - Actualizarea modalului `SaleDetailsModal.tsx` pentru a afișa sumarul bonului cu componentele separate ("Total produse", "Total garanții SGR", "Total de plată").
  - Breakdown fiscal SGR separat (Grupa D, 0% TVA) în tabelul de detalii din subsolul bonului.
  - Test E2E dedicat pentru validarea vizuală și funcțională a istoricului de vânzări cu SGR.
- **Ce NU s-a modificat**:
  - Nu s-au aplicat migrări SQL sau modificări directe ale bazei de date.
  - Nu s-a modificat comportamentul POS runtime, POS checkout, `finalize_sale`, Product Forms sau logica de retur.
  - Nu s-au modificat Owner Console, Store Lifecycle, Module Entitlements, Fiscal Bridge sau Offline Sync.

## 2. Data Mapping
- Coloanele bazei de date `sale_items.sgr_*` populate la finalizarea vânzării (`sgr_enabled`, `sgr_type`, `sgr_deposit_amount`, `sgr_total_amount`, `sgr_vat_group`, `sgr_vat_rate`) sunt interogate de `salesHistoryService.ts` în query-ul pentru `sale_items`.
- Câmpurile TypeScript sunt definite în `SaleItemDetails` din `src/features/sales-history/types.ts`:
  ```ts
  sgrEnabled?: boolean;
  sgrType?: 'plastic' | 'metal' | 'glass' | null;
  sgrDepositAmount?: number | null;
  sgrTotalAmount?: number | null;
  sgrVatGroup?: 'D' | null;
  sgrVatRate?: number | null;
  ```
- **Parsare defensivă**:
  - `sgrEnabled` este evaluat explicit ca boolean.
  - `sgrType` este normalizat prin utilitarul existent `normalizeSgrType` din `src/features/products/utils/sgr.ts` pentru a evita valori invalide.
  - În cazul în care valorile snapshot-urilor financiare lipsesc, se folosesc fallback-uri sigure (0.50 RON per unitate, Grupa D și 0% TVA).
  - Dacă `sgr_enabled` este `false` sau `null`, câmpurile SGR sunt complet ignorate în UI.

## 3. Receipt UI
- Fiecare produs care are SGR activ conține o sub-linie distinctă cu stilizare specifică (`+ Garanție SGR - PLASTIC x2: 1.00 lei`).
- Cota de TVA aferentă este afișată separat ca `D — 0%` folosind badge dedicat, complet disociat de TVA-ul standard al produsului (de ex. `A — 19%` sau `A — 21%`).
- Elementele conțin atributele `data-testid` cerute:
  - `sale-item-sgr-line-${item.id}`
  - `sale-item-sgr-label-${item.id}`
  - `sale-item-sgr-amount-${item.id}`
  - `sale-item-sgr-vat-${item.id}`

## 4. Summary
- În subsolul modalului, totalurile sunt împărțite clar pentru a reflecta matematic valorile corecte:
  - **Total produse**: Subtotalul produselor din bon (fără taxele SGR).
  - **Total garanții SGR**: Suma tuturor garanțiilor SGR aplicate în tranzacție.
  - **Total de plată**: Valoarea totală a bonului (`Total produse + Total garanții SGR`).
- **Breakdown fiscal**:
  - Detalierea TVA standard a produselor rămâne neschimbată.
  - Pentru SGR se adaugă linii dedicate:
    - `SGR / Grupa D 0%: X.XX LEI`
    - `TVA SGR: 0.00 LEI`
- Elementele conțin atributele `data-testid` cerute:
  - `sale-sgr-summary`
  - `sale-products-total`
  - `sale-sgr-total`
  - `sale-grand-total`

## 5. Legacy Handling
- Pentru bonurile istorice / legacy (emise înainte de introducerea SGR) sau bonurile curente fără produse SGR:
  - Câmpul `sgrEnabled` este evaluat ca `false`.
  - Nu se afișează nicio sub-linie SGR.
  - Nu se afișează linia `Total garanții SGR` în footer, iar `Total produse` este egal cu `Total de plată`.
  - Interfața rămâne stabilă și nu apar erori în consolă sau blocaje UI.

## 6. E2E Tests
- **Fișier test**: `test_sgr_sales_history_receipt_6d68.py`
- **Scenarii testate**:
  - Autentificare și seeding de produse (unul cu SGR plastic și unul normal).
  - Tranzacție POS cu produs SGR (cantitate 2, total 21.00 RON).
  - Tranzacție POS cu produs normal (cantitate 1, total 5.00 RON).
  - Navigare la Istoric Vânzări.
  - Verificare bon normal: modalul se deschide stabil, nu conține linii SGR sau breakdown SGR.
  - Verificare bon SGR: modalul afișează linia SGR corectă sub produs (`+ Garanție SGR - PLASTIC x2`), cota `D — 0%`, valoarea `1.00`.
  - Verificare sumar SGR: `Total produse: 20.00 LEI`, `Total garanții SGR: 1.00 LEI`, `Total de plată: 21.00 LEI`.
  - Verificare breakdown fiscal: `SGR / Grupa D 0%: 1.00 LEI`, `TVA SGR: 0.00 LEI`.
  - Verificare bon legacy: stabilitate și lipsa elementelor SGR.
  - Cleanup produse de test.
- **Rezultat**: **PASS** (100% succes, toate aserțiunile verificate în Playwright).
- **Screenshot generat**:
  ![Receipt Modal Details](/C:/Users/Stefan/.gemini/antigravity/brain/d227f6f4-2819-449c-8b01-ee7efada6345/screenshot_sgr_receipt_modal_details.png)

## 7. Build & Regressions
- **npm run build**: Rulat cu succes (compilare TypeScript & Vite build finalizate corect în dist).
- **Teste de regresie rulate**:
  - `python test_sgr_pos_checkout_e2e_6d67.py` -> **PASS**
  - `python test_sales_history_vat_display_6d55.py` -> **PASS**

## 8. Limitări
- Logica pentru retururi de produse SGR nu este încă implementată (va fi definită în Blueprint-ul de retururi SGR 6D.6.9).
- Modulul fiscal bridge / print fizic pe imprimantă de bonuri nu este actualizat cu noile linii SGR (necesită implementare hardware bridge).
- Rapoartele comerciale/financiare agregate nu separă încă taxele SGR de vânzările brute la nivel de magazin.

## 9. Decizie
- **Recomandare**: **Ready for 6D.6.9 SGR Returns Integration Blueprint**.
- Sistemul de afișare este pregătit pentru integrarea fluxului de retururi.
