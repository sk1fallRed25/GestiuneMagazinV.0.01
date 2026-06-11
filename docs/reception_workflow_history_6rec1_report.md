# Raport Integrare — Redesign Recepție Marfă, Istoric Recepții & Stock Movement Safety (6REC.1)

## 1. Ce era greșit în recepția veche
În designul anterior, recepția de marfă prezenta următoarele deficiențe structurale:
1. **Modificări directe asupra stocului**: Orice salvare a unei recepții (chiar și în curs de editare) opera modificări imediate și necontrolate asupra tabelelor de stocuri (`stock_batches`, `product_prices`, `stock_movements`), riscând coruperea datelor în cazul abandonării sau modificării ulterioare.
2. **Lipsa trasabilității și a istoricului**: Nu exista un jurnal sau un istoric centralizat al recepțiilor finalizate, făcând imposibil auditul stocurilor introduse sau urmărirea facturilor trecute.
3. **Absența stării de Draft**: Operatorii nu puteau salva o schiță a documentului pe care să o continue ulterior; totul trebuia finalizat pe loc.
4. **Lipsa atomicității tranzacționale**: Stocurile erau inserate linie cu linie de pe client, ceea ce putea duce la stări inconsistente de stoc în caz de eșec parțial al conexiunii.

---

## 2. Ce s-a implementat
A fost reconstruit întregul flux de recepție conform standardelor de siguranță multi-store și trasabilitate totală:
* **Workflow pe bază de Status**: Recepțiile folosesc acum stări explicite validate prin constrângeri în baza de date: `draft` (schiță), `posted` (confirmată/intrată în stoc) și `cancelled` (anulată).
* **NIR Number & Date Jurnale**: S-au adăugat câmpurile `nir_number` și `reception_date` direct în structura tabelului `receptions`.
* **Istoric Jurnal vizual**: A fost creat modulul `ReceptionHistory.tsx` dotat cu filtre avansate (dată, furnizor, status, punct de lucru) și suport complet pentru vizualizarea detaliată în format read-only a documentelor confirmate (`ReceptionDetail.tsx`).
* **Marcaje E2E / Data-Testid**: Toate elementele esențiale cerute în instrucțiuni au fost marcate cu testid-uri dedicate.

---

## 3. Cum funcționează Draft
* **Inițializare**: O recepție nouă pornește implicit în starea `draft`.
* **Persistență în siguranță**: Apăsarea butonului "Salvează ca Draft" colectează liniile curente și le scrie în tabelele `receptions` și `reception_items` cu `status = 'draft'`.
* **Zero impact pe stoc**: Cât timp documentul are statusul `draft`, stocul depozitului nu este modificat în niciun fel. Prețurile de vânzare și de achiziție din catalog rămân neschimbate.
* **Editare / Anulare**: Draftul poate fi încărcat ulterior din istoric, re-editat (adăugat/șters linii, modificat antet) sau anulat complet (tranzitează în starea `cancelled`).

---

## 4. Cum funcționează Confirmarea & Actualizarea Stocului
* **Procesare tranzacțională (RPC)**: Confirmarea recepției apelează funcția securizată din baza de date `public.post_reception(p_reception_id, p_store_id, p_profile_id)`.
* **Flux de stoc**:
  1. Blochează rândul recepției cu `FOR UPDATE` pentru a evita accesul concurent.
  2. Validează rolurile de permisiune (gestionar, admin sau platform owner).
  3. Schimbă statusul documentului în `posted`.
  4. Pentru fiecare linie de recepție:
     - Actualizează prețurile de achiziție/vânzare în `product_prices` (cu comportament Upsert).
     - Identifică lotul corect în `stock_batches` (pe criterii de număr de lot și dată de expirare în zona 'depozit') utilizând `FOR UPDATE` și incrementează cantitatea. Dacă lotul nu există, creează unul nou.
     - Inserează o mișcare de stoc cu tipul `reception` în tabela `stock_movements` pentru o trasabilitate de 100%.
* **Stare Read-Only**: Odată confirmată, recepția devine blocată. Modulul de detalii afișează un badge de avertisment dedicat (`reception-posted-readonly-warning`), împiedicând orice formă de re-editare directă a datelor.

---

## 5. Ce face RPC-ul `post_reception`
RPC-ul este implementat la nivel de bază de date cu privilegii de securitate stricte:
* **Securitate**: Rulează cu `SECURITY DEFINER` și are `search_path` fixat pe `public` pentru a evita atacurile de search path path injection.
* **Revocare drepturi publice**: S-au revocat în mod explicit drepturile de execuție pentru rolurile `PUBLIC` și `anon`. Doar utilizatorii autentificați (`authenticated`) o pot rula.
* **Atomicitate**: Execuția are loc într-o singură tranzacție Postgres. Dacă oricare dintre pași (cum ar fi actualizarea lotului sau a mișcării de stoc) eșuează, întreaga tranzacție se întoarce la starea inițială (Rollback automat).

---

## 6. Situație Migrare DB (Aplicată live sau doar creată)
* **Status migrare**: Migrarea SQL a fost **creată** și **aplicată cu succes** pe baza de date de staging.
* **Fișiere create**:
  - Script principal: `supabase/migrations/proposed_reception_draft_status_6rec1.sql`
  - Script rollback: `scripts/rollback_reception_draft_status_6rec1.sql`
* **Rollback**: Scriptul de rollback este disponibil și permite ștergerea rapidă a coloanelor adăugate și a funcției RPC în caz de necesitate.

---

## 7. Ce NU s-a modificat (Safety Check)
În conformitate cu restricțiile stabilite:
* **Fără modificări POS Checkout**: `finalize_sale` nu a fost afectat.
* **Fără modificări FiscalNet**: Modulul de comunicare cu casele de marcat și exportul bonurilor fiscale au rămas intacte.
* **Fără modificări Auto-Update**: Logică de actualizare a aplicației nu a fost atinsă.
* **Fără fișiere compiled**: Nu s-au generat executabile `.exe` și nu s-a rulat `npm run electron:build`.

---

## 8. Status Build & Teste
* **Build de producție**: `npm run build` a trecut cu succes (2600 module compilate corect prin rollup/vite).
* **Jurnal de Teste E2E**:
  - `test_reception_workflow_history_6rec1.py`: **PASS** (verifică login, creare draft, salvare, afișare istoric, deschidere detalii, confirmare, status posted și starea read-only cu avertisment).
  - `test_catalog_category_management_6cat1.py`: **PASS** (integritate 6CAT.1).
  - `test_ui_catalog_forms_settings_6ux4.py`: **PASS** (integritate 6UX.4).
  - `test_ui_visual_cleanup_multi_store_6fix1.py`: **PASS** (integritate multi-store, asocieri, CUI-uri și limitări).
  - `test_pos_real_category_mapping_6ux32.py`: **PASS** (integritate cache SQLite/POS).

---

## 9. Riscuri Rămase
* **Latența rețelei la confirmare**: Procesarea unui număr foarte mare de linii de recepție printr-o conexiune instabilă ar putea dura câteva secunde până la finalizarea tranzacției Postgres. Totuși, datorită atomicității RPC-ului, nu există riscul de scriere parțială.
