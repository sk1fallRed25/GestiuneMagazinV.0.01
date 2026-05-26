# Raport Oficial Etapa 6D.6.10: SGR Returns SQL Pre-Apply Hardening

## 1. Rezumat
*   **Status**: `Ready for 6D.6.11 SGR Returns SQL Manual Apply + Verification`
*   **Bază de date modificată live**: **NU** (Safety constraint: DML-Zero, nu s-au rulat scripturi DDL/DML live).
*   **Frontend modificat runtime**: **NU**.
*   **RPC-uri live modificate**: **NU**.

---

## 2. Audit Blueprint & Live Schema
S-a efectuat un audit detaliat al blueprint-ului existent și al structurii live a bazei de date (folosind comenzi read-only `list_tables` pe proiectul Supabase activ `GestiuneMagazinV0.0.1`):
*   **`sale_return_items`**: Nu are momentan coloane specifice SGR în producție. `return_id` este FK valid către `sale_returns.id`, iar `original_sale_item_id` este FK valid către `sale_items.id`.
*   **`get_sale_return_eligibility`**: Interogarea citește din `sale_items` snapshot-ul SGR.
*   **`return_sale_items`**: Restabilește stocurile corect folosind `batch_id` în `stock_batches` și înregistrează mișcări de stoc în `stock_movements`.

---

## 3. Constraint Hardening
Constrângerea `sale_return_items_sgr_check` din `database/proposed_sgr_returns_6d69.sql` a fost validată și configurată pentru a impune reguli stricte:
*   **Cazul fără SGR**:
    *   `sgr_enabled = false`
    *   `sgr_type IS NULL`
    *   `sgr_deposit_amount = 0`
    *   `sgr_refund_amount = 0`
    *   `sgr_vat_group IS NULL`
    *   `sgr_vat_rate = 0`
*   **Cazul cu SGR**:
    *   `sgr_enabled = true`
    *   `sgr_type IN ('plastic', 'metal', 'glass')`
    *   `sgr_deposit_amount = 0.50`
    *   `sgr_refund_amount >= 0`
    *   `sgr_vat_group = 'D'`
    *   `sgr_vat_rate = 0`

*Notă*: Constrângerea nu leagă direct `sgr_refund_amount` de cantitate ca să nu complice migrarea datelor, însă funcția RPC garantează că `sgr_refund_amount = returned_qty * 0.50`.

---

## 4. Grants Hardening
Pentru a preveni expunerile accidentale, ambele funcții au primit instrucțiuni explicite de revocare și autorizare:
```sql
REVOKE EXECUTE ON FUNCTION public.get_sale_return_eligibility(...) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sale_return_eligibility(...) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sale_return_eligibility(...) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_return_eligibility(...) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.return_sale_items(...) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(...) FROM anon;
REVOKE EXECUTE ON FUNCTION public.return_sale_items(...) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.return_sale_items(...) TO authenticated;
```
Aceasta asigură starea finală sigură: **PUBLIC: false, anon: false, authenticated: true**.

---

## 5. Payload Validation
În funcția `return_sale_items`, s-a adăugat validare structurală strictă (fail-fast) a argumentului `p_items`:
*   Verificare că `p_items` nu este null, este de tip JSON `array` și conține cel puțin un element.
*   În buclă:
    *   Fiecare element conține obligatoriu cheile `sale_item_id` și `quantity`.
    *   Tipul de date pentru `sale_item_id` trebuie să fie string, iar pentru `quantity` numeric.
    *   Verificare validitate format UUID pentru `sale_item_id` printr-un bloc `BEGIN...EXCEPTION`.
    *   Verificare cantitate returnată strict mai mare ca 0.
*   De asemenea, argumentul `p_reason` este procesat prin `trim()` (minim 3 caractere), iar `p_refund_method` este normalizat la litere mici prin `lower(trim(p_refund_method))` și salvat în variabila locală `v_refund_method`.

---

## 6. SGR Refund Calculation & Capping
*   **Refund produs**: `v_ret_qty * unit_price` (rotunjit la 2 zecimale).
*   **Refund SGR**: `v_ret_qty * sgr_deposit_amount` (0.50 lei/unitate).
*   **Refund total**: suma celor două valori, adăugată la `total_refund` din `sale_returns`.
*   **Protecție la retur parțial multiplu**: Cantitatea returnată este comparată cu cantitatea rămasă disponibilă (`quantity - quantity_already_returned`). Deoarece cantitatea de returnat este capped strict la nivel de linie de bon, este imposibilă dublarea sau depășirea valorilor SGR vândute inițial.
    *   *Exemplu*: Vândut 3 bucăți SGR. Retur 1: se returnează 1 bucată => SGR Refund = 0.50 lei. Retur 2: se returnează 2 bucăți => SGR Refund = 1.00 lei. Retur 3: se încearcă returnarea a încă 1 bucată => Erori de capping (cantitate disponibilă ramasă = 0).

---

## 7. Eligibility Output Extins
Funcția `get_sale_return_eligibility` a fost extinsă pentru a include informații de monitorizare detaliate pentru fiecare articol din coșul de retur:
*   `sgr_returned_amount`: Suma cumulată a garanțiilor SGR returnate deja pentru acea linie de produs.
*   `sgr_available_amount`: Garanția SGR disponibilă pentru a fi returnată, calculată dinamic pe baza cantității disponibile rămase.
Aceste câmpuri permit interfeței frontend (`ReturnSaleModal`) să afișeze corect starea stornării.

---

## 8. Audit Logs Hardening
Audit log-ul înregistrat în `public.audit_logs` conține acum sub-chei separate în structura `new_data`:
*   `sale_id`: ID-ul vânzării originale.
*   `total_refund`: Refund total (produse + garanție).
*   `sgr_refund_total`: Valoarea acumulată separată a garanției SGR stornate (`v_total_sgr_refund`).
*   `refund_method`: Metoda de plată utilizată la stornare (normalizată).
*   `reason`: Motivul returului (curățat).
*   `items`: Payload-ul elementelor returnate.

---

## 9. Backward Compatibility
Toate coloanele noi din tabela `sale_return_items` sunt create cu o valoare implicită (`DEFAULT false` pentru boolean, `DEFAULT 0` pentru zecimale, `NULL` pentru tip/grupă TVA). Constrângerea check trece cu succes pentru toate înregistrările legacy existente în baza de date. Nu este necesar un proces destructiv de backfill.

---

## 10. Decizie
Blueprint-ul actualizat este **securizat** și **pregatit pentru aplicare manuală** în cadrul etapei viitoare: **6D.6.11 SGR Returns SQL Manual Apply + Verification**.
