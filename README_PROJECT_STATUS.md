# Status Proiect - Gestiune Magazin

Acest document urmărește starea integrărilor și a etapelor de dezvoltare pentru proiectul Gestiune Magazin.

## Stadiu Integrare Fiscală

- **Etapa 6G.FN.0 (FiscalNet File Bridge Blueprint & Dry-Run Export)**: **PASS**
  - Proiectarea și implementarea unui format de export controlat/dry-run pentru FiscalNet sunt finalizate.
  - Generarea formatului de text Caret-separated este conformă cu specificațiile tehnice FiscalNet.
  - S-a configurat scrierea atomică în folderul local de dry-run (`artifacts/fiscalnet/bonuri/`).
  - Toate testele unitare (money formatting, quantity formatting, sanitizare text, validare totaluri, parser răspuns) rulează și trec cu succes sub Node.js și Python.

- **Etapa 6G.FN.1 (FiscalNet Manual Export from Sales History)**: **PASS**
  - Se poate genera manual fișierul `.txt` FiscalNet din detaliile bonului din Istoric Vânzări.
  - Se poate previzualiza conținutul fișierului în UI într-un panou dedicat.
  - Se poate descărca fișierul sub denumirea `${saleId}.txt`.
  - Se poate parsa manual răspunsul FiscalNet din folderul `Raspuns` prin copy-paste, afișând starea grafică a bonului (succes + număr bon fiscal sau eroare + cod/mesaje).
  - **IMPORTANT**:
    - Nu se scrie automat în folderul real monitorizat `Bonuri` al casei de marcat.
    - Nu s-a emis bon real.
    - Logica de checkout POS și finalize_sale rămâne complet neschimbată (fără fiscalizare automată).

- **Etapa 6G.FN.2 (FiscalNet Real Folder Controlled Pilot)**: **PASS**
  - S-a implementat detecția runtime a capabilităților Electron/Browser.
  - S-a adăugat configurarea locală a folderelor de intrare/ieșire persistată în `localStorage` și avertismentul dinamic asociat.
  - S-a securizat scrierea locală printr-un dialog de dublă confirmare care cere introducerea textului exact `SCRIE BON FISCALNET`.
  - S-a integrat scrierea atomică locală `.tmp` -> `.txt` securizată prin IPC (în mediul Electron) și stubbing în browser sandbox.
  - S-a adăugat citirea răspunsului de pe disc (`fiscalnet-read-response-button`) și afișarea rezultatului.
  - S-au scris teste Playwright cuprinzătoare în `test_fiscalnet_real_folder_pilot_6gfn2.py` care acoperă toate scenariile.
  - Nu s-a emis bon real automat la checkout și nu s-a actualizat baza de date.

- **Etapa 6G.FN.2.1 (FiscalNet IPC Security & Path Hardening)**: **PASS**
  - S-au adăugat helper-e de securitate în `electron-main.js` pentru validarea numelor de fișier (`isSafeTxtFilename`), validarea directoarelor locale (`assertDirectoryExists`) și prevenirea atacurilor de tip *Path Traversal* (`resolveInside`).
  - S-a securizat scrierea fișierelor de comenzi prin blocarea fișierelor `.tmp` paralele și redenumirea atomică securizată cu cleanup automat în caz de eroare.
  - S-a securizat citirea fișierelor de răspuns prin impunerea unei limite maxime de dimensiune de **10 KB** pentru a preveni atacurile DoS și epuizarea memoriei.
  - S-a asigurat securitatea la nivel de interfață în sandbox (browser) prin blocarea completă și afișarea unui toast corespunzător.
  - S-a montat un component `<Toaster />` local în `SaleDetailsModal.tsx` pentru a asigura randarea robustă a mesajelor în toate circumstanțele.
  - Toate criteriile au fost verificate automat și trecute cu succes în suita `test_fiscalnet_ipc_security_6gfn21.py`.

- **Etapa 6G.FN.2.2 (FiscalNet Admin Station Settings)**: **PASS**
  - S-a implementat componenta unificată de configurare `FiscalNetStationSettings` plasată în ecranul de setări magazin (`StoreSettingsPage.tsx`).
  - S-au mutat setările din detaliile bonului într-o stocare persistentă exclusiv locală pe browser / calculator POS.
  - S-a securizat vizibilitatea datelor: casierul vede doar statusul și căile active sub formă read-only în mod de detalii bon (câmpurile de input și setarea de scriere sunt complet ascunse pentru acest rol).
  - Casierul poate scrie bonuri local folosind configurarea pre-validată de administrator prin dublă confirmare, fără a trebui să introducă calea manual de fiecare dată.
  - Toate criteriile au fost validate automat prin testul Playwright `test_fiscalnet_station_settings_6gfn22.py`.

- **Etapa 6G.FN.3 (FiscalNet Auto Print on POS Checkout)**: **PASS**
  - S-a implementat tipărirea automată post-checkout (serviciul `fiscalNetPostCheckoutService.ts` integrat asincron în `usePos.ts`).
  - Fluxul de checkout nu este blocat de eșecul tipăririi, oferind casierului o tratare elegantă a erorilor de scriere pe disc.
  - Detecția automată a mediului web/sandbox dezactivează scrierea locală și previne apelurile eronate ale interfeței Electron IPC în browser.
  - S-a validat automat generarea și structura formatului FiscalNet pentru produse standard, garanții SGR multiple și plăți mixte.
  - Toate testele au fost implementate și trecute cu succes în suita `test_fiscalnet_pos_auto_write_6gfn3.py`.

- **Etapa 6G.FN.3.2 (FiscalNet Electron Runtime Detection Hotfix)**: **PASS**
  - **ROOT CAUSE**: `electron-preload.js` lipsea din `build.files` din `package.json`, ceea ce cauza ca preload-ul să nu fie inclus în `.exe`-ul generat de Electron Builder → `window.electronAPI` nu era niciodată expus.
  - S-a adăugat `electron-preload.js` în `build.files` pentru includerea corectă în build-ul packaged.
  - S-a creat helper-ul centralizat `fiscalNetRuntime.ts` cu `isFiscalNetDesktopRuntime()` (detecție defensivă boolean + funcție legacy) și `getFiscalNetRuntimeDiagnostics()`.
  - S-a unificat detecția runtime în toate cele 4 fișiere UI care o foloseau (`FiscalNetStationSettings`, `SaleDetailsModal`, `fiscalNetPostCheckoutService`, `usePos`).
  - S-a adăugat panoul de diagnostic vizibil în setările FiscalNet cu 4 indicatoare (isElectron, hasElectronAPI, hasWriteAPI, hasReadAPI) și `data-testid`-uri dedicate.
  - S-a creat tipul global `src/types/electron.d.ts` pentru `window.electronAPI`.
  - Toate testele trec: `test_fiscalnet_electron_runtime_detection_6gfn32.py` (32/32), build OK, auto-write E2E OK.
  - Raport detaliat: `docs/fiscalnet_electron_runtime_detection_6gfn32_report.md`.

### Următorul pas recomandat:
- **`6G.FN.4 FiscalNet Hardware Smoke Test Manual Run`** (Rularea manuală a întregului flux pe hardware fizic în mediul Electron securizat).
- **`6G.0 FiscalBridge Discovery & Integration Blueprint`** (Proiectarea arhitecturii unificate a bridge-ului fiscal).


---

## Stadiu POS & Catalog

- **Etapa 6G.POS.2 (Category/Subcategory Management for Quick Add & POS)**: **PASS**
  - Schema auditata: tabel `categories` exista cu `parent_id` self-referential (root + subcategorii).
  - Nu a fost necesara nicio migrare SQL.
  - Nou serviciu `categoryService.ts`: listare, creare categorii principale si subcategorii cu validare duplicate.
  - Nou hook `useCategories.ts`: state management categorii pentru Quick Add.
  - `FastAddPage.tsx`: inlocuit blocul static "Categorie (Auto): General" cu selecturi interactive + modals creare.
  - `fastAddService.ts`: transmite `category_id` la inserarea produselor.
  - POS: `PosCategoryBrowser.tsx` + `usePosCategories.ts` pentru navigare ierarhica categorii/subcategorii/produse.
  - Build: 0 erori TypeScript, 2556 module.
  - Teste: 26 PASS, 0 FAIL.

- **Etapa 6G.POS.1.1 (POS Barcode Enter Auto-Add Hotfix)**: **PASS**
  - S-a implementat adăugarea automată a produsului în coș la scanarea sau introducerea codului de bare și apăsarea tastei `Enter` în POS.
  - Scanarea repetată mărește cantitatea (fără duplicate), actualizează SGR și totalul bonului, iar în caz de cod inexistent afișează o eroare temporară, păstrând focusul pe input.
  - Testele E2E Playwright și testele de regresie trec cu succes.

### Urmatorul pas recomandat:
- **`6G.POS.4 Barcode Label Printing`** (Tipărire etichete coduri de bare)

---

## Stadiu AI Consultant

- **Etapa 6AI.0 (AI Consultant Module Load Failure Audit & Hotfix)**: **PASS**
  - S-a rezolvat eroarea generică `Nu s-au putut încărca datele.` prin introducerea unui chunking asincron (`chunkSize = 100`) pentru interogările masive `.in(...)` care depășeau limita de 8KB a API Gateway-ului Supabase.
  - S-a redus strictețea parser-ului numeric, introducând fallback pe valoarea `0` în caz de date invalide sau corupte pentru a asigura randarea.
  - S-a diferențiat ecranul de eroare în UI pentru a afișa mesaje specifice de Store lipsă, RLS restricționat, Eroare tehnică și Date insuficiente (empty state).
  - S-au adăugat selectori `data-testid` și s-a creat suita `test_ai_consultant_load_6ai0.py` pentru regresie.

- **Etapa 6AI.1 (AI Consultant UI/UX Dashboard Polish)**: **PASS**
  - S-a proiectat și implementat un dashboard operațional premium, utilizând carduri KPI animate, alerte colorate pe bază de severitate și butoane de acțiune rapidă către rutele active.
  - S-au creat componente curate și reutilizabile: `AiConsultantHeader`, `AiKpiCard`, `AiRecommendationCard` și `AiProductInsightTable`.
  - S-a asigurat responsivitatea completă pe 4 rezoluții (desktop, laptop, tabletă, mobil) prin transformarea automată a tabelelor mari în liste de carduri compacte pe ecrane de telefon (390x844).
  - S-a implementat o stare de încărcare premium cu animații de tip skeleton loader.
  - Suita de teste Playwright `test_ai_consultant_ui_6ai1.py` rulează și salvează capturi de ecran visual QA în `artifacts/6ai1/`.
  - Build-ul și toate testele de regresie (inclusiv entitlements și chunking) trec cu succes.

- **Etapa 6AI.2 (AI Server-Side Aggregation, Consent & ML Data Contribution Blueprint)**: **PASS**
  - S-a proiectat blueprint-ul bazei de date în `database/proposed_ai_server_side_aggregation_consent_6ai2.sql` definind structura tabelelor `store_ai_consent`, `store_ai_snapshots` și `store_ai_training_snapshots`.
  - S-a definit un model de consimțământ granular pe 5 niveluri separate (UI, server processing, platform ML training, cross-store benchmarking, external API processing), toate fiind implicit `FALSE`.
  - S-au elaborat semnăturile și logica internă a RPC-urilor securizate cu clauza `SECURITY DEFINER` și verificarea strictă a rolurilor magazinului (`has_store_role`).
  - S-au implementat politici de izolare Row Level Security (RLS) specifice fiecărei tabele și un sistem de trigger automat de audit pe modificări de consimțământ.
  - S-a documentat conformitatea cu GDPR și AI Act, detaliind procedurile de anonimizare/minimizare a datelor și excludere completă a PII-urilor.
  - S-a creat scriptul de test static `test_ai_server_side_aggregation_consent_6ai2.py` care validează automat respectarea constrângerilor de securitate și consent.
  - Build-ul și toate testele trec cu succes.

### Următorul pas recomandat:
- **`6AI.3 Server-Side Aggregation & Consent SQL Hardening`** (Rularea și pre-validarea scripturilor SQL propuse în mediul sandbox izolat).

---

## Stadiu Desktop Update & Offline Safe Mode

- **Etapa 6APP.1 (NIR Placeholder UI + Auto-Update Blueprint + Offline Safe Mode Blueprint)**: **PASS**
  - Creat `NirPage.tsx` ca placeholder de înaltă fidelitate pentru modulul NIR/e-Factura (permisiuni admin/manager/gestionar).
  - Implementat network hook `useNetworkStatus.ts` cu monitorizare `online`/`offline` și debounce la reconectare.
  - Implementat UI Safe Mode (offline banner global + blocare checkout în POS, salvare setări, actualizări produse și recepție stoc offline).
  - Documentat blueprint-ul de update (`desktop_auto_update_blueprint_6app2.md`) și blueprint-ul de offline (`offline_safe_mode_blueprint_6app3.md`).
  - Toate testele trec: `test_nir_placeholder_update_offline_6app1.py` (Exit code 0).

- **Etapa 6APP.2 (Desktop Auto-Update Implementation)**: **PASS**
  - Instalat pachetul `electron-updater` ca dependență în `package.json`.
  - Configurat `package.json` cu win target `nsis` și `portable`, setări de instalare NSIS (non-one-click, directoare personalizabile) și publish.
  - Creat `electron-updater-service.js` în procesul Main care integrează `electron-updater`, gestionează fluxurile în background și emite mesaje IPC.
  - Expus interfața `updater` în `electron-preload.js` securizând canalele de update IPC și definit tipurile în `src/types/electron.d.ts`.
  - Dezvoltat panoul `AppUpdatePanel.tsx` în Settings cu monitorizarea progresului de download și avertizări de browser sandbox.
  - Implementat măsuri de siguranță POS în settings: instalarea update-ului este blocată dacă există produse în coș (`localStorage.getItem('pos_cart')` nu e gol), solicitând golirea coșului. Dacă e gol, se cere dublă confirmare înainte de repornire.
  - Toate testele trec: `test_desktop_auto_update_6app2.py` (Exit code 0).
  - Raport detaliat: `docs/desktop_auto_update_implementation_6app2_report.md`.

- **Etapa 6APP.2.1 (Auto-Update Real Release Smoke Test Preparation)**: **PASS**
  - Auditat configurația de publicare și corectat o lipsă critică prin adăugarea `electron-updater-service.js` în `build.files` din `package.json` pentru a asigura includerea în bundle-ul de producție Electron.
  - Adăugat notificare de instalare NSIS vs Portable în `AppUpdatePanel.tsx` UI pentru ghidarea administratorului.
  - Creat ghidul de testare manuală pe hardware real `docs/desktop_auto_update_real_release_smoke_test_6app21.md` (Version A -> B transition, latest.yml, update offline, pos safety).
  - Creat scriptul de verificare statică `test_desktop_auto_update_release_smoke_6app21.py` care validează configurarea corectă din repository.
  - Toate testele trec cu succes: `test_desktop_auto_update_release_smoke_6app21.py` (Exit code 0), `test_desktop_auto_update_6app2.py` (Exit code 0), `test_nir_placeholder_update_offline_6app1.py` (Exit code 0).
  - Raport detaliat: `docs/desktop_auto_update_real_release_smoke_6app21_report.md`.
