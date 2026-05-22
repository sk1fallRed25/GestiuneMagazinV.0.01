# Commercial Reports Frontend Integration — Etapa 6C.3

## 1. Rezumat
Această etapă finalizează integrarea în interfața grafică a celor 6 rapoarte comerciale bazate pe funcțiile RPC din baza de date Supabase. 
- **Ruta nou creată**: `/rapoarte` (înregistrată în `AppRoutes.tsx`).
- **RPC-uri consumate**:
  - `get_sales_summary_report`
  - `get_product_performance_report`
  - `get_shift_report`
  - `get_daily_cash_report`
  - `get_inventory_value_report`
  - `get_losses_report`
- **Exclus din această etapă**:
  - Testarea E2E automatizată (prevăzută în Etapa 6C.4).
  - Funcționalitatea de export PDF/CSV.
  - Înlocuirea/modificarea ecranului de dashboard existent.

## 2. Structură Feature
Următoarele fișiere au fost create sau modificate în structura proiectului:
- **`src/features/reports/types.ts`**: Interfețele de date TypeScript corespunzătoare structurilor JSON returnate de bază.
- **`src/features/reports/services/reportsService.ts`**: Serviciul API ce apelează funcțiile RPC Supabase și filtrează răspunsurile.
- **`src/features/reports/hooks/useCommercialReports.ts`**: Hook React pentru gestiunea stării filtrelor, a datelor de perioadă și a încărcării paralele.
- **`src/features/reports/components/ReportKpiCard.tsx`**: Componentă reutilizabilă premium pentru afișarea unui indicator KPI (valoare, titlu, iconiță, culoare de fundal și descriere).
- **`src/features/reports/components/SalesSummaryPanel.tsx`**: Panou financiar general (Cash vs Card, Voids, retururi, coș mediu).
- **`src/features/reports/components/ProductPerformancePanel.tsx`**: Clasament produse cu COGS și marje comerciale.
- **`src/features/reports/components/DailyCashPanel.tsx`**: Registru monetar zilnic, control diferențe și detalii tura de casă (care include listarea tranzacțiilor și starea de audit a sertarului).
- **`src/features/reports/components/InventoryValuePanel.tsx`**: Valoarea estimată a stocului (raft/magazin vs depozit), alerte și Dead Stock.
- **`src/features/reports/components/LossesPanel.tsx`**: Distribuția pierderilor pe categorii de casare și produse scoase din gestiune.
- **`src/features/reports/ReportsPage.tsx`**: Containerul principal al paginii cu filtre globale de timp, selector de taburi și control de acces.
- **`src/app/AppRoutes.tsx`**: Integrarea rutei protejate `/rapoarte`.
- **`src/app/navigation.tsx`** & **`src/app/MainLayout.tsx`**: Adăugarea linkului vizual în sidebar pentru utilizatorii cu roluri eligibile.
- **`src/features/auth/permissions.ts`**: Maparea securizată a permisiunilor de acces la nivel de rută.

## 3. Service și Parsere
Serviciul API expune următoarele metode asincrone:
- `getSalesSummaryReport(storeId, dateFrom, dateTo)`
- `getProductPerformanceReport(storeId, dateFrom, dateTo, limit)`
- `getDailyCashReport(storeId, date)`
- `getInventoryValueReport(storeId)`
- `getLossesReport(storeId, dateFrom, dateTo)`
- `getShiftReport(storeId, shiftId)`

**JSONB Parser defensiv**:
- Intrările primite din baza de date sunt tipizate ca `unknown` pentru a forța validarea.
- Valorile numerice sunt normalizate prin `toNumberSafe(value, fallback)`.
- Cheile sunt mapate suportând atât formatul `snake_case` (de la PostgreSQL) cât și `camelCase` (de la eventuale middleware-uri/configurări), prevenind erorile la nivel de frontend în caz de discrepanțe ale structurii de return (ex: `gross_sales` sau `grossSales`).
- Erorile de conexiune sau permisiuni sunt capturate, normalizate și afișate sub formă de mesaje de eroare intuitive în pagină.

## 4. Hook
Hook-ul `useCommercialReports` encapsulează logica de business:
- **Date range default**: Prima zi a lunii curente până în prezent.
- **selectedDate**: Gestiune locală pentru data selectată în reconcilierea monetară zilnică (default: astăzi).
- **selectedShiftId**: Identificatorul turei de casă inspectate curent.
- **Încărcare paralelă**: Datele primare pentru cele 5 panouri sunt încărcate în paralel prin `Promise.all` pentru performanță optimă, eliminând latențele consecutive.
- **Refresh manual**: Expune metoda `fetchAllReports` pentru reîmprospătare la cerere a datelor.
- **Permission State**: Validează direct dacă rolul curent (`role`) este manager, admin sau platform_owner și dacă un magazin (`currentStoreId`) este selectat.

## 5. UI
Interfața grafică este implementată modular:
- **ReportsPage**: Structură premium cu tabs. Include bare de control pentru date, butoane de refresh și ecrane animate de loading.
- **SalesSummaryPanel**: Utilizează componenta partajată `ReportKpiCard` pentru consistență vizuală. Prezintă detaliile financiare într-un mod structurat.
- **ProductPerformancePanel**: Tabel optimizat cu indicatori de profitabilitate și marje colorate în funcție de performanță.
- **DailyCashPanel**: Separă vizual lista de ture din ziua respectivă (în stânga) de panoul de audit detaliat al turei selectate (în dreapta).
- **InventoryValuePanel**: Valoarea stocului defalcată pe depozit/magazin și tabelul de Dead Stock.
- **LossesPanel**: Reprezentare vizuală a motivelor de casare cu bare de progres procentuale și clasamentul pe produse rebutate.
- **Stări speciale**: Tratarea stărilor de eroare, permisiune lipsă, magazin neselectat și liste goale (empty states).

## 6. Securitate
Securitatea datelor este tratată pe mai multe niveluri:
- **Store Isolation**: Fiecare RPC primește ca prim parametru `p_store_id` (provenit din `currentStoreId` al utilizatorului autentificat), garantând că un administrator de magazin sau manager nu poate vizualiza datele altui punct de lucru.
- **Control de acces pe roluri**:
  - `admin`, `manager`, `platform_owner` (dacă are magazin selectat) au acces deplin.
  - `casier` și `gestionar` sunt complet blocați direct din middleware-ul de rută și la afișarea paginii, primind mesajul *"Nu ai permisiunea necesară pentru rapoarte comerciale."*
- **Supabase Policies**: Funcțiile rulează cu privilegii de execuție limitate în baza de date. Nu se utilizează chei cu drepturi de superuser (`service_role`) în frontend.

## 7. Limitări
- Nu este implementat exportul PDF/CSV.
- Nu s-a rulat încă testul E2E automatizat.
- Dashboard-ul din pagina principală rămâne cel existent, nefiind înlocuit sau afectat.
- Profitul comercial este o estimare determinată pe baza ultimului preț de achiziție înregistrat în catalog, nu reprezintă un profit contabil certificat.

## 8. Build
- Compilarea proiectului prin comanda `npm run build` a finalizat cu succes.
- Toate modulele TypeScript și JSX sunt 100% valide și build-ul nu a generat avertismente sau erori.

## 9. Decizie
Proiectul este pregătit pentru testarea E2E din **Etapa 6C.4 Commercial Reports E2E Test**.
