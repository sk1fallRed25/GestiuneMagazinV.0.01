# AI Consultant Fullscreen Layout & Action Clarity Hotfix — Etapa 6AI.1.1

## 1. Problema Raportată

În urma implementării dashboard-ului în Etapa 6AI.1, s-au semnalat următoarele probleme de interfață în mod fullscreen / ecrane mari:
- **Container îngust**: Layout-ul principal era constrâns la `max-w-7xl` (1280px), lăsând mult spațiu neutilizat lateral pe ecrane mari și comprimând datele.
- **Truncare KPI**: Titlurile indicatorilor statistici erau tăiate agresiv (e.g. `VALOAR...`, `STOC EP...`), făcându-le greu de înțeles.
- **Tabele înghesuite cu scroll orizontal**: Panelurile laterale (stoc scăzut, expirare loturi, dead stock) din coloana dreaptă randau tabele complete cu 5-6 coloane într-o secțiune îngustă (33% lățime), forțând apariția unui scrollbar orizontal inestetic.
- **Acțiuni neclare (Misleading action labels)**: Recomandările prioritare aveau butoane ca „Refă stocul” sau „Promoții” care puteau sugera acțiuni directe (e.g. lansarea automată a unei comenzi), deși ele doar navigau generic către pagina de produse.

---

## 2. Optimizări Aduse Layout-ului Fullscreen

- **Widescreen Max-Width**: Containerul principal a fost lărgit la `max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 mx-auto` pentru a exploata optim rezoluțiile 1080p și ecranele de laptop/desktop mari.
- **Grid Adaptiv pe 12 coloane**: 
  - Pe desktop-uri mari (`xl`): Recomandările prioritare și tabelul de top vânzări folosesc **7 coloane** (`xl:col-span-7`), în timp ce alerte/insight-uri din sidebar folosesc **5 coloane** (`xl:col-span-5`).
  - Pe laptop-uri (`md`): Layout-ul se împarte în 2 coloane egale (`md:col-span-1`).
  - Pe tabletă și mobil: Se re-aranjează într-o singură coloană (`grid-cols-1`).

---

## 3. Corecții la KPI Cards

- **Text Wrapping**: S-a eliminat clasa `truncate` de pe etichetele de titlu și subtext, înlocuind-o cu `whitespace-normal break-words` pentru a permite așezarea textului pe 2 rânduri dacă lățimea fizică a cardului scade.
- **Tooltip-uri Native**: S-au adăugat atributele HTML `title={label}` și `title={value}` pe elementele interne pentru a permite vizualizarea textului complet în mod nativ la hover.

---

## 4. Recomandări Prioritare Clare și Utile

Fiecare card de recomandare prioritizat a fost extins pentru a fi explicit:
1. **Ce problemă există?**: Detaliat în Titlu + Descriere.
2. **De ce contează?**: Subtitlu nou: `Impact Operațional:` (e.g. *"Risc iminent de pierdere a vânzărilor din cauza indisponibilității mărfurilor la raft."*).
3. **Ce trebuie să fac?**: Subtitlu nou: `Acțiune Recomandată:` (e.g. *"Verifică produsele cu stoc sub 5 bucăți și pregătește o nouă recepție."*).
4. **Butoane clare (Contextual Routing)**:
   - S-au înlocuit etichetele ce implicau acțiuni automate cu butoane de explorare clare:
     - `Refă stocul` -> `Vezi produse epuizate`
     - `Vezi stocuri` -> `Deschide lista cu stoc scăzut`
     - `Promoții` -> `Vezi produse fără vânzare`
   - S-a adăugat transmiterea contextului de filtrare în React Router folosind proprietatea `state`:
     - Deschide lista cu stoc scăzut -> navighează la `/produse` cu state `{ aiFilter: 'low_stock' }`
     - Vezi produse epuizate -> navighează la `/produse` cu state `{ aiFilter: 'no_stock' }`
     - Vezi produse fără vânzare -> navighează la `/produse` cu state `{ aiFilter: 'dead_stock' }`

---

## 5. Paneluri Laterale Sub Formă de Liste Compacte (`isSidebar={true}`)

Pentru a elimina scrollbar-urile orizontale în coloana din dreapta:
- S-a introdus proprietatea `isSidebar?: boolean` în componenta `AiProductInsightTable`.
- Când `isSidebar = true` (cazul panelurilor laterale de stoc scăzut, expirare și dead stock), componenta renunță la structura de tabel `<table>` cu multe coloane și randează un grid flexibil de liste compacte:
  - **Stânga**: Numele produsului (truncat discret la limită) și codul de bare.
  - **Dreapta**: Stocul total (cu unitatea de măsură) și distribuția detaliată (Magazin/Depozit).
  - **Badges compacte**: Sub codul de bare se randează badge-ul de status (`Stoc zero`, `Stoc scăzut`, `Critic` etc.) sau valoarea blocată (e.g. `120 lei blocat` în caz de dead stock), evitând degradarea layout-ului.

---

## 6. Microcopy și Disclaimer Actualizat

- Bannerul de disclaimer a fost aliniat cu microcopy-ul specificat:
  `AI Consultant folosește reguli operaționale și agregări locale ale magazinului. Nu trimite date către modele AI externe.`

---

## 7. Validare Teste și Screenshots

### A. E2E Playwright `test_ai_consultant_layout_clarity_6ai11.py`
S-a creat și rulat suita de teste Playwright dedicată care validează scenariile:
- Verificarea lățimii containerului (`max-w-[1600px]`).
- Prezența claselor de wrapping (`whitespace-normal` / `break-words`) în KPI cards.
- Prezența noilor descrieri („Impact Operațional”, „Acțiune Recomandată”) în recomandări.
- Generarea capturilor de ecran visual QA pe 4 rezoluții salvate în `artifacts/6ai11/`:
  - `ai_consultant_desktop_1920x1080.png`
  - `ai_consultant_laptop_1366x768.png`
  - `ai_consultant_tablet_768x1024.png`
  - `ai_consultant_mobile_390x844.png`

Toate testele E2E (layout, load volume regresie, și general UI polish) trec cu succes:
- `test_ai_consultant_layout_clarity_6ai11.py`: **PASS**
- `test_ai_consultant_ui_6ai1.py`: **PASS**
- `test_ai_consultant_load_6ai0.py`: **PASS**
