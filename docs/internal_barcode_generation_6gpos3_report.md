# Internal Barcode Generation — Etapa 6G.POS.3

## 1. Rezumat
Am implementat funcționalitatea de generare automată de coduri de bare interne pentru produse care nu au un cod de bare fizic/real (de exemplu: legume, fructe, produse vrac, panificație neambalată, produse realizate local). Această funcționalitate asigură că fiecare produs din magazin are un identificator unic în câmpul `barcode`, respectând constrângerea bazei de date și oferind posibilitatea scanării lor rapide la casa de marcat (POS).

## 2. Barcode Format
Pentru a asigura compatibilitatea maximă cu cititoarele de coduri de bare comerciale standard, am implementat formatul standardizat internațional **EAN-13** cu prefix proprietar:
* **Prefix intern**: `29` (rezervat de GS1 pentru circulație internă / restricted circulation, evitând orice conflict cu produse din comerțul global).
* **Lungime totală**: 13 cifre.
* **Structură cod**: `29` + `8 cifre din timestamp` + `2 cifre aleatorii` + `1 check digit (EAN-13)`.
* **Algoritm Check Digit EAN-13**: Suma cifrelor pe poziții impare înmulțite cu 1 și poziții pare înmulțite cu 3. Cifra de control este determinată prin formula: `(10 - (suma % 10)) % 10`.

Codul este validat automat înainte de a fi utilizat în interfață pentru a garanta structura sa validă EAN-13.

## 3. Quick Add UI
În ecranul de **Adăugare Rapidă (v2)**, am integrat următoarele elemente vizuale și de flux:
1. **Butonul de generare** (`Gen. Cod` / `Generează cod de bare`) cu `data-testid="quick-add-generate-barcode-button"`, amplasat direct lângă câmpul de cod de bare.
2. **Badge informativ** (`data-testid="quick-add-generated-barcode-badge"`) care semnalează vizual când codul afișat în input este unul generat intern. Oferă și o acțiune rapidă de "Copiază" pentru utilizator.
3. **Modal / Prompt de confirmare** (`showReplaceConfirm`): Dacă utilizatorul încearcă să genereze un cod de bare intern, dar există deja caractere în câmpul `barcode`, aplicația solicită confirmarea explicită înainte de a suprascrie valoarea existentă.

## 4. Uniqueness (Unicitate)
Înainte de a finaliza generarea unui cod intern, serviciul `fastAddService.ts` efectuează o verificare de tip read-only în baza de date (`barcodeExists`):
* Căutarea se face exact după `store_id` și `barcode`, excluzând produsele șterse (`status != 'deleted'`).
* În caz de conflict, algoritmul încearcă regenerarea automată a codului (până la **5 încercări** succesive cu decalaje de milisecunde).
* Dacă toate încercările eșuează (conflict repetat), utilizatorului i se afișează o eroare controlată: `Nu s-a putut genera un cod unic. Încearcă din nou.`

## 5. POS Scan
* Produsul salvat cu un cod de bare intern se comportă identic cu orice alt produs cu cod de bare real.
* La tastare sau scanare în câmpul de căutare din POS, produsul este identificat prin potrivire exactă (`getProductByBarcode`).
* Scanarea repetată a codului intern adaugă produsul în coș și crește cantitatea acestuia în mod corespunzător.

## 6. Limitări
* **Tipărirea etichetelor**: MVP-ul actual nu include generarea de PDF-uri sau integrarea cu imprimante termice pentru etichete autoadezive. Această etapă este planificată separat (6G.POS.4).
* **Absență flag dedicat**: Codurile de bare interne sunt stocate direct în câmpul text `barcode` din tabela `products` fără a folosi o coloană dedicată în baza de date (cum ar fi `is_internal_barcode` sau `barcode_type`), respectând întocmai schema de bază fără a aplica migrații SQL neconfirmate.

## 7. Teste
Funcționalitatea a fost testată și validată complet:
1. **Static/Unit testing**: Codul helper `barcodeGenerator.ts` respectă algoritmul EAN-13 și produce coduri valide cu prefixul `29`.
2. **Build test**: `npm run build` rulează cu succes, validând că nu există erori TypeScript sau probleme în bundler-ul Vite.
3. **E2E/Regression Suite**:
   * Scenariile din `test_internal_barcode_generation_6gpos3.py` trec cu succes (`TOTAL: 60 | PASS: 52 | FAIL: 0 | SKIP: 1`).
   * Integritatea modulelor critice (`finalize_sale`, FiscalNet writer, TVA, SGR) nu a fost afectată.

## 8. Următorul pas
* **Etapa 6G.POS.4 Barcode Label Printing**: Implementarea posibilității de a exporta/printa codurile de bare interne direct pe etichete fizice folosind formate standardizate de tipărire termică.
* Alternativ: **6G.TEST.0 Manual Aggressive POS Testing**.
