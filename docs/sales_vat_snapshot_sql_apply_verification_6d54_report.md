# Sales VAT Snapshot SQL Apply Verification — Etapa 6D.5.4

## 1. Rezumat

| Element | Status / Detalii |
| :--- | :--- |
| **Status General** | **✅ PASS** |
| **SQL Aplicat** | Da, prin migrarea `20260525140000_sales_history_vat_snapshot.sql` |
| **Baza de Date modificată** | Da, schema extinsă cu 6 coloane pe `sale_items` și funcțiile/RPC-urile actualizate |
| **Frontend modificat** | ❌ Nu (conform constrângerilor etapei) |
| **Backfill rulat** | ❌ Nu (bonurile legacy păstrează NULL pentru a asigura trasabilitatea istorică corectă) |
| **Decizie Finală** | **Ready for 6D.5.5 Sales History VAT Display Frontend Integration** |

---

## 2. Structură `sale_items`

Extensia de schemă a fost interogată și confirmată în baza de date. Tabelul `public.sale_items` conține acum următoarele elemente noi:

### Coloane noi
*   `vat_group` (`text`): Grupa TVA fiscală aplicată produsului (A, B, C, D, E).
*   `vat_rate` (`numeric(5,2)`): Procentul ratei TVA salvat istoric (ex: 21.00, 11.00, 0.00).
*   `price_includes_vat` (`boolean`): Indică dacă prețul unitar de vânzare conține TVA. Default `true`.
*   `price_without_vat` (`numeric(12,2)`): Prețul unitar net, fără TVA.
*   `vat_amount` (`numeric(12,2)`): Valoarea totală a TVA pe linie (`total_item - total_without_vat`).
*   `total_without_vat` (`numeric(12,2)`): Baza impozabilă (valoarea netă totală a liniei).

### Constrângeri (Check Constraint)
*   **`sale_items_vat_group_check`**: `CHECK (vat_group IN ('A', 'B', 'C', 'D', 'E') OR vat_group IS NULL)`.
    *   *Rol*: Asigură că se pot introduce doar grupe fiscale valide conform legislației din România (A=21%, B=11%, C=11%, D=0%, E=0%), permițând totodată valoarea `NULL` pentru compatibilitate cu datele legacy.

### Index fiscal
*   **`idx_sale_items_store_vat_reporting`**: creat pe `(store_id, sale_id, vat_group)`.
    *   *Rol*: Optimizează viteza de generare a rapoartelor de TVA (ex: Jurnal Vânzări) per magazin și bon fiscal.

---

## 3. Helperi TVA

Funcțiile de calcul fiscal au fost definite securizat:

1.  **`public.get_vat_rate_for_group(text)`**
    *   *Proprietate*: `IMMUTABLE`, `SET search_path = public`.
    *   *Rol*: Normalizează input-ul cu `upper(trim())` și returnează cota numerică. Ridică o excepție explicită la valori nule sau invalide (ex: grupa 'X').
2.  **`public.calculate_vat_breakdown(numeric, text, boolean)`**
    *   *Proprietate*: `STABLE`, `SET search_path = public`.
    *   *Rol*: Calculează baza, valoarea TVA și valoarea brută rotunjite la 2 zecimale. Suportă politici de preț inclusive și exclusive. Validează inputurile negative/null.

---

## 4. `finalize_sale` Patch

Funcția tranzacțională `public.finalize_sale` a fost modificată cu succes pentru a salva snapshot-ul TVA per linie fără a altera logica preexistentă.

### Păstrarea Regulilor de Business Live:
*   **Validare Tură**: Păstrează verificarea obligatorie a turei active (`pos_shifts WHERE status='open'`).
*   **FEFO / FIFO**: Alocă loturile în ordinea FIFO/FEFO folosind clauza `FOR UPDATE` pentru a preveni race conditions.
*   **Scădere Stoc**: Scade cantitățile corect din loturi și inserează mișcările de stoc (`stock_movements`) de tip `sale`.
*   **Plăți**: Suportă și validează plățile (cash, card, mixt, etc.) cu verificarea sumei totale (toleranță 0.01).
*   **Audit**: Nu s-au pierdut câmpurile de trasabilitate.
*   **Drepturi**: Rulează cu `SECURITY DEFINER` sub rolul creatorului (`postgres`) având setat explicit `SET search_path = public`.

---

## 5. Test Vânzare Nouă

S-a rulat un test tranzacțional automat de vânzare reală folosind fluxul din interfață.

### Date tranzacție:
*   **Produs vândut**: `OTET 1L` (cu `vat_group` = 'A' în `product_prices`)
*   **Preț brut la raft (TVA inclus)**: `0.65 LEI`
*   **Cantitate**: `1 buc`

### Snapshot TVA salvat în `sale_items`:
```json
{
  "id": "5146aeef-96ad-4cb3-9cfe-be645be9a80a",
  "product_id": "7df05807-a7a0-49ff-a8b2-3bbbe9123c9c",
  "quantity": 1,
  "unit_price": 0.65,
  "total_item": 0.65,
  "vat_group": "A",
  "vat_rate": 21.00,
  "price_includes_vat": true,
  "price_without_vat": 0.54,
  "vat_amount": 0.11,
  "total_without_vat": 0.54
}
```

### Verificare matematică:
1.  **Baza fără TVA (Preț net)**:
    $$PriceWithoutVat = \text{ROUND}\left(\frac{0.65}{1.21}, 2\right) = 0.54 \text{ LEI}$$
    *(Valoarea din baza de date: `0.54 LEI` — corect)*
2.  **Valoare TVA (TVA pe linie)**:
    $$VatAmount = 0.65 - 0.54 = 0.11 \text{ LEI}$$
    *(Valoarea din baza de date: `0.11 LEI` — corect)*
3.  **Total net linie**:
    $$TotalWithoutVat = 0.54 \text{ LEI}$$
    *(Valoarea din baza de date: `0.54 LEI` — corect)*

---

## 6. Bonuri Legacy

S-a verificat compatibilitatea cu tranzacțiile istorice anterioare migrării.
*   **Test**: Au fost interogate 10 tranzacții istorice.
*   **Rezultat**: Toate câmpurile noi (`vat_group`, `vat_rate`, `price_without_vat` etc.) sunt corect setate pe `NULL`.
*   **Comportament UI viitor**: În etapa de afișare frontend (6D.5.5), se va folosi un fallback inteligent: dacă `vat_group` este `NULL`, se va afișa grupa curentă din nomenclator cu marcajul **"Estimativ"** sau se va afișa **"N/A"**.
*   **Backfill**: Nu a fost rulat niciun backfill automat (faza 3 este păstrată doar ca documentație/blueprint comentat în baza de date).

---

## 7. Security / Grants

S-au verificat restricțiile de securitate aplicate funcțiilor noi:

*   **`get_vat_rate_for_group`**: Drepturile de execuție au fost revocate pentru `PUBLIC`, `anon` și `authenticated`. Apelul direct RPC returnează `42501 permission denied`.
*   **`calculate_vat_breakdown`**: Drepturile de execuție au fost revocate pentru `PUBLIC`, `anon` și `authenticated`. Apelul direct RPC returnează `42501 permission denied`.
*   **`finalize_sale`**: Drepturile de execuție sunt acordate doar pentru rolul `authenticated` (și explicit revocate pentru `PUBLIC` / `anon`).
*   **Search Path**: Toate funcțiile conțin clauza explicită `SET search_path = public` pentru a preveni vulnerabilitățile de tip *search path hijacking*.
*   **Advisors**: Supabase Advisors nu raportează avertizări privind securitatea funcțiilor modificate.

---

## 8. Decizie

**✅ Ready for 6D.5.5 Sales History VAT Display Frontend Integration**

Toate verificările de schemă, securitate și calcule matematice au trecut cu succes. Baza de date este pregătită pentru integrarea afișării cotelor de TVA în istoricul vânzărilor de pe frontend.
