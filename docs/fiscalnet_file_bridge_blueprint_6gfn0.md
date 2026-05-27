# FiscalNet File Bridge Blueprint — Etapa 6G.FN.0

## 1. Rezumat
FiscalNet este utilizat ca bridge fiscal temporar pentru aplicația de POS, până când modulul unificat **BridgeGest** este complet implementat și testat. 
Deoarece FiscalNet funcționează asincron pe bază de fișiere de comenzi (text separat prin `^`), integrarea nu necesită conexiuni TCP/IP directe sau drivere proprietare la nivel de aplicație client web. În schimb:
- Aplicația scrie un fișier text structurat într-un folder monitorizat numit `Bonuri`.
- FiscalNet detectează fișierul, îl procesează, comunică cu casa de marcat fizică și tipărește bonul.
- Răspunsul (succes/eroare) este scris în folderul `Raspuns`.

**Ce nu facem în această etapă:**
- Nu pornim utilitarul FiscalNet în mod automat.
- Nu trimitem bonuri reale către casa de marcat în mediul de producție.
- Nu scriem în folderul real `Bonuri` al casei de marcat (de exemplu `C:\FiscalNet\Bonuri`) fără configurare/confirmare manuală.
- Nu modificăm logica existentă de checkout sau tranzacțiile din baza de date.

---

## 2. Documentație FiscalNet relevantă
Interfața pe bază de fișiere folosește fișiere text simple (`.txt`), fiecare linie conținând o comandă formată dintr-un prefix și parametrii separați prin caracterul `^`.

### Foldere cheie:
- **`Bonuri`**: Folderul de intrare unde aplicația depune fișierele de comandă.
- **`Raspuns`**: Folderul de ieșire unde FiscalNet depune fișierele cu rezultatul execuției (folosind același nume de fișier ca cel trimis).

### Comenzi suportate relevante:
- **`CF`** (Cod Fiscal): Transmite codul de identificare fiscală al clientului (CIF/CUI), generând un bon cu datele firmei cumpărătoare.
  - Format: `CF^RO123456`
- **`S`** (Vânzare articol): Înregistrează o linie de produs pe bon.
  - Format: `S^Denumire^Pret^Cantitate^UM^GrTVA^GrDep`
- **`TL`** (Text Liber): Tipărește text nefiscal suplimentar pe bon (de exemplu, coduri de bare, promoții sau mesaje personalizate).
  - Format: `TL^Text`
- **`ST`** (Subtotal): Calculează subtotalul curent al bonului. De obicei este opțional deoarece utilitarul calculează totalul automat la închidere, dar poate fi utilizat pentru validare vizuală.
  - Format: `ST^`
- **`P`** (Plată): Înregistrează o modalitate de plată pe bon. Mai multe linii pot fi folosite pentru plăți mixte.
  - Format: `P^TipPlata^Valoare`
- **`VB`** (Anulare bon): Anulează bonul curent deschis în tranzacție.
  - Format: `VB^`
- **`X`** (Raport X): Emite raportul de verificare X.
  - Format: `X^`
- **`Z`** (Raport Z): Emite raportul fiscal zilnic Z (de închidere de zi).
  - Format: `Z^`

---

## 3. Format bon
Fiecare bon fiscal este generat secvențial în ordinea următoare:
1. Codul Fiscal al clientului (dacă este furnizat).
2. Liniile de vânzare ale produselor (`S`).
3. Liniile de vânzare aferente garanțiilor SGR (`S` introduse imediat după fiecare produs asociat).
4. Linii de text liber informative (`TL`).
5. Liniile de plată (`P`).

### Exemplu de format generic:
```text
CF^RO987654321
S^Paine Feliata^350^2000^buc^1^1
S^Cola Zero 0.5L^600^1000^buc^1^1
S^GARANTIE SGR PLASTIC^50^1000^buc^4^1
P^1^1350
```

---

## 4. Mapping TVA
Grupele de TVA din aplicație sunt mapate direct la codurile numerice cerute de configurarea casei de marcat prin FiscalNet:

| Grupa Aplicație | Procent Corelat (implicit) | Cod FiscalNet | Observație |
| :--- | :--- | :--- | :--- |
| **A** | 19% | `1` | Verifică configurarea casei fizice |
| **B** | 9% | `2` | Verifică configurarea casei fizice |
| **C** | 5% | `3` | Verifică configurarea casei fizice |
| **D** | 0% (sau scutit) | `4` | Utilizat implicit pentru garanții SGR |
| **E** | Regim special | `5` | Scutit cu drept de deducere / altele |

> [!WARNING]
> Risc ridicat: Dacă ordinea cotelor din casa de marcat fizică nu corespunde cu ordinea `1=19%, 2=9% etc.`, bonurile se vor tipări cu cote de TVA greșite. Această mapare este o propunere logică și trebuie validată cu tehnicianul de service al casei de marcat.

---

## 5. Mapping plăți
Modalitățile de plată suportate de sistemul nostru sunt convertite în codurile numerice corespunzătoare pentru casa de marcat:

| Metodă Aplicație | Denumire FiscalNet | Cod FiscalNet |
| :--- | :--- | :--- |
| **cash** | Numerar | `1` |
| **card** | Card Bancar | `2` |
| **credit** | Credit / OP | `3` |
| **meal_ticket** | Tichet masă | `4` |
| **voucher** | Voucher | `6` |
| **modern** | Plăți moderne (Mobile, QR) | `7` |
| **other** | Alte modalități | `8` |

Pentru tranzacțiile de tip **mixed payments** (plată mixtă), sistemul generează linii de plată multiple:
```text
P^1^500    (5.00 lei numerar)
P^2^1000   (10.00 lei card)
```

---

## 6. SGR (Sistemul Garanție-Returnare)
Produsele supuse legislației SGR au asociate o garanție obligatorie de **0.50 lei** pe unitate.
- Garanția se exportă ca o **linie separată de produs** imediat după produsul de bază.
- Denumirea liniei de garanție se alege în funcție de material:
  - Plastic: `GARANTIE SGR PLASTIC`
  - Metal: `GARANTIE SGR METAL`
  - Sticlă: `GARANTIE SGR STICLA`
- Garanția folosește întotdeauna grupa de **TVA D** (scutit / 0% VAT), tradusă în codul FiscalNet `4`.
- Cantitatea garanției este egală cu cantitatea produsului cumpărat.
- Prețul unitar este fixat la 0.50 lei (`50` în format bani).

---

## 7. Validări
Pentru a preveni erori la tipărirea bonurilor fiscale (care pot bloca casa de marcat sau genera neconcordanțe contabile), formatterul validează strict datele înainte de scriere:
1. **Validarea totalurilor**:
   $$\text{Total Produse} + \text{Total Garanții SGR} = \text{Total Bon}$$
2. **Validarea plăților**:
   $$\sum \text{Suma Plăți} = \text{Total Bon}$$
3. **Toleranța maximă**: Diferențele datorate rotunjirilor nu trebuie să depășească **0.01 lei**.
4. **Verificări semne**: Nu sunt permise prețuri, cantități sau sume negative în payload-ul de export.
5. **Sanitizarea textului**:
   - Elimină caracterul separator `^` pentru a preveni interpretarea greșită a coloanelor.
   - Elimină caracterele de tip newline (`\r`, `\n`).
   - Convertește caracterele diacritice românești în caractere standard din alfabetul latin (`ă` $\rightarrow$ `a`, `ș` $\rightarrow$ `s` etc.) pentru a asigura compatibilitatea cu ecranele/imprimantele termice.
   - Trunchiază denumirea produsului la maxim 36 de caractere.

---

## 8. Export strategy
- **Folder local**: Fișierele sunt salvate în `artifacts/fiscalnet/bonuri/` pentru a evita poluarea folderelor de sistem sau trimiterea eronată la o casă reală.
- **Scriere Atomică**:
  1. Fișierul este scris mai întâi sub forma `${saleId}.tmp`.
  2. După finalizarea scrierii cu succes, fișierul este redenumit în `${saleId}.txt`. Acest mecanism previne citirea fișierului de către serviciile watch-dog în timp ce este încă în curs de scriere.
- **Identificator**: Numele fișierului este exact `saleId` (UUID-ul vânzării), asigurând unicitatea și trasabilitatea tranzacțiilor.
- **Securitate**: Nu se utilizează scrierea directă din browser-ul web pe disk-ul local `C:\` pentru a respecta sandbox-ul de securitate al browserelor. Scrierile locale se fac doar la nivel de scripturi de test, Electron IPC, sau bridge-uri locale.

---

## 9. Response handling
FiscalNet scrie rezultatele în folderul `Raspuns` în fișiere cu același nume ca cele trimise.
Aplicația analizează fișierul răspuns:
- Căutăm linia `BONOK=1` (bon emis cu succes) sau `BONOK=0` (eroare).
- În caz de succes, extragem numărul bonului din cheile `NUMARBON` sau `NRBON`.
- În caz de eroare, extragem codul și mesajul din cheia `EROARE` (de exemplu, `EROARE=103 - Mesaj`).

---

## 10. Riscuri și Atenționări
1. **Fișiere duplicat**: Trimiterea repetată a aceluiași `saleId` poate suprascrie răspunsul sau genera bonuri multiple pe casa de marcat dacă driverul nu are implementată dedublarea.
2. **Lipsa de Idempotentizare**: FiscalNet nu validează dacă un bon a fost deja emis anterior decât dacă controlul se face la nivel de aplicație client sau prin verificarea stării fișierelor.
3. **Casa de marcat oprită / Fără hârtie**: Fișierul de comenzi va fi citit, dar procesarea va rămâne blocată sau va returna eroare în `Raspuns`. Sistemul POS trebuie să poată gestiona timeout-urile.
4. **Mapare greșită TVA / Plăți**: Riscuri de amenzi fiscale dacă datele tipărite nu reflectă realitatea contabilă. Maparea propusă trebuie confirmată pe fiecare casă fizică înainte de lansarea în producție.

---

## 11. Pilot usage
Pentru a testa sistemul în siguranță:
- Folosim exclusiv directorul de dry-run local `artifacts/fiscalnet/bonuri`.
- Generăm payload-uri de test bazate pe tranzacții reale finalizate.
- Mutarea fișierelor către folderul de producție FiscalNet (e.g. `C:\FiscalNet\Bonuri`) se va face strict manual în faza pilot pentru verificare vizuală a structurii fișierelor.

---

## 12. Următorul pas
Următoarele etape propuse după implementarea modelului dry-run sunt:
- **`6G.FN.2 FiscalNet Real Folder Controlled Pilot`**: Integrarea unui canal IPC securizat în Electron pentru a permite scrierea directă și asincronă în folderele fizice monitorizate de FiscalNet.
- **`6G.0 FiscalBridge Discovery & Integration Blueprint`**: Proiectarea modulului unificat de bridge pentru a suporta atât FiscalNet, cât și soluții directe (e.g. Datecs, Custom).

---

## 13. Actualizare 6G.FN.1 — Manual Export UI
În cadrul etapei 6G.FN.1, am adăugat suportul grafic pentru interacțiunea cu utilizatorul în regim manual:
- **Butonul manual**: Adăugat în modalul de detalii din Istoric Vânzări (afișat exclusiv pentru bonurile cu status finalized sau partially_returned).
- **Avertisment**: Utilizatorului i se comunică clar că descărcarea fișierului text nu declanșează listarea automată, iar fișierul `.txt` generat trebuie depus manual în folderul monitorizat.
- **Câmp CIF**: S-a inclus posibilitatea de a introduce codul fiscal al firmei cumpărătoare în UI, generând dinamic linia `CF^RO...`.
- **Pre-vizualizare**: O zonă cu aspect premium în modal afișează conținutul exact al fișierului, oferind opțiuni rapide de copiere text și descărcare fișier (`saleId.txt`).
- **Parser de Răspuns integrat**: Interfață text în care se poate lipi conținutul fișierului din folderul `Raspuns`, interpretând automat rezultatul (`BONOK=1` / `BONOK=0`) și afișând starea sub formă de badges vizuale (succes cu număr bon fiscal vs. eroare cu detalii).
- **Validare**: Orice export este condiționat de validarea totalurilor. În cazul în care datele înregistrate au nepotriviri sau lipsesc grupe de TVA ori detalii de plată, interfața afișează o eroare de securitate și blochează descărcarea.

---

## 14. Actualizare 6G.FN.2 — Controlled Real Folder Pilot
În cadrul etapei 6G.FN.2, s-a implementat pilotul controlat cu scriere în directoare locale fizice:
- **Preload Script**: S-a definit `electron-preload.js` securizat pentru expunerea IPC-ului în context-isolation.
- **Canale IPC în electron-main.js**:
  - `write-fiscal-net-file`: scrie atomic (`.tmp` -> `.txt`) după sanitizarea numelui (blocare path traversal, extensie `.txt`). Verifică existența fișierului pentru a asigura **idempotentizarea** la nivel local (nu permite rescrierea unui fișier existent).
  - `read-fiscal-net-response`: citește răspunsul de pe disc pentru a permite analiza rapidă.
- **Interfață Utilizator în POS**:
  - Panou dedicat pentru pilot: configurarea căilor Bonuri/Răspuns (salvate în localStorage), activarea manuală a checkbox-ului de pilot și buton de validare a configurării.
  - Dialog de dublă confirmare obligatorie (`fiscalnet-real-write-confirm-dialog`) care solicită scrierea textului exact `SCRIE BON FISCALNET`.
  - Buton dedicat de citire a răspunsului direct de pe disc (`fiscalnet-read-response-button`), afișând dinamic rezultatul parsat.
- **Fallback Browser**: Dacă aplicația este accesată din browser, funcționalitatea de scriere/citire automată locală este dezactivată complet prin fallback runtime, fiind marcată ca `"Browser Sandbox (Scriere dezactivată)"` cu butoanele aferente dezactivate.
- **Idempotentizare**: Interfața reține fișierele scrise local și blochează rescrierea directă. De asemenea, IPC-ul din Electron blochează scrierea dacă fișierul există deja în folder.
- **Status**: **PASS**.

