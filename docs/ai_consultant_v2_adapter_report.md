# Raport de Migrare: Etapa 4D - AI Consultant (Data Adapter v2)

## Context
În urma auditului **Etapa 4A**, componenta `AiConsultant.tsx` a fost identificată ca fiind critic dependentă de tabela legacy `produse` și de view-uri specifice schemei v1 (`view_daily_usage`, `view_recent_losses`). Această dependență cauza crash-uri runtime într-un mediu cu baza de date v2.

## Obiectiv Realizat
Am migrat logica de analiză a consultantului AI la schema v2, implementând un adaptor de date care citește direct din tabelele normalizate. Modulul a fost mutat în `src/features/ai-consultant/` pentru o mai bună organizare.

## Arhitectură Data Adapter v2

În loc să folosim view-uri precalculate în DB, noul `aiConsultantDataService.ts` agregă datele on-the-fly folosind 5 interogări optimizate:

1.  **Produse Active (`products`)**: Filtrate după `store_id` și `status = 'active'`.
2.  **Prețuri (`product_prices`)**: Pentru a determina valoarea de vânzare și de achiziție.
3.  **Loturi (`stock_batches`)**: Sursa principală pentru stocul agregat (Magazin vs Depozit) și pentru detectarea riscului de expirare.
4.  **Vânzări (`sales` + `sale_items`)**: Analiza ultimelor 30 de zile pentru a identifica produsele top-selling și pe cele "moarte" (Dead Stock).
5.  **Pierderi (`waste_events` + `waste_items`)**: Contabilizarea casărilor din ultimele 30 de zile.

## Algoritmi de Analiză (Locali)

Am implementat o suită de algoritmi determinisți pentru generarea recomandărilor, fără a apela la un motor AI extern (pentru viteză și siguranță):

-   **Stoc Agregat**: Calculat prin însumarea cantităților din loturi pe zone (`magazin`/`depozit`).
-   **Risc Expirare**: Analiză pe fiecare lot; marcăm `critical` dacă expiră în sub 7 zile și `warning` sub 30 zile.
-   **Analiză Vânzări 30z**: Calculăm volumul și valoarea vânzărilor per produs.
-   **Identificare Dead Stock**: Produse care au stoc pozitiv dar zero vânzări în ultimele 30 de zile.
-   **Recomandări Prioritare**:
    *   `CRITICAL` pentru stoc zero la produse active sau loturi deja expirate.
    *   `WARNING` pentru stoc sub 5 bucăți sau risc de expirare apropiat.
    *   `INFO` pentru dead stock sau statistici de pierderi.

## Rezultate Tehnice

-   **Zero Any**: Am folosit interfețe TypeScript stricte pentru toate etapele de mapare.
-   **Performanță**: Datele sunt procesate în memorie după fetch-urile inițiale, evitând "N+1 query" problem.
-   **Build Status**: Verificat prin `npm run build` (Exit code: 0).

## Ce urmează (Roadmap)
-   Implementarea unui Fiscal Bridge pentru integrarea datelor din casele de marcat.
-   Integrarea opțională a unui model LLM (OpenAI/Gemini) pentru interpretarea narativă a acestor date agregate.
-   Predicții bazate pe sezonalitate (Weekend Boost este deja simulat în logica de mapare).
