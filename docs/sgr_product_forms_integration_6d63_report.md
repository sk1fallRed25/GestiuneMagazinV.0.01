# SGR Product Forms Integration — Etapa 6D.6.3

## 1. Rezumat
- **Status**: PASS;
- **Integrare SGR în Formulare**: Complet (Adăugare Rapidă v2 și Product Edit Modal);
- **Control Vizual Nomenclator**: Complet (Badge SGR în tabela de produse);
- **Securitate Date & Constrângeri**: Strict respectate (DML-Zero, compatibilitate loturi reale păstrată, configurare independentă de prețuri/TVA);
- **Teste E2E Rulate**:
  - `test_sgr_product_forms_6d63.py`: PASS (100% succes)
  - `test_store_settings_product_vat_6d5.py`: PASS (100% succes)
- **Production Build (`npm run build`)**: Rulat cu succes (exit code 0).

## 2. Arhitectură și Helperi SGR (Frontend)
Pentru gestionarea configurărilor SGR, au fost adăugate tipuri și funcții helper izolate în directorul de produse:
- **Tipuri TypeScript (`src/features/products/types.ts`)**:
  - `SgrType`: `'plastic' | 'metal' | 'glass'`
  - `ProductSgrSelection`: `'none' | SgrType`
  - Extinderi pe interfețele `Product`, `ProductDbRow`, `ProductUpdateInput` și `FastAddProductPayload` pentru a reflecta coloanele bazei de date (`sgr_enabled`, `sgr_type`).
- **Utilitare și Mapping (`src/features/products/utils/sgr.ts`)**:
  - `SGR_OPTIONS`: Opțiunile folosite în interfață (`Fără SGR`, `SGR - PLASTIC`, `SGR - METAL`, `SGR - STICLĂ`);
  - `selectionFromSgr(enabled, type)`: Mapează valorile venite din DB/API în starea selectată din dropdown, oferind protecție defensivă (unknown sau invalid din DB devine `'none'`);
  - `payloadFromSgrSelection(selection)`: Traduce opțiunea din UI în payload Supabase (`sgr_enabled: true/false`, `sgr_type: string/null`).

## 3. Componente UI & Formulare
- **ProductSgrSelector (`src/features/products/components/ProductSgrSelector.tsx`)**:
  - Dropdown cu label descriptiv și accesibilitate prin `data-testid="product-sgr-selector"`.
- **Adăugare Rapidă (`src/features/fast-add/FastAddPage.tsx` & `useFastAdd.ts`)**:
  - Selectorul SGR este integrat în interfață;
  - La salvare, starea formularului este convertită prin `payloadFromSgrSelection` și salvată în baza de date;
  - După adăugare/resetare, selectorul este resetat automat la starea `'none'`.
- **ProductEditModal (`src/features/products/components/ProductEditModal.tsx`)**:
  - Selectorul SGR este afișat și legat la starea locală a produsului;
  - **Hardening Stocuri pe Loturi**: S-a menținut comportamentul de blocare (disabled) a inputurilor de stoc depozit/magazin în cazul produselor cu loturi active, însă selectorul SGR rămâne **complet editabil și salvabil**, satisfăcând constrângerea de izolare operatională.
- **ProductTable (`src/features/products/components/ProductTable.tsx`)**:
  - Sub codul de bare al fiecărui produs, în cazul în care SGR este activat, se afișează un badge vizual colorat, cu test ID `product-sgr-badge`.

## 4. Servicii de Date (Servicii Supabase)
- **productService (`src/features/products/services/productService.ts`)**:
  - Interogările API mapează transparent coloanele snake_case din baza de date (`sgr_enabled`, `sgr_type`) în camelCase (`sgrEnabled`, `sgrType`) și invers;
  - Payload-urile de scriere/actualizare sunt curățate defensiv înainte de trimitere.
- **fastAddService (`src/features/fast-add/services/fastAddService.ts`)**:
  - Permite stocarea noilor câmpuri SGR la crearea rapidă sau la actualizarea nomenclatorului existent.

## 5. Rezultate Teste E2E & Validări
Toate testele automate au fost rulate local și au trecut cu succes complet:

### A. Test SGR Product Forms (`test_sgr_product_forms_6d63.py`)
- **Scenariu testat**:
  1. Autentificare administrator.
  2. Adăugare Rapidă produs nou cu SGR activ (`plastic`), stoc inițial și lot.
  3. Verificare în baza de date Supabase că produsul are `sgr_enabled = true` și `sgr_type = 'plastic'`, iar prețurile și grupele de TVA (independent) au rămas corecte.
  4. Verificare că la adăugarea cu succes a produsului, selectorul se resetează la `'none'`.
  5. Navigare în Monitorizare Produse, căutarea produsului și verificarea existenței badge-ului `SGR - PLASTIC` în tabelă.
  6. Deschidere modal editare produs, verificare că inputurile de stoc sunt corect dezactivate din cauza lotului adăugat, dar selectorul SGR este activ.
  7. Modificarea SGR la `metal` și salvarea nomenclatorului.
  8. Verificare actualizare în baza de date și vizualizarea badge-ului `SGR - METAL` în tabelă.
  9. Dezactivarea completă a SGR, salvarea nomenclatorului și verificarea dispariției badge-ului.
  10. Curățarea datelor de test din Supabase.
- **Rezultat**: **PASS** (100% succes, exit code 0).

### B. Test Regresie VAT (`test_store_settings_product_vat_6d5.py`)
- **Scenariu testat**:
  1. Autentificare administrator.
  2. Configurare magazin ca Plătitor TVA, adăugare produs și modificare cotă TVA în edit modal. Verificare badge-uri corecte.
  3. Configurare magazin ca Neplătitor TVA, verificare ascundere selector grupă TVA și afișarea corectă a bannerului informativ. Verificare încadrare automată a produselor în grupa fiscală E (0%).
  4. Verificare că noul selector SGR din edit modal nu intră în conflict cu selectorul de TVA fiscală prin definirea de selectori strict targeted.
  5. Restaurarea setărilor inițiale ale magazinului și curățarea datelor.
- **Rezultat**: **PASS** (100% succes, exit code 0).

## 6. Decizie
- **Decizie finală**: **PASS**
- Etapa 6D.6.3 a fost implementată cu succes. Sistemul de configurare SGR pe produs este funcțional în totalitate în interfețele administrative ale nomenclatorului de produse și nu perturbă fluxurile financiare sau de stocuri existente.
