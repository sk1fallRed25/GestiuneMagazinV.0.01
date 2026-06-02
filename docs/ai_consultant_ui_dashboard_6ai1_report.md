# AI Consultant UI Dashboard — Etapa 6AI.1

## 1. Rezumat

- **Ce s-a îmbunătățit**: S-a refăcut complet interfața grafică a modulului **AI Consultant** transformând-o dintr-o listă simplă/textuală într-un dashboard operațional premium, robust și clar destinat administratorilor de magazin.
- **De ce era necesar**: După ce Etapa 6AI.0 a rezolvat problemele tehnice de încărcare a volumelor mari de date (prin chunking asincron și fallback-uri defensive), interfața avea nevoie de o structură organizată vizual (KPI-uri, alerte prioritizate, tabele responsive, empty states bine definite și acțiuni rapide) pentru a deveni cu adevărat utilă în activitatea zilnică a magazinului.

---

## 2. Layout

Interfața se bazează pe o structură verticală clar divizată, concepută în stil modern (paletă HSL custom, dark mode, carduri cu gradienți subtili, animații la hover și skeleton loaders):

- **A. Header (`AiConsultantHeader.tsx`)**:
  - Titlu descriptiv cu diacritice: `AI Consultant`.
  - Subtitlu: `Recomandări automate pentru stocuri, vânzări și risc operațional`.
  - Badge status dinamic: `Date actualizate la: [Ora/Data]` și `Magazin curent: [Nume Magazin]`.
  - Buton interactiv `Reîmprospătează analiza` cu loader animat de rotire (`ai-refresh-button`).
- **B. KPI Cards (`AiKpiCard.tsx`)**:
  - Un grid de 6 carduri cheie (Produse active, Valoare estimată stoc, Vânzări 30 zile, Stoc zero, Stoc scăzut, Risc expirare).
  - Fiecare card conține o valoare evidențiată, un trend/subtitlu discret și culori adaptate severității.
- **C. Recomandări prioritizate (`AiRecommendationCard.tsx`)**:
  - Secțiune dedicată (`ai-recommendations-section`) cu carduri colorate în funcție de severitate:
    - **Critic** (roșu/red gradient) pentru acțiuni urgente (e.g. stoc zero la produse de top).
    - **Atenție/Warning** (galben-portocaliu gradient) pentru riscuri medii (e.g. produse cu stoc scăzut sau aproape de expirare).
    - **Info/Slate** (albastru/slate gradient) pentru optimizări comerciale (e.g. produse fără vânzări sau oportunități de reaprovizionare).
  - Fiecare card conține un buton de acțiune rapidă cu rute reale (`Vezi stocuri`, `Vezi expirări`, etc.).
- **D. Secțiuni/Tabele de detalii (`AiProductInsightTable.tsx`)**:
  - Patru tabele dedicate: Stoc scăzut (`ai-low-stock-section`), Risc expirare (`ai-expiry-risk-section`), Dead stock (`ai-dead-stock-section`) și Top vânzări (`ai-top-selling-section`).
  - Fiecare tabel include detalii esențiale (Cod de bare, Stoc magazin/depozit/total, preț vânzare, valoare estimată stoc, cantitate vândută, badge-uri de risc).
- **E. Empty States**:
  - Mesaje explicative prietenoase în loc de tabele goale sau ecrane albe (e.g., *"Nu există riscuri de expirare detectate."*).

---

## 3. Date afișate

Datele sunt agregate din snapshot-ul calculat de serviciul de business:

1. **Produse active**: Numărul total de SKU-uri din nomenclator (`ai-kpi-products-active`).
2. **Valoare estimată stoc**: Suma valorilor (stoc * preț de achiziție sau preț de vânzare ca fallback) (`ai-kpi-stock-value`).
3. **Vânzări ultimele 30 zile**: Valoarea totală a vânzărilor realizate în ultimele 30 de zile (`ai-kpi-sales-30d`).
4. **Stoc zero**: Numărul de produse active cu stoc total egal cu 0 (`ai-kpi-no-stock`).
5. **Stoc scăzut**: Numărul de produse cu stoc total sub limita definită (implicit 5 bucăți) (`ai-kpi-low-stock`).
6. **Risc expirare**: Numărul de loturi care expiră în următoarele 30 de zile (`ai-kpi-expiry-risk`).
7. **Dead Stock**: Produse fără nicio vânzare în ultimele 30 de zile.
8. **Top Vânzări**: Cele mai vândute produse ordonate după cantitate și valoare.

---

## 4. UX/Responsive

Pentru a preveni overflow-ul orizontal pe rezoluții mai mici, tabelele folosesc o reprezentare dublă cu detecție CSS:
- **Desktop (1920x1080) & Laptop (1366x768)**: Vizualizare tabelară clasică, densă, cu coloane aliniate perfect.
- **Tabletă (768x1024) & Mobil (390x844)**: Tabelele se transformă automat într-un grid de carduri individuale, optimizate pentru ecrane tactile, ascunzând datele secundare sau dispunându-le pe rânduri distincte.
- Toate secțiunile importante au `data-testid`-uri dedicate pentru a permite testarea automată robustă.

---

## 5. Teste

### A. Compilare (Build)
- Comanda `npm run build` a rulat și a trecut cu succes:
  ```bash
  ✓ 2566 modules transformed.
  ✓ built in 2.95s
  ```

### B. Teste E2E Playwright (`test_ai_consultant_ui_6ai1.py`)
Suita de teste Playwright verifică următoarele scenarii:
- Autentificare Store Administrator și accesare modul `/ai-consultant`.
- Prezența skeleton-ului de încărcare (`ai-consultant-loading`).
- Validarea existenței tuturor celor 6 carduri KPI (`ai-kpi-*`).
- Validarea prezenței secțiunilor de recomandări și a listelor de produse detaliate.
- Apăsarea butonului de refresh (`ai-refresh-button`) fără crash-uri.
- **Visual QA**: Generarea a 4 capturi de ecran (`ai_consultant_[desktop/laptop/tablet/mobile].png`) salvate în `artifacts/6ai1/` pentru validarea manuală a responsivității.

### C. Teste de Regresie
- `test_ai_consultant_load_6ai0.py` (Încărcarea datelor în siguranță, chunking): **PASS**.
- `test_module_entitlements_frontend_6f15.py` (Activarea/dezactivarea și restricționarea rutei în funcție de abonamentul magazinului): **PASS**.

---

## 6. Limitări

- **Agregare locală**: Calculele de business din `aiConsultantDataService` sunt efectuate pe client (browser-side) utilizând chunk-urile descărcate.
- **Server-Side Aggregation**: Mutarea acestor calcule pe server (pentru a reduce consumul de memorie în cazul magazinelor extrem de mari) este planificată pentru Etapa 6AI.2.
- **Fără predicție reală ML**: Momentan, recomandările se bazează pe reguli euristice rigide (stocuri scăzute, istoric vânzări, date expirare loturi), nu pe modele de machine learning active.

---

## 7. Următorul pas

- **`6AI.2 Server-Side Aggregation Blueprint`**: Proiectarea structurii pentru transferarea calculelor pe backend.
