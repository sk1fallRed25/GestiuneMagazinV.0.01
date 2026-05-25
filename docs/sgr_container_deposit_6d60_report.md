# SGR Container Deposit Blueprint Report — Etapa 6D.6.0

## 1. Decizii Principale
*   **Stocare SGR:** S-a decis stocarea tipului de ambalaj și a stării de eligibilitate SGR direct pe tabelul global de produse `public.products` sub formă de coloane noi (`sgr_enabled`, `sgr_type`). Proprietatea fizică a recipientului este intrinsecă produsului și este uniformă la nivelul tuturor magazinelor (pentru același cod de bare).
*   **Separare Fiscală:** Garanția SGR (0.50 lei) este tratată fiscal independent de lichidul/băutura din ambalaj.
*   **Grupa Fiscală TVA:** Garanția SGR folosește exclusiv **Grupa D (TVA 0%)** conform normelor din România, indiferent de grupa TVA a produsului asociat (care poate fi A — 21%, B — 11% etc.).
*   **Snapshot-ul tranzacției:** Structura `public.sale_items` va fi extinsă pentru a include un snapshot complet al garanției reținute la momentul vânzării (`sgr_enabled`, `sgr_type`, `sgr_deposit_amount`, `sgr_total_amount`, `sgr_vat_group`, `sgr_vat_rate`).

## 2. SQL Blueprint Creat
A fost generat fișierul `database/proposed_sgr_containers_6d60.sql` care conține:
1.  `ALTER TABLE public.products` pentru adăugarea coloanelor de configurare a produsului SGR.
2.  `ALTER TABLE public.sale_items` pentru adăugarea coloanelor de snapshot SGR.
3.  Constrângeri `CHECK` stricte pentru consistență de date (e.g. `sgr_type` poate fi setat doar dacă `sgr_enabled` este `true`).
4.  Indecși optimizați pentru căutare și raportare.
5.  Funcția helper `public.get_sgr_deposit_config()` securizată cu `SET search_path = public` și restricții de execuție, returnând metadatele sistemului către utilizatorii autentificați.

## 3. Ce NU s-a implementat (Scope Guard)
*   **SQL-ul nu a fost aplicat:** Nicio modificare la nivel de schemă sau date live nu a fost rulată în baza de date.
*   **Nu s-a modificat codul de business/UI:** POS-ul, formularele Quick Add și Product Edit, logica de finalizare a vânzării din `finalize_sale` și istoricul vânzărilor rămân nemodificate în această etapă de blueprinting.

## 4. Următorul Pas Recomandat
*   **Etapa 6D.6.1: SGR SQL Apply Verification** pentru aplicarea și testarea în siguranță a migrării bazei de date.
