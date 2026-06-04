# Raport Etapa 6APP.5.1: Desktop Close Button + POS Cart Recovery

Acest document descrie detaliile implementării, optimizările tehnice și rezultatele testelor E2E / regresie pentru funcționalitatea **Desktop Close Button + POS Cart Recovery**.

---

## 1. Modificări Efectuate

### A. Electron Layer & IPC Communication
- **`electron-main.js`**: Adăugat handler IPC `app:quit` securizat pentru a închide aplicația curat la solicitarea din renderer.
- **`electron-preload.js`**: Expus API-ul `window.electronAPI.appControls.quitApp()` în bridge-ul securizat.
- **`src/types/electron.d.ts`**: Actualizat interfețele TypeScript globale pentru a include noul API de control.

### B. Cart Recovery Service (`posCartRecoveryService.ts`)
- Creat serviciu modular de gestiune a coșurilor salvate în `localStorage`, folosind chei cu namespace unic bazat pe utilizator și magazin: `pos_cart_draft_v1:{storeId}:{profileId}`.
- Adăugat suport de validare structurală a elementelor coșului (`validateCartDraft` și `validateCartItems`) împotriva nomenclatorului de produse active al magazinului, asigurând auto-recalcularea prețurilor și validarea stocului disponibil.
- Menținută compatibilitatea cu cheia legacy `pos_cart` pentru a nu afecta logica existentă a barierei de auto-update.

### C. Dialoguri Warning & Recovery
- **`PosCartRecoveryDialog.tsx`**: Dialogul afișat casierului la intrarea în POS când există un coș draft detectat, oferind opțiunile de Restaurare (Restore), Ștergere (Discard) sau Amânare (Later).
- **`LogoutCartWarningDialog.tsx`**: Randează o avertizare dacă se dorește deconectarea în timp ce coșul de cumpărături conține produse (opțiuni: Keep & Logout, Discard & Logout, Anulează).
- **`AppCloseCartWarningDialog.tsx`**: Randează avertizarea specifică pentru închiderea aplicației de pe butonul dedicat (opțiuni: Keep & Close, Discard & Close, Anulează).

### D. Integrare în usePos.ts & UI Layout
- **`usePos.ts`**:
  - Înlocuit autosave-ul simplist sincro din localStorage cu un debounced autosave de 300ms.
  - Implementat un flag `hasCartBeenModifiedRef` pentru a preveni ștergerea sau suprascrierea draft-urilor din `localStorage` din cauza efectelor multiple declanșate de mecanismul de remount specific **React 18 Strict Mode** pe starea inițială goală a coșului.
  - Integrat `clearPosCartDraft` în funcția `clearCart` apelată la checkout-ul finalizat cu succes sau la golirea manuală.
- **`MainLayout.tsx`**:
  - Adăugat butonul premium "Închide aplicația" în footer-ul sidebar-ului.
  - Butonul este activat exclusiv în runtime-ul desktop/Electron (dezactivat vizual/disabled în browser).
  - Configurat barierele de logout și close care interceptează acțiunea dacă există produse active în coș, afișând dialogurile corespunzătoare.
- **`PosPage.tsx`**:
  - Integrat `PosCartRecoveryDialog` și logica de verificare la mount.
  - Adăugat `showRecoveryDialog` în lista de excepții pentru componenta de auto-focus a scannerului.

---

## 2. Optimizare de Performanță: Supabase URL Parameter Limit

În timpul testelor, s-a diagnosticat o eroare **400 Bad Request** pe cererea `posService.listAllProducts(storeId)` la încărcarea POS-ului.
- **Cauza**: Codul inițial efectua o cerere generală pe tabela `products`, urmată de interogări pe `product_prices` și `stock_batches` folosind filtrul `.in('product_id', productIds)`. Având peste 900 de produse active în baza de date, URL-ul HTTP generat pentru parametrii de filtrare depășea lungimea maximă admisă (33KB+ parametru URL), fiind respins de NGINX/PostgREST.
- **Soluția**: A fost rescrisă funcția `listAllProducts` în `posService.ts` pentru a efectua interogarea printr-un singur apel JOIN securizat cu tabelele dependente:
  ```typescript
  const { data: products, error: pError } = await supabase
      .from('products')
      .select(`
          id, name, barcode, unit, sgr_enabled, sgr_type, category_id,
          product_prices (price_sale, vat_percent, store_id),
          stock_batches (quantity, zone, store_id)
      `)
      .eq('store_id', storeId)
      .eq('status', 'active');
  ```
  Această optimizare elimină complet cererile multiple și riscul de overflow URL, reducând timpul de răspuns al paginii POS și eliminând eroarea 400 Bad Request.

---

## 3. Rezultatele Verificării

### Teste E2E (`test_pos_cart_recovery_close_app_6app51.py`)
Rularea testelor Playwright E2E a returnat **12 succese din 12 teste**:
- **Test A**: Verificare autosave draft coș cu cheie specifică în localStorage (trece).
- **Test B**: Dialog recuperare coș pe ecranul POS (flow de restaurare - trece).
- **Test C**: Dialog recuperare coș (flow de ștergere draft - trece).
- **Test D**: Lipsa dialogului de recuperare dacă nu există draft (trece).
- **Test E**: Barieră deconectare cu produse în coș (trece).
- **Test F**: Deconectare directă fără avertizări dacă coșul e gol (trece).
- **Test G**: Vizibilitate și dezactivare buton închidere în modul browser (trece).
- **Test H**: Compatibilitate retroactivă a cheii legacy `pos_cart` (trece).
- **Test I**: Persistența draft-ului la selectarea opțiunii "Mai târziu" (trece).
- **Test J**: Ignorare și curățare automată coșuri corupte în localStorage (trece).
- **Test K**: Logout cu păstrarea produselor în draft (trece).
- **Test L**: Logout cu ștergerea produselor din coș (trece).

### Teste Regresie
- **Auto-Update (`test_desktop_auto_update_6app2.py`)**: Toate scenariile de verificare a comportamentului updater-ului în Electron și a barierei POS cu cart-ul plin au trecut (trece).
- **Auto-Update Smoke (`test_desktop_auto_update_release_smoke_6app21.py`)**: Validările de structură pachet și smoke tests (trece).
- **SQL Apply Verification (`test_offline_data_cache_sql_apply_6app5.py`)**: RLS, funcții catalog, privilegii și RPC-uri create în Supabase (trece).
