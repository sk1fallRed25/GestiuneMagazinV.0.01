# Store Context Switcher — Etapa 5E.4.2

## 1. Rezumat
În cadrul Etapei **5E.4.2**, a fost implementat mecanismul complet de selecție și comutare a contextului de magazin (**Store Context Switcher**) destinat utilizatorilor asociați cu multiple puncte de lucru sau magazine.
Această funcționalitate era esențială pentru a rezolva un gap identificat în versiunile anterioare: la autentificare, aplicația selecta automat primul magazin disponibil, fără a oferi utilizatorilor o metodă explicită de a naviga sau de a comuta între diferitele puncte de lucru la care au acces.

## 2. Model Multi-Store
Arhitectura de date și securitate a platformei susține un model robust multi-store:
- **Asocieri Multiple**: Un utilizator (ex. `magazin@magazin.com`) poate avea multiple înregistrări active în tabela `public.store_members` (`active = true`).
- **Izolare pe Magazin**: Fiecare punct de lucru are un `store_id` unic (UUID) izolat prin politicile RLS (Row Level Security) din baza de date.
- **Identificare Logică**: Punctele de lucru ale aceleiași entități juridice sunt diferențiate prin combinația de CUI (`stores.fiscal_code`) și numărul punctului de lucru stocat în `stores.settings.workpointNumber` (ex. `12345678 / 901`, `12345678 / 902`).
- **Persistență UI**: Cheia `selected_store_id` stocată în `localStorage` reprezintă exclusiv o preferință de interfață (UI preference), neavând rol de autorizare sau permisiune.

## 3. Auth Context
Contextul de autentificare (`AuthContext.tsx`) și serviciul asociat (`authService.ts`) au fost extinse și consolidate:
- **`availableStores`**: Lista de asocieri (`StoreMembership[]`) este îmbogățită automat la încărcare cu metadate parsate defensiv din `stores.settings`: `storeName`, `fiscalCode`, `workpointNumber` și `displayCode`.
- **`currentStoreId` & `currentStoreRole`**: Reflectă ID-ul magazinului activ și rolul specific pe care utilizatorul îl deține în acel magazin (ex. `manager`, `gestionar`, `casier`).
- **`selectStore(storeId)`**: Funcție asincronă expusă în context care validează ID-ul solicitat împotriva listei `availableStores`. Dacă este valid, actualizează starea aplicației și persistă selecția.
- **Persistență**: La inițializarea aplicației sau reîncărcarea paginii (`loadProfileAndStores`), sistemul verifică prezența `selected_store_id` în `localStorage` și restaurează automat ultimul magazin selectat dacă acesta este în continuare valid.

## 4. UI Switcher
Componenta dedicată `StoreContextSwitcher.tsx` a fost creată și integrată direct în bara de navigare superioară (`MainLayout.tsx`):
- **Amplasare**: În header-ul principal, adiacent profilului utilizatorului și notificărilor.
- **Afișare**: Un buton elegant de tip dropdown care prezintă numele magazinului curent, codul de afișare (ex. `12345678 / 902`) și un badge distinctiv cu rolul deținut în magazin.
- **Comportament Adaptiv**:
  - **0 Magazine (Platform Owner)**: Afișează un badge de stare dedicat *"Platform Administration"*.
  - **1 Magazin**: Afișează caseta informativă a magazinului activ în format read-only (fără meniu dropdown), eliminând interacțiunile redundante.
  - **> 1 Magazin**: Activează meniul dropdown interactiv, permițând comutarea între punctele de lucru disponibile.
- **Confirmare UX**: La selectarea unui nou magazin, utilizatorul este întâmpinat de un dialog de confirmare: *"Schimbi magazinul activ? Datele afișate vor fi filtrate pentru noul punct de lucru."*, asigurând o tranziție conștientă a contextului operațional.

## 5. Securitate
Implementarea respectă cu strictețe principiile de securitate stabilite în etapele de audit anterioare:
- **Fără `service_role`**: Toate interogările către `stores` și `store_members` se realizează prin clientul standard Supabase utilizând token-ul JWT al utilizatorului autentificat.
- **Fără Roluri în LocalStorage**: Nu se stochează și nu se citește niciun rol din `localStorage`. Rolul curent (`currentStoreRole`) este derivat strict din înregistrarea `store_members` returnată de baza de date.
- **Validare Strictă**: Funcția `selectStore` respinge automat orice încercare de a seta un `storeId` care nu se regăsește în lista `availableStores` a utilizatorului.
- **Sursa de Adevăr**: Politicile RLS din baza de date rămân singura sursă de adevăr pentru filtrarea datelor operaționale (produse, vânzări, recepții, pierderi).

## 6. Limitări & Pași Viitori
- **Autentificare Multi-Store**: Testarea manuală completă a unui cont de tip `magazin@magazin.com` alocat la multiple magazine necesită credențiale valide (parolă cunoscută) sau un mediu de testare E2E dedicat.
- **Testare E2E**: Validarea automată prin Playwright a fluxului de comutare a contextului va fi realizată în cadrul Etapei **5E.4.3**.
- **Audit Logs**: Monitorizarea acțiunilor proprietarului de platformă și a schimbărilor de context va fi implementată în Etapa **5E.5**.

## 7. Build
Proiectul a fost compilat cu succes în urma integrării noilor componente:
```bash
> tsc && vite build
vite v7.3.0 building client environment for production...
✓ 2500 modules transformed.
dist/index.html                       1.37 kB │ gzip:   0.65 kB
dist/assets/index-B9Ld5J9K.css       60.71 kB │ gzip:   9.80 kB
dist/assets/index-B76_uJew.js       983.39 kB │ gzip: 271.32 kB
✓ built in 2.47s
Exit code: 0
```

## 8. Test Recomandat
Pentru validarea manuală sau pregătirea testului automatizat, se recomandă următoarea secvență:
1. Autentificare cu un utilizator asociat la cel puțin două magazine active (ex. `12345678 / 901` și `12345678 / 902`).
2. Verificarea prezenței componentei `StoreContextSwitcher` în header și inspectarea datelor afișate (nume, CUI/punct, rol).
3. Deschiderea meniului dropdown și selectarea punctului de lucru secundar (`902`).
4. Confirmarea intenției în fereastra de dialog.
5. Verificarea actualizării automate a modulelor din pagină (Dashboard, Produse) pentru a reflecta stocul noului magazin.
6. Efectuarea unui refresh de browser (`F5`) și confirmarea persistenței selecției prin restaurarea magazinului `902` din `localStorage`.
7. Tentativa de apelare manuală din consolă a funcției `selectStore` cu un UUID nepermis pentru a verifica respingerea acțiunii.

## 9. Decizie
- **Status**: **Ready for 5E.4.3 Store Context Switcher E2E Test**
