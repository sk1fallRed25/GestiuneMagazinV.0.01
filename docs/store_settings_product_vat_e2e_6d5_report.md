# Store Settings + Product VAT E2E Test — Etapa 6D.5

Acest document descrie rezultatele rulării și detaliile testului E2E automatizat (`test_store_settings_product_vat_6d5.py`) care validează integrarea setărilor de magazin (plătitor/neplătitor TVA), a grupelor de TVA pe produse, precum și comportamentul modalului de editare a produsului în contextul stocurilor gestionate pe loturi reale.

---

## 1. Rezumat Executiv

* **Status final**: **PASS**
* **Script de testare**: `test_store_settings_product_vat_6d5.py`
* **Utilizator de test**: `admin@admin.com` (Owner/Administrator)
* **Magazine testate**:
  * **Magazin Principal** (ID: `00000000-0000-0000-0000-000000000001` — Plătitor de TVA)
  * **Magazin Test 12345678 Punct 902** (ID: `92d9f9f8-a927-496d-9759-05fa393f0839` — Neplătitor de TVA)
* **Build status**: **PASS** (`npm run build` finalizat cu succes, zero avertizări/erori blocate)
* **SQL aplicat**: Nu (nu au fost aduse modificări bazei de date sau RPC-urilor SQL în această etapă)
* **RPC modificat**: Nu

---

## 2. Test Matrix

Suita de teste Playwright acoperă următoarele scenarii operaționale:

| # | Scenariu | Pași de Verificare | Rezultat |
| :--- | :--- | :--- | :---: |
| 1 | **Login și Store Context** | Autentificare ca `admin@admin.com`, navigare pe Dashboard, confirmare punct de lucru selectat. | **PASS** |
| 2 | **Store Settings — Plătitor TVA** | Navigare la `/setari-magazin`, confirmare că magazinul principal este marcat ca plătitor de TVA și are grupele A-D configurate. | **PASS** |
| 3 | **Product Edit — Plătitor TVA** | Editare produs pe magazin plătitor, verificare selector TVA disponibil cu opțiunile A, B, C, D active, salvare și actualizare listă. | **PASS** |
| 4 | **Fast Add — Plătitor TVA** | Deschidere panou Fast Add, verificare selector TVA vizibil, adăugare produs nou, confirmare badge TVA corect în listă. | **PASS** |
| 5 | **Store Settings — Neplătitor TVA** | Comutare la al doilea magazin, navigare la setări, confirmare stare neplătitor TVA. | **PASS** |
| 6 | **Fast Add — Neplătitor TVA** | Deschidere Fast Add pe magazin neplătitor, verificare selector TVA blocat/ascuns și prezență banner fiscal, adăugare produs. | **PASS** |
| 7 | **Product Edit — Neplătitor TVA** | Deschidere editare pe magazin neplătitor, verificare selector TVA blocat pe Grupa E, prezență banner explicativ. | **PASS** |
| 8 | **Product Table Badge** | Validare vizuală a insignei de TVA în listă: procente calculate corect conform legii (21%, 11%, 0%). | **PASS** |
| 9 | **Product Edit cu Loturi Reale** | Verificare produs `OTET 1L` (gestionat pe loturi reale): câmpuri de stoc dezactivate, editarea TVA-ului permisă, salvare cu succes fără eroare de stoc. | **PASS** |
| 10 | **Cleanup** | Ștergerea produselor adăugate în test (`E2E_PAYER_123`, `E2E_NONPAYER_123`) și resetarea `OTET 1L` la starea inițială. | **PASS** |

---

## 3. Reguli Fiscale Validate

Aplicația forțează conformitatea cu legislația fiscală din România direct la nivel de UI și servicii frontend:

1. **Mapare Rigidă Cota-Procent**:
   * **Grupa A** = 21%
   * **Grupa B** = 11%
   * **Grupa C** = 11%
   * **Grupa D** = 0%
   * **Grupa E** = 0% (Forțată pentru neplătitorii de TVA)
2. **Forțare Regim Fiscal**:
   * Dacă `vatPayer = true` în configurația magazinului activ, utilizatorul poate selecta oricare dintre grupele active (A, B, C, D). Grupa E este exclusă/inactivă deoarece se adresează strict regimului de neplătitor.
   * Dacă `vatPayer = false`, interfața ascunde dropdown-ul selectorului și forțează grupa E (0% TVA) pentru toate adăugările și salvările, asigurând conformitatea fiscală.

---

## 4. Scenariu 6D.5.1 — Loturi Reale (Product Edit Stock Lock)

În cadrul hotfix-ului din Etapa 6D.5.1, am asigurat funcționarea corectă a editării metadatelor (denumire, cod bare, TVA) pe produse care folosesc stocuri gestionate pe loturi reale.

* **Produs testat**: `OTET 1L` (ID: `7df05807-a7a0-49ff-a8b2-3bbbe9123c9c`)
* **Verificare stoc blocat**:
  * Câmpul `Stoc Depozit` și `Stoc Magazin` sunt setate ca `disabled` în DOM (utilizatorul nu poate introduce valori direct).
  * Se afișează avertismentul textual: *"Stocul este calculat din loturi și se modifică doar prin Recepție / Transfer."*
* **Salvare TVA**:
  * Se modifică grupa de TVA de la `A` la `B`.
  * Se apasă salvarea. Payload-ul de trimitere **exclude** câmpurile de stoc (nefiind modificate), permițând actualizarea cu succes a metadatelor.
  * Nu este aruncată excepția din triggerul database de loturi reale.
* **Verificare listă**: Produsul apare în listă cu badge-ul `B (11%)`.
* **Integritate stoc**: Stocul total din depozit și magazin rămâne neschimbat (nemodificat).
* **Resetare la cleanup**: Testul automat editează din nou produsul la final și îl resetează în grupa de TVA `A` (21%).

---

## 5. Cleanup

La finalizarea testului, scriptul Playwright rulează o procedură automată de curățare a bazei de date (folosind direct conexiunea client supabase):
* Produsul creat pentru testul plătitor de TVA (`VAT_E2E_PAYER_COLA` / `E2E_PAYER_123`) este șters complet din baza de date.
* Produsul creat pentru testul neplătitor de TVA (`VAT_E2E_NONPAYER_COLA` / `E2E_NONPAYER_123`) este șters complet.
* Produsul `OTET 1L` este restabilit în grupa de TVA `A` (21%), iar `vat_percent` este setat corespunzător la 21.

---

## 6. Limitări Rămase (Post-6D.5)

* **POS Fiscal Printing**: Funcția de tipărire pe POS nu utilizează încă în mod direct noul `vat_group` din `product_prices` în momentul emiterii bonurilor către casele fizice.
* **Sales History / Rapoarte Fiscale**: Istoricul vânzărilor și rapoartele de închidere zilnică nu afișează încă detalierea TVA pe grupe, ci rulează pe baza structurii legacy.
* **Fiscal Bridge**: Modulul extern de conexiune cu aparatele fiscale (Fiscal Bridge) nu a fost modificat și rulează pe schema clasică.
* **Procentul legacy**: Procentul `vat_percent` rămâne populat în baza de date ca o componentă legacy pentru a asigura compatibilitatea înapoi cu modulele ne-migrate.

---

## 7. Decizie și Pași Următori

Având în vedere finalizarea cu succes a testării E2E și a cleanup-ului de logging temporar:
* **Următorul pas recomandat**: **POS Mixed Payment Auto-Balance UX Hotfix** (Etapa 6D.5.2) pentru a asigura echilibrarea automată a plăților mixte din POS.
