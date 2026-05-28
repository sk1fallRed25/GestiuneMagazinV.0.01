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


