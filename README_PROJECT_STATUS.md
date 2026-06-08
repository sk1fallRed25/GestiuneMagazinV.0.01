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

- **Etapa 6APP.3 (Offline Data Cache & Sales Queue Blueprint)**: **PASS**
  - Proiectat schema SQL pe server (`proposed_offline_data_cache_sales_queue_6app3.sql`) pentru device register (`pos_devices`), cozi de actualizări (`offline_sale_sync_log`), snapshoturi de integritate (`offline_sync_snapshots`) și proceduri RPC securizate (`SECURITY DEFINER`, `search_path = public`).
  - Proiectat blueprintul complet (`offline_data_cache_sales_queue_blueprint_6app3.md`) cu tabele locale SQLite (produse, prețuri, stoc snapshot, categorii, tura activă, coadă vânzări locală, metadata sync).
  - Definit frecvența sincronizărilor (startup sync, periodic incremental pull, full daily pull, manual sync) și invalidări la 24h (warning)/48h (block).
  - Definit logul local append-only (`.jsonl`) pentru prevenirea defecțiunilor fizice de calculator (PC stricat) și procedurile administrative de backup/recovery.
  - Stabilite regulile post-sync FiscalNet (nu se scrie offline, se printează doar după sync reușit și returnare sale_id) și protocoalele de rezolvare a conflictelor.
  - Toate testele trec cu succes: `test_offline_data_cache_sales_queue_blueprint_6app3.py` (Exit code 0), `test_desktop_auto_update_6app2.py` (Exit code 0), `test_nir_placeholder_update_offline_6app1.py` (Exit code 0).
  - **Etapa 6APP.4 (Offline Data Cache SQL Pre-Apply Hardening)**: **PASS**
  - S-a întărit și securizat schema SQL a bazei de date propusă pentru offline.
  - S-au adăugat validări de securitate pe funcțiile RPC, în special pe `register_pos_device` (lungime fingerprint și securizare).
  - S-a finalizat scriptul pregătit pentru aplicare în `database/proposed_offline_data_cache_sales_queue_6app3.sql`.
  - Toate testele trec: `test_offline_data_cache_sql_hardening_6app4.py` (Exit code 0).

- **Etapa 6APP.5 (Offline Data Cache SQL Manual Apply Verification)**: **PASS**
  - S-a aplicat manual scriptul SQL în Supabase SQL Editor.
  - S-a dezvoltat suita E2E `test_offline_data_cache_sql_apply_6app5.py` pentru a valida corectitudinea aplicării catalogului: tabele create (`pos_devices`, `offline_sale_sync_log`, `offline_sync_snapshots`), politici de RLS active, funcții `SECURITY DEFINER` securizate cu `search_path = public` și revocare drepturi EXECUTE pentru rolurile anon/public.
  - Toate testele catalog, RLS și RPC-uri în contextul de utilizatori reali trec cu succes (Exit code 0).

- **Etapa 6APP.5.1 (Desktop Close Button + POS Cart Recovery)**: **PASS**
  - S-a implementat butonul dedicat "Închide aplicația" în layout-ul Sidebar, activ exclusiv în runtime-ul desktop/Electron via IPC `app:quit`.
  - S-a implementat bariera de deconectare și închidere când coșul POS conține produse active, afișând dialogurile specifice de atenționare cu opțiuni de păstrare (draft) sau ștergere.
  - Dezvoltat serviciul `posCartRecoveryService.ts` cu namespace unic utilizator/magazin și schemă structurată pentru stocarea draft-urilor de coș.
  - S-a asigurat compatibilitatea cu remount-ul React 18 Strict Mode prin flag-ul `hasCartBeenModifiedRef` pentru a preveni ștergerea timpurie a draftului la mount.
  - **OPTIME**: S-a rescris interogarea `listAllProducts` din `posService.ts` printr-un singur JOIN select pentru a rezolva eroarea de depășire a lungimii maxime a URL-ului (400 Bad Request) atunci când există peste 900+ de produse în magazin.
  - Toate testele Playwright trec: `test_pos_cart_recovery_close_app_6app51.py` (12/12 PASS, Exit code 0).
  - Raport detaliat: `docs/pos_cart_recovery_close_app_6app51_report.md`.

- **Etapa 6APP.6 (Local SQLite Database & Cache Storage in Electron Main)**: **PASS**
  - Integrată baza de date SQLite nativă (`better-sqlite3`) în procesul Electron Main (`electron-sqlite-service.js`), inițializată în `%APPDATA%/Sistem Gestiune Magazin/offline_cache.db`.
  - Definite tabelele locale SQLite (`local_products`, `local_product_prices`, `local_stock_snapshot`, `local_categories`, `local_shift_state`, `local_store_settings`, `local_sync_metadata`, `local_offline_sales_queue`) cu indecși pe codul de bare și numele produsului.
  - Implementat modulul de sincronizare `usePosOfflineCache.ts` în React care verifică identitatea dispozitivului (amprentă unică în `device_id.json`), auto-înregistrează dispozitivul pe server (RPC `register_pos_device`) și stochează pachetul de date (RPC `get_offline_cache_bundle`) printr-o tranzacție atomică SQLite ACID.
  - Adăugat componentul vizual premium `OfflineCacheSyncPanel.tsx` în setările magazinului, afișând starea cache-ului, numărul de elemente și avertizări de prospețime (green/yellow/red).
  - Integrat fallback automat pentru căutare și scanare cod de bare în POS (`usePos.ts`) în mod offline, redirecționând interogarea către SQLite.
  - Toate testele Playwright trec: `test_offline_data_cache_sqlite_6app6.py` (3/3 PASS, Exit code 0).
  - Raport detaliat: `docs/offline_data_cache_sqlite_6app6.md`.

- **Etapa 6APP.6.1 (Packaged Electron SQLite Service Inclusion Hotfix)**: **PASS**
  - **Eroare raportată**: `ERR_MODULE_NOT_FOUND` pentru `electron-sqlite-service.js` la pornirea aplicației packaged `.exe`.
  - **Cauză**: Fișierul `electron-sqlite-service.js` nu era inclus în lista `files` din configurarea de build a `package.json`, ceea ce a dus la omiterea sa din pachetul final generat de `electron-builder`.
  - **Hotfix**: S-a adăugat `electron-sqlite-service.js` în vectorul `files` din `package.json`.
  - **Testare statică**: S-a creat scriptul de test `test_packaged_electron_sqlite_service_6app61.py` care verifică automat integritatea importurilor și configurațiile de build.
  - **Rezultate**: Toate testele automate (static check, offline cache integration test, auto-update integration test) au fost rulate și trec cu succes (Exit code 0). Instalația packaged porneste cu succes.
  - Raport detaliat: `docs/packaged_electron_sqlite_service_hotfix_6app61_report.md`.



