# Commercial Reports SQL Hotfix Apply Guide — Etapa 6C.2.2A

Acest ghid oferă instrucțiunile necesare pentru aplicarea manuală a hotfix-ului SQL destinat celor două rapoarte comerciale defecte (`get_shift_report` și `get_losses_report`).

---

## 1. Scop
* **Repară** comportamentul runtime pentru `public.get_shift_report`.
* **Repară** comportamentul runtime pentru `public.get_losses_report`.
* **Securizează** toate cele 6 RPC-uri comerciale prin eliminarea drepturilor de execuție pentru rolul public (`anon`) și setarea explicită a `search_path = public`.
* **Nu modifică** nicio tabelă din baza de date (fără DDL destructiv).
* **Nu creează / nu modifică** date sau stocuri.
* **Nu schimbă** codul din interfața utilizator (frontend).

---

## 2. De ce este necesar
În etapa 6C.2.1 s-a constatat că:
1. **`get_shift_report`** aruncă eroarea: `column "s.created_at" must appear in the GROUP BY clause or be used in an aggregate function`. Aceasta este cauzată de ordonarea `ORDER BY s.created_at` direct în interiorul agregării din sub-interogare, fără ca sub-interogarea să fie corect definită cu un alias.
2. **`get_losses_report`** aruncă eroarea: `aggregate function calls cannot be nested`. Aceasta se datorează structurii imbricate a agregării (e.g. `jsonb_agg(sum(...))`).

---

## 3. Fișier de aplicat
* Calea fișierului în workspace: `database/hotfix_commercial_reports_6c22.sql`

---

## 4. Pași manuali de aplicare în Supabase
1. Conectează-te la panoul de control **Supabase Console** al proiectului.
2. Accesează secțiunea **SQL Editor** din meniul din stânga.
3. Deschide o filă nouă de interogare (**New Query**).
4. Copiază conținutul integral al fișierului [hotfix_commercial_reports_6c22.sql](../database/hotfix_commercial_reports_6c22.sql).
5. Apasă pe butonul **Run** (sau scurtătura `Ctrl + Enter`).
6. Confirmă că mesajul returnat este: `Success. No rows returned`.
7. Rulează scriptul de testare/verificare pentru a valida rezolvarea problemelor (Etapa 6C.2.2B Verification).

---

## 5. Strategia de Rollback
* **Fără impact destructiv**: Acest script conține doar comenzi `CREATE OR REPLACE FUNCTION` și comenzi de administrare a drepturilor (`GRANT/REVOKE`). Nu există comenzi de tip `DROP TABLE`, `DELETE` sau `UPDATE` pe datele magazinului.
* **Restaurare**: În caz de probleme, se poate reaplica manual fișierul anterior `database/proposed_commercial_reports_6c2.sql` sau fișierele de blueprint din etapa 6C.1 pentru a reveni la starea precedentă.

---

## 6. Verificări rapide după aplicare
După aplicarea cu succes în consolă, puteți valida funcționalitatea rulând următoarele interogări rapide direct în editorul SQL:

1. **Test `get_shift_report`**:
   ```sql
   -- Înlocuiește parametrii cu UUID-uri reale din baza de date
   SELECT public.get_shift_report('STORE_UUID_AICI', 'SHIFT_UUID_AICI');
   ```
   *Rezultat așteptat*: Un obiect JSONB ce conține detaliile turei (`shiftId`, `expectedCash`, `declaredCash`, `salesList` etc.), fără erori.

2. **Test `get_losses_report`**:
   ```sql
   -- Înlocuiește cu un UUID real
   SELECT public.get_losses_report('STORE_UUID_AICI', '2026-01-01', '2026-12-31');
   ```
   *Rezultat așteptat*: Un obiect JSONB cu cheile `totalWasteQuantity`, `estimatedWasteValue`, `byReason` și `byProduct`.

3. **Verificare permisiuni (Security check)**:
   Funcțiile nu trebuie să fie accesibile din afara sesiunilor autentificate. Puteți rula:
   ```sql
   -- Verifică permisiunile pentru utilizatorii neînregistrați
   SELECT has_function_privilege('anon', 'public.get_shift_report(uuid, uuid)', 'execute');
   ```
   *Rezultat așteptat*: `false` (accesul este revocat pentru utilizatorii anonimi).
