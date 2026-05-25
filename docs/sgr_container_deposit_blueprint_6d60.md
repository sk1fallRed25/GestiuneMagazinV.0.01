# SGR Container Deposit Blueprint — Etapa 6D.6.0

## 1. Rezumat
Sistemul de Garanție-Returnare (SGR) în România impune o garanție de 0.50 lei pentru ambalajele de băuturi din plastic, sticlă sau metal cu volume între 0.1L și 3L. 

Din punct de vedere fiscal, această garanție este o poziție cu regim special:
*   **Separare fiscală:** Garanția SGR este facturată separat de băutura în sine. Chiar dacă produsul (lichidul) are o cotă de TVA de 9% sau 19% (Grupa B sau A), ambalajul SGR trebuie tratat separat cu **TVA 0% (Grupa D)**.
*   **TVA SGR:** Întotdeauna 0% (Grupa D) conform reglementărilor fiscale naționale. SGR nu va moșteni niciodată grupa TVA a produsului principal.
*   **Neafectare produse standard:** Produsele care nu fac parte din programul SGR (alimente, produse neambalate în recipiente SGR) nu suferă modificări de flux.

---

## 2. Audit Structură Actuală

Un audit al bazei de date live și al codului TypeScript a arătat următoarele detalii structurale:
1.  **Produse Globale (`public.products`):** Produsele sunt stocate la nivel global (per `store_id`) în tabelul `public.products`. Acesta conține date de bază precum `name`, `barcode`, `unit` și `status`.
2.  **Prețuri și TVA per Magazin (`public.product_prices`):** Prețurile (`price_sale`, `price_purchase`) și configurația TVA (`vat_group`, `vat_percent`) sunt stocate în `public.product_prices` (per magazin, pe relația `store_id` + `product_id`).
3.  **Adăugare Rapidă (Quick Add):** Serviciul `fastAddService.createFastProduct()` preia un payload `FastAddProductPayload` și efectuează inserarea în `products` și upsert în `product_prices`.
4.  **Editare Produs (Product Edit):** `productService.updateProduct()` preia modificările utilizatorului ca `ProductUpdateInput` și efectuează un `UPDATE` pe `products` (pentru nume, cod bare, unitate) și `UPSERT` în `product_prices` (pentru prețuri și `vat_group`).
5.  **Interfața POS:** Produsele sunt încărcate în POS prin `posService.searchProducts()` and `posService.getProductByBarcode()`. POS preia prețul de vânzare și cota TVA din cache/DB, le pune în coș și trimite payload-ul către funcția RPC `finalize_sale`.
6.  **Salvare Vânzări (`public.sale_items`):** Când utilizatorul finalizează o vânzare, clientul POS apelează RPC-ul atomic `finalize_sale(p_store_id, p_profile_id, p_items, p_payments, p_shift_id)`. Această procedură stocată deduce stocul prin FEFO din `stock_batches`, înregistrează mișcarea în `stock_movements`, inserează bonul în `sales`, plățile în `payments` și asociază liniile în `sale_items`.
7.  **Persistență Snapshot TVA:** Din Etapa 6D.5.4, `finalize_sale` calculează prin helper-ul `calculate_vat_breakdown` valorile snapshot-ului de TVA (`vat_group`, `vat_rate`, `vat_amount`, `price_without_vat`, `total_without_vat`, `price_includes_vat`) și le salvează direct pe fiecare rând în `sale_items`.
8.  **Sales History (Istoric Vânzări):** `SaleDetailsModal.tsx` apelează `salesHistoryService.getSaleDetails()` care returnează valorile din snapshot-ul de TVA din `sale_items` și construiește un tabel detaliat cu un subsol (`tfoot`) grupat pe cote fiscale.

---

## 3. Model Produs

Pentru a suporta SGR, modelul de produs va stoca informația de eligibilitate și tipul ambalajului:
*   `sgr_enabled` (boolean): `true` dacă produsul participă la SGR; implicit `false`.
*   `sgr_type` (text): Tipul ambalajului. Valori permise: `plastic`, `metal`, `glass` sau `NULL` (atunci când `sgr_enabled` este `false`).

### Etichete UI Propuse:
*   `Fără SGR`
*   `SGR - PLASTIC`
*   `SGR - METAL`
*   `SGR - STICLĂ`

---

## 4. Model Fiscal SGR

Fiecare linie de vânzare care conține un produs cu `sgr_enabled = true` va genera automat o taxă de garanție atașată. Regulile fiscale sunt fixe:
*   `SGR_AMOUNT` = `0.50` lei (valoare fixă de sistem, nu se modifică per magazin).
*   `SGR_VAT_GROUP` = `'D'` (TVA 0%).
*   `SGR_VAT_RATE` = `0`.
*   SGR este exclus din baza impozabilă a produsului principal. De exemplu:
    *   Băutură: `4.50 lei` (TVA A — 21% inclus). Baza: `3.72 lei`, TVA: `0.78 lei`.
    *   Ambalaj SGR: `0.50 lei` (TVA D — 0% inclus). Baza: `0.50 lei`, TVA: `0.00 lei`.
    *   Total de plată client: `5.00 lei` (Taza netă totală: `4.22 lei`, TVA total: `0.78 lei`).

---

## 5. SQL Propus

Blueprint-ul SQL este definit în `database/proposed_sgr_containers_6d60.sql`. Acesta include:
1.  Extinderea tabelului `public.products` cu câmpurile `sgr_enabled` și `sgr_type` (cu index și constrângere CHECK de consistență).
2.  Extinderea tabelului `public.sale_items` cu coloane de snapshot SGR (`sgr_enabled`, `sgr_type`, `sgr_deposit_amount`, `sgr_total_amount`, `sgr_vat_group`, `sgr_vat_rate`) pentru a memora garanția reținută la momentul tranzacției.
3.  Procedura stocată `public.get_sgr_deposit_config()` ce returnează metadatele și constantele sistemului SGR către clienții autorizați.

---

## 6. Plan de Integrare: Adăugare Rapidă (Quick Add)

În formularul de adăugare rapidă a produsului, se va adăuga un selector sub câmpul de selectare a TVA-ului:
*   **Selector SGR:** Un dropdown cu opțiunile: *Fără SGR*, *SGR - PLASTIC*, *SGR - METAL*, *SGR - STICLĂ*.
*   **Microcopy Informational:** "SGR se aplică ambalajului și are TVA 0% (Grupa D). Nu modifică TVA-ul băuturii."
*   **Payload:** Când se apelează `fastAddService.createFastProduct()`, payload-ul va trimite suplimentar `sgrEnabled` (boolean) și `sgrType` (string sau null). Serviciul va insera aceste valori direct în tabelul `products`.

---

## 7. Plan de Integrare: Product Edit Modal

În formularul principal de editare al produselor din ecranul de Gestiune Produse:
*   Se adaugă selectorul SGR în secțiunea de detalii fiscale (lângă selectorul de TVA).
*   Formularul va reflecta starea curentă a produsului citită din DB.
*   **Salvare:** Când se modifică starea SGR, `productService.updateProduct` trimite câmpurile `sgrEnabled` și `sgrType` în payload-ul de update al tabelului `products`. 
*   **Compatibilitate Loturi:** Deoarece SGR este o proprietate a produsului de bază (și nu influențează direct fluxul de recalculare stoc sau cost achiziție batch), modificarea acesteia este permisă oricând, fără a fi blocată de gestiunea pe loturi reale.

---

## 8. Plan de Integrare: POS

*   **Afișare Coș:** Atunci când se adăuga în coș un produs cu `sgr_enabled = true`, sub numele produsului se va afișa o sub-linie distinctă:
    `+ Garanție SGR (PLASTIC)   0.50 lei`
*   **Total de plată:** Valoarea totală a coșului va include suma prețurilor produselor + valoarea cumulată a garanțiilor SGR (cantitate * 0.50 lei per produs cu SGR).
*   **Stoc:** Stocul produsului principal se scade normal. Ambalajul SGR nu are o fișă de stoc dedicată în această etapă (este o taxă/garanție fiscală, nu un produs fizic inventariat).

---

## 9. Plan de Integrare: Sale Snapshot & finalize_sale

În etapa următoare, procedura stocată din Supabase `finalize_sale` va fi actualizată pentru a citi starea SGR a produselor la momentul vânzării:
*   Dacă `products.sgr_enabled` este `true`, finalize_sale va calcula valorile de garanție:
    *   `sgr_deposit_amount = 0.50`
    *   `sgr_total_amount = quantity * 0.50`
    *   `sgr_vat_group = 'D'`
    *   `sgr_vat_rate = 0`
*   Aceste valori vor fi înregistrate în noile coloane de snapshot din `sale_items`.
*   Totalul bonului (`sales.total`) va fi calculat automat incluzând valoarea SGR.

---

## 10. Plan de Integrare: Sales History & Detalii Bon

În modalul de vizualizare a bonului (`SaleDetailsModal.tsx`):
*   **Afișare Linii Produse:** Dacă o linie din bon are `sgr_enabled = true`, sub rândul produsului se va afișa o linie suplimentară indentată corespunzătoare garanției:
    `Garanție SGR (PLASTIC) x1: 0.50 lei | TVA: D — 0%`
*   **Footer Summary:** Sumarul fiscal va grupa garanțiile sub **Grupa D (0%)** în tabelul de TVA. 
*   Afișarea în subsol va fi separată clar:
    *   *Total Bază Produse*
    *   *Total TVA Produse*
    *   *Total Garanții SGR (Grupa D)*
    *   *Total General de Plată*

---

## 11. Plan de Integrare: Retururi

*   **Regulă de Business MVP:** La returnarea unui produs care a fost vândut cu garanție SGR, valoarea garanției asociate (0.50 lei per unitate) se returnează automat clientului în cadrul aceleiași tranzacții de retur.
*   **Limitări:** Returnarea ambalajului SGR gol fără cumpărarea unui produs (fluxul invers de colectare) este un proces separat care nu face obiectul acestui blueprint (va fi tratat într-o etapă comercială ulterioară, posibil prin emiterea de vouchere valorice SGR).

---

## 12. Etape Următoare

1.  **Etapa 6D.6.1: SGR SQL Pre-Apply & Apply Verification**
    *   Hardening-ul scriptului propus, scrierea testului Playwright/Python de verificare și aplicarea manuală în editorul Supabase SQL.
2.  **Etapa 6D.6.2: SGR Product Forms Integration**
    *   Modificarea UI-ului formularului Quick Add v2 și a Product Edit Modal pentru a permite salvarea și editarea stării SGR pe produse.
3.  **Etapa 6D.6.3: SGR POS / Receipt Integration**
    *   Actualizarea interfeței POS pentru afișarea și calculul garanției, actualizarea RPC-ului `finalize_sale` cu snapshot-ul SGR și actualizarea modului de afișare din `SaleDetailsModal.tsx`.
4.  **Etapa 6D.6.4: SGR E2E / Visual QA**
    *   Scrierea testelor automate Playwright, rularea build-ului de producție și capturarea screenshot-urilor de QA pe multiple rezoluții.

---

## 13. Decizie

> [!NOTE]
> Proiectarea este completă și conformă cu normele fiscale din România. Datele SGR sunt decuplate de TVA-ul produsului principal și izolate în grupa D (0%).

**Status:** **Ready for 6D.6.2 SGR SQL Apply Verification**

---

## 14. Corecție 6D.6.1 — SQL Pre-Apply Hardening

În cadrul etapei 6D.6.1, s-au aplicat măsuri suplimentare de siguranță și optimizare pe scriptul SQL blueprint `database/proposed_sgr_containers_6d60.sql`:
1.  **Constrângerea `sale_items_sgr_check` Întărită:** S-a specificat clar comportamentul fiscal pentru ambele stări:
    *   `sgr_enabled = false` => `sgr_type` is NULL, `sgr_deposit_amount` = 0, `sgr_total_amount` = 0, `sgr_vat_group` is NULL, `sgr_vat_rate` = 0.
    *   `sgr_enabled = true` => `sgr_type` is in ('plastic', 'metal', 'glass'), `sgr_deposit_amount` = 0.50, `sgr_total_amount` >= 0, `sgr_vat_group` = 'D', `sgr_vat_rate` = 0.
2.  **Indexuri Dedicate pe `sale_items`:** Adăugarea indexului `idx_sale_items_sgr_enabled` pe `(store_id, sgr_enabled)` și a indexului parțial `idx_sale_items_sgr_type` pe `(store_id, sgr_type) WHERE sgr_enabled = true` pentru a asigura performanță optimă la raportarea garanțiilor SGR.
3.  **Configurație Extinsă `get_sgr_deposit_config()`:** Funcția helper a fost îmbunătățită pentru a include monedele, etichetele de TVA și detalii despre tipul depozitului:
    *   `currency`: `'RON'`
    *   `vatLabel`: `'Grupa D — 0%'`
    *   `depositLabel`: `'Garanție SGR'`
4.  **Compatibilitate Date Existente:** Definirea valorilor implicite (`sgr_enabled = false`, etc.) permite aplicarea lină a constraint-urilor peste datele din baza de date existentă (bonuri vechi), fără a fi necesar un script de backfill.
5.  **Status finalize_sale:** Funcția RPC `finalize_sale` rămâne neschimbată în această etapă, urmând a fi patch-uită ulterior în cursul implementării fluxului de POS checkout.

