# Raport Tehnic Oficial — Etapa 6D.6.5: SGR POS Frontend Integration Preflight

## 1. Rezumat Executiv
- **Obiectiv**: Integrarea preliminară a Sistemului de Garanție SGR în componenta de POS Frontend, calcularea totalurilor corecte (subtotal produse, total garanții SGR, total general) și implementarea unui sistem de siguranță (Checkout Rollout Guard) care previne trimiterea vânzărilor cu SGR către baza de date înainte ca serverul să fie actualizat.
- **Status final**: **PASS**. Toate cerințele au fost implementate conform specificațiilor.
- **SQL / Database Live**: **Nu s-a modificat nimic** live în baza de date Supabase.
- **finalize_sale RPC**: **Nu s-a modificat** RPC-ul live.
- **Checkout SGR**: **Blocat/Guarded** prin intermediul `SGR_CHECKOUT_BACKEND_ENABLED = false` în frontend, pentru a asigura sincronizarea completă la rollout (Rollout Safety).
- **Vânzări POS fără SGR**: Rămân **pe deplin funcționale** (verificate prin E2E).
- **Build de producție**: Compilat cu succes (`npm run build` PASS).
- **E2E & Regresii**: Toate testele Playwright (`test_sgr_pos_frontend_preflight_6d65.py`, `test_pos_mixed_payment_autobalance_6d52.py` și `test_sgr_product_forms_6d63.py`) au trecut cu succes.

## 2. POS Data Loading (Încărcarea datelor SGR)
- În `src/features/pos/services/posService.ts`:
  - Interogările `searchProducts` și `getProductByBarcode` au fost extinse pentru a selecta coloanele `sgr_enabled` și `sgr_type` din tabelul `products`.
  - Serviciul mapează corect proprietățile din baza de date în interfața POS:
    - `sgr_enabled` -> `sgrEnabled` (boolean)
    - `sgr_type` -> `sgrType` (normalizat folosind utilitarul defensiv `normalizeSgrType` din `src/features/products/utils/sgr.ts`)
  - Garanția per unitate (`sgrDepositAmount`) se calculează client-side ca fiind `0.50 lei` dacă `sgrEnabled` este activ, altfel `0`.

## 3. Cart Calculations (Calcule coș POS)
- În hook-ul principal al POS-ului (`src/features/pos/hooks/usePos.ts`), s-a integrat logica de calcul SGR:
  - `productsSubtotal`: suma prețurilor tuturor produselor din coș (`quantity * price`).
  - `sgrTotal`: suma garanțiilor pentru produsele cu SGR activ (`quantity * 0.50 lei`).
  - `totalBon` (Grand Total): reprezentat de `productsSubtotal + sgrTotal`.
  - SGR nu se adaugă în baza de calcul pentru TVA-ul produsului de bază, ci rămâne o taxă suplimentară de garanție cu cotă proprie TVA D (0%).

## 4. Cart UI (Afișarea SGR în coș)
- În componenta `PosCart.tsx` (localizată în `src/features/pos/components/PosCart.tsx`):
  - Pentru fiecare produs din coș cu SGR activ, se randează o linie secundară de informație:
    ```
    + Garanție SGR - [METAL/PLASTIC/GLASS] x[CANTITATE]: [VALOARE_SGR] lei
    TVA: D — 0%
    ```
    Această linie conține atributul `data-testid="pos-sgr-line"` pentru verificări E2E.
  - În secțiunea de footer a coșului, dacă există cel puțin un produs SGR:
    - Se afișează defalcat:
      - Subtotal produse: `data-testid="pos-products-subtotal"`
      - Garanții SGR: `data-testid="pos-sgr-total"`
      - Total de plată: `data-testid="pos-grand-total"` (redat în font mărit/bold ca principalul total de încasat).
    - Dacă nu există produse SGR, se afișează doar totalul general standard, păstrând UI-ul nemodificat.

## 5. Mixed Payment Auto-Balancing (Plată Mixtă)
- Algoritmul de auto-balansare din tasta `MIXT` a fost actualizat să folosească `grandTotal` (reprezentat prin `totalBon`, care conține și taxa SGR):
  - Modificarea valorii CASH determină auto-completarea CARD la valoarea `grandTotal - CASH`.
  - Modificarea valorii CARD determină auto-completarea CASH la valoarea `grandTotal - CARD`.
  - Introducerea unei sume mai mari decât `grandTotal` este limitată prin clamp (clamp-ul folosește `grandTotal`, setând cealaltă metodă la `0.00`).
  - Schimbările în coș (creșterea cantității unui produs SGR sau adăugarea de noi produse) determină actualizarea automată a sumelor conform preferinței memorate (câmpul editat cel mai recent).

## 6. Checkout Guard (Scutul de Rollout)
- Deoarece backend-ul live din baza de date nu este încă pregătit să accepte totalurile cu SGR în RPC-ul `finalize_sale`, a fost implementat un **Checkout Rollout Guard** în POS:
  - Constanta locală `const SGR_CHECKOUT_BACKEND_ENABLED = false;` definește starea backend-ului.
  - Cât timp flag-ul este `false`, dacă în coș există orice produs cu SGR activ (`sgrTotal > 0`):
    - Butonul principal de finalizare a vânzării (`ÎNCASEAZĂ`) este dezactivat (`disabled`).
    - În POS se afișează un banner galben de avertizare cu textul:
      `"Preflight Guard SGR Activat: POS calculează garanțiile SGR local, însă finalizarea vânzării va fi deblocată după actualizarea serverului."`
      Acest banner are selectorul `data-testid="pos-sgr-preflight-banner"`.
  - Coșurile care nu conțin niciun produs SGR sunt pe deplin funcționale, putând fi încasate normal, fără nicio restricție.

## 7. E2E Test (Validarea Automată)
- S-a creat fișierul de test `test_sgr_pos_frontend_preflight_6d65.py` în rădăcina proiectului.
- Scenarii testate cu succes:
  1. Autentificare casier/admin.
  2. Creare produse de test (unul cu SGR plastic, celălalt normal/fără SGR) prin inserare securizată în baza de date.
  3. Adăugare produs SGR în coș:
     - Verificare afișare linie de garanție (`+ Garanție SGR - PLASTIC`).
     - Verificare calcul subtotal (10.00 lei), garanție SGR (0.50 lei) și grand total (10.50 lei).
  4. Creștere cantitate la 2:
     - Verificare actualizare subtotal (20.00 lei), garanție SGR (1.00 lei) și grand total (21.00 lei).
  5. Selectare plată MIXTĂ:
     - Verificare auto-balansare inițială (Cash=21.00, Card=0.00).
     - Modificare Cash la 10.00 -> Card se auto-balansează la 11.00 lei.
     - Modificare Card la 5.00 -> Cash se auto-balansează la 16.00 lei.
     - Depășire total (Cash la 25.00) -> Cash se limitează la 21.00, iar Card devine 0.00 lei.
  6. Verificare Checkout Guard:
     - Bannerul de preflight este vizibil.
     - Butonul `ÎNCASEAZĂ` este dezactivat.
  7. Eliminare produs SGR și adăugare produs normal:
     - Bannerul dispare, secțiunea de sume suplimentare SGR se ascunde.
     - Butonul `ÎNCASEAZĂ` devine activ, permițând finalizarea vânzării.
  8. Ștergere produse de test din baza de date (cleanup curat).
- Rezultatul testului: **SUCCESS**.

## 8. Build & Regresii
- S-au rulat testele de regresie pe platforma POS și pe nomenclator:
  - `python test_pos_mixed_payment_autobalance_6d52.py` -> **PASS**
  - `python test_sgr_product_forms_6d63.py` -> **PASS**
  - `python test_sgr_pos_frontend_preflight_6d65.py` -> **PASS**
- S-a verificat build-ul de producție (`npm run build` PASS) pentru a ne asigura că nu există erori TypeScript sau Rollup.

## 9. Limitări curente & Rollout Safety
- RPC-ul live `finalize_sale` nu salvează încă SGR în tabela `sale_items`.
- Câmpurile snapshot SGR (`sgr_amount`, `sgr_group`, etc.) din `sale_items` nu sunt încă populate de server.
- Istoricul de vânzări (`Sales History`) și modalul de bon nu afișează SGR (vor fi integrate după ce backend-ul este patch-uit).
- Checkout-ul SGR live se va activa odată cu trecerea la etapa **6D.6.6** (unde se va aplica patch-ul SQL pe backend și se va trece `SGR_CHECKOUT_BACKEND_ENABLED` pe `true` sincron).

## 10. Decizie
**Ready for 6D.6.6 SGR finalize_sale SQL Manual Apply + Backend Verification**
