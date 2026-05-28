# FiscalNet IPC Security & Path Hardening — Etapa 6G.FN.2.1

## 1. Rezumat
Această etapă a realizat securizarea și consolidarea structurală (**hardening**) a canalului de comunicare IPC (Inter-Process Communication) între contextul de randare (Frontend) și procesul principal Electron, destinat integrării modulului **FiscalNet**.

Toate măsurile de securitate au fost validate prin teste statice, teste unitare/integrare low-level în Node.js și suite E2E complexe rulând prin Playwright, acoperind atât scenariul sandbox (Browser standard), cât și cel nativ (Electron securizat).

---

## 2. Abordare & Măsuri de Securitate Implementate

### 2.1. Validare Strictă de Cale și Prevenire Path Traversal
În `electron-main.js` au fost introduse funcții utilitare pure de securitate pentru a neutraliza riscul accesului neautorizat la fișiere sistem:
- **`isSafeTxtFilename(filename)`**: Validează că denumirea fișierului de export/import corespunde exact formatului UUIDv4 plus extensia `.txt` (`^[a-f0-9-]{36}\.txt$`). Orice tentativă de denumire malițioasă sau caractere speciale este respinsă direct.
- **`assertDirectoryExists(dir)`**: Asigură că directoarele configurate (`bonuriPath` și `raspunsPath`) există fizic pe disc și sunt directoare valide.
- **`resolveInside(parentDir, childFilename)`**: Rezolvă calea absolută a fișierului țintă și garantează că acesta se află strict în interiorul folderului părinte configurat. Previne atacurile de tip *Path Traversal* (folosirea de secvențe `..`, link-uri simbolice sau foldere adiacente cu prefix similar, de exemplu `C:\BonuriHelper` în loc de `C:\Bonuri`).

### 2.2. Scrieri Atomice și Prevenire Conflicte
Pentru a preveni scanarea parțială a fișierelor de către serviciul FiscalNet (care ar putea duce la bonuri incomplete sau erori de procesare):
- **Scriere temporară**: Fișierele sunt inițial scrise cu o extensie temporară `.tmp` (ex: `uuid.tmp`) în interiorul directorului securizat.
- **Detecție Duplicate**: Sistemul respinge scrierea dacă calea de bonuri este identică cu cea de răspuns (`bonuriPath === raspunsPath`).
- **Prevenire Suprascriere TMP**: Înainte de a scrie fișierul `.tmp`, sistemul verifică dacă există deja un fișier `.tmp` activ cu aceeași denumire pentru a evita conflictele de concurență.
- **Redenumire Atomică**: Odată scrierea încheiată cu succes, se execută o redenumire sincronă către `.txt`.
- **Cleanup la Eșec**: În cazul în care scrierea sau redenumirea eșuează, fișierul `.tmp` este șters automat în blocul `catch` pentru a menține curățenia pe disc.

### 2.3. Limitarea Dimensiunii Fișierelor de Răspuns (DoS Protection)
Pentru a împiedica epuizarea memoriei RAM sau blocarea procesului principal prin citirea unor fișiere de răspuns uriașe (atacuri de tip Denial of Service):
- Înainte de citirea fișierului de răspuns, se interoghează metadatele prin `fs.statSync`.
- Este impusă o limită strictă de dimensiune de **10 KB** (`10240 bytes`). Fișierele care depășesc această limită sunt respinse la citire, aruncând o eroare securizată.

---

## 3. Integrare UI și Experiență Utilizator

- **Sandbox Gating**: Dacă `window.electronAPI` nu este disponibil (Browser Sandbox), apelul de scriere directă este blocat la nivelul modalului `SaleDetailsModal.tsx` și se afișează un toast explicit de avertisment: `"Scrierea directă este disponibilă doar în aplicația desktop."`.
- **Toaster Dedicat**: Pentru a asigura afișarea consecventă a toast-urilor în interiorul modalului fără a depinde de instanța globală de Toaster din app, s-a montat un component `<Toaster position="top-right" />` direct în structura DOM-ului `SaleDetailsModal`.
- **UX Confirmare**: Butonul de anulare din dialogul de confirmare a fost dotat cu `data-testid="fiscalnet-real-write-confirm-cancel-button"` pentru a facilita închiderea dialogului în scenarii de test și operare manuală.

---

## 4. Validare & Suite de Testare

Suita de testare `test_fiscalnet_ipc_security_6gfn21.py` acoperă 4 paliere majore:

1. **Static Security Checks**:
   - Verifică prezența helper-ilor de securitate în `electron-main.js`.
   - Validează configurarea toast-ului de sandbox în `SaleDetailsModal.tsx`.
2. **Low-Level Node IPC Security Tests**:
   - Execută într-un mediu virtual izolat (`vm` mock în Node.js) toți helper-ii și handler-ele IPC.
   - Validează: `isSafeTxtFilename`, `assertDirectoryExists`, `resolveInside`, `serializeError`, comportamentul atomic, prevenirea duplicatelor și limitările de dimensiune la citire.
3. **Playwright Sandbox Toast E2E Tests**:
   - Autentifică utilizatorul și navighează în Istoric Vânzări.
   - Deschide modalul de detalii, configurează și validează căile.
   - Șterge dinamic `window.electronAPI` pentru a forța starea de Sandbox.
   - Confirmă scrierea și validează că dialogul se închide corect, iar toast-ul de sandbox block este detectat în starea `attached` în DOM.
4. **Playwright Hardened Electron IPC E2E Tests**:
   - Injectează dynamic mock-ul `electronAPI` securizat.
   - Simulează un atac de tip *Path Traversal* și validează că Electron răspunde cu toast-ul de eroare de securitate corespunzător.
   - Simulează returnarea unui fișier de răspuns prea mare și validează că Electron blochează citirea și afișează toast-ul de limită de dimensiune depășită.

---

## 5. Rezultate Rulare Teste

Toate testele din suită au trecut cu succes (Exit Code 0):

```text
=== RUNNING STATIC SECURITY CHECKS ===
[PASS] All security helpers are defined in electron-main.js.
[PASS] SaleDetailsModal.tsx sandbox warning toast configured correctly.

=== RUNNING LOW-LEVEL NODE IPC SECURITY TESTS ===
Executing: node test_fiscalnet_ipc_node.js
=== STARTING NODE IPC SECURITY TESTS ===
[PASS] Security helper functions successfully extracted.
Testing isSafeTxtFilename...
[PASS] isSafeTxtFilename passed all validation cases.
Testing assertDirectoryExists...
[PASS] assertDirectoryExists validated directories correctly.
Testing resolveInside...
[PASS] resolveInside blocked path traversal and prefix exploits.
Testing serializeError...
[PASS] serializeError formatted errors correctly.
Testing write-fiscal-net-file IPC Handler...
[PASS] Standard safe write test passed.
[PASS] Duplicate prevention (bonuriPath) test passed.
[PASS] Duplicate prevention (raspunsPath) test passed.
[PASS] Path traversal in write blocked successfully.
[PASS] Existing .tmp block test passed.
[PASS] Atomic write failure cleanup test passed.
Testing read-fiscal-net-response IPC Handler...
[PASS] Standard safe read test passed.
[PASS] Response file size limit test passed.
[PASS] Path traversal in read blocked successfully.
=== ALL NODE IPC SECURITY TESTS PASSED ===

[PASS] Node IPC security tests passed successfully.

=== RUNNING PLAYWRIGHT SANDBOX TOAST E2E TESTS ===
Logged in.
Seeded sale: c39e81a3-2cf2-430e-b8d9-c97775a66ccd
[PASS] Sandbox write block toast successfully displayed.

=== RUNNING PLAYWRIGHT HARDENED ELECTRON IPC E2E TESTS ===
[PASS] Security error toast from Electron correctly displayed.
[PASS] Read size limit error toast correctly displayed.

[SUCCESS] E2E Playwright test 6G.FN.2.1 passed successfully!
```

---

## 6. Concluzie
Hardening-ul modulului de securitate FiscalNet este complet și funcțional. Sistemul garantează izolarea operațiunilor cu fișiere la directoarele autorizate, scrierea atomică sigură și rezistența la atacuri DoS sau Path Traversal, menținând în același timp o experiență fluidă pentru operator în ambele medii de rulare (Desktop vs. Web).
