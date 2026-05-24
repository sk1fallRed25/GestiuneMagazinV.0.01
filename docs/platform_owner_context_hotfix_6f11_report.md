# Raport Corectură Context Platform Owner — Etapa 6F.1.1

## Problemă Identificată
Platform Owner (proprietarul platformei SaaS) era tratat implicit ca un utilizator de magazin. La autentificare, contextul magazinului (`selected_store_id`) era restaurat automat din `localStorage`, forțând owner-ul în panoul operațional al magazinului ("Magazin Principal") în loc să deschidă direct consola globală de administrare a platformei. De asemenea, în sidebar-ul owner-ului apăreau implicit modulele operaționale ale magazinului (POS, Recepție, Transfer etc.) chiar dacă niciun magazin nu fusese selectat explicit.

## Soluție Implementată
1. **Separare Context în AuthContext**:
   - La inițializare și schimbarea stării de autentificare, dacă utilizatorul are rolul de `platform_owner`, nu mai restaurăm automat un magazin implicit din `localStorage` și ștergem cheia `selected_store_id`.
   - Acest lucru forțează proprietarul platformei să pornească cu contextul de magazin gol (`null`), aflat în starea de **Platform Administration**.
2. **Îmbunătățire StoreContextSwitcher**:
   - Adăugarea unei opțiuni explicite de **Platform Administration** (fără magazin selectat) disponibilă doar pentru `platform_owner`.
   - Adăugarea unui flow de confirmare la selectarea/schimbarea unui magazin operațional sau la revenirea la administrarea globală.
3. **Restructurare MainLayout**:
   - Sidebar-ul adaptiv afișează acum o secțiune dedicată de "Platformă" (cu link către Consola Proprietar) și o secțiune de "Administrare".
   - Modulele de magazin (Stocuri, Setări Magazin, Rapoarte) sunt accesibile doar dacă proprietarul a selectat explicit un magazin din StoreContextSwitcher. În caz contrar, acestea apar dezactivate.
   - Utilizatorii cu alte roluri (admin, manager, gestionar, casier) au propriul flux operațional fără acces la secțiunea de Platformă.

## Verificare
- **Build**: PASS. Toate modulele și paginile se compilează corect.
- **E2E owner tests**: PASS. Testele automate ce rulează acțiunile de login și navigare ale proprietarului platformei trec cu succes.
- **Modificări Bază de Date**: Fără schimbări SQL / DB / RLS / RPC în această etapă. Totul a fost izolat la nivel de UI shell și context de sesiune frontend.
