# Audit & Hotfix Report: AI Consultant Module Load Failure (Etapa 6AI.0)

## 1. Problema Raportată

Pagina **AI Consultant** afișa eroarea generică `Nu s-au putut încărca datele` cu butonul `Încearcă din nou`.
Deși modulul `ai_consultant` era activ globally și vizibil în meniu/sidebar, adminul magazinului nu putea accesa dashboard-ul de recomandări.

---

## 2. Cauzele Identificate

În urma auditului, s-au detectat următoarele probleme:

### A. Depășirea Limitei de Lungime a URL-ului (Primary Cause) ⚠️
Pentru magazinele cu un număr mare de produse (de exemplu, Magazin Principal are 705 produse active):
- `aiConsultantDataService.getAiConsultantData()` lansa interogări Supabase/Postgrest folosind filtrul `.in('product_id', productIds)`.
- Clientul Supabase convertea lista de ID-uri într-un parametru de interogare de tip GET (`product_id=in.(uuid1,uuid2,...)`), producând un URL de peste 26KB.
- Serverul/API Gateway-ul Supabase (Kong/Nginx) a respins acest GET request, returnând codul de eroare HTTP **400 Bad Request**.

### B. Rigiditatea la Date Corupte/Lipsă ⚠️
- Funcția `toNumberStrict` arunca erori fatale la agregarea stocurilor sau vânzărilor dacă întâlnea valori `null` sau `NaN` în coloanele opționale sau corupte ale tabelului `stock_batches` sau `product_prices`.

### C. UI Error Clarity nesatisfăcător ⚠️
- UI-ul original afișa același mesaj generic (`Nu s-au putut încărca datele.`) indiferent dacă eroarea era cauzată de lipsa magazinului selectat, o eroare RLS de permisiuni, date incomplete sau o eroare tehnică (400 Bad Request).

---

## 3. Rezolvări și Hotfix-uri Implementate

### A. Implementarea Chunk-uirii Interogărilor în Service 🚀
În [aiConsultantDataService.ts](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/ai-consultant/services/aiConsultantDataService.ts):
- Am introdus chunk-uirea cu dimensiune fixă (`chunkSize = 100`) pentru toate interogările masive ce folosesc filtre `.in(...)`.
- Sunt chunk-uite acum:
  1. Interogarea de prețuri (`product_prices`).
  2. Interogarea de loturi de stoc (`stock_batches`).
  3. Interogarea de detalii vânzări (`sale_items`).
  4. Interogarea de detalii pierderi (`waste_items`).
- Această implementare urmează pattern-ul robust de chunk-uire folosit și în alte module critice precum `productService.ts`.

### B. Toleranță la Date Invalide (Fallback la 0) 🚀
- Am actualizat comportamentul funcției `toNumberStrict` în `aiConsultantDataService.ts` pentru a loga un avertisment și a returna `0` în cazul datelor invalide (`null`/`NaN`/non-finite), evitând crash-ul întregii pagini din cauza unor înregistrări incomplete.

### C. Diferențierea Mesajelor de Eroare și Empty State în UI 🚀
În [AiConsultantPage.tsx](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/ai-consultant/AiConsultantPage.tsx) și [useAiConsultant.ts](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/ai-consultant/hooks/useAiConsultant.ts):
- Am adăugat clasificarea erorilor în:
  - **Store lipsă**: `Nu există magazin selectat.` (`ai-consultant-store-missing`)
  - **Permisiuni/RLS**: `Nu ai permisiuni pentru datele necesare AI Consultant.` (`ai-consultant-permission-error`)
  - **Eroare Tehnică**: `AI Consultant nu a putut încărca datele. Detalii: <safe error>` (`ai-consultant-error`)
- Am implementat un ecran dedicat pentru **Empty State** (`ai-consultant-empty-state`) atunci când magazinul este valid dar nu are produse active, explicând că AI Consultant este activ dar are nevoie de date inițiale (produse, recepții, vânzări).
- Am atribuit elementelor cheie atributele `data-testid` cerute.

---

## 4. Teste de Validare și Verificare

S-au rulat următoarele suite de teste Playwright:
1. **`test_ai_consultant_load_6ai0.py`** (nou creat & actualizat):
   - Verifică scenariul cu modulul activ.
   - Verifică comportamentul în caz de erori diferențiate.
   - Verifică existența butonului de Retry și a sidebar-ului.
   - Trece cu succes (100% PASS).
2. **`test_module_entitlements_frontend_6f15.py`**:
   - Verifică router guards, sidebar visibility și accesul restricționat al modulului.
   - Trece cu succes (100% PASS).
3. **`test_owner_module_management_6f16.py`**:
   - Verifică modulul în Owner Console (activare/dezactivare, audit logs).
   - Trece cu succes (100% PASS).

---

## 5. Limitări

- AI Consultant depinde de datele de pe ultimele 30 de zile. Recomandările (ex: dead stock, low stock) pot dura câteva minute pentru a fi recalculate de fiecare dată când se înregistrează date noi pe scară largă, procesarea fiind locală pe client.
