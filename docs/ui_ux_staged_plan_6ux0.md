# Plan Corectare UI/UX pe Etape — Etapa 6UX.0

Acest document descrie planul de execuție în 6 etape (de la 6UX.1 la 6UX.6) pentru remedierea problemelor identificate în auditul baseline și pentru standardizarea vizuală completă a platformei **Gestiune Magazin v2**.

---

## Reguli Generale Stricte (Ce NU se modifică în nicio etapă)

> [!WARNING]
> Pe parcursul întregului proces de refactorizare vizuală, sunt complet interzise următoarele modificări:
> 1.  **NU se modifică schema bazei de date SQL** (tabele, coloane, constrângeri, indexuri).
> 2.  **NU se modifică politicile RLS** (Row Level Security) sau permisiunile de securitate.
> 3.  **NU se modifică logica internă a procedurilor stocate RPC** (`finalize_sale`, `void_sale`, `return_sale_items`, `receive_stock` etc.).
> 4.  **NU se modifică logica de business POS**, modul de calcul al prețurilor sau validarea stocului.
> 5.  **NU se modifică FiscalNet** sau logica de scriere a fișierelor fiscale.
> 6.  **NU se modifică cache-ul offline**, sincronizarea sau starea globală a rețelei.
> 7.  **NU se generează fișiere executabile (.exe)** prin rularea de comenzi desktop builder.

---

## 3. Planul Etapizat (6UX.1 - 6UX.6)

### Etapa 6UX.1: Foundations, Design Tokens & Core Components
*   **Obiectiv / Scope:** Definiția token-urilor de design (culori, umbre, spacing) în `index.css` și implementarea celor 13 componente fundamentale reutilizabile în folderul `src/shared/components` (Button, Input, Select, Card, Badge, Modal, Table, Alert, Tooltip, Tabs, PageHeader, EmptyState, LoadingState) cu suport pentru contrast WCAG AA și focus ring.
*   **Fișiere Vizate (Probabile):**
    *   `src/index.css` (tokens, scrollbars)
    *   `src/shared/components/` (crearea de noi componente React curat tipizate)
*   **Risc:** Modificarea stilurilor globale ar putea deregla temporar elementele ad-hoc existente.
*   **Mitigare:** Menținerea stilurilor Tailwind existente și aplicarea componentelor noi doar pe rând, fără a șterge vechiul cod global deodată.
*   **Plan Verificare / Testare:** Verificare statică a contrastului prin instrumente tip Lighthouse și teste unitare pentru noile componente React.

---

### Etapa 6UX.2: Layout, Navigation & Access Denied
*   **Obiectiv / Scope:** Refactorizarea navigației principale și a structurilor de layout global. Extragerea și restilizarea ecranului de Access Denied din ProtectedRoute într-o componentă separată cu design premium și suport complet pentru micro-animații.
*   **Fișiere Vizate (Probabile):**
    *   `src/app/MainLayout.tsx` (sidebar, sidebar items, header, profile picker)
    *   `src/features/auth/ProtectedRoute.tsx` (extragere AccessDeniedCard)
    *   `src/features/auth/components/AccessDeniedCard.tsx` [NEW]
*   **Risc:** Întreruperea funcționării logout-ului sau a gardurilor de acces (route guards) la modificarea ProtectedRoute.
*   **Mitigare:** Modificarea exclusivă a layout-ului vizual. Păstrarea neatinsă a funcțiilor de verificare a rolului și a apelurilor Supabase auth.
*   **Plan Verificare / Testare:** Test Playwright E2E pentru verificarea comportamentului la accesul cu rol de casier pe `/owner` și funcționarea butoanelor de Logout/Înapoi.

---

### Etapa 6UX.3: POS Workspace, Cart & Payments
*   **Obiectiv / Scope:** Refactorizarea ecranului POS pentru adaptare responsive pe tablete și monitoare tactile de rezoluție mică. Standardizarea elementelor de listare coș (PosCart) și a butoanelor de cantitate (+/- cu touch target minim 44px). Stilizarea premium a butoanelor de plată din `PosPaymentPanel` și a panelului de audit al evenimentelor coșului (`PosCartEventsPanel`).
*   **Fișiere Vizate (Probabile):**
    *   `src/features/pos/PosPage.tsx`
    *   `src/features/pos/components/PosCart.tsx`
    *   `src/features/pos/components/PosPaymentPanel.tsx`
    *   `src/features/pos/components/PosCartEventsPanel.tsx`
    *   `src/features/pos/components/PosLockScreen.tsx`
*   **Risc:** Afectarea procesului de scanare rapidă, a logicii de adăugare automată la Enter sau a calculului plată mixtă.
*   **Mitigare:** UI-ul va folosi exact aceleași handlere de evenimente (`onKeyDown`, `onChange`, `onClick`) și aceleași hooks/states. Nu se atinge `finalize_sale`.
*   **Plan Verificare / Testare:** Test Playwright pe coșul POS, adăugare scanner, editare cantități cu butoanele mărite și auto-balance-ul la plată mixtă.

---

### Etapa 6UX.4: Catalog, Forms & Settings
*   **Obiectiv / Scope:** Modernizarea tabelelor și formularelor din Catalog Produse, Quick Add și Setări Magazin. Utilizarea componentelor unificate `Table` și `Card` cu îmbunătățirea aspectului vizual al modalei de editare și al secțiunii de selectare TVA/SGR.
*   **Fișiere Vizate (Probabile):**
    *   `src/features/products/ProductsPage.tsx`
    *   `src/features/products/components/ProductTable.tsx`
    *   `src/features/products/components/ProductEditModal.tsx`
    *   `src/features/fast-add/FastAddPage.tsx`
    *   `src/features/store-settings/StoreSettingsPage.tsx`
*   **Risc:** Blocarea salvării datelor de produs, pierderea comportamentului de detectare a magazinului neplătitor (forțare grupa E) sau erori la salvarea setărilor de magazin din cauza payload-urilor modificate accidental.
*   **Mitigare:** Păstrarea neatinsă a hook-urilor `useProducts`, `useFastAdd` și `useStoreSettings`. Payload-urile trimise la servicii rămân identice.
*   **Plan Verificare / Testare:** Teste E2E Playwright de creare produs prin Adăugare Rapidă (cu cod intern generated), editare TVA/SGR în catalog și salvarea setărilor de magazin.

---

### Etapa 6UX.5: Owner Console & AI Consultant
*   **Obiectiv / Scope:** Alinierea tabelelor și modalelelor din Owner Console la noile standarde UI. Înlocuirea taburilor custom din Owner Console cu componenta standardizată `Tabs` (suport flex-wrap pe rezoluții mici). Reducerea riscului de truncare text în AI Consultant prin utilizarea de KPI cards responsive cu tooltip-uri complete.
*   **Fișiere Vizate (Probabile):**
    *   `src/features/owner-console/OwnerConsolePage.tsx`
    *   `src/features/owner-console/components/OwnerTabs.tsx`
    *   `src/features/owner-console/components/OwnerGlobalStatsCards.tsx`
    *   `src/features/ai-consultant/AiConsultantPage.tsx`
*   **Risc:** Afectarea comportamentului de context-lockdown al Platform Owner sau a limitării chunk-uite pentru interogările AI.
*   **Mitigare:** Păstrarea neatinsă a hook-urilor de date, a structurilor de state și a restricțiilor de redirect la nivel de routing sau rol.
*   **Plan Verificare / Testare:** Teste E2E pe Owner Console (alocare membru, stare de suspendare magazin) și afișarea recomandărilor din AI Consultant pe rezoluții adaptive.

---

### Etapa 6UX.6: Reports, History & Visual QA
*   **Obiectiv / Scope:** Refactorizarea paginilor de Rapoarte Comerciale și Istoric Vânzări conform noilor componente. Rularea unei suite de Visual QA complete pe 4 viewports standard (Desktop, Laptop, Tabletă, Mobil) pentru a valida eliminarea elementelor cu contrast scăzut și testarea regresiei pe toate fluxurile.
*   **Fișiere Vizate (Probabile):**
    *   `src/features/sales-history/SalesHistoryPage.tsx`
    *   `src/features/sales-history/components/SaleDetailsModal.tsx`
    *   `src/features/commercial-reports/`
*   **Risc:** Alterarea formulelor de agregare în rapoarte sau a logicii de return/void în istoric.
*   **Mitigare:** UI-ul va citi exact aceleași obiecte de date returnate de RPC-uri. Nicio interogare comercială directă sau procedură SQL nu este modificată.
*   **Plan Verificare / Testare:** Playwright E2E pentru vizualizare rapoarte comerciale, verificare estimări TVA în bonuri legacy și suita completă de teste vizuale pe multiple rezoluții.
