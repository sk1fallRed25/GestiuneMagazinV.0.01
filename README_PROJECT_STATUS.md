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

### Următorul pas recomandat:
- **`6G.0 FiscalBridge Discovery & Integration Blueprint`** (Proiectarea arhitecturii unificate a bridge-ului fiscal)
  sau
- **`6G.FN.3 FiscalNet Hardware Smoke Test Manual Run`** (Rularea manuală a pilotului pe hardware fizic)

