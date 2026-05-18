# Stadiul Proiectului — Gestiune Magazin v2 (Sursa de Adevăr)

Acest document reprezintă **Sursa Unică de Adevăr (Single Source of Truth)** privind stadiul curent de dezvoltare, arhitectura de securitate și nivelul de pregătire al platformei **Gestiune Magazin v2**.

> [!IMPORTANT]
> Toate rapoartele, analizele și documentele generate în etapele anterioare (Etapele 1 - 4) au caracter **istoric**. Orice afirmație din vechile rapoarte care contrazice stadiul descris în acest document (ex. mențiuni că RLS nu ar fi activat, că login-ul legacy ar fi permis sau că Owner Console ar sincroniza starea globală a profilelor) trebuie considerată depășită și invalidă.

---

## 1. Status Actual: MVP-Ready (Etapa 5A)

Platforma a finalizat cu succes toate etapele de dezvoltare, refactorizare și securizare aferente fazei MVP (Minimum Viable Product). Aplicația este stabilă, auditată și pregătită pentru demonstrații interne (Internal Demo) și testare operațională în regim controlat.

### Starea Componentelor Cheie:
- **Baza de date & Supabase**: Schema v2 este complet funcțională și populată cu date de test (produse, prețuri, stocuri).
- **Securitate (RLS)**: Row Level Security este **activat și întărit (hardened)** pe toate tabelele din public, conform auditului 4H.2. Accesul public necontrolat este complet blocat.
- **Autentificare & RBAC**: Sistemul folosește exclusiv Supabase Auth v2, cu rute protejate și permisiuni ierarhice stricte (`platform_owner`, `admin`, `manager`, `gestionar`, `casier`).
- **Owner Console**: Modulul este complet funcțional și securizat (Hardening 4J.1). Acesta gestionează permisiunile la nivel de magazin (`store_members`) și **NU** atinge/sincronizează starea globală sau rolul din tabela `profiles`.
- **Experiență Platform Owner (5C.1)**: Utilizatorul `platform_owner` folosește Owner Console ca landing page (`/owner`) și dispune de un empty state dedicat în Dashboard atunci când nu are un magazin selectat.
- **Consistență Tranzacțională (5D.0)**: S-a realizat auditul tehnic și s-a creat blueprint-ul SQL pentru proceduri stocate atomice (RPC) aferente fluxurilor de stoc și vânzare (`finalize_sale`, `receive_stock`, `transfer_stock`, `record_waste`). În prezent, aplicația funcționează corect pe varianta multi-step din frontend, RPC-urile fiind o propunere arhitecturală (blueprint) pregătită pentru aplicare ulterioară.
- **Build & Stabilitate**: Proiectul se compilează perfect (`npm run build` returnează `Exit code: 0`), fără erori sau avertizări TypeScript/Vite.

---

## 2. Documentația Oficială Curentă (Etapa 5A - 5D.0)

Pentru planificarea demonstrațiilor, verificarea stării tehnice sau auditarea istoricului de dezvoltare, consultați exclusiv următoarele documente actualizate:

1. [Ghid Operațional Demo Intern (Etapa 5A)](./internal_demo_operational_guide_5a.md)
   - Conține instrucțiunile de utilizare, descrierea rolurilor, fluxul recomandat în 12 pași și datele de test recomandate.
2. [Checklist Tehnic Final (Etapa 5A)](./internal_demo_technical_checklist_5a.md)
   - Grila de verificare tehnică a mediului, a bazei de date, a rutei de autentificare și a modulelor operaționale.
3. [Changelog MVP & Istoric Etape (Etapa 5A)](./mvp_internal_changelog_5a.md)
   - Sinteza cronologică a tuturor celor 20 de sub-etape parcurse de la inițializarea proiectului până în prezent.
4. [Audit RPC Atomic Hardening (Etapa 5D.0)](./rpc_atomic_hardening_audit_5d0.md)
   - Analiza riscurilor de non-atomicitate în serviciile frontend și specificațiile celor 4 proceduri stocate propuse.

---

## 3. Documente Istorice (A NU se interpreta ca stare curentă)

Următoarele categorii de afirmații prezente în rapoartele vechi (din folderul `docs/`) reflectau stadii intermediare de dezvoltare și **NU** mai sunt valabile:

- ❌ *„RLS nu este aplicat sau este configurat în mod permisiv”* 👉 **FALS**: RLS a fost activat și întărit conform etapei 4H.2.
- ❌ *„Sistemul permite fallback la login legacy prin VITE_ALLOW_LEGACY_LOGIN”* 👉 **FALS**: Mecanismele legacy au fost complet eliminate în etapa 4E.
- ❌ *„Owner Console sincronizează câmpurile active și role din tabela profiles”* 👉 **FALS**: Logica a fost decuplată și securizată în etapa 4J.1; se modifică exclusiv `store_members`.
- ❌ *„Etapa următoare este curățarea codului sau implementarea de bază POS”* 👉 **FALS**: Toate aceste module sunt deja implementate și funcționale.
- ℹ️ *„Fiscal Bridge și Offline Sync”* 👉 **CLARIFICARE**: Ambele funcționalități (integrarea cu case de marcat fizice și suportul offline avansat Dexie v2) aparțin etapei post-MVP (v3/Comercial) și nu sunt necesare pentru validarea demo-ului intern curent.

---

## 4. Următorii Pași Recomandați (Post-5D.0)

După finalizarea etapei de audit și blueprint 5D.0, echipa poate continua implementarea tranzacțională astfel:

- **Etapa 5D.1**: Aplicarea manuală a scriptului SQL `proposed_atomic_rpcs_5d.sql` în Supabase SQL Editor (Realizat - funcții noi adăugate).
- **Etapa 5D.1.1 & 5D.1.2**: Curățarea granturilor (REVOKE EXECUTE anon) pe vechile overload-uri RPC și verificarea securizării acestora (Realizat - funcțiile vechi nu mai permit acces public).
- **Etapa 5D.1.3 (Auth Trigger Legacy Cleanup)**: S-a descoperit trigger-ul legacy `handle_new_user` pe `auth.users` care încearcă să insereze în tabela inexistentă (legacy) `public.utilizatori`. S-a creat blueprint-ul SQL `database/proposed_auth_trigger_v2_cleanup_5d13.sql` și raportul de audit. Acest trigger necesită cleanup (aplicare manuală a blueprint-ului) înainte de a putea crea utilizatori noi din Supabase Auth. (Owner Console actual gestionează membrii existenți, dar nu creează utilizatori Auth).
- **Etapa 5D.2**: Migrarea serviciului frontend de Transfer Marfă (`transferService.ts`) pentru a apela noul RPC atomic `transfer_stock` (Realizat - frontend-ul nu mai execută pași multi-step vulnerabili).
- **Etapa 5D.2.1**: test E2E/Playwright pentru Transfer RPC — PASS. Transferul prin RPC este validat operațional.
- **Etapa 5D.3**: Migrare Pierderi/Casări la RPC atomic `record_waste` (Realizat - frontend-ul nu mai execută pași multi-step pentru pierderi/casări).
- **Etapa 5D.3.1**: test E2E/Playwright pentru Pierderi RPC — PASS. Pierderile prin RPC sunt validate operațional, incluzând rezolvarea trunchierii datelor PostgREST prin paginare automată.
- **Etapa 5D.4**: Migrare Recepție Marfă la RPC atomic `receive_stock` (Realizat - frontend-ul nu mai face multi-step pentru recepție).
- **Etapa 5D.4.1**: test E2E/Playwright pentru Recepție RPC — PASS. Recepția prin RPC este validată operațional.
- **Etapa 5D.5**: Migrare Vânzări / POS la RPC atomic `finalize_sale` (Realizat - frontend-ul nu mai execută logică multi-step pentru vânzare. Transfer, Pierderi și Recepție sunt deja migrate și validate operațional).
- **Etapa 5D.5.1**: test E2E/Playwright pentru POS RPC — PASS. Toate modurile de vânzare (cash, card, mixt) și verificările de stoc sunt validate operațional.
- **Etapa 5D.6**: Smoke testing tranzacțional pentru validarea fluxurilor atomice în regim end-to-end — **PASS**. Toate cele 4 fluxuri operaționale critice (`receive_stock`, `transfer_stock`, `finalize_sale`, `record_waste`) funcționează complet integrat, securizat (Security Definer cu RLS activ) și fără nicio regresie.
- **Etapa 5E.0 (Owner Console v2 Audit & Plan)**: S-a realizat auditul consolei de proprietar existente și s-a creat planul tehnic complet de implementare pentru `admin@owner.com` (`docs/owner_console_v2_audit_plan_5e0.md`). S-a documentat clar că fluxul de creare a noilor utilizatori depinde strict de aplicarea manuală a blueprint-ului de curățare a trigger-ului Auth (`database/proposed_auth_trigger_v2_cleanup_5d13.sql`).
- **Etapa 5E.1 (Auth Trigger Cleanup Verification & Safe User Creation Flow)**: S-a verificat și clarificat fluxul sigur de creare a noilor utilizatori (`docs/auth_trigger_cleanup_5e1_report.md`, `docs/auth_trigger_cleanup_5e1_apply_guide.md`). Utilizatorii noi primesc un profil global minimal cu rolul implicit `'casier'`, iar rolurile reale de administrare sau gestiune per magazin se setează ulterior din Owner Console v2. Blueprint-ul SQL a fost actualizat la forma finală securizată.
- **Etapa 5E.2 (Owner Console v2 — Global Dashboard & Profiles View)**: Realizat. `platform_owner/admin@owner.com` poate vedea dashboard global, toate profilele din `public.profiles`, utilizatorii nealocați, magazinele fără admin activ și tab-urile principale ale Owner Console v2. Nu se creează încă utilizatori, nu se alocă încă membri la magazin și nu se modifică `profiles.role`.
- **Etapa 5E.3 (Owner Console v2 — Add Existing User to Store)**: Realizat. Platform Owner poate asocia conturi existente din `public.profiles` la magazine specifice prin `store_members` folosind modalul de alocare și un mecanism hibrid de upsert + fallback sigur, fără a altera starea sau rolul global din `profiles`.
- **Etapa 5E.3.1 (Owner Assignment E2E Test)**: Testare E2E / Playwright pentru fluxul de alocare a utilizatorilor în Owner Console v2 (`test_owner_assignment_5e31.py`) — **PASS**. S-a validat funcționalitatea completă de alocare și menținerea integrității tabelei `profiles`.
- **Etapa 5E.4 (Owner Console v2 — Store Management & Edit Flow)**: Realizat. S-a implementat fluxul complet de creare și editare a magazinelor / punctelor de lucru pentru `platform_owner` (`admin@owner.com`). Funcționalitatea include diferențierea logică a magazinelor pe același CUI prin numărul punctului de lucru stocat în `settings`, validări defensive pentru prevenirea duplicatelor și interfața UI `StoreFormModal.tsx`.
- **Etapa 5E.4.1 (Store Management E2E Test)**: Testare E2E / Playwright pentru Store Management (`test_store_management_5e41.py`) — **PASS**. Crearea, editarea magazinelor, diferențierea pe CUI + punct de lucru și blocarea duplicatelor sunt complet validate operațional.
- **Etapa 5E.4.2 (Store Context Switcher)**: Realizat. Utilizatorii asociați la mai multe magazine/puncte de lucru pot selecta explicit magazinul activ din interfața de navigare superioară. Cheia `selected_store_id` este stocată în `localStorage` ca preferință UI, în timp ce filtrarea datelor și autorizarea rămân asigurate de politicile RLS și calitatea de membru din `store_members`.
- **Etapa 5E.4.3 (Store Context Switcher E2E Test)**: Realizat (`test_store_context_switcher_5e43.py`) — **PASS**. Comutarea de context între magazine, persistența în `localStorage`, filtrarea corectă în modulele operaționale și izolarea sesiunilor Gotrue au fost validate E2E cu succes.
- **Etapa 5E.5 (Următorul Pas)**: Implementare Owner Audit Logs — sistem de monitorizare și trasabilitate pentru acțiunile critice efectuate de platform_owner.
