# FiscalNet Real Folder Controlled Pilot — Etapa 6G.FN.2

## 1. Rezumat
Această etapă implementează **Controlled Pilot** pentru conectarea la directoare locale de tip FiscalNet. 
- S-a adăugat detectarea capabilităților runtime (detalii mai jos).
- S-a definit modelul de configurare stocat în local storage.
- S-au implementat măsuri avansate de siguranță: banere de avertizare dinamice și o fereastră de dublă confirmare securizată.
- Scrierea locală este realizată prin apeluri IPC atomice securizate (`.tmp` -> `.txt`) când aplicația rulează în mediul desktop (Electron), respectiv prin blocare/stub când rulează într-un browser standard (sandbox).
- S-a implementat un modul de citire semi-automată a răspunsurilor din folderul local configurat.
- Toată logica POS (checkout, finalize_sale) rămâne neatinsă pentru siguranță.

---

## 2. Runtime Capability Audit & Decizie
Am auditat mediul runtime al proiectului:
- **Este browser-only?** La rularea în browser standard sau în teste Playwright, aplicația este sandboxată și nu are acces la modulele `fs` sau `path` native.
- **Are Electron?** Da, există `electron-main.js` în rădăcina proiectului, însă webPreferences-urile aveau `nodeIntegration: false` și `contextIsolation: true` fără script de preload, blocând accesul IPC.
- **Decizie de design**:
  - Am creat un script de preload `electron-preload.js` securizat, expunând o interfață controlată `window.electronAPI`.
  - Am modificat `electron-main.js` pentru a înregistra preload scriptul și a asculta pe două canale IPC sigure: `write-fiscal-net-file` și `read-fiscal-net-response`.
  - Frontend-ul detectează prezența `window.electronAPI`. Dacă nu este definită (rulare în browser standard sau teste Playwright), afișează statusul ca fiind în Sandbox, stochează configurările, dar dezactivează butonul de scriere fizică pe disc. Dacă este definită (rulare în Electron), permite scrierea după parcurgerea tuturor guard-urilor.

---

## 3. Configuration Model
Configurația locală se numește `FiscalNetConfig` și conține următoarele proprietăți:
- `enabled: boolean` (implicit false)
- `bonuriPath: string` (calea configurată pentru fișierele de bonuri, de ex: `C:\PilotFiscal\Bonuri`)
- `raspunsPath: string` (calea configurată pentru citirea fișierelor de răspuns, de ex: `C:\PilotFiscal\Raspuns`)
- `realWriteEnabled: boolean` (checkbox activat manual de utilizator)
- `requireConfirmation: boolean` (implicit true)
- `lastValidatedAt?: string` (data validării configurării)

Configurația este persistată exclusiv în `localStorage` (`fiscalnet-pilot-config`) pentru a preveni trimiterea de date locale către baza de date (Supabase) sau BridgeGest.

---

## 4. Real Write Guards & Double Confirmation
Pentru a elimina riscul emiterii accidentale de bonuri fiscale reale în cadrul pilotului, am implementat următoarele guard-uri:
1. **Pilot Dezactivat implicit**: Butonul de scriere în folder este dezactivat dacă checkbox-ul "Activez pilotul de scriere locală" nu este bifat.
2. **Mesaj Avertizare Dinamic**: La activarea checkbox-ului, apare un avertisment roșu proeminent: `"Atenție: dacă folderul este cel real monitorizat de FiscalNet, fișierul poate declanșa emiterea bonului fiscal."`
3. **Buton Dezactivat**: Butonul de scriere este disabled dacă:
   - Configurația este invalidă (căi goale).
   - Configurația nu a fost validată (prin butonul "Validează configurarea").
   - Aplicația nu rulează în runtime Electron (`window.electronAPI` indisponibil).
   - Nu a fost generat preview-ul pentru bon.
4. **Fereastră de Confirmare cu Cuvânt Cheie**: La click pe scriere, se deschide dialogul de confirmare (`fiscalnet-real-write-confirm-dialog`). Utilizatorul trebuie să introducă cuvântul exact:
   `SCRIE BON FISCALNET`
   Fără acest text exact, butonul de confirmare rămâne dezactivat.

---

## 5. Atomic Write
Pentru a asigura scrieri atomice și a evita monitorizarea fișierelor parțiale de către watcher-ul FiscalNet, în Electron main process:
1. Fișierul se salvează cu extensia temporară `.tmp` (ex: `sale-uuid.tmp`).
2. După finalizarea scrierii, se face rename atomic către `.txt` (ex: `sale-uuid.txt`).
3. Denumirile fișierelor sunt sanitizate (sunt respinse caractere de tip `..`, `/` sau `\` în denumirea fișierului pentru a bloca path traversal).
4. Doar extensia `.txt` este acceptată.

---

## 6. Response Handling
Citirea răspunsului nu folosește un watcher continuu pentru acest pilot. 
- Utilizatorul poate face click pe butonul `"Citește răspuns pentru acest bon"` (`fiscalnet-read-response-button`).
- Acesta trimite o cerere prin IPC pentru a citi fișierul `${saleId}.txt` din directorul de răspunsuri configurat (`raspunsPath`).
- Dacă fișierul este găsit, este trimis renderer-ului și parsat prin parser-ul de răspuns (BONOK=1 / BONOK=0).
- Rezultatele sunt afișate în containerul dedicat (`fiscalnet-response-file-result`).
- Statusurile fiscale nu sunt salvate în baza de date (Supabase) în această etapă pentru a izola comportamentul.

---

## 7. E2E & Static Tests
A fost creat fișierul de test E2E `test_fiscalnet_real_folder_pilot_6gfn2.py`:
- **Static Checks**:
  - Verifică absența path-urilor hardcodate `C:\FiscalNet\Bonuri`.
  - Verifică prezența avertismentelor dinamice și a codului de confirmare.
  - Verifică absența scrierilor automate pe parcursul POS-ului.
- **E2E Browser-only**:
  - Deschide modalul în browser standard.
  - Generază preview.
  - Verifică prezența secțiunii pilot.
  - Verifică dacă statusul runtime este "Browser Sandbox".
  - Verifică dacă butonul de scriere este dezactivat.
- **E2E Electron (Mocked)**:
  - Injectează `window.electronAPI` la inițializarea paginii.
  - Configurează directoarele de test.
  - Validează și activează pilotul.
  - Verifică dacă butonul de scriere devine activ.
  - Deschide dialogul de confirmare, testează validarea textului.
  - Simulează scrierea de succes și citirea răspunsului mock-uit.

---

## 8. Limitări
- Nu pornește automat software-ul FiscalNet.
- Nu emite bon fiscal real fără interacțiune manuală.
- Nu alterează baza de date.
- Nu se integrează în checkout (este o acțiune exclusiv manuală din Istoric Vânzări).

---

## 9. Decizie Recomandată
**Ready for controlled hardware test** / **Ready for 6G.0 FiscalBridge Discovery & Integration Blueprint**
Sistemul este pregătit pentru testarea controlată pe mașina fizică prin intermediul aplicației desktop Electron.
