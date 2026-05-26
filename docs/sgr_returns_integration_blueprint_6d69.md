# SGR Returns Integration Blueprint — Etapa 6D.6.9

## 1. Rezumat

Acest document reprezintă blueprint-ul tehnic și de design pentru integrarea ambalajelor cu garanție SGR (Sistemul de Garanție-Returnare) în fluxul de retururi de marfă al magazinului.

### Ce proiectăm
*   **Stornare garanție la retur de produs**: Un model matematic și de flux de date în care returnarea unui produs vândut cu garanție SGR (sticlă, plastic sau metal, marcate cu `sgr_enabled=true`) stornează automat și valoarea garanției asociate (0.50 RON per bucată).
*   **Persistență istorică (Snapshotting)**: Salvarea stării SGR din tranzacție direct în tabela `sale_return_items` pentru a proteja istoricul de eventuale modificări ulterioare ale configurării produselor.
*   **Interfață UI (Modal de retur)**: Blueprint-ul vizual și de flux de lucru pentru actualizarea modalului `ReturnSaleModal` pentru a afișa explicit garanția returnată separat de valoarea produsului.
*   **Reconciliere Casierie**: Actualizarea modului de calcul al soldului sertarului de numerar (Cash Drawer) pentru a deduce corect valoarea integrală a returului (produs + garanție).

### Ce NU implementăm (Exclus din MVP)
*   **Returnare separată a ambalajelor**: Clientul care aduce doar ambalajele goale la magazin pentru a-și recupera garanția (fără a returna marfă și fără un bon de vânzare asociat produsului) reprezintă un flux separat (colectare ambalaje SGR), care **NU** se implementează în această etapă.

### Regula de Business MVP
*   Returnarea unui produs cu SGR include returnarea garanției aferente cantității returnate.
    *   *Retur cantitate 1* => Refund produs + 0.50 lei SGR.
    *   *Retur cantitate 2* => Refund produs + 1.00 lei SGR.
*   SGR-ul returnat își păstrează tratamentul fiscal: TVA Grupa D, cota 0%.
*   SGR-ul este separat de valoarea produsului în schema bazei de date și în UI.

---

## 2. Audit retururi actuale

### DB Tables
1.  **`public.sale_returns`**:
    *   Salvează metadatele returului: `id`, `original_sale_id`, `shift_id`, `profile_id`, `type` (`void`, `return`), `status` (`completed`, `cancelled`), `total_refund` (valoarea totală stornată), `refund_method` (`cash`, `card`, `voucher`, `mixed`).
2.  **`public.sale_return_items`**:
    *   Stochează liniile stornate: `id`, `original_sale_item_id`, `product_id`, `batch_id`, `quantity`, `unit_price`, `total_item` (calculat ca `quantity * unit_price`).
    *   *Limitare curentă*: Nu deține nicio coloană pentru tracking-ul stornării garanției SGR.
3.  **`public.sales` & `public.sale_items`**:
    *   În etapele anterioare, `sale_items` a fost extins cu coloanele snapshot SGR: `sgr_enabled`, `sgr_type`, `sgr_deposit_amount`, `sgr_total_amount`, `sgr_vat_group`, `sgr_vat_rate`.
4.  **`public.payments`**:
    *   Înregistrează plățile inițiale asociate vânzării.
5.  **`public.stock_movements` & `public.stock_batches`**:
    *   Loturile din care s-a vândut produsul primesc înapoi stocul prin incrementarea cantității în `stock_batches` și înregistrarea unei mișcări de tip `return` în `stock_movements`.

### RPC-uri active
1.  **`public.get_sale_return_eligibility(p_store_id, p_profile_id, p_sale_id)`**:
    *   Validează permisiunile operatorului (rol de `admin` sau `manager` sau `platform_owner`).
    *   Verifică statusul vânzării (`finalized` sau `partially_returned`).
    *   Calculează cantitățile deja returnate agregând `sale_return_items` din retururile finalizate, determinând cantitatea disponibilă maximă pentru fiecare articol (`quantity_sold - quantity_returned`).
    *   *Limitare curentă*: Nu expune în payload-ul JSON informațiile despre SGR-ul înregistrat pe liniile de vânzare.
2.  **`public.return_sale_items(p_store_id, p_profile_id, p_sale_id, p_items, p_reason, p_refund_method, p_notes)`**:
    *   Efectuează stornarea tranzacțional.
    *   Actualizează stocul în loturile originale și înregistrează mișcările de stoc.
    *   Calculează totalul stornat exclusiv ca `quantity * unit_price`.
    *   *Limitare curentă*: Ignoră cu desăvârșire stornarea garanției SGR. Nu salvează snapshot-ul SGR în tabelul de retururi și nu include valoarea SGR în `total_refund`.

### UI Modal (`ReturnSaleModal`)
*   Se deschide din Istoric Vânzări (la click pe "RETUR PRODUSE" în detaliile bonului).
*   Permite editarea cantităților de returnat pentru fiecare produs, aplicând capping în timp real bazat pe valoarea `quantityAvailableToReturn`.
*   Afișează totalul stornat live, dar utilizează doar prețul unitar al produsului:
    `total + qty * item.unitPrice`
*   Are butoane pentru selecția metodei de refund (`cash`, `card`, `voucher`).

### Teste existente
*   **`test_sales_returns_6b33.py`**:
    *   Test E2E de Playwright care rulează un flux complet de vânzare parțială și totală, validând capping-ul din interfață, motivele minime de audit (minim 3 caractere), actualizarea stării bonului (`partially_returned` -> `returned`), indisponibilizarea butoanelor de acțiune după returul total, validarea interzicerii returului pe un bon anulat (voided) și reconcilierea de numerar la tura POS (care se întoarce la soldul inițial după un retur complet).

---

## 3. Model de calcul retur SGR

Pentru fiecare linie de bon `sale_item` care se returnează parțial sau total:

### Formule de calcul
*   `return_product_amount = returned_qty * unit_price`
*   `return_sgr_amount = returned_qty * sgr_deposit_amount` (dacă `sale_item.sgr_enabled = true`, altfel `0.00`)
*   `return_total_amount = return_product_amount + return_sgr_amount`

### Reguli matematice și fiscale:
1.  **Prioritate Snapshot**: Toate datele (`sgr_enabled`, `sgr_deposit_amount`, `sgr_type`) se citesc din snapshot-ul liniei de vânzare `sale_items`, nu din tabela curentă de produse. Acest lucru previne erorile dacă parametrii SGR ai produsului s-au schimbat de la momentul vânzării.
2.  **Capping strict la nivel de linie**: Cantitatea cumulată returnată pe o linie de bon nu poate depăși cantitatea vândută inițial.
3.  **Calcul SGR parțial fără dublare**:
    *   Dacă un bon are vândute 3 bucăți cu SGR și se returnează 1 bucată:
        *   SGR returnat = $1 \times 0.50 = 0.50$ LEI.
        *   Rămân disponibile pentru retur viitor 2 bucăți de produs și $2 \times 0.50 = 1.00$ LEI garanție.
    *   La următorul retur parțial pentru încă 2 bucăți:
        *   SGR returnat = $2 \times 0.50 = 1.00$ LEI.
        *   Sistemul interzice stornarea a mai mult de 3 garanții în total.
4.  **TVA zero (Grupul D)**: Garanția returnată păstrează `sgr_vat_group = 'D'` și `sgr_vat_rate = 0.00%`.

---

## 4. Schema DB propusă

Pentru a stoca snapshot-ul și stornările efective de SGR, extindem tabela `public.sale_return_items`.

```sql
-- Adăugare coloane în tabela de detalii retur
ALTER TABLE public.sale_return_items
ADD COLUMN IF NOT EXISTS sgr_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sgr_type text NULL,
ADD COLUMN IF NOT EXISTS sgr_deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgr_refund_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgr_vat_group text NULL,
ADD COLUMN IF NOT EXISTS sgr_vat_rate numeric(5,2) NOT NULL DEFAULT 0;

-- Constrângere de integritate (Check Constraint)
ALTER TABLE public.sale_return_items DROP CONSTRAINT IF EXISTS sale_return_items_sgr_check;
ALTER TABLE public.sale_return_items ADD CONSTRAINT sale_return_items_sgr_check
CHECK (
  (
    sgr_enabled = false
    AND sgr_type IS NULL
    AND sgr_deposit_amount = 0
    AND sgr_refund_amount = 0
    AND sgr_vat_group IS NULL
    AND sgr_vat_rate = 0
  )
  OR
  (
    sgr_enabled = true
    AND sgr_type IN ('plastic', 'metal', 'glass')
    AND sgr_deposit_amount = 0.50
    AND sgr_refund_amount >= 0
    AND sgr_vat_group = 'D'
    AND sgr_vat_rate = 0
  )
);

-- Indexuri pentru performanță la reconcilieri și analize SGR
CREATE INDEX IF NOT EXISTS idx_sale_return_items_sgr_enabled ON public.sale_return_items(sgr_enabled);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_sgr_type ON public.sale_return_items(sgr_type) WHERE sgr_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sale_return_items_return_sgr ON public.sale_return_items(return_id, sgr_enabled);
```

---

## 5. Blueprint `process_sale_return` (SQL RPC-uri)

Arhitectura propusă rescrie cele două RPC-uri din `database/proposed_sgr_returns_6d69.sql`:

### `get_sale_return_eligibility`
*   Extrage suplimentar datele SGR din snapshot-ul `sale_items`:
    `si.sgr_enabled`, `si.sgr_type`, `si.sgr_deposit_amount`, `si.sgr_total_amount`.
*   Trimite aceste date către client în vectorul `items` din payload-ul JSON.

### `return_sale_items`
*   Pentru fiecare element primit:
    *   Verifică disponibilitatea cantității (capping).
    *   Verifică dacă linia originală are `sgr_enabled = true`.
    *   Calculează `v_refund_sgr := round(v_ret_qty * v_sale_item.sgr_deposit_amount, 2)`.
    *   Adaugă `v_refund_sgr` împreună cu prețul stornat al produsului la `v_total_refund`.
    *   Inserează în `sale_return_items` valorile snapshot cu cota de TVA zero și grupa D.
    *   Restabilește stocul în lotul original din magazin.
*   Actualizează tabela principală `sale_returns` cu `total_refund` incluzând valoarea SGR.
*   Înregistrează evenimentul în audit logs.

---

## 6. Blueprint `ReturnSaleModal` (UI Frontend)

Modificările propuse pentru componenta `ReturnSaleModal.tsx` sunt următoarele:

### Afișare Info SGR per Produs
Dacă un produs are `sgrEnabled === true` în eligibility item:
*   Sub denumirea produsului se afișează o etichetă sau o linie adițională:
    `Include garanție SGR - PLASTIC: 0.50 lei / buc`

### Calcul Live al sumelor în Modal
Pe măsură ce utilizatorul mărește cantitatea stornată pentru un produs cu SGR, secțiunea de sume se actualizează dinamic:
*   **Produs stornat**: `qty * unitPrice` (ex: `10.00 LEI` pentru cantitate 1 de Oțet).
*   **Garanție SGR stornată**: `qty * 0.50` (ex: `0.50 LEI`).
*   **Total de returnat**: `(qty * unitPrice) + (qty * 0.50)` (ex: `10.50 LEI`).

### Validări și Warning-uri în UI
*   Butoanele de returnare numerar/card vor afișa suma totală incluzând SGR (ex: `CONFIRMĂ RETURUL (10.50 LEI)`).
*   Dacă se selectează o cantitate care ar genera refund, modalul afișează clar că se va sturna și garanția corespunzătoare, respectând capping-ul din DB.

---

## 7. Impact pe Sales History după retur

*   **Afișare Detalii Bon**: Detaliile bonului în istoric (`SalesHistoryPage`) trebuie să arate stornarea SGR în listarea retururilor anterioare asociate bonului.
*   **Structura Istoricului de Stornare**:
    `Retur: Oțet 1L x1 (-10.00 lei) + Garanție SGR - PLASTIC (-0.50 lei) = -10.50 lei stornat prin CASH`
*   Dacă un bon a fost returnat parțial, badge-ul din UI își schimbă statusul în `RETURNAT PARȚIAL` (sau `RETURNAT` dacă toate articolele au fost stornate), luând în calcul soldul cumulat.

---

## 8. Impact pe Cash Drawer / Shift Reconciliation

Acesta este un aspect critic din punct de vedere contabil și de audit:

1.  **Deducere din Numerar (Cash Refund)**:
    *   Când un retur se face prin metoda `cash`, suma totală returnată (produs + SGR) trebuie extrasă din sertarul de numerar.
    *   În RPC-urile de tură `get_active_pos_shift` și `close_pos_shift`, valoarea `total_cash_refunds` preia valoarea din `sale_returns.total_refund`.
    *   Cum am propus ca `total_refund` să conțină atât valoarea bunului, cât și garanția SGR, calculele de reconciliere din sertar vor funcționa automat corect:
        `expected_cash = opening_cash + total_cash_sales - total_cash_refunds`
2.  **Plăți prin Card (Card Refund)**:
    *   Similar cash-ului, tranzacția stornată pe card trebuie să însumeze valoarea produsului și a garanției SGR.
3.  **Fluxul de Închidere Tură (Z-Report)**:
    *   La închiderea de tură, raportul financiar va evidenția corect stornarea de numerar faptic, iar diferențele faptic vs. scriptic vor fi zero dacă casierul a returnat exact suma calculată de sistem.

---

## 9. Edge Cases documentate

1.  **Retur parțial multiplu**:
    *   *Scenariu*: Vânzare 5 bucăți produs SGR. Retur 1: 2 bucăți. Retur 2: 3 bucăți.
    *   *Soluție*: La Retur 1, se returnează $2 \times 0.50 = 1.00$ LEI SGR. La Retur 2, sistemul verifică în `sale_return_items` că s-au returnat deja 2 bucăți, deci permite maxim 3 bucăți de returnat și stornează corect restul de $3 \times 0.50 = 1.50$ LEI SGR.
2.  **Bonuri Legacy (vândute înainte de implementarea SGR)**:
    *   *Scenariu*: Returul unui bon vechi unde coloanele `sgr_enabled` din `sale_items` sunt `NULL` sau `false`.
    *   *Soluție*: RPC-ul evaluează `COALESCE(sgr_enabled, false)` care va fi `false`, stornând 0.00 lei SGR. UI-ul nu afișează linii SGR suplimentare, comportându-se identic cu un produs non-SGR.
3.  **Modificarea produsului după vânzare**:
    *   *Scenariu*: Produsul a fost vândut ca fiind non-SGR. Ulterior, din panoul de administrare i se activează SGR-ul. Clientul returnează produsul vândut anterior.
    *   *Soluție*: Deoarece returul folosește **snapshot-ul** din linia `sale_items` creată la finalizarea vânzării (unde `sgr_enabled` este `false`), returul nu va storna nicio garanție, prevenind frauda (reclamarea unei garanții care nu a fost plătită la achiziție).
4.  **Produs deteriorat returnat fără ambalaj SGR**:
    *   *Decizie MVP*: În cadrul acestui MVP, returnarea produsului presupune obligatoriu returnarea produsului în ambalajul său. Nu se permite separarea din punct de vedere operațional (de exemplu, clientul să returneze produsul degradat, dar magazinul să refuze returnarea garanției pe motiv că ambalajul lipsește). Această decizie simplifică masiv controlul de stoc și fiscalitatea.
5.  **Returnarea ambalajelor fără bon / fără produs**:
    *   *Decizie MVP*: Acest flux reprezintă o colectare SGR independentă (automată prin RVM sau manuală) și nu face parte din returul de marfă. Va fi tratată ca un modul separat în viitor.

---

## 10. Etape următoare

În conformitate cu planul de implementare robust, etapele viitoare sunt:

1.  **Etapa 6D.6.10: SGR Returns SQL Pre-Apply Hardening**
    *   Scrierea testelor unitare de securitate și consistență în fișiere SQL dedicate înainte de aplicarea pe baza de date de test.
    *   Validarea constrângerilor de tip check și a capping-ului tranzacțional în scenarii simulate.
2.  **Etapa 6D.6.11: SGR Returns SQL Apply Verification**
    *   Aplicarea modificărilor pe schema live, actualizarea RPC-urilor în baza de date.
    *   Rularea testelor backend pentru a confirma că procesarea funcționează corect fără a altera alte module.
3.  **Etapa 6D.6.12: SGR Returns Frontend Integration**
    *   Actualizarea componentelor React (`ReturnSaleModal.tsx`, `SalesHistoryPage.tsx`, tipuri TypeScript) pentru a implementa calculul dinamic și afișarea detaliilor SGR la retur.
4.  **Etapa 6D.6.13: SGR Returns E2E / Visual QA**
    *   Scrierea și rularea unui test Playwright E2E (`test_sgr_returns_e2e.py`) pentru a simula fluxul complet în browser.
    *   Înregistrarea video/capturi de ecran și validarea reconcilierii soldului casei în tura POS.

---

## 11. Decizie

**Status recomandat**:
*   `Ready for 6D.6.10 SGR Returns SQL Pre-Apply Hardening`
