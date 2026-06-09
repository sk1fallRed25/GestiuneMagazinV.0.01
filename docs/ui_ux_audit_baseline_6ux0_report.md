# Raport Audit Baseline UI/UX — Etapa 6UX.0

Acest document reprezintă auditul detaliat al interfețelor utilizator (UI) și al experienței de utilizare (UX) pentru platforma **Gestiune Magazin v2**. Scopul auditului este de a identifica abaterile de la standardele de design, problemele de contrast, consistență și responsivitate (layout responsive pe diverse dispozitive), oferind recomandări clare pentru o restructurare viitoare organizată pe etape (6UX.1 - 6UX.6).

---

## 1. Rezumat General UI/UX

### Puncte Tari (Strengths)
*   **Structură modernă:** Aplicația folosește un layout curat cu colțuri rotunjite ample (`rounded-3xl` / `rounded-2xl`), oferind o estetică modernă.
*   **Interactivitate rapidă:** Pagina de vânzare (POS) are scurtături de taste și fluxuri optimizate pentru viteză de operare.
*   **Separare vizuală clară:** Utilizarea paletelor de culori de la Tailwind (slate, indigo, emerald, amber, rose) ajută la diferențierea rapidă a stărilor (online/offline, tipuri de plată, tipuri de stoc).

### Puncte Slabe (Weaknesses)
*   **Lipsa standardizării componentelor (Code Duplication):** Elemente fundamentale precum butoane, input-uri, carduri și ecrane de încărcare (loading/empty states) sunt implementate ad-hoc cu clase Tailwind specifice fiecărui fișier. Aceasta duce la o mentenanță dificilă și un aspect vizual inconsistent.
*   **Probleme de contrast (WCAG Compliance):** Anumite texte (în special cele din table headers sau butoane secundare) folosesc culori deschise pe fundaluri la fel de deschise (ex. text-slate-400 pe bg-slate-50 sau text-gray-400 pe white), afectând lizibilitatea.
*   **Ținte de atingere (Touch Targets):** În modul POS, anumite butoane (e.g. modificarea cantității în coș cu +/-) sunt prea mici pentru ecrane tactile de tip tabletă (sub recomandarea minimă de 44x44px).
*   **Bannere și alerte inconsistente:** Mesajele de eroare și statusurile offline folosesc stiluri, culori și poziționări diferite de la o pagină la alta.

---

## 2. Tabelul Central al Auditului (15 Ecrane & Componente)

| Nr. | Ecran / Componentă | Descriere Problemă Identificată | Severitate | Recomandare Concretă UI/UX | Alocare Etapă |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Login / Autentificare** | Inputs cu spacing rigid. Alertele de eroare nu sunt unificate cu restul aplicației. Lipsă feedback vizual la starea Caps Lock. | `Minor` | Integrare input-uri standardizate, adăugare avertisment Caps Lock și animație subtilă de focus pe container. | **6UX.2** |
| **2** | **MainLayout / Sidebar / Header** | Lipsa micro-animațiilor la hover pe sidebar. Lățimi hardcodate pentru sidebar care pot cauza suprapuneri pe tablete în mod portret. | `Major` | Standardizare spacing layout, adăugare tranziții CSS line-height/opacity, unificare indicator store selector. | **6UX.2** |
| **3** | **POS / Vânzare** | Input-ul de cod de bare are dimensiuni masive neadaptate pe rezoluții mici. Grid-ul central devine aglomerat pe ecrane sub 1366px. | `Major` | Layout flexibil cu container scrollable. Adaptare text-size pe bază de media-queries (`sm:text-lg md:text-2xl`). | **6UX.3** |
| **4** | **Coș POS / Plată / Total** | Butoanele de incrementare cantitate (+/-) au țintă de atingere prea mică (sub 44px). Butoanele de plată sunt simple blocuri fără efecte premium. | `Major` | Mărire touch targets pentru controalele coșului. Adăugare hover gradients și click feedback pe butoanele de plată (Numerar, Card, Mixt). | **6UX.3** |
| **5** | **Products / Catalog Produse** | Tabelul de produse folosește headere cu font mic și contrast slab (`text-slate-400`). Acțiunile (Edit/Archive) sunt doar pictograme fără tooltips. | `Major` | Utilizarea componentei unificate de tabel. Adăugare tooltips native/personalizate pe acțiunile rapide din rânduri. | **6UX.4** |
| **6** | **Quick Add / Adăugare Rapidă** | Spacing inconsistent între secțiunile de input stânga/dreapta. Butonul "Gen. Cod" este mic și înghesuit în input layout. | `Major` | Alinierea la gridul de spacing standard. Butonul de generare integrat vizual ca input suffix modern cu layout stabil. | **6UX.4** |
| **7** | **Store Settings** | Layout-ul vertical lung devine monoton. Panourile albe simple au un aspect vizual plat (lipsă adâncime/gradient). | `Major` | Utilizarea de Card-uri standardizate cu shadow fin. Adăugare iconițe colorate pe titlurile de secțiuni pentru navigare rapidă. | **6UX.4** |
| **8** | **Owner Console** | Taburile (`OwnerTabs.tsx`) au stil custom nealiniat. Modalele au lățimi și margini diferite. Consistență redusă a spacing-ului. | `Major` | Standardizarea modalelelor și a taburilor cu stilul pastilă (`flex-wrap`). Utilizarea design tokens de culori globale. | **6UX.5** |
| **9** | **AI Consultant** | KPI cards pot suferi text-truncation pe rezoluții medii. Tabelele cu recomandări au layout diferit de catalogul principal. | `Major` | CSS flex-wrap pe KPI-uri. Standardizarea designului tabelelor de insight conform structurii de table general. | **6UX.5** |
| **10** | **Sales History / Istoric** | Rândurile din tabel au contrast redus la selecție. Filtrele calendaristice folosesc stil ad-hoc. Modalele de retur/anulare sunt inconsistente. | `Major` | Utilizarea tabelei standardizate. Unificarea stilului de date-picker și modal de confirmare cu ID-uri clare. | **6UX.6** |
| **11** | **Offline Cache / Banners Stare** | Banners de avertizare folosesc culori diferite (amber-50, red-50) și animații inconsistente (`animate-pulse` vs static). | `Minor` | Crearea unei componente unificate de Alertă/Banner cu stilizări și culori standardizate pe nivele de alertă. | **6UX.1** |
| **12** | **Access Denied** | Ecranul `AccessDeniedCard` este hardcodat direct în ProtectedRoute.tsx, îngreunând testarea și mentenanța vizuală. Stilizare simplă. | `Major` | Extragere în fișier separat. Îmbunătățirea aspectului vizual (premium card, shadow fin, opțiuni de navigare clare). | **6UX.2** |
| **13** | **Modals / Loading / Empty States**| Cod duplicat masiv pentru ecrane de loading și stări goale (empty states). Animațiile diferă (spinners vs text pulsat). | `Critic` | Implementarea a 3 componente globale reutilizabile: `Modal`, `LoadingState`, `EmptyState` pentru înlocuirea codului duplicat. | **6UX.1** |
| **14** | **POS Cart Event Panel** | Panelul folosește stiluri nestandardizate pentru listarea evenimentelor, având text dens fără separatori vizuali clari. | `Minor` | Utilizarea componentelor tip Card/Badge standardizate și a spacingului unificat pentru evenimente cronologice. | **6UX.3** |
| **15** | **Contrast Scăzut & Butoane** | Butoanele secundare sau textul secundar (gri deschis pe alb) nu respectă standardele WCAG AA (minimum contrast 4.5:1). | `Critic` | Revizuirea paletei de culori la nivel global. Modificarea textului din text-slate-400 în text-slate-600 pentru lizibilitate. | **6UX.1** |

---

## 3. Listă Componente UI Standardizate pentru Creare / Refactorizare

Pentru a elimina codul duplicat și a garanta un aspect vizual premium, consecvent și accesibil, în etapa **6UX.1** vor fi create și publicate următoarele componente standardizate:

1.  **Button:** Suportă variante (`primary`, `secondary`, `danger`, `ghost`, `link`), dimensiuni (`sm`, `md`, `lg`), stare de loading (cu spinner integrat) și focus outline vizibil.
2.  **Input:** Cu label integrat, suport pentru erori de validare, iconițe prefix/suffix și design consistent la focus.
3.  **Select:** Dropdown curat adaptat pentru selecția multiplă sau simplă, compatibil cu stilul inputului standard.
4.  **Card:** Container cu umbre subtile (`shadow-sm` / `shadow-md`), colțuri rotunjite ample (`rounded-3xl`) și structură clară pentru header/body/footer.
5.  **Badge:** Etichetă compactă pentru statusuri (ex: active, inactive, ciornă, SGR) în variante de culori unificate.
6.  **Modal:** Dialog accesibil (cu control focus, tasta Escape, fundal blurat) cu dimensiuni predefinite (`sm`, `md`, `lg`, `xl`).
7.  **Table:** Structură tabelară cu headere contrastante, rânduri hoverable, animație de loading și suport nativ pentru responsivitate.
8.  **Alert / Banner:** Banners de notificare pentru erori, avertismente, confirmări și informații (folosite pentru mesaje offline, validări etc.).
9.  **Tooltip:** Indicator informativ discret ce apare la hover pe elementele compacte.
10. **Tabs:** Meniu de navigare orizontal cu stilul pastilă (`flex-wrap`) și indicator vizual clar al tabului activ.
11. **PageHeader:** Header unificat pentru pagini ce include titlul principal, iconiță, breadcrumbs/descriere și secțiune de acțiuni rapide.
12. **EmptyState:** Componentă centrată cu o pictogramă discretă, un titlu clar, o descriere și un buton opțional de acțiune.
13. **LoadingState:** Spinner centrat sau schelet animat (skeleton loader) cu un mesaj text opțional, pentru tranzitul de date.
