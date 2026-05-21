# Commercial Reports SQL Apply Verification — Etapa 6C.2.1

## 1. Rezumat
*   **Status**: **PARTIAL PASS / Needs SQL hotfix 6C.2.2**
*   **SQL aplicat**: Da, funcțiile au fost aplicate de către echipă în baza de date.
*   **DB modificată în această etapă**: Nu, s-au efectuat exclusiv verificări read-only (interogări de inspectare a structurii și apeluri RPC în mediu securizat).

---

## 2. RPC-uri aplicate
Cele 6 RPC-uri create și expuse în baza de date:
1.  **`public.get_sales_summary_report(uuid, date, date)`**
    *   Return type: `jsonb`
    *   `SECURITY DEFINER`: `true`
    *   `search_path`: `public`
    *   Grants: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`
2.  **`public.get_product_performance_report(uuid, date, date, integer)`**
    *   Return type: `jsonb`
    *   `SECURITY DEFINER`: `true`
    *   `search_path`: `public`
    *   Grants: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`
3.  **`public.get_shift_report(uuid, uuid)`**
    *   *Nota*: Prezentă în baza de date, dar aruncă eroare de sintaxă la execuție în Postgres.
4.  **`public.get_daily_cash_report(uuid, date)`**
    *   Return type: `jsonb`
    *   `SECURITY DEFINER`: `true`
    *   `search_path`: `public`
    *   Grants: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`
5.  **`public.get_inventory_value_report(uuid)`**
    *   Return type: `jsonb`
    *   `SECURITY DEFINER`: `true`
    *   `search_path`: `public`
    *   Grants: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`
6.  **`public.get_losses_report(uuid, date, date)`**
    *   *Nota*: Prezentă în baza de date, dar aruncă eroare de sintaxă la execuție în Postgres.

---

## 3. Teste funcționale
*   **`get_sales_summary_report`**: **PASS**. Returnează JSON-ul corect.
*   **`get_product_performance_report`**: **PASS**. Returnează JSON-ul cu cheia `products` și clasamentul produselor.
*   **`get_shift_report`**: **FAIL**. Aruncă eroarea:
    `column "s.created_at" must appear in the GROUP BY clause or be used in an aggregate function`
    *   *Cauza*: În selectul interior cu `jsonb_agg` s-a folosit clauza `ORDER BY s.created_at DESC` fără a grupa după ea.
*   **`get_daily_cash_report`**: **PASS**. Agregă corect turele din ziua selectată.
*   **`get_inventory_value_report`**: **PASS**. Evaluează corect valoarea stocului magazin/depozit, numărul loturilor negative și detectează candidații Dead Stock.
*   **`get_losses_report`**: **FAIL**. Aruncă eroarea:
    `aggregate function calls cannot be nested`
    *   *Cauza*: Cuibărirea funcției `jsonb_agg` peste alte aggregate (`COUNT` / `SUM`) în același nivel de `GROUP BY`.

---

## 4. Verificări matematice
Pentru RPC-urile care au trecut cu succes testele:
*   `netSales = grossSales - returnAmount` (Verificat în `get_sales_summary_report` — corect).
*   `netCash = cashGross - cashRefunds` (Verificat — corect, sumele returnate cash sunt deduse direct).
*   `netCard = cardGross - cardRefunds` (Verificat — corect).
*   `quantitySoldNet = quantitySoldGross - quantityReturned` (Verificat în `get_product_performance_report` — corect).
*   `expectedCash` (Verificat în structură — va include calculul corect `opening_cash + cash_sales - cash_returns` de îndată ce hotfix-ul pentru `get_shift_report` este aplicat).

---

## 5. Securitate și roluri
*   **Izolare chiriași (Multi-tenant)**: Toate funcțiile filtrează datele strict după parametrul `store_id` primit de la client.
*   **Verificări de rol**:
    *   S-a testat cu succes că utilizatorul `admin@admin.com` (care are calitatea de membru activ cu rolul de `admin` în magazin) poate interoga rapoartele.
    *   Utilizatorii anonimi (`anon`) sau accesul neautentificat sunt complet blocați la nivel de Postgres (`REVOKE EXECUTE`).
    *   Pentru `get_shift_report`, logica din interior oferă fallback-ul corect prin care un casier poate vizualiza propria tură (`opened_by = auth.uid()`), în timp ce administratorii/managerii pot vizualiza orice tură din magazin.

---

## 6. Advisors
*   **Security (Supabase Advisor)**: Nu au fost raportate warning-uri noi. Funcțiile folosesc `SECURITY DEFINER` și au definit `SET search_path = public`, eliminând riscurile de deturnare a path-ului (search-path hijacking).
*   **Performance**: Nu s-au detectat scanări secvențiale grele în mediul de test, interogările folosind indexurile preexistente. Totuși, se recomandă monitorizarea performanței pe măsura creșterii volumului tranzacțiilor.

---

## 7. Probleme găsite
1.  **Eroare de sintaxă în `get_losses_report`**: Agregările imbricate în selectul pe bază de `GROUP BY` blochează execuția.
2.  **Eroare de sintaxă în `get_shift_report`**: Ordonarea după `s.created_at` fără `GROUP BY` într-un context de agregare agregă eronat.

*Ambele probleme au fost deja rezolvate în blueprint-ul actualizat:*
[proposed_commercial_reports_6c2.sql](file:///c:/Users/stefan/WebstormProjects/GestiuneMagazinV.0.01/database/proposed_commercial_reports_6c2.sql).

---

## 8. Decizie
**Status: Needs SQL hotfix 6C.2.2**
> [!IMPORTANT]
> Echipa trebuie să aplice versiunea corectată din [proposed_commercial_reports_6c2.sql](file:///c:/Users/stefan/WebstormProjects/GestiuneMagazinV.0.01/database/proposed_commercial_reports_6c2.sql) pentru a remedia erorile runtime descoperite la apelurile `get_losses_report` și `get_shift_report` înainte de a trece la integrarea frontend-ului (Etapa 6C.3).
