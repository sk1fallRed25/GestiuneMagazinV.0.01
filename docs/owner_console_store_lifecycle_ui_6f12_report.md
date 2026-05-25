# Raport Integrare UI Store Lifecycle Management — Etapa 6F.1.12

Acest raport detaliază implementarea și integrarea completă a interfeței de management a ciclului de viață al magazinelor (Store Lifecycle Management UI) în Consola Proprietarului (Owner Console), respectând constrângerile stricte de securitate și principiul **DML-Zero**.

---

## 1. Arhitectură și Servicii Client

Modulul de frontend a fost proiectat defensiv pentru a interacționa cu baza de date **exclusiv** prin intermediul RPC-urilor securizate expuse de backend:

1. **Tipuri de Date (`src/features/owner-console/types.ts`)**:
   - Extins tipul `OwnerStore` cu proprietățile: `lifecycleStatus`, `deletionRequestedAt`, `deletionRequestedBy`, `suspendedAt`, `suspendedBy`, `archivedAt`, `archivedBy`.
   - Adăugat enum-ul `StoreLifecycleStatus` (`active`, `suspended`, `archived`, `pending_deletion`, `deleted`).
   - Adăugat definiții de interfață pentru `StoreDeletionEligibility` (rezultatele diagnozei de dependențe) și `StoreLifecycleActionResult`.
   - Înregistrat noile acțiuni de audit în `OwnerAuditAction`.

2. **Serviciu RPC API Client (`src/features/owner-console/services/storeLifecycleService.ts`)**:
   - Implementat wrapper-ul tipizat peste cele 7 RPC-uri active din baza de date:
     - `get_store_lifecycle_status` (verificare stări)
     - `suspend_store` (suspendare cu motiv de audit)
     - `reactivate_store` (reactivare cu motiv de audit)
     - `archive_store` (arhivare cu motiv de audit)
     - `get_store_deletion_eligibility` (analiză dependențe)
     - `request_store_deletion` (cerere de ștergere)
     - `cancel_store_deletion_request` (anulare cerere)
   - Adăugat parsare defensivă a răspunsurilor JSONB și traducerea erorilor comune din baza de date în limba română.

3. **Hook personalizat (`src/features/owner-console/hooks/useStoreLifecycle.ts`)**:
   - Expune stările asincrone (`loading`, `error`, `eligibility`) și metodele de mutare către componentele UI.
   - Izolează logica de mutare și garantează refacerea corectă a contextului la succes.

---

## 2. Componente UI Implementate

Aplicația folosește un sistem de design premium (bazat pe shadcn/lucide-react și Tailwind) perfect adaptat pentru tema dark/light:

1. **`StoreLifecycleActionModal.tsx`**:
   - Gestionează acțiunile: suspendare, reactivare, arhivare, cerere ștergere și anulare cerere.
   - Forțează introducerea unui motiv (de minim 3 caractere) pentru înregistrarea în logul de audit.
   - Afișează avertismente contextuale adaptate fiecărei tranziții.

2. **`StoreDeletionEligibilityModal.tsx`**:
   - Încarcă și afișează în timp real rezultatul diagnozei de ștergere.
   - Inspectează dependențele din cele 22 de tabele core ale aplicației (vânzări, stocuri, membri, configurări etc.).
   - Afișează o recomandare explicită de **arhivare în loc de ștergere** pentru magazinele care au activitate comercială istorică.
   - Blochează/ascunde butonul de solicitare ștergere dacă magazinul este ineligibil.
   - Menționează clar că ștergerea definitivă fizică (hard delete) este dezactivată din rațiuni fiscale în versiunea curentă.

3. **Optimizări `StoresTable.tsx`**:
   - Înlocuit switch-ul legacy cu un badge elegant pentru starea de lifecycle (`Activ`, `Suspendat`, `Arhivat`, `În curs de ștergere`).
   - Adăugat meniul de context dropdown „Opțiuni ciclu viață” pentru accesarea rapidă a modalelelor.
   - Actualizat sumarele de la subsol pentru a număra corect magazinele în funcție de noile statusuri din lifecycle.

4. **Filtre și Traduceri Jurnal Audit (`OwnerAuditLogsPanel.tsx`)**:
   - Adăugat noile acțiuni de lifecycle (`store.suspend`, `store.reactivate`, `store.archive` etc.) în selectorul de filtrare și în injectorul de badge-uri.
   - Mapate traducerile în limba română în serviciul de audit client pentru a asigura trasabilitatea completă.

5. **Integrare Finală (`OwnerConsolePage.tsx`)**:
   - Montat componentele modal în structura principală a paginii.
   - Definit callback-urile de succes pentru reîncărcarea listelor de magazine și a jurnalului de audit în mod sincron.

---

## 3. Validare prin Testare E2E Playwright

Pentru validarea fluxurilor a fost creat scriptul de testare automatizat `test_owner_store_lifecycle_ui_6f12.py`.

### Scenarii Testate cu Succes:
1. **Scenario 1 (Suspendare)**: Deschidere dropdown pe magazinul de test `Magazin Test 12345678 Punct 902` -> selectare Suspendare -> completare motiv -> confirmare -> verificare badge în tabel: `Suspendat`.
2. **Scenario 2 (Reactivare)**: Selectare Reactivare -> completare motiv -> confirmare -> verificare badge în tabel: `Activ`.
3. **Scenario 3 (Arhivare)**: Selectare Arhivare -> completare motiv -> confirmare -> verificare badge în tabel: `Arhivat`.
4. **Scenario 4 (Reactivare din Arhivă)**: Selectare Reactivare -> completare motiv -> confirmare -> verificare badge în tabel: `Activ`.
5. **Scenario 5 (Eligibilitate Ștergere)**: Deschidere diagnoză pe `Magazin Principal` -> verificare afișare loading spinner -> verificare text recomandare arhivare -> verificare blocare buton solicitare ștergere -> închidere modal.
6. **Cleanup / Restaurare automată**: Restaurarea stării magazinului de test la `active` în blocul `finally` al testului exclusiv prin RPC-ul `reactivate_store`.

### Rezultate Rulări:
- **DML Safety Guard**: `PASS` (zero modificări directe `.delete()`, `.insert()`, `.update()` în script).
- **TypeScript & Vite Build Check**: `PASS` (`Exit code: 0`).
- **E2E Playwright Test Suite**: `PASS` (`Exit code: 0`).

```
--- SCENARIO 1: Suspend Store ---
Opening lifecycle options menu...
Clicking 'Suspenda magazin'...
Verifying StoreLifecycleActionModal is visible...
Entering suspension reason...
Confirming action...
Current badge text: 'Suspendat'
[PASS] Store suspended successfully.

--- SCENARIO 2: Reactivate Store ---
Clicking 'Reactiveaza magazin'...
Current badge text: 'Activ'
[PASS] Store reactivated successfully.

--- SCENARIO 3: Archive Store ---
Clicking 'Arhiveaza magazin'...
Current badge text: 'Arhivat'
[PASS] Store archived successfully.

--- SCENARIO 4: Reactivate from Archive ---
Clicking 'Reactiveaza magazin'...
Current badge text: 'Activ'
[PASS] Store reactivated from Archive successfully.

--- SCENARIO 5: Deletion Eligibility for Magazin Principal ---
Opening lifecycle options menu on Magazin Principal...
Clicking 'Verifica eligibilitate'...
Verifying StoreDeletionEligibilityModal is visible...
Waiting for eligibility checks to finish...
Eligibility Modal text summary:
Verificare Eligibilitate ?tergere
Magazin Principal ? CUI RO12345678
?tergerea definitiv? este dezactivat? ?n aceast? versiune.
...
Ineligibil pentru ?tergere
Store has historical operational activity...
Recomandare: Acest magazin are activitate istoric? ?nregistrat?. Se recomand? arhivarea, nu ?tergerea.
ANALIZ? ?NREGISTR?RI DEPENDENTE (4019 TOTAL)
...
[PASS] Deletion eligibility correctly handled for active commercial store.

--- CLEANUP: Restoring test store state via RPC ---
Cleanup RPC response: {'success': True, 'error': None}
[PASS] Cleanup completed successfully.

[SUCCESS] E2E UI Lifecycle Verification Test completed successfully!
```

---

## 4. Concluzii și Securitate

- **DML-Zero din UI**: În conformitate cu standardele ridicate de siguranță, UI-ul nu are permisiuni de editare directă pe tabele. Toate acțiunile se fac tranzacțional prin RPC.
- **Audit-Compliance**: Jurnalul de audit înregistrează corect autorul tranziției, motivul acesteia și starea magazinului, fiind vizibile direct în consolă.
- **Pregătire Pilot**: Integrarea completă a ciclului de viață finalizează cerințele administrative esențiale pentru gestionarea securizată a clienților pe platformă.
