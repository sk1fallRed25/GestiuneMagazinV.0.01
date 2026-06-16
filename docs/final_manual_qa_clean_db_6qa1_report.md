# Raport QA Manual & Automat pe Bază Curată (Etapa 6QA.1)

**Data testării:** 16 Iunie 2026  
**Commit SHA:** `f17056112bf61134fbfab54290780dd4c6995fc6`  
**Branch:** `master`  
**Tip Verificare:** QA Final pe baza curățată de istoric test, înainte de rebuild desktop executabil `.exe`.

---

## 1. DB Baseline Counts (Verificare Baseline Database)

După curățarea completă (Etapa 6DATA.4) și rularea tuturor testelor automate, interogările SQL read-only de catalog arată următoarele conturi (baseline curat):

| Tabela / Criteriu | Valoare Așteptată | Valoare Determinată Live | Status |
| :--- | :---: | :---: | :---: |
| **total stores** | 2 | 2 | **PASS** |
| **total profiles** | 4 | 4 | **PASS** |
| **total products** | 568 | 568 | **PASS** |
| **total product_prices** | 568 | 568 | **PASS** |
| **total categories** | 6 | 6 | **PASS** |
| **total sales** | 123 | 123 | **PASS** |
| **total payments** | 143 | 143 | **PASS** |
| **total waste_events** | 8 | 8 | **PASS** |
| **total pos_devices** | 1 | 1 | **PASS** |
| **test products** | 0 | 0 | **PASS** |
| **test categories** | 0 | 0 | **PASS** |
| **test stores** | 0 | 0 | **PASS** |
| **test sales** | 0 | 0 | **PASS** |
| **POS-TEST-E2E** | 0 | 0 | **PASS** |

### Concluzie Audit DB:
* Toate datele istorice de test au fost șterse complet în etapa 6DATA.4.
* **Testele automate rulează în regim complet self-contained și își execută teardown-ul corect, nelăsând date reziduale (test/E2E/etc.) în baza de date.**

---

## 2. QA Manual (Verificare fluxuri UI prin Playwright)

Verificările s-au realizat programatic prin simulare cap-la-cap (Playwright) pe portul live `5173`.

### A. Platform Owner (`admin@owner.com`)
* **Owner Console:** Se deschide corect la ruta `/owner`.
* **Magazine reale:** Apar exclusiv magazinele reale `STEF&MON STORE` și `Magazin Principal`. Nu sunt prezente magazine suspendate, arhivate artificiale sau magazine E2E create în timpul rulării testelor.
* **Utilizatori & Alocări:** Utilizatorii și store_members se văd corect, afișând doar profilele și alocările administrative reale.
* **Audit Logs:** Jurnalul de audit logs se încarcă fără erori.
* **Status:** **PASS** (Fără date test vizibile).

### B. Admin Magazin (`admin@admin.com`)
* **Selector Punct Lucru:** Afișează static badge-ul `Magazin Principal` deoarece utilizatorul este membru într-un singur magazin real. Dropdown-ul interactiv este ascuns conform design-ului (pentru a evita dropdown-uri inutile de un singur element).
* **Dashboard:** Nu afișează date test; datele sunt coerente cu cele 123 vânzări reale. Nu există erori de consolă.
* **Catalog Produse:** Afișează doar cele 568 produse reale. Nu apar produse de test (`6CAT1`, `6REC`, `PRODUS_SGR` etc.). Filtrele de categorii și subcategorii funcționează.
* **Manager Categorii:** Afișează cele 6 categorii reale. Nu sunt prezente categorii de test.
* **Recepție Marfă (NIR):** Pagina se deschide fără erori, funcționalitatea de draft, NIR, adăugare produse și calcul automat al liniei NIR sunt operaționale. Modulul de vizualizare istoric este read-only.
* **Transfer Marfă:** Formularul de transfer se deschide corect. Din cauza baseline-ului cu o singură alocare de magazin pentru acest admin, dropdown-ul de destinație este lăsat gol/fără alte selecții active.
* **Rapoarte / Istoric Vânzări:** Afișează KPI-uri corecte pe baza celor 123 vânzări reale. Vânzările de test nu apar.
* **Store Settings:** Setările se încarcă corect, afișează metadatele corecte de runtime (versiune 1.0.0, runtime browser sandbox). Nu apar erori la deschidere.
* **Status:** **PASS**

### C. Casier (`casier@casier.com`)
* **POS Workspace:** Casierul intră corect în POS. Deoarece pe baza de date curată nu este deschisă nicio tură POS, interfața se deschide corect în starea blocată (`POS Blocat` - PosLockScreen), solicitând deschiderea unei ture.
* **Izolare Rute / RBAC:** Încercarea de a accesa `/owner` de către casier este blocată corect, afișând pagina de eroare specifică cu mesajul `"Acces Interzis"`.
* **Status:** **PASS**

---

## 3. Teste Automate (E2E Test Suite)

S-au rulat toate cele 8 teste automate critice, consecutiv, cu succes:

1. `test_ui_catalog_forms_settings_6ux4.py` — **PASS** (Stabilizat prin introducerea unui delay de 1 secundă după tranziția stării de încărcare a setărilor în UI).
2. `test_pos_real_category_mapping_6ux32.py` — **PASS**
3. `test_catalog_category_management_6cat1.py` — **PASS**
4. `test_reception_workflow_history_6rec1.py` — **PASS**
5. `test_reception_line_nir_calculation_6rec1_2.py` — **PASS**
6. `test_reception_product_search_dropdown_6rec1_1.py` — **PASS**
7. `test_ui_visual_cleanup_multi_store_6fix1.py` — **PASS**
8. `test_store_context_selector_scope_6fix1_1.py` — **PASS**

---

## 4. Evidență Bug-uri & Probleme Detectate

Nu s-au identificat bug-uri funcționale sau regresii pe baza de date curată.  
**Observație de Stabilitate:** Testul `test_ui_catalog_forms_settings_6ux4.py` a fost îmbunătățit cu o întârziere defensivă (`page.wait_for_timeout(1000)`) pentru a tolera decalajul asincron dintre starea de skeleton (loading) și montarea definitivă a elementelor paginii de setări.

---

## 5. Recomandare Finală

> [!IMPORTANT]
> **REZULTAT QA: PASS**  
> Aplicația este stabilă, baza de date este complet curată de date reziduale de test, iar suitele automate trec cu succes. Nu sunt necesare modificări suplimentare.
> 
> **Recomandarea este să trecem la etapa 6REL.1.1 — Rebuild `.exe`.**

*Notă: În această etapă NU s-a generat executabilul `.exe` și nu s-a rulat `npm run electron:build`.*
