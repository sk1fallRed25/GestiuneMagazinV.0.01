# Raport Oficial Etapa 6D.6.9: SGR Returns Integration Blueprint

## 1. Audit Retururi Actuale
*   **Structura BD**: Tabela `sale_return_items` nu are în prezent stocare pentru proprietățile SGR (stare, tip, valoare depozit, valoare stornată, grupa și rata TVA). În schimb, tabela `sale_items` stochează deja cu succes snapshot-ul SGR la vânzare.
*   **RPC-uri**:
    *   `get_sale_return_eligibility` nu returnează în prezent proprietățile SGR din snapshot-ul vânzării în structura JSON a liniilor de produs.
    *   `return_sale_items` nu include garanția SGR în suma stornată (`total_refund` din `sale_returns`) și nu stochează snapshot-ul SGR în `sale_return_items`.
*   **Interfață (UI)**: Componenta `ReturnSaleModal` calculează suma live de returnat folosind doar prețul produsului, ignorând taxa de garanție SGR.
*   **E2E Tests**: Testul existent `test_sales_returns_6b33.py` validează fluxurile normale fără SGR, verificând corectitudinea soldului sertarului POS după stornări.

## 2. Decizie MVP
*   Returnarea unui produs vândut cu SGR returnează automat și garanția SGR de 0.50 RON per unitate (cu cota 0% TVA, grupa D).
*   SGR-ul este tratat separat de produs în baza de date și în UI.
*   Returnarea separată a ambalajelor (fără marfă/fără bon) nu este inclusă în MVP.

## 3. Schema BD Propusă
Propuse 6 coloane noi în `public.sale_return_items`:
*   `sgr_enabled` (boolean)
*   `sgr_type` (text - plastic/metal/glass)
*   `sgr_deposit_amount` (numeric(12,2) - 0.50)
*   `sgr_refund_amount` (numeric(12,2) - cantitate returnată * 0.50)
*   `sgr_vat_group` (text - 'D')
*   `sgr_vat_rate` (numeric(5,2) - 0.00)
A fost propusă o constrângere de integritate CHECK pe aceste coloane și 3 indexuri de optimizare.

## 4. Impact UI (`ReturnSaleModal`)
*   Afișare text informativ sub produs: `Include garanție SGR - PLASTIC: 0.50 lei / buc`.
*   Calculare dinamică live a sumei totale stornate: `Valoare Produs + Valoare Garanție`.
*   Afișare avertisment și total corect pe butonul de confirmare.

## 5. Impact Cash Drawer / Shift Reconciliation
*   Valoarea stornării SGR este inclusă în totalul de refund (`total_refund` în `sale_returns`).
*   Numerarul așteptat în sertar la închiderea de tură (`expected_cash`) este redus corect cu valoarea totală stornată (bun + SGR). Calculele existente din `get_active_pos_shift` și `close_pos_shift` rămân valide automat deoarece folosesc `total_refund`.

## 6. Ce nu s-a modificat (Siguranță DML-Zero)
*   Baza de date live **nu a fost modificată** (nu s-au rulat comenzi DDL sau DML).
*   RPC-urile din baza de date live **nu au fost modificate**.
*   Codul sursă al frontend-ului (UI, modal, servicii) **nu a fost modificat**.
*   Nu s-au rulat scripturi de backfill.

## 7. Următorul Pas
*   Trecerea la etapa **6D.6.10: SGR Returns SQL Pre-Apply Hardening** (Finalizată). Blueprint-ul SQL a fost întărit cu validări pe argumentul JSON, normalizări de input, câmpuri de urmărire extinse pe eligibility și log de audit dedicat pentru SGR. Nu s-a aplicat SQL și nu s-a modificat baza de date live. Pasul următor este **6D.6.11 SGR Returns SQL Manual Apply + Verification**.
