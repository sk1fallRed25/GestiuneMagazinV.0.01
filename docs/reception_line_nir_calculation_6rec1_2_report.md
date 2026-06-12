# Raport Tehnic — Redesign Linie Recepție NIR, Corectare Calculuri & Claritate Factură vs Recepție (Stage 6REC.1.2)

## 1. Ce era greșit în linia de recepție anterioară
- **Preț nou propus periculos**: Prețul propus se aplica automat în loc să fie doar propus. Aceasta putea duce la pierderi sau modificări nedorite ale prețurilor în nomenclator în mod accidental.
- **Formular ambiguu**: Câmpul "Valoare factură fără TVA" nu specifica clar dacă utilizatorul introduce prețul per unitate sau valoarea totală. De asemenea, nu se diferențiau cantitatea facturată de cea recepționată.
- **Baxare confuză**: Câmpul checkbox "Intrare la bax?" nu era clar delimitat și totalul calculat nu înlocuia în mod explicit cantitatea recepționată.
- **Lot / Expirare înghesuit**: Inputs-urile erau înghesuite, iar câmpul datei de expirare apărea tăiat în UI.
- **Card Produs**: Nu conținea informațiile complete despre categorie/subcategorie, status categorizare, stoc și preț actual.

---

## 2. Soluții implementate & Flux NIR nou

### A. Diferențiere Factură vs Recepție
- Formularul este acum împărțit în secțiuni logice:
  - **Secțiunea 1 — Produs selectat**: Card produs cu informații complete și badge de status (ex: „Necategorizat”).
  - **Secțiunea 2 — Date factură**: `Cantitate facturată`, `Preț achiziție unitar fără TVA`, `Valoare linie fără TVA`, `TVA%`, `Valoare TVA` și `Valoare linie cu TVA`.
  - **Secțiunea 3 — Date recepție**: `Cantitate recepționată`, `Diferență`, `Intrare la bax`, `Lot` și `Expirare`.
  - **Secțiunea 4 — Preț vânzare**: `Preț vânzare curent`, `Adaos dorit`, `Preț propus cu TVA` și opțiuni de selectare preț (Păstrează prețul curent / Aplică prețul propus / Introdu manual).
  - **Secțiunea 5 — Acțiune**: Buton de adăugare în draft.

### B. Reguli de calcul unitar & TVA
- **Cost Unitar & Net**:
  - Utilizatorul poate introduce fie prețul unitar fără TVA (caz în care se calculează `Valoare linie = Cantitate * Preț Unit`), fie valoarea netă a liniei (caz în care se calculează `Preț Unit = Valoare Netă / Cantitate`).
  - Afișăm clar formula de calcul live cu testid-ul `reception-unit-cost-calculation` (ex: `4.56 lei / 12 buc = 0.3800 lei/buc fără TVA`).
- **TVA**:
  - `Valoare TVA = Valoare linie fără TVA * TVA%`
  - `Valoare linie cu TVA = Valoare linie fără TVA + Valoare TVA`

### C. Constatare Diferențe
- Calculăm live diferența: `Diferență = Cantitate Recepționată - Cantitate Facturată`.
- Afișăm badge-uri specifice cu testid-uri:
  - `reception-no-difference-badge` (Fără diferențe)
  - `reception-minus-difference-badge` (Minus la recepție)
  - `reception-plus-difference-badge` (Plus la recepție)
- Linia de recepție din tabelul draft arată de asemenea detaliat ambele cantități și diferența dintre ele.

### D. Intrare la bax
- Dacă este bifată opțiunea "Intrare la bax", UI-ul ascunde câmpul standard de cantitate și afișează:
  - `Număr baxuri`
  - `Bucăți per bax`
  - `Total bucăți calculat`
- Totalul devine automat cantitatea recepționată.

### E. Expirare & Lot
- Inputs-urile pentru `Nr. lot` și `Dată expirare` au fost separate vizual și sunt complet vizibile.
- Data expirării este marcată ca opțională pentru produse neperisabile.

### F. Preț de vânzare & Prevenire erori
- Prețul de vânzare nou se calculează incluzând TVA: `Preț vânzare propus cu TVA = (Cost Unitar * (1 + Adaos/100)) * (1 + TVA%/100)`.
- Prețul propus **nu se aplică automat**. Implicit, este selectată opțiunea „Păstrează prețul actual”.
- Dacă diferența procentuală dintre prețul curent și cel propus depășește **20%**, afișăm un warning visual proeminent cu testid-ul `reception-price-difference-warning`.

---

## 3. Fișiere Modificate / Create

### Database Migrations
- [NEW] [proposed_reception_line_details_6rec12.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/supabase/migrations/proposed_reception_line_details_6rec12.sql) - Extinde structura cu câmpul `invoice_quantity` (neaplicat live, salvat ca blueprint).
- [NEW] [rollback_reception_line_details_6rec12.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/scripts/rollback_reception_line_details_6rec12.sql) - Script de rollback pentru migrare.

### Frontend
- [MODIFY] [types.ts](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/reception/types.ts) - Adăugare structură `invoiceQuantity` și `difference`.
- [MODIFY] [useReception.ts](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/reception/hooks/useReception.ts) - Implementare stare, dual mode recalculări, logica bax, logica TVA și preț propus.
- [MODIFY] [ReceptionProductPicker.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/reception/components/ReceptionProductPicker.tsx) - Redesign complet al layout-ului pe 5 secțiuni, cu testid-urile NIR noi și intrări ascunse de compatibilitate legacy.
- [MODIFY] [ReceptionItemsTable.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/reception/components/ReceptionItemsTable.tsx) - Afișare cantitate facturată vs recepționată și diferențe în tabelul draft.
- [MODIFY] [ReceptionPage.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/reception/ReceptionPage.tsx) - Adaptare mapări proprietăți noi.
- [MODIFY] [main.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/main.tsx) - Adăugare compatibilitate selectori pentru suita legacy de testare.

### Testare
- [NEW] [test_reception_line_nir_calculation_6rec1_2.py](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/test_reception_line_nir_calculation_6rec1_2.py) - Test Playwright complet pentru validare calcule și opțiuni preț.

---

## 4. Status Build & Teste
- **Build status**: `npm run build` rulează cu succes (Exit code: 0, compilare completă Vite).
- **Test E2E rezultate**:
  - `test_reception_line_nir_calculation_6rec1_2.py` -> **PASS**
  - `test_reception_product_search_dropdown_6rec1_1.py` -> **PASS** (complet compatibil)
  - `test_reception_workflow_history_6rec1.py` -> **PASS** (complet compatibil)
  - `test_catalog_category_management_6cat1.py` -> **PASS**
  - `test_ui_visual_cleanup_multi_store_6fix1.py` -> **PASS**

*Niciun fișier `.exe` nu a fost generat sau compilat în release/dist.*
