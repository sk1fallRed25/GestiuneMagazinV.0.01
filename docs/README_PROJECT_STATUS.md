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
- **Etapa 5E.5 (Owner Audit Logs)**: Realizat. Owner Console v2 înregistrează acțiunile critice ale `platform_owner` în `public.audit_logs`: creare/editare magazin, alocare membru, schimbare rol membru și activare/dezactivare acces membru. Logarea este non-blocking, fără `service_role`, fără date sensibile și este vizibilă în tab-ul Audit Logs din Owner Console.
- **Etapa 5E.5.1 (Owner Audit Logs E2E Test)**: Realizat (`test_owner_audit_logs_5e51.py`) — **PASS**. Generarea corectă a logurilor, capturarea snapshot-urilor `oldData`/`newData`, filtrarea, căutarea, inspectorul modal și lipsa stocării de date sensibile au fost validate E2E cu succes.
- **Etapa 6A.0 (Operational Management Audit & Next Modules Plan)**: Realizat (`docs/operational_management_audit_6a0_report.md`). S-a auditat stadiul actual al aplicației de gestiune și s-au identificat gap-urile majore înainte de pilotul real (Shift Management, Retururi, Rapoarte Comerciale, Setări Magazin, Import/Export, Curățare date test). Nu se începe încă Fiscal Bridge și nu se începe încă Offline Sync.
- **Etapa 6A.1 (Shift Management Blueprint)**: Realizat (`docs/shift_management_blueprint_6a1.md`, `database/proposed_shift_management_6a1.sql`). S-a proiectat arhitectura completă pentru casele de marcat (`cash_registers`), turele de casieri (`pos_shifts`), procedurile stocate atomice de deschidere/închidere tură cu calculul diferențelor de casă și s-a definit mecanismul de blocare a POS-ului în lipsa turei active.
- **Etapa 6A.2 (Shift Management Implementation & Frontend Integration)**: Realizat (`docs/shift_management_6a2_report.md`). S-a rafinat blueprint-ul SQL idempotent (`database/proposed_shift_management_6a2.sql`), s-au creat modalele de deschidere/închidere tură, ecranul de blocare `PosLockScreen`, indicatorul `ShiftActiveBadge` și s-a integrat validarea obligatorie a turei în POS și `finalize_sale`.
- **Etapa 6A.2.1 (Shift Management SQL Apply Verification)**: Realizat (`docs/shift_management_sql_apply_verification_6a21_report.md`) — **PASS**. S-a verificat prin interogări read-only existența și corectitudinea tabelelor `cash_registers` și `pos_shifts`, activarea RLS, politicile de acces, indexurile de concurență, granturile RPC și prezența casei de marcat de seeding (`Casa 1`) pentru fiecare magazin activ.
- **Etapa 6A.3 (Shift Management E2E Test)**: Realizat (`test_shift_management_6a3.py`) — **PASS**. Toate scenariile de gestiune a turelor (blocare POS fără tură, deschidere tură, vânzare cu `shift_id`, blocare dublă deschidere, blocare anulare cu vânzări, și închidere tură cu calcul diferențe de casă) au fost validate E2E cu succes.
- **Etapa 6B.1 (Sales Returns & Voids Blueprint)**: Realizat (`docs/sales_returns_voids_blueprint_6b1.md`, `database/proposed_sales_returns_voids_6b1.sql`). S-a proiectat arhitectura completă și idempotentă pentru stornări și anulări de bonuri, tabelele de retur, procedurile stocate atomice `void_sale`, `return_sale_items` și `get_sale_return_eligibility`, cu trasabilitate completă în stoc și ture.
- **Etapa 6B.2.0 (Sales Void MVP SQL Pre-Apply Hardening)**: Realizat (`docs/sales_void_mvp_preapply_6b20_report.md`, `database/proposed_sales_void_mvp_6b2.sql`). S-a auditat schema existentă și s-a rafinat blueprint-ul SQL pentru anularea totală a bonurilor (`void_sale`). S-au corectat rolurile reale (`admin`, `manager`, `casier`), s-a aliniat semnătura `has_store_role` și s-au definit constrângerile și regulile stricte de reconciliere în tură deschisă.
- **Etapa 6B.2.1 (Sales Void MVP SQL Apply Verification)**: Realizat (`docs/sales_void_mvp_sql_apply_verification_6b21_report.md`) — **PASS**. S-a verificat prin interogări read-only existența tabelelor `sale_returns` și `sale_return_items`, a politicilor RLS, extinderea constrângerilor de status (`sales`) și tip (`stock_movements`), și corectitudinea granturilor RPC-urilor `void_sale` și `get_sale_void_eligibility`.
- **Etapa 6B.2.2 (Sales Void MVP Frontend & Service Integration)**: Realizat (`docs/sales_void_frontend_integration_6b22_report.md`). S-au integrat serviciile RPC client, s-a creat modalul `VoidSaleModal` cu validarea obligatorie a motivului (min. 3 caractere), s-a adăugat butonul de anulare în `SaleDetailsModal` pentru bonurile finalized și s-a adaptat `SaleStatusBadge` pentru stările noi de anulare/retur. Compilarea a fost validată prin build complet Vite.
- **Etapa 6B.2.3 (Sales Void MVP E2E Test)**: Realizat (`test_sales_void_6b23.py`) — **PASS**. S-a validat E2E prin Playwright fluxul complet de anulare a bonurilor: realizare vânzare în tură activă, verificări de eligibilitate, deschidere modal void cu motiv obligatoriu, anulare și actualizare status în UI, restaurare corectă a stocurilor în DB (pe bază de loturi/locații) și auditare automată, blocarea dublei anulări și interzicerea anulării pentru vânzări din ture închise.
- **Etapa 6B.2.4 (Void Shift Reconciliation Audit)**: Realizat (`docs/void_shift_reconciliation_6b24_report.md`) — **PASS**. S-a auditat codul funcțiilor `close_pos_shift` și `get_active_pos_shift` și s-a verificat că plățile bonurilor anulate sunt excluse automat din `total_cash` și `expected_cash` prin intermediul filtrului `s.status = 'finalized'`. Nu este necesar niciun patch SQL, iar datele reale din testele E2E confirmă o diferență de casă de 0.00.
- **Etapa 6B.3.0 (Sales Advanced Returns SQL Pre-Apply Hardening)**: Realizat (`docs/sales_returns_advanced_preapply_6b30_report.md`, `database/proposed_sales_returns_advanced_6b3.sql`). S-a auditat schema existentă și s-a rafinat blueprint-ul SQL pentru retururi parțiale/totale pe articole. S-au definit RPC-urile `get_sale_return_eligibility` și `return_sale_items`, s-au planificat indexurile de optimizare și s-au creat patch-urile de reconciliere pentru turele POS active și închise.
- **Etapa 6B.3.1 (Sales Advanced Returns SQL Apply Verification)**: Realizat (`docs/sales_returns_advanced_sql_apply_verification_6b31_report.md`) — **PASS**. S-a verificat prin interogări read-only existența și corectitudinea structurii tabelelor `sale_returns` și `sale_return_items`, a politicilor RLS, a constrângerilor de tip și status, a indexurilor suplimentare de optimizare și a RPC-urilor `get_sale_return_eligibility` și `return_sale_items` cu clauze `SECURITY DEFINER` și revocarea granturilor publice.
- **Etapa 6B.3.3 (Sales Advanced Returns E2E Test)**: **PASS** (retururile parțiale/totale sunt validate operațional). Următorul pas: **6C.1 Commercial Reports Upgrade**. Raport complet disponibil în [sales_returns_e2e_6b33_report.md](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/docs/sales_returns_e2e_6b33_report.md).
- **Etapa 6C.1 (Commercial Reports Upgrade Blueprint)**: Realizat (`docs/commercial_reports_blueprint_6c1.md`, `database/proposed_commercial_reports_6c1.sql`). S-a auditat starea actuală a raportării din aplicație, s-au corectat formulele de calcul pentru a integra corect stornările/retururile și s-a proiectat arhitectura SQL bazată pe 6 RPC-uri parametrizate cu securitate ridicată și izolare multi-tenant.
- **Etapa 6C.2.0 (Commercial Reports SQL Pre-Apply Hardening)**: Realizat (`docs/commercial_reports_preapply_6c20_report.md`, `database/proposed_commercial_reports_6c2.sql`). S-a verificat schema reală Supabase (read-only), confirmându-se tabelele, coloanele, statusurile și funcțiile helper. S-a rafinat blueprint-ul SQL pentru a standardiza formatul de ieșire `JSONB` cu camelCase și a asigura calificarea completă a interogărilor fără shadowing.
- **Etapa 6C.2.1 (Commercial Reports SQL Apply Verification)**: Realizat (`docs/commercial_reports_sql_apply_verification_6c21_report.md`) — **PARTIAL PASS / Needs SQL hotfix 6C.2.2**. S-au verificat prin teste funcționale read-only cele 6 RPC-uri aplicate. Funcțiile summary, performance, daily cash și inventory funcționează perfect și returnează JSONB valid. S-au identificat 2 erori runtime de sintaxă în `get_losses_report` (agregări imbricate) și `get_shift_report` (ordonare în aggregate fără GROUP BY), care au fost corectate în blueprint-ul `proposed_commercial_reports_6c2.sql`.
- **Etapa 6C.2.2A (Commercial Reports Minimal SQL Hotfix Preparation)**: Realizat. Hotfix-ul SQL a fost pregătit în `database/hotfix_commercial_reports_6c22.sql`, alături de ghidul de aplicare `docs/commercial_reports_hotfix_apply_6c22_guide.md` și raportul de pregătire `docs/commercial_reports_hotfix_preparation_6c22a_report.md`.
- **Etapa 6C.2.2B (Commercial Reports SQL Hotfix Verification)**: Realizat (`docs/commercial_reports_sql_hotfix_verification_6c22b_report.md`) — **PASS**. Hotfix-ul a fost aplicat manual în editorul SQL Supabase, iar verificarea completă a validat funcționarea corectă și sigură a tuturor celor 6 RPC-uri comerciale (inclusiv remedierea `get_shift_report` și `get_losses_report`).
- **Etapa 6C.3 (Commercial Reports Frontend Integration)**: Realizat (`docs/commercial_reports_frontend_integration_6c3_report.md`) — **PASS**. S-a creat pagina de interfață premium `/rapoarte` integrată în sidebar, care consumă și formatează defensiv datele din cele 6 RPC-uri comerciale, oferind tab-uri detaliate pentru vânzări nete, performanță produse, numerar/ture POS, valoare inventar și pierderi. Accesul este limitat la rolurile `admin`, `manager` și `platform_owner`.
- **Etapa 6C.4 (Commercial Reports E2E Test)**: Realizat (`docs/commercial_reports_e2e_6c4_report.md`) — **PASS**. S-a validat E2E prin Playwright suita completă de 10 scenarii de testare, acoperind navigarea, KPI-urile, tab-urile detaliate, performanța produselor, reconcilierea caselor, filtrarea calendaristică, context switching-ul pentru Platform Owner (inclusiv suport virtual store memberships) și design-ul adaptiv.
- **Etapa 6D.1 (Store Settings Blueprint)**: Realizat (`docs/store_settings_blueprint_6d1_report.md`, `database/proposed_store_settings_6d1.sql`). S-a finalizat auditul static al setărilor și al codului (TVA hardcodat, CUI și puncte de lucru). S-a proiectat arhitectura JSONB imbricată pentru setările operaționale (`stores.settings`), triggerul de validare a schemei și funcțiile ajutătoare de acces. Blueprint-ul SQL a fost creat pentru review fără a fi aplicat.
- **Etapa 6D.1.1 (Store Settings Blueprint Completion & VAT Tax Groups Alignment)**: Realizat. S-a completat blueprint-ul SQL (`database/proposed_store_settings_6d1.sql`) prin alinierea modelului TVA la grupele fiscale specifice din România (A = 21%, B = 11%, C = 11%, D = 0%, E = 0% / neplătitor), eliminarea valorilor hardcodate anterioare și implementarea celor 3 RPC-uri planificate (`get_store_settings`, `update_store_settings`, `get_store_operational_config`). S-a actualizat raportul oficial `docs/store_settings_blueprint_6d1_report.md` cu noile detalii de design și RPC APIs.
- **Etapa 6D.1.2 (Store Settings Blueprint Normalization Hotfix)**: Realizat. S-a corectat și normalizat blueprint-ul SQL (`database/proposed_store_settings_6d1.sql`) pentru a folosi `default_vat_group` și structura de obiect `vat_groups` compatibilă cu setările de pilot. S-au integrat funcțiile ajutătoare de fallback `get_default_store_settings` și `merge_store_settings_with_defaults`, s-a corectat tipul de returnare al `update_store_settings` la `jsonb` și s-au restricționat permisiunile de scriere pentru a exclude rolul de `manager`.
- **Etapa 6D.1.3 (Store Settings Pre-Apply Security & Robustness Hardening)**: Realizat. S-a întărit blueprint-ul Store Settings înainte de aplicare SQL, prin adăugarea `SET search_path = public` la funcțiile `SECURITY DEFINER` (`get_store_setting_text`, `get_store_setting_numeric`, `get_store_setting_boolean`), normalizarea finală a modelului TVA (`default_vat_group` + `vat_groups`), verificarea grants și întărirea logicii de merge pentru setări parțiale.
- **Etapa 6D.2 (Store Settings SQL Apply Verification)**: Realizat (`docs/store_settings_apply_verification_6d2_report.md`) — **PASS**. S-a verificat prin interogări tranzacționale/read-only prezența celor 10 funcții de setări de magazin în schema public, corectitudinea gettere-lor personalizate cu mecanism legacy fallback, comportamentul corect al validatorului de schemă, fuziunea și migrarea datelor legacy fără impact permanent pe baza de date și auditul drepturilor de execuție. S-a inclus o recomandare/avertizare de securitate pentru limitarea dreptului de execuție pe migratorul legacy.
- **Etapa 6D.2.1 (Store Settings Migrator Grant Security Hotfix)**: Realizat (`docs/store_settings_migrator_grants_hotfix_6d21_report.md`, `database/hotfix_store_settings_migrator_grants_6d21.sql`). S-a pregătit hotfix-ul SQL minimal de securitate pentru blocarea accesului la funcția de migrare administrativă.
- **Etapa 6D.2.2 (Store Settings Migrator Grant Verification)**: Realizat (`docs/store_settings_migrator_grants_verification_6d22_report.md`) — **PASS**. S-a verificat prin interogări de catalog în baza de date că rolurile `anon` și `authenticated` au fost blocate de la execuția `public.migrate_stores_legacy_settings()`, în timp ce rolurile administrative (`service_role`, `postgres`) și RPC-urile de runtime își mențin permisiunile necesare.
- **Etapa 6D.3 (Store Settings Frontend Integration)**: Realizat (`docs/store_settings_frontend_integration_6d3_report.md`) — **PASS**. S-a creat feature-ul complet `src/features/store-settings/` cu ruta `/setari-magazin`, 6 paneluri de configurare (fiscal, TVA, stoc, POS, documente, rapoarte/alerte), service cu parsare JSONB defensivă, hook cu dirty tracking și auto-reload, toggle Plătitor/Neplătitor TVA cu forțare grup E/A, manager read-only, casier/gestionar blocat. Build PASS.
- **Etapa 6D.4.0 (Product VAT Group Schema Audit & Blueprint)**: Realizat (`docs/product_vat_group_blueprint_6d40.md`, `database/proposed_product_vat_group_6d40.sql`). S-a auditat schema DB și interfețele frontend, luându-se decizia arhitecturală de a stoca `vat_group` în tabelul `product_prices` (model multi-store).
- **Etapa 6D.4.1 (Product VAT SQL Apply Verification)**: Realizat (`docs/product_vat_sql_apply_verification_6d41_report.md`) — **PASS** (cu observația că necesită hotfix-ul 6D.4.1.1 pentru imunizarea/alinierea ratelor TVA la runtime).
- **Etapa 6D.4.1.1 (Product VAT Config Rate Alignment Hotfix)**: Realizat (`docs/product_vat_config_rates_alignment_6d411_report.md`, `database/hotfix_product_vat_config_rates_6d411.sql`).
- **Etapa 6D.4.1.2 (Product VAT Config Rate Hotfix Verification)**: Realizat (`docs/product_vat_config_rates_hotfix_verification_6d412_report.md`) — **PASS**. Toate testele funcționale pe procedurile stocate de configurare a TVA-ului au fost validate cu succes în baza de date, iar imunitatea fiscală runtime este garantată.
- **Etapa 6D.4.2 (Product VAT Frontend Integration)**: Realizat (`docs/product_vat_frontend_integration_6d42_report.md`) — **PASS**. S-a integrat selectorul reutilizabil `ProductVatGroupSelector` în listele de produse, modalul de editare și formularul de adăugare rapidă (Fast Add v2), cu încărcarea dinamică a configurației din RPC-ul magazinului curent și calculul automat al cotei procentuale. Rularea build-ului a fost validată cu succes.
- **Etapa 6D.4.2.1 (Product VAT Frontend Parser & Non-Payer Enforcement Hotfix)**: Realizat (`docs/product_vat_frontend_hotfix_6d421_report.md`) — **PASS**. Am corectat parsarea configurației pentru a tolera ambele tipuri de casing (`camelCase` / `snake_case`), am forțat cotele fiscale standardizate (blocând ratele legacy), am implementat helper-ul de normalizare a grupelor TVA și am securizat submit-urile în modalul de editare și Fast Add (forțare grupa E pentru magazinele neplătitoare).
- **Etapa 6D.5 (Product VAT Integration E2E Test)**: Realizat (`test_store_settings_product_vat_6d5.py`) — **PASS**. S-a implementat și validat suita completă de testare E2E Playwright, acoperind setările fiscale de plătitor/neplătitor TVA, comportamentul modalului de editare, Fast Add și tabelul de produse în ambele tipuri de puncte de lucru.
- **Etapa 6D.5.1 (Product Edit VAT Save Hotfix for Batch-Managed Products)**: Realizat (`docs/product_vat_edit_stock_lock_hotfix_6d51_report.md`). S-a reparat modalul de editare a produsului (`ProductEditModal.tsx`) pentru a permite modificarea cotei TVA și a metadatelor produselor gestionate pe loturi reale, prin dezactivarea câmpurilor de stoc și excluderea lor din payload-ul de actualizare dacă nu au fost modificate, blocând strict modificarea directă a stocului și prevenind excepția SQL. Testele E2E Playwright au fost extinse și trec cu succes.
- **Etapa 6D.5.1.1 (Product VAT Hotfix Cleanup & Documentation Alignment)**: Realizat. S-au eliminat logurile temporare de debug din interfață și serviciul de produse. S-a creat raportul general E2E `docs/store_settings_product_vat_e2e_6d5_report.md` care include scenariile de loturi reale (blocare stoc, salvare TVA, resetare la cleanup). Producția build trece cu succes.
- **Etapa 6D.5.2 (POS Mixed Payment Auto-Balance UX Hotfix)**: Realizat — PASS.
  - La plata mixtă:
    - completarea sumei cash calculează automat suma card;
    - completarea sumei card calculează automat suma cash;
    - valorile peste total sunt limitate;
    - schimbarea totalului recalculează suma opusă în funcție de ultimul câmp editat;
    - `finalize_sale` nu a fost modificat;
    - payload-ul cash/card este compatibil cu schema existentă (`mixed` lowercase, plăți separate `cash` și `card`).

- **Etapa 6D.5.3 (Sales History VAT Display Audit & Snapshot Blueprint)**: **Realizat** — PASS.
  - S-a confirmat prin audit live DB că `sale_items` nu conține nicio coloană TVA (`vat_group`, `vat_rate`, `vat_amount`, `price_without_vat`, `total_without_vat`, `price_includes_vat` — toate lipsesc).
  - `product_prices` conține `vat_group` (A/B/C/D/E, DEFAULT 'A') și `vat_percent` — disponibile, dar dinamice (nu pot fi folosite pentru bonuri vechi).
  - `finalize_sale` nu inserează niciun câmp TVA în `sale_items`.
  - Sales History UI (`SaleDetailsModal.tsx`, `types.ts`, `salesHistoryService.ts`) nu afișează și nu citește TVA.
  - **Decizie arhitecturală:** Snapshot TVA în coloane directe ale `sale_items` (nu fallback la produs curent pentru bonuri noi).
  - **Fallback pentru bonuri vechi:** UI va citi `product_prices.vat_group` curent și va marca `vatIsFallback = true` cu badge discret.
  - Blueprint SQL creat (`database/proposed_sales_history_vat_snapshot_6d53.sql`): 6 coloane noi, constraint idempotent, index reporting, helper `get_vat_rate_for_group()` (IMMUTABLE), helper `calculate_vat_breakdown()` (STABLE), patch `finalize_sale` (neaplicat), backfill comentat/opțional.
  - Documentație completă: `docs/sales_history_vat_display_blueprint_6d53.md`, `docs/sales_history_vat_snapshot_6d53_report.md`.
  - Sales History TVA UI **nu este** încă implementat. Fiscal Bridge **nu este** modificat. `finalize_sale` real **nu a** fost modificat.

- **Etapa 6D.5.3.1 (Sales VAT Snapshot SQL Pre-Apply Hardening)**: **Realizat** — PASS.
  - Blueprint-ul `database/proposed_sales_history_vat_snapshot_6d53.sql` a fost întărit înainte de aplicare, prin comparare cu funcția live confirmată la 2026-05-24.
  - `get_vat_rate_for_group`: input normalizat `upper(trim())`, validare NULL/gol explicit, `SET search_path = public`, `REVOKE FROM PUBLIC/anon/authenticated`.
  - `calculate_vat_breakdown`: validare `p_total < 0` și `IS NULL`, normalizare flag `NULL → true`, rounding explicit, `SET search_path`, `REVOKE FROM PUBLIC/anon/authenticated`.
  - Bug fix `price_without_vat` în patch: branching corect `inclusive → unit_price/(1+rată)` / `exclusive → unit_price` (era mereu inclusive).
  - SQL structurat clar pe 3 faze: (1) schema+helperi safe apply, (2) patch `finalize_sale`, (3) backfill comentat/neexecutat automat.
  - Raport: `docs/sales_history_vat_snapshot_preapply_hardening_6d531_report.md`.
  - DB **nu a** fost modificată. Frontend **nu a** fost modificat. `finalize_sale` live **nu a** fost modificat.

- **Etapa 6D.5.4 (Sales VAT Snapshot SQL Apply Verification)**: Aplicarea manuală a Fazei 1 din `database/proposed_sales_history_vat_snapshot_6d53.sql` în Supabase SQL Editor (ALTER TABLE + helperi) și verificarea read-only a structurii coloanelor noi, constrângerilor, indexurilor și funcțiilor helper. Patch `finalize_sale` (Faza 2) se aplică separat după verificarea Fazei 1.
- **Etapa 6F.1.2 (Store Module Entitlements Blueprint)**: Realizat (`docs/store_module_entitlements_blueprint_6f12.md`, `database/proposed_store_module_entitlements_6f12.sql`). S-a definit registry-ul oficial al celor 18 module platformă, s-au redactat RPC-urile securizate cu `SECURITY DEFINER` și s-a planificat integrarea în frontend. DB activă și codul live nu au fost modificate.
- **Etapa 6F.1.3 (Module Entitlements SQL Pre-Apply Hardening)**: **Realizat** — PASS.
  - S-a întărit blueprint-ul `database/proposed_store_module_entitlements_6f12.sql` prin adăugarea constrângerilor stricte pe `module_key`, `category`, `status` și structura JSONB.
  - S-au revocat drepturile DML directe pentru userii `authenticated`, impunând scrierea exclusiv prin RPC-uri securizate.
  - S-a adăugat validarea recursivă a dependențelor de module (atât la activare cât și la dezactivare) direct în tranzacție.
  - Refăcut `get_store_module_access` pentru a returna Effective Access calculat dinamic (fallback la `default_enabled` și forțare `false` pentru modulele indisponibile global).
  - Aliniat auditarea la schema live a tabelei `audit_logs` (coloanele `old_data`, `new_data`).
  - Raport: `docs/store_module_entitlements_preapply_hardening_6f13_report.md`.
  - DB **nu a** fost modificată. Frontend **nu a** fost modificat.
- **Etapa 6F.1.3.1 (Module Entitlements Pre-Apply Safety Hotfix)**: **Realizat** — PASS.
  - Blueprint-ul SQL a fost corectat înainte de aplicare: modulele planned nu pot fi activate (acestea fiind destinate exclusiv roadmap-ului de produse, nu entitlements active comerciale), parametrul `p_enabled` este validat explicit ca non-null, `module_key` este normalizat și validat pe baza structurii regex, iar bulk payload-ul acceptă doar boolean JSON real.
  - SQL-ul nu a fost aplicat încă.
- **Etapa 6F.1.4 (Module Entitlements SQL Apply Verification)**: **Realizat** — PASS.
  - Blueprint-ul SQL întărit (`proposed_store_module_entitlements_6f12.sql`) a fost aplicat manual în editorul SQL Supabase.
  - S-a verificat schema tabelelor (`platform_modules`, `store_module_access`) și constrângerile de validare (regex pe chei, categorii, statusuri planned/beta/active, structuri JSONB).
  - Politicile RLS și revocările de privilegii DML directe au fost verificate pentru asigurarea accesului exclusiv prin RPC-uri securizate.
  - S-au testat funcțiile RPC (`get_platform_modules`, `get_store_module_access`, `set_store_module_access`, `bulk_set_store_modules`, `user_can_access_store_module`) prin simulări de identitate, validând corectitudinea RBAC, blocarea activării planned/disabled, constrângerile de dependențe și jurnalizarea automată în `audit_logs`.
  - Raport complet: `docs/store_module_entitlements_sql_apply_verification_6f14_report.md`.

- **Etapa 6F.1.5 (Module Entitlements Frontend Integration)**: Realizat. S-a integrat sistemul de entitlements în frontend, folosind contextul, hook-ul și serviciile RPC de interogare. Rutele sunt securizate dinamic (`ProtectedRoute.tsx`), sidebar-ul filtrează opțiunile nepermise (`MainLayout.tsx`), iar modulele dezactivate/planificate sunt redirecționate către ecranul dedicat de blocare (`DisabledModulePage.tsx`). Build-ul complete trece cu succes.
- **Etapa 6F.1.5.1 (Module Entitlements Frontend Security & Artifact Alignment)**: Realizat. S-a aplicat hotfix-ul de securitate (`REVOKE DML` pe tabele pentru rolul `authenticated`), s-a refăcut testul E2E Playwright pentru a elimina complet DML-ul direct și a folosi doar RPC-urile securizate, s-a creat documentația dedicată și raportul oficial de integrare. Testele E2E Playwright trec cu succes (Exit code: 0).

- **Etapa 6F.1.6 (Owner Console Module Management UI)**: **Realizat** — PASS.
  - S-a implementat componenta de management module `OwnerStoreModulesPanel.tsx` sub tab-ul "Module Magazin" din Owner Console.
  - S-a adăugat posibilitatea de aplicare a pachetelor comerciale (Basic, Standard, Premium, Enterprise) cu avertisment și modal de confirmare.
  - Activarea sau dezactivarea individuală a modulelor forțează utilizatorul să introducă un motiv de audit, trimis direct prin parametrii RPC-urilor securizate (`set_store_module_access` / `bulk_set_store_modules`).
  - Toggles sunt dezactivate/blocate vizual pentru modulele cu status `planned` sau `disabled` la nivel global.
  - S-a extins componenta de vizualizare audit logs din consolă (`OwnerAuditLogsPanel.tsx`) pentru acțiunile de `store.module_enable` și `store.module_disable`.
  - Testarea E2E Playwright (`test_owner_module_management_6f16.py`) și build-ul de producție (`npm run build`) au fost rulate și au trecut cu succes.

- **Etapa 6F.1.6.1 (Module Management E2E Cleanup & Preset Safety)**: **Realizat** — PASS.
  - S-a identificat riscul operațional: preset-ul Basic aplicat în testul E2E lăsa `Magazin Principal` cu module critice dezactivate (reception, transfer, commercial_reports, store_settings, loss_reporting, waste_audit, dashboard, expiration_tracking).
  - S-a efectuat un audit complet al stării modulelor prin RPC `get_store_module_access` și s-a restaurat baseline-ul operațional sigur prin apeluri `set_store_module_access` / `bulk_set_store_modules`. Niciun DML direct.
  - S-a refactorizat testul E2E cu: snapshot complet pre-test, cleanup robust în `finally` care restaurează exact snapshot-ul capturat indiferent de PASS/FAIL, și eliminarea aplicării live a preset-ului pe `Magazin Principal` (se testează doar UI-ul modalului: apare, are butoanele cu ID stabil, se poate anula).
  - S-au adăugat ID-uri stabile pe butoanele din modaluri (`#toggle-cancel-btn`, `#toggle-confirm-btn`, `#preset-cancel-btn`, `#preset-confirm-btn`) în `OwnerStoreModulesPanel.tsx`.
  - Build PASS, test E2E PASS (Exit code 0).
  - Rapoarte: `docs/module_management_e2e_cleanup_safety_6f161_report.md`, secțiunea 5 adăugată în `docs/owner_console_module_management_ui_6f16_report.md`.
  - **Următorul pas: Etapa 6F.1.7 — Module Entitlements E2E Hardening / Visual QA**

- **Etapa 6F.1.6.2 (Owner Module Management DOM/Test Alignment Hotfix)**: **Realizat** — PASS.
  - S-au adăugat ID-uri stabile (`#toggle-cancel-btn`, `#toggle-confirm-btn`, `#preset-cancel-btn`, `#preset-confirm-btn`) și atribute de accesibilitate `aria-label` în modalele de toggle individual și aplicare preset în componenta `OwnerStoreModulesPanel.tsx`.
  - S-a validat alinierea DOM-ului cu testul E2E `test_owner_module_management_6f16.py`, care rulează acum 100% reproductibil și sigur.
  - Cleanup-ul robust rămâne strict prin RPC-uri și zero DML direct pe baza de date. Nu s-au modificat DB/RLS/RPC-uri.
  - Build-ul Vite/TypeScript de producție a trecut perfect (`npm run build` PASS).
- **Etapa 6F.1.7 (Module Entitlements E2E Hardening / Visual QA)**: **Realizat** — PASS. Toate verificările automate de route guards, module planificate/blocate, securitate RPC-only, audit log și accesibilitate a interfeței au fost validate cu succes. S-au salvat capturi de ecran adaptate pe 4 viewports (Desktop, Laptop, Tabletă, Mobil) în `artifacts/6f17/` pentru inspecția vizuală. Raport complet în `docs/module_entitlements_e2e_visual_qa_6f17_report.md`.
- **Etapa 6F.1.8 (Platform Owner Global Context Lockdown & Visual Polish)**: Realizat. S-a securizat rolul `platform_owner` forțându-l să rămână exclusiv în contextul de administrare globală (`currentStoreId` rămâne `null`, selecția în local storage este eliminată). S-au implementat route guards absolute pentru blocarea accesului la rutele de magazin, s-a simplificat sidebar-ul, s-a înlocuit switcherul din topbar cu un badge static și s-a refăcut layout-ul taburilor din Consolă Proprietar cu un design tip pastilă (flex-wrap). E2E lockdown test PASS, viewports screenshots generate în `artifacts/6f18/`.
- **Etapa 6F.1.8.1 (Platform Owner Lockdown Code Hygiene & Report Alignment)**: Realizat. S-a ordonat corect apelarea hook-urilor în `StoreContextSwitcher.tsx` (înainte de orice return condițional) și s-au eliminat toate ramurile de cod owner mort din dropdown. S-a creat raportul oficial 6F.1.8 în `docs/platform_owner_global_context_lockdown_6f18_report.md` și s-au actualizat rapoartele adiacente. Build-ul de producție și toate testele E2E (6F.1.8, 6F.1.7 și 6F.1.6) au fost rulate cu succes fără regresii.
- **Etapa 6F.1.9 (Store Lifecycle Management Blueprint)**: Realizat. A fost proiectat sistemul securizat pentru suspendarea, reactivarea, arhivarea, solicitarea de ștergere și ștergerea definitivă a magazinelor (criterii stricte de eligibilitate). S-a stabilit că pentru clienți reali se recomandă starea de arhivare (read-only), nu hard delete. S-a creat blueprint-ul SQL `database/proposed_store_lifecycle_6f19.sql`, documentația principală în `docs/store_lifecycle_management_blueprint_6f19.md` și raportul rezumat în `docs/store_lifecycle_management_6f19_report.md`. SQL-ul nu a fost aplicat încă, iar UI-ul nu a fost implementat. Următorul pas: 6F.1.10 Store Lifecycle SQL Pre-Apply Hardening.
- **Etapa 6F.1.10 (Store Lifecycle SQL Pre-Apply Hardening)**: Realizat. Blueprint-ul SQL a fost securizat și întărit: s-a auditat schema live (22 de tabele dependente identificate), s-a adăugat verificarea `is_platform_owner()` pe eligibilitate, s-au extins controalele de eligibilitate la 18 tabele active, s-a dezactivat/stub-uit hard delete-ul fizic real pentru primul rollout pentru a preveni cascade delete-ul logurilor și datelor fiscale, s-a adăugat RPC-ul de anulare a cererii de ștergere, iar tranzacțiile au fost securizate prin `SELECT FOR UPDATE`. S-au actualizat documentațiile aferente și s-a creat raportul `docs/store_lifecycle_preapply_hardening_6f110_report.md`. SQL-ul nu a fost aplicat încă, iar UI-ul nu a fost implementat. Următorul pas: 6F.1.11 Store Lifecycle SQL Apply Verification.
- **Etapa 6F.1.11 (Store Lifecycle SQL Apply Verification)**: **Realizat** — PASS.
  - S-a aplicat scriptul SQL întărit (`database/proposed_store_lifecycle_6f19.sql`) în baza de date Supabase.
  - S-a creat scriptul de testare Playwright E2E automatizat `test_store_lifecycle_verify_6f111.py` pentru validarea completă a ciclului.
  - S-a testat și confirmat integritatea structurii tabelului `stores` (cele 10 coloane noi adăugate), a constrângerii CHECK `check_stores_lifecycle_status` (blocare statusuri invalide) și a triggerului `trigger_sync_store_active_with_lifecycle` (sincronizare cu flagul legacy `active`).
  - S-au testat și securizat toate cele 8 RPC-uri de lifecycle (`SECURITY DEFINER` ce apelează `is_platform_owner()`), validând eșecul accesului neautorizat pentru rolurile non-owner (eroare access denied).
  - S-a validat mecanismul defensiv "Double Exception Safety" din `hard_delete_store_if_eligible` (aruncă excepții separate pentru magazin ineligible și excepția de tip stub pentru magazin curat, prevenind cascade delete-ul).
  - Jurnalizarea în `audit_logs` a fost confirmată pentru toate tranzițiile (`store.deletion_request`, `store.cancel_deletion`, `store.suspend`, `store.reactivate`, `store.archive`, `store.hard_delete_blocked`) fără scurgeri de secrete.
  - Raport complet: `docs/store_lifecycle_sql_apply_verification_6f111_report.md`.
- **Etapa 6F.1.11.1 (Store Lifecycle Verification Test DML Safety Hotfix)**: **Realizat** — PASS.
  - S-a refactorizat testul de verificare `test_store_lifecycle_verify_6f111.py` pentru a elimina complet orice scriere directă sau ștergere fizică (fără `.delete()`, `.insert(` sau `.update(` pe tabelele de bază `stores`, `audit_logs`, `store_members`).
  - S-a introdus un guard static de securitate (`sanity_scan_self()`) care blochează rularea dacă se detectează utilizarea directă a acestor comenzi.
  - Testul utilizează acum magazinul de test existent (`Magazin Test 12345678 Punct 902`) pentru a simula tranzițiile de stare prin RPC, restaurând starea sa inițială la final exclusiv prin RPC-ul `reactivate_store`. Nicio înregistrare nu este ștearsă fizic din baza de date.
  - Scenariul de succes pentru `request_store_deletion` a fost marcat ca `NOT RUN LIVE` pentru a preveni necesitatea unui cleanup distructiv.
  - Raport hotfix: `docs/store_lifecycle_verification_test_safety_6f1111_report.md`.
- **Etapa 6F.1.12 (Owner Console Store Lifecycle UI Integration)**: **Realizat** — PASS.
  - S-au definit tipurile și contractele de date (`types.ts`) reprezentând noile statusuri și diagnostice de lifecycle.
  - S-a creat `storeLifecycleService.ts` pentru a wrapp-ui cele 7 RPC-uri active de lifecycle și s-a dezvoltat hook-ul `useStoreLifecycle.ts`.
  - S-a implementat modalele `StoreLifecycleActionModal.tsx` (cu confirmarea acțiunii și motiv de audit obligatoriu) și `StoreDeletionEligibilityModal.tsx` (cu diagnosticul de dependențe și recomandarea de arhivare).
  - S-a actualizat `StoresTable.tsx` cu status badges și dropdown de acțiuni, iar `OwnerAuditLogsPanel.tsx` cu noile filtre și traduceri de audit.
  - S-au integrat modalele în `OwnerConsolePage.tsx` cu mecanism de auto-refresh pe succes.
  - S-a validat E2E prin testul `test_owner_store_lifecycle_ui_6f12.py` (`PASS`) și s-a confirmat lipsa TS build regressions (`npm run build` PASS).
  - Raport complet: `docs/owner_console_store_lifecycle_ui_6f12_report.md`.
- **Etapa 6F.1.13 (Store Lifecycle E2E Hardening & Visual QA)**: **Realizat** — PASS.
  - S-au adăugat atribute stabile `data-testid` în `StoresTable.tsx` pentru rândul tabelului, meniul dropdown de opțiuni, badge-ul de stare și acțiunile individuale ale magazinului.
  - S-au îmbunătățit standardele de accesibilitate ARIA adăugând `aria-label="Închide dialog"` la butoanele X ale modalelelor de acțiune și eligibilitate.
  - S-a stabilizat testul Playwright existent `test_owner_store_lifecycle_ui_6f12.py` utilizând noii selectori și s-a inclus verificarea finală a stării ambelor magazine (`Magazin Principal` și magazinul de test).
  - S-a creat și implementat un nou test robust de testare automată vizuală și responsivă `test_store_lifecycle_visual_qa_6f13.py` care validează fluxurile pe 4 rezoluții standardizate (Desktop, Laptop, Tabletă, Mobil) și generează capturile de ecran corespunzătoare în `artifacts/6f13/`.
  - Toate testele trec cu succes (inclusiv testele de regresie pe lockdown-ul Platform Owner), iar build-ul de producție Vite se finalizează fără erori.
  - Raport complet generat în `docs/store_lifecycle_e2e_visual_qa_6f13_report.md`.

- **Etapa 6D.5.4 (Sales VAT Snapshot SQL Apply Verification)**: **Realizat** — PASS. S-a verificat aplicarea migrării `20260525140000_sales_history_vat_snapshot.sql` ce extinde structura `public.sale_items` cu 6 noi coloane pentru snapshot TVA. Testul tranzacțional E2E automatizat (`verify_vat_snapshot_e2e.py`) a confirmat funcționarea corectă a patch-ului `finalize_sale` (salvare snapshot corect pentru o tranzacție reală), funcționarea corectă a helper-ilor fiscali, securitatea acestora (execuție directă blocată pentru utilizatorii autentificați) și compatibilitatea deplină cu înregistrările legacy. Raportul oficial este disponibil la `docs/sales_vat_snapshot_sql_apply_verification_6d54_report.md`.
- **Etapa 6D.5.5 (Sales History VAT Display Frontend Integration)**: **Realizat** — PASS. S-au integrat detaliile istorice de TVA în interfața utilizator (modalul `SaleDetailsModal.tsx`). Funcționalitatea selectează noile coloane de snapshot TVA, formatează detaliile sub o nouă coloană în tabelul de articole și generează un sumar complet de TVA la nivel de bon în footer (`tfoot`). Pentru bonurile legacy (unde snapshot-ul este NULL), se aplică un parser defensiv ce estimează TVA pe baza cotelor curente ale magazinului selectat (marcându-le ca "Estimativ" și afișând un banner informativ) sau arată "TVA indisponibil". E2E testul automatizat `test_sales_history_vat_display_6d55.py` a validat cu succes ambele fluxuri (bon nou cu snapshot corect și bon legacy cu fallbacks), iar build-ul de producție Vite se compilează fără erori. Raportul oficial este disponibil la `docs/sales_history_vat_display_frontend_6d55_report.md`.
- **Etapa 6D.5.5.1 (Sales History VAT Display Parser & Fallback Rate Hotfix)**: **Realizat** — PASS. Fallback-ul TVA pentru bonurile legacy folosește ratele standard pe grupa TVA (A=21%, B=11%, C=11%, D=0%, E=0%), nu `vat_percent` legacy din setări. `any` a fost complet eliminat din parserul `salesHistoryService.ts` în favoarea tipizării stricte. Snapshot-ul real salvat în baza de date rămâne neatins și servește ca sursă istorică oficială pentru tranzacțiile noi. Build de producție Vite compilabil curat (`npm run build` PASS), teste E2E Playwright de validare locală (`test_sales_history_vat_display_6d55.py` și regression `verify_vat_snapshot_e2e.py`) încheiate cu succes. Raport oficial creat la `docs/sales_history_vat_display_hotfix_6d551_report.md`. Următorul pas: 6D.5.6 Sales History VAT Display E2E / Visual QA.
- **Etapa 6D.6.0 (SGR Container Deposit Blueprint)**: **Realizat** — PASS. S-a realizat proiectarea completă a sistemului de garanție SGR în aplicație. SGR este tratat ca o garanție separată de prețul produsului principal, aplicând obligatoriu grupa fiscală D (TVA 0%). S-a decis stocarea tipului de ambalaj (`sgr_enabled`, `sgr_type`) în tabelul `public.products`, iar detaliile despre garanția percepută vor fi stocate ca snapshot în `public.sale_items`. S-a creat blueprint-ul SQL în `database/proposed_sgr_containers_6d60.sql` și documentația completă în `docs/sgr_container_deposit_blueprint_6d60.md` împreună cu raportul oficial `docs/sgr_container_deposit_6d60_report.md`. Nu au fost efectuate modificări în baza de date live sau codul aplicației. Următorul pas: 6D.6.1 SGR SQL Apply Verification.
- **Etapa 6D.6.1 (SGR SQL Pre-Apply Hardening)**: **Realizat** — PASS. Constrângerile SGR au fost întărite pentru a impune grupa D / 0% și valoarea 0.50 lei pe `sale_items`. Indexurile pentru raportare SGR au fost adăugate în blueprint. `get_sgr_deposit_config()` a fost extins cu monedă și label-uri. SQL-ul nu a fost aplicat live. POS/finalize_sale nu au fost modificate încă. Raport oficial generat în `docs/sgr_sql_preapply_hardening_6d61_report.md`. Următorul pas: 6D.6.2 SGR SQL Apply Verification.
- **Etapa 6D.6.2 (SGR SQL Apply Verification)**: **Realizat** — PASS.
  - Coloanele SGR au fost aplicate pe `products` și `sale_items`.
  - Constraint-urile impun SGR cu grupa D / 0% și garanție 0.50 lei.
  - Helperul `get_sgr_deposit_config()` este disponibil pentru utilizatori autentificați.
  - `finalize_sale` și POS nu au fost modificate încă.
  - Backfill nu a fost rulat.
  - Raport oficial creat la `docs/sgr_sql_apply_verification_6d62_report.md`.
- **Etapa 6D.6.3 (SGR Product Forms Integration)**: **Realizat** — PASS.
  - S-au integrat câmpurile SGR în formularele de produse (Adăugare Rapidă v2 și Product Edit Modal), utilizând selectorul dedicat `ProductSgrSelector.tsx` cu ID-uri stabile.
  - S-a menținut blocarea stocului pe produse cu loturi active, asigurând în același timp editabilitatea completă a selectorului SGR din Edit Nomenclator.
  - S-a adăugat badge-ul SGR (`ProductTable.tsx`) pentru identificarea rapidă a ambalajelor în nomenclator.
  - S-au actualizat serviciile frontend (`productService.ts` și `fastAddService.ts`) cu mapări și normalizări client-side sigure.
  - Testul Playwright E2E dedicat (`test_sgr_product_forms_6d63.py`) și testul de regresie VAT (`test_store_settings_product_vat_6d5.py`) au trecut cu succes complet.
  - Build-ul Vite/TypeScript de producție s-a finalizat fără erori.
  - Raport oficial creat la `docs/sgr_product_forms_integration_6d63_report.md`.
- **Etapa 6D.6.4 (SGR POS / finalize_sale Integration Blueprint & Pre-Apply Hardening)**: **Realizat** — PASS.
  - S-a auditat fluxul de checkout în frontend POS (`posService.ts`) și s-a analizat modul de calcul al totalului de plată.
  - S-a determinat că recalcularea tranzacțională a SGR trebuie să aibă loc direct pe server (RPC) citind valorile direct din nomenclatorul `products`, asigurând rolul de unică sursă de adevăr pentru prevenirea fraudelor client-side.
  - S-a redactat blueprint-ul SQL complet al funcției modificate în `database/proposed_sgr_finalize_sale_6d64.sql`, păstrând toate validările existente (roluri, ture, stoc lot FEFO, audit).
  - S-a elaborat ghidul detaliat de integrare POS client, istoric bonuri și reguli de retur în `docs/sgr_pos_finalize_sale_blueprint_6d64.md`.
  - Nu s-au efectuat modificări live în baza de date Supabase, interfața POS sau funcția `finalize_sale` live.
  - Raport oficial generat în `docs/sgr_pos_finalize_sale_6d64_report.md`.
- **Etapa 6D.6.4.1 (SGR Checkout Rollout Safety Hotfix)**: **Realizat** — PASS. S-a identificat riscul de payment mismatch în cazul în care patch-ul SQL pentru `finalize_sale` (care include taxa SGR în totalul bonului) este aplicat înainte ca POS frontend să implementeze SGR în total/plăți. S-a stabilit strategia de lansare sincronizată (Synchronized Release) și s-a reordonat roadmap-ul (etapa 6D.6.5 devine POS Frontend Preflight, iar aplicarea SQL devine 6D.6.6). Blueprint-ul SQL a primit un avertisment explicit de rollout în antet, iar blueprint-ul general a fost actualizat cu o secțiune de siguranță și un plan de rollback. Nu s-a modificat baza de date live și nu s-a modificat POS runtime. Raport complet în `docs/sgr_checkout_rollout_safety_6d641_report.md`.
- **Etapa 6D.6.5 (SGR POS Frontend Integration Preflight)**: **Realizat** — PASS. S-a realizat integrarea preliminară a sistemului SGR în POS frontend. POS citește datele SGR din nomenclator, coșul afișează linia de garanție SGR (0.50 lei per unitate, grupa fiscală D / 0%) și actualizează totalul de plată (grand total). Algoritmul mixed payment auto-balance folosește acum grand total-ul cu SGR inclus. S-a implementat un checkout rollout guard local (`SGR_CHECKOUT_BACKEND_ENABLED = false`) care dezactivează finalizarea vânzării și afișează un banner informativ dacă în coș sunt produse cu SGR, asigurând că vânzările cu SGR nu sunt trimise către backend-ul vechi înainte de patch-ul SQL. Vânzările fără produse SGR funcționează normal. S-a creat testul E2E `test_sgr_pos_frontend_preflight_6d65.py` și s-au rulat cu succes testele de regresie. Raport complet în `docs/sgr_pos_frontend_preflight_6d65_report.md`. Următorul pas: 6D.6.6 SGR finalize_sale SQL Manual Apply + Backend Verification.
- **Etapa 6D.6.6 (SGR finalize_sale SQL Manual Apply + Backend Verification)**: **Realizat** — PASS. Patch-ul SQL (`database/proposed_sgr_finalize_sale_6d64.sql`) a fost aplicat manual de către utilizator în editorul SQL Supabase. S-a creat fișierul de rollback local `database/rollback_finalize_sale_before_sgr_6d66.sql` conținând funcția veche live. Verificările post-apply au confirmat calculul corect al SGR server-side, popularea snapshot-ului SGR în `sale_items`, scăderea stocului și respingerea tranzacțiilor în cazul unui payment mismatch (testate prin `test_sgr_finalize_sale_backend_6d66.py` PASS). POS checkout SGR rămâne guarded (`SGR_CHECKOUT_BACKEND_ENABLED = false`). Raport complet în `docs/sgr_finalize_sale_sql_apply_verification_6d66_report.md`. Următorul pas: 6D.6.7 SGR POS + finalize_sale E2E Activation.
- **Etapa 6D.6.7 (SGR POS + finalize_sale E2E Activation)**: **Realizat** — PASS. S-a activat checkout-ul SGR în POS prin setarea `SGR_CHECKOUT_BACKEND_ENABLED = true` (cu fallback dinamic în `window` pentru teste). S-a actualizat serviciul `posService.ts` pentru a include taxa SGR în `totalSaleUI` pe frontend, asigurând conformitatea plăților cu valoarea SGR calculată pe server. Testul E2E complet `test_sgr_pos_checkout_e2e_6d67.py` a validat cu succes finalizarea vânzărilor SGR (plată cash, mixed cu auto-balance și normală fără SGR), popoularea corectă în baza de date a snapshot-ului SGR pe `sale_items`, scăderea stocului și apariția corectă a bonurilor în Istoricul Vânzărilor. Toate testele de regresie trec cu succes. Raport complet în `docs/sgr_pos_checkout_e2e_activation_6d67_report.md`.
- **Etapa 6D.6.8 (SGR Sales History / Receipt Integration)**: **Realizat** — PASS. Detaliile bonului afișează SGR ca sub-linie separată sub produs, cu TVA D / 0%. Sumarul bonului afișează total produse, total SGR și total de plată. Toate testele E2E și testele de regresie trec cu succes. Raport complet disponibil în `docs/sgr_sales_history_receipt_integration_6d68_report.md`.
- **Etapa 6D.6.9 (SGR Returns Integration Blueprint)**: **Realizat** — PASS. S-a realizat proiectarea completă a fluxului de retururi de produse vândute cu garanție SGR. S-a elaborat blueprint-ul SQL (`database/proposed_sgr_returns_6d69.sql`), documentul de design arhitectural (`docs/sgr_returns_integration_blueprint_6d69.md`) și raportul de etapă (`docs/sgr_returns_integration_6d69_report.md`), definind modelul de calcul, extinderile tabelei `sale_return_items` și impactul pe interfața `ReturnSaleModal` și reconcilierea casieriei. Următorul pas: 6D.6.10 SGR Returns SQL Pre-Apply Hardening.
- **Etapa 6D.6.10 (SGR Returns SQL Pre-Apply Hardening)**: **Realizat** — PASS. S-a realizat securizarea și hardening-ul blueprint-ului SQL (`database/proposed_sgr_returns_6d69.sql`). S-au adăugat validări stricte pe tipul de date și formatul JSON al argumentelor în funcția `return_sale_items`, normalizarea metodelor de retur, constrângeri clare de CHECK pe `sale_return_items`, tracking separat pentru total SGR returnat în audit log-uri, precum și calcul dinamic al SGR disponibil/returnat în eligibilitate. S-au securizat explicit granturile pentru funcții la nivel de `authenticated` role. Nu s-a aplicat SQL și nu s-a modificat baza de date live. Raport complet în `docs/sgr_returns_sql_preapply_hardening_6d610_report.md`.
- **Etapa 6D.6.11 (SGR Returns SQL Manual Apply + Verification)**: **Realizat** — PASS.
  - S-a verificat prin interogări read-only structura tabelelor (coloane SGR, constrângeri de CHECK, indexuri de performanță pe `sale_return_items`) și s-a confirmat conformitatea deplină.
  - S-a verificat protecția RPC-urilor `return_sale_items` și `get_sale_return_eligibility` (revocare grant-uri PUBLIC/anon și permisiuni exclusive pentru rolul `authenticated`).
  - S-au rulat testele de backend automatizate: Scenariile A (eligibilitate), B (retur parțial SGR), C (eligibilitate post-retur), E (capping) și D (retur total) au trecut cu succes complet.
  - S-a salvat scriptul de rollback local la `database/rollback_sgr_returns_before_6d611.sql`.
  - Raport oficial de verificare: `docs/sgr_returns_sql_apply_verification_6d611_report.md`.
- **Etapa 6D.6.11.1 (SGR Returns Non-SGR Regression SQL Hotfix)**: **Realizat** — PASS.
  - S-a creat și aplicat manual hotfix-ul `database/hotfix_sgr_returns_non_sgr_regression_6d6111.sql` în Supabase SQL Editor.
  - S-a corectat logică de inserare pentru `sale_return_items` eliminând expresia legacy `COALESCE(..., 'D')` și înlocuind-o cu `CASE WHEN sgr_enabled` în funcția `return_sale_items`.
  - S-au verificat interogările pe cataloage (removed legacy coalesce = true, grants secure to authenticated only, constraint active).
  - S-au validat toate scenariile backend (A-F) folosind `test_sgr_returns_backend_6d611.py`, Scenario F (retur non-SGR) trecând acum cu succes.
  - S-au rulat testele de regresie E2E `test_sgr_pos_checkout_e2e_6d67.py` și `test_sgr_sales_history_receipt_6d68.py` cu 100% succes.
  - Raport oficial de hotfix: `docs/sgr_returns_non_sgr_regression_hotfix_6d6111_report.md`.
  - Următorul pas: 6D.6.12 SGR Returns Frontend Integration.

- **Etapa 6D.6.12 (SGR Returns Frontend Integration)**: **Realizat** — PASS.
  - S-au extins tipurile TypeScript (`ReturnEligibilityItem`, `ReturnPreviousEntry`, `SgrType`) cu câmpurile SGR din `get_sale_return_eligibility`.
  - S-a actualizat `salesHistoryService.getSaleReturnEligibility()` cu mapare defensivă completă a câmpurilor SGR (`sgr_enabled`, `sgr_type`, `sgr_deposit_amount`, `sgr_total_amount`, `sgr_vat_group`, `sgr_vat_rate`, `sgr_returned_amount`, `sgr_available_amount`) și `sgrRefundTotal` în `previousReturns` (fallback graceful dacă backend nu îl include).
  - `ReturnSaleModal.tsx` afișează pentru fiecare item cu `sgrEnabled=true`: label garanție SGR (tip plastic/metal/sticlă, 0.50 lei/buc, TVA D 0%), SGR disponibil pentru retur, SGR deja returnat și breakdown estimativ (produs + SGR + total linie).
  - Footer modal afișează: Total produse returnate, Total garanții SGR returnate, Total de rambursat (cu `data-testid` stabile).
  - Payload `return_sale_items` trimite strict `{sale_item_id, quantity}` — backend calculează SGR automat din snapshot.
  - Non-SGR regression: blocul SGR nu apare în modal, totalul = doar produs.
  - Build de producție Vite/TypeScript PASS (`Exit code: 0`).
  - Test E2E creat: `test_sgr_returns_frontend_6d612.py` (scenarii A-K, anti-DML guard).
  - Raport oficial: `docs/sgr_returns_frontend_integration_6d612_report.md`.
  - **NU s-au modificat:** SQL/RPC live, finalize_sale, POS Checkout, Product Forms, Owner Console, Fiscal Bridge.
  - **Limitări rămase:** print/fiscal bridge retur SGR, returnare ambalaje fără bon.
  - **Următorul pas: 6D.6.13 SGR Returns E2E / Visual QA.**

- **Etapa 6D.6.13 (SGR Returns E2E / Visual QA)**: **Realizat** — PASS.
  - S-a verificat și corectat alinierea selectorilor `data-testid` în `ReturnSaleModal.tsx` (mutând `return-grand-refund-total` pe `grandRefundTotal` și adăugând `return-total-product-refund`).
  - S-au adăugat atribute de accesibilitate ARIA (`aria-label`) pe butoanele X ale modalelelor, input-urile de cantitate și butoanele plus/minus.
  - S-a implementat testul complet de Visual QA Playwright (`test_sgr_returns_visual_qa_6d613.py`) care a validat fluxul E2E de retur SGR (retur parțial, final, capping, previous returns, non-SGR regression, legacy safety).
  - S-au capturat screenshot-urile adaptate pe 4 viewports (Desktop, Laptop, Tabletă, Mobil) în `artifacts/6d613/` confirmând că interfața este complet utilizabilă și nu iese din ecran.
  - S-a rulat cu succes întreaga suită de teste de regresie: `6d613`, `6d612` (remediat), `6d611`, `6b33`, `6d67`, `6d68` și `npm run build` (PASS).
  - Raport oficial creat la `docs/sgr_returns_e2e_visual_qa_6d613_report.md`.
  - **Etapa 6G.POS.3 (Internal Barcode Generation for Products Without Barcode)**: **Realizat** — PASS.
  - S-a implementat generarea codurilor de bare interne în format standardizat **EAN-13** cu prefixul `29` (GS1 restricted circulation).
  - Câmpul de cod de bare din Adăugare Rapidă (v2) are butonul `Gen. Cod` (`data-testid="quick-add-generate-barcode-button"`).
  - Include avertizare/confirmare la înlocuirea unui cod existent, detecție automată a codului intern la tastare și badge `Cod intern generat` (`data-testid="quick-add-generated-barcode-badge"`).
  - Se efectuează verificarea unicității în baza de date cu până la 5 încercări (retry cu offset de timestamp).
  - Scanarea în POS funcționează perfect prin maparea în câmpul existent `barcode` (fără a schimba schema DB/RLS).
  - S-au validat testele E2E Playwright/static (`test_internal_barcode_generation_6gpos3.py` PASS) și build-ul Vite de producție.
  - Raport oficial creat la `docs/internal_barcode_generation_6gpos3_report.md`.
  - **Etapa 6G.POS.1.1 (POS Barcode Enter Auto-Add Hotfix)**: **Realizat** — PASS.
    - S-a implementat adăugarea automată a produsului în coș la apăsarea tastei `Enter` (pe baza codului de bare scanat/lipit).
    - Se golește inputul și se menține/resturează focusul pe inputul `pos-barcode-input` pentru scanări succesive rapide.
    - Scanarea repetată a aceluiași cod mărește cantitatea (fără a duplica linia de produs).
    - Valoarea totală SGR și totalul bonului sunt actualizate corespunzător.
    - În cazul codurilor inexistente, se afișează bannerul de avertizare `pos-barcode-not-found` sub formă de notificare non-blocking, care se ascunde automat la re-tastare.
    - S-a validat că fluxul de checkout și scrierea automată a fișierelor de comenzi FiscalNet post-checkout funcționează perfect.
    - Toate testele din suita `test_pos_barcode_enter_auto_add_6gpos11.py` și testele de regresie FiscalNet `test_fiscalnet_pos_auto_write_6gfn3.py` trec cu succes (100% PASS).
    - Raport tehnic generat la `docs/pos_barcode_enter_auto_add_6gpos11_report.md`.
  - **Următorul pas: 6G.POS.4 Barcode Label Printing sau 6G.TEST.0 Manual Aggressive POS Testing.**

- **Etapa 6AI.0 (AI Consultant Module Load Failure Audit & Hotfix)**: **Realizat** — PASS.
  - S-a auditat serviciul de date `aiConsultantDataService.ts` și s-a identificat cauza principală a erorilor `400 Bad Request`: depășirea limitei de lungime a interogării GET (URL limit) din cauza trimiterii a 705+ ID-uri de produs într-o singură clauză `.in(...)` pentru prețuri și loturi de stoc.
  - S-a implementat chunk-uirea interogărilor cu dimensiune fixă (`chunkSize = 100`) pentru `product_prices`, `stock_batches`, `sale_items` și `waste_items` în `aiConsultantDataService.ts`, aliniindu-se la bunele practici existente în codebase.
  - S-au adăugat mesaje de eroare diferențiate și ecrane specifice în `AiConsultantPage.tsx` pentru: magazin neselectat, modul dezactivat, lipsă permisiuni/RLS, erori tehnice securizate și un ecran intuitiv pentru starea de date insuficiente (empty state).
  - S-a creat și integrat testul Playwright E2E `test_ai_consultant_load_6ai0.py` care validează scenariile de încărcare, redirecționarea rutei și cleanup-ul prin RPC-uri, utilizând contexte de browser izolate.
  - Raport oficial creat la `docs/ai_consultant_load_failure_audit_6ai0_report.md`.

- **Etapa 6AI.1 (AI Consultant UI/UX Dashboard Polish)**: **Realizat** — PASS.
  - S-a reconstruit interfața grafică AI Consultant ca un dashboard operațional complet cu header interactiv, butoane de reîmprospătare a analizei și loader animat.
  - S-a implementat un grid adaptiv cu 6 KPI cards (Produse active, Valoare stoc, Vânzări, Stoc zero, Stoc scăzut, Risc expirare).
  - S-au adăugat secțiuni dedicate cu recomandări prioritizate prin coduri de culori bazate pe severitate (Critic, Warning, Info) și tabele de insight-uri detaliate.
  - S-a asigurat responsivitatea fluidă a designului pe rezoluții diverse (de la telefoane mobile la ecrane desktop 1920x1080) prin adaptarea automată a tabelelor în liste de carduri compacte.
  - Teste E2E validate prin suita `test_ai_consultant_ui_6ai1.py` și screenshot-uri Visual QA salvate în `artifacts/6ai1/`.
  - Raport oficial generat la `docs/ai_consultant_ui_dashboard_6ai1_report.md`.

- **Etapa 6AI.1.1 (AI Consultant Fullscreen Layout & Action Clarity Hotfix)**: **Realizat** — PASS.
  - S-a extins lățimea containerului principal la `max-w-[1600px]` pentru optimizare pe ecrane mari/fullscreen.
  - S-a eliminat truncarea textului din KPI cards utilizând `whitespace-normal break-words` și s-au adăugat tooltip-uri native.
  - S-a adăugat claritate recomandărilor prioritare prin secțiuni explicite de impact operațional și acțiuni recomandate concrete.
  - S-au înlocuit acțiunile generice cu butoane de explorare contextuală (e.g. `Vezi produse epuizate` navigând cu filtre pre-setate la `/produse`).
  - S-au optimizat panelurile laterale din coloana dreaptă sub formă de liste compacte flexibile când lățimea disponibilă este redusă (`isSidebar={true}`), eliminând complet scrollbar-urile orizontale.
  - S-au validat testele prin `test_ai_consultant_layout_clarity_6ai11.py` cu screenshot-uri pe 4 rezoluții salvate în `artifacts/6ai11/`.
  - Raport oficial generat la `docs/ai_consultant_layout_clarity_hotfix_6ai11_report.md`.

- **Etapa 6AI.1.2 (AI Recommendation Filters Integration in Products Page)**: **Realizat** — PASS.
  - S-au integrat filtrele de recomandare AI în pagina de produse, permițând butoanelor din AI Consultant să navigheze utilizând parametri de interogare (e.g. `/produse?aiFilter=low_stock`) și Router state.
  - Pagina `ProductsPage.tsx` citește activ filtrul din URL și state local, afișând doar produsele corespunzătoare: `low_stock` (stoc total cuprins între 1 și 5 bucăți) și `no_stock` (stoc total 0).
  - S-a adăugat o notificare de limitare cu avertisment de fallback în cazul selectării `dead_stock`, indicând necesitatea conectării cu snapshot-urile server-side.
  - S-a proiectat și implementat un banner de filtrare AI vizual premium (`products-ai-filter-banner`) cu butoane de eliminare a filtrului și redirecționare rapidă către AI Consultant.
  - S-a dezvoltat și executat cu succes testul Playwright E2E `test_ai_recommendation_product_filters_6ai12.py`, confirmând filtrarea corectă, funcționarea bannerelor, a butoanelor de curățare și a link-urilor URL directe.
  - Raport oficial generat la `docs/ai_recommendation_product_filters_6ai12_report.md`.

- **Etapa 6AI.2 (AI Server-Side Aggregation, Consent & ML Contribution Blueprint)**: **Realizat** — PASS.
  - S-a creat blueprint-ul de design pentru stocarea consimțământului granular, stocarea snapshot-urilor operaționale și a exporturilor ML.
- S-a documentat schema bazei de date cu cinci indicatori independenți de consimțământ (UI visibility, data preparation, model improvement, benchmarking, external processing), toți fiind implicit `FALSE`.
  - S-a conceput un mecanism securizat de generare a dataset-urilor fără date cu caracter personal (PII-free whitelist).
  - S-a implementat testul static de audit `test_ai_server_side_aggregation_consent_6ai2.py`.
  - Blueprint-ul bazei de date salvat la `database/proposed_ai_server_side_aggregation_consent_6ai2.sql` și rapoartele la `docs/ai_server_side_aggregation_consent_blueprint_6ai2.md` și `docs/ai_server_side_aggregation_consent_6ai2_report.md`.

- **Etapa 6AI.3 (AI Server-Side Aggregation & Consent SQL Pre-Apply Hardening)**: **Realizat** — PASS.
  - S-a efectuat auditul de compatibilitate cu schema live și s-a corectat helperul RLS la varianta plurală corectă `public.current_user_store_ids()`.
  - S-au adăugat constrângeri stricte de tip `CHECK` (semnătură consimțământ, perioadă validă, limite valori non-negative, structuri de tip JSONB object/array).
  - S-au securizat funcțiile RPC folosind `SECURITY DEFINER` și `SET search_path = public` și s-au revocat privilegiile implicite pentru `PUBLIC` și `anon`.
  - S-a implementat validarea strictă a parametrilor și a patch-ului JSONB în `update_store_ai_consent` (rejectarea cheilor necunoscute).
  - S-a creat scriptul de rollback idempotent `database/rollback_ai_server_side_aggregation_consent_6ai3.sql`.
  - S-a creat scriptul de verificare statică `test_ai_server_side_aggregation_sql_hardening_6ai3.py` care a trecut cu succes (100% PASS).
  - Niciun script SQL nu a fost executat live pe baza de date de producție în această etapă, acestea fiind pregătite ca blueprint-uri sigure de instalare.
  - Raport oficial generat la `docs/ai_server_side_aggregation_sql_hardening_6ai3_report.md`.

- **Etapa 6AI.4 (AI Server-Side Aggregation SQL Manual Apply Verification)**: **Realizat** — PASS.
  - Scriptul SQL consolidat `database/proposed_ai_server_side_aggregation_consent_6ai2.sql` a fost aplicat manual în Supabase SQL Editor de către utilizator.
  - S-a creat suita de teste automate E2E Playwright `test_ai_server_side_aggregation_apply_6ai4.py` pentru a valida funcțional structura tabelelor, constrângerile de tip CHECK, politicile RLS (izolare multi-tenant), revocarea privilegiilor anonime (execute block) și comportamentul RPC-urilor.
  - S-a verificat că stările implicite de consimțământ sunt `FALSE`, că actualizarea consent-ului validează patch-ul JSONB, că refresh-ul snapshot-ului este blocat fără consimțământ, iar crearea datasetului ML returnează NULL fără opt-in.
  - S-a confirmat popularea jurnalelor în `public.audit_logs` pentru toate operațiunile critice de actualizare, refresh și export.
  - S-au rulat toate suitele de teste din proiect (hardening, UI, load regression, layout clarity) și toate au trecut cu 100% succes.
  - Raport oficial generat la `docs/ai_server_side_aggregation_sql_apply_verification_6ai4_report.md`.
  - **Următorul pas recomandat: 6AI.5 Store Settings AI Consent UI Integration.**

---

## Stadiu Offline Data & Auto-Update (6APP)

- **Etapa 6APP.1 (NIR Placeholder & Offline Safe Mode)**: **PASS**
  - S-a adăugat o pagină placeholder curată pentru NIR cu starea "În lucru" și butonul dezactivat conform restricțiilor de securitate.
  - S-a integrat componenta de detectare a conexiunii la rețea `useNetworkStatus` cu banner-ul corespunzător în caz de offline.
  - S-au configurat etichetele dinamice de versiune și mediu de execuție ("Electron Desktop" sau "Web Sandbox").
  - S-au adăugat măsuri de securitate în mod offline (Offline Safe Mode) care blochează finalizarea vânzărilor și afișează avertismente corespunzătoare pe paginile POS, Produse și Setări.
  - Testele Playwright din `test_nir_placeholder_update_offline_6app1.py` rulează și trec cu succes.

- **Etapa 6APP.2 (Desktop Auto-Update Infrastructure)**: **PASS**
  - S-a proiectat și configurat infrastructura de auto-update prin `electron-builder` utilizând target-urile `nsis` și `portable`.
  - S-a implementat Electron IPC bridge pentru interacțiunea cu `electron-updater` securizat împotriva scurgerilor de privilegii.
  - S-a proiectat un panou de setări premium `AppUpdatePanel` cu stări de progres ale descărcării și buton de instalare cu double-confirm.
  - S-au integrat garduri de protecție la nivel de POS: instalarea actualizării este strict blocată dacă există produse active în coș.
  - Testele Playwright din `test_desktop_auto_update_6app2.py` rulează și trec cu succes.

- **Etapa 6APP.3 (Offline Data Cache & Sales Queue Blueprint)**: **PASS**
  - S-a proiectat blueprint-ul tehnic pentru baza de date locală SQLite în procesul principal Electron.
  - S-a elaborat schema detaliată a tabelelor locale (`local_products`, `local_product_prices`, `local_stock_snapshot`, `local_categories`, `local_shift_state`, `local_offline_sales_queue`, `local_sync_metadata`).
  - S-a definit politica de sincronizare periodică (full refresh zilnic, sync incremental la 15-30 minute) și validitatea cache-ului (warning la 24h, blocare totală la 48h).
  - S-a propus schema bazei de date server în `database/proposed_offline_data_cache_sales_queue_6app3.sql` conținând tabelele server (`pos_devices`, `offline_sale_sync_log`, `offline_sync_snapshots`) și RPC-uri securizate cu `SECURITY DEFINER` și `SET search_path = public`.
  - S-a proiectat protocolul de backup local append-only în format `.jsonl` sub `%APPDATA%\GestiuneMagazin\offline-backups\` pentru protecția datelor la defectarea hardware-ului terminalului.
  - S-a documentat comportamentul UI/UX și politica FiscalNet (scrie pe disc doar după sincronizare de succes).
  - Testul static din `test_offline_data_cache_sales_queue_blueprint_6app3.py` rulează și trece cu succes.

- **Etapa 6APP.4 (Offline Data Cache SQL Pre-Apply Hardening)**: **PASS**
  - S-a auditat compatibilitatea cu schema bazei de date live și s-a adaptat referențierea turelor active la tabela `public.pos_shifts`.
  - S-au adăugat constrângeri stricte de validare pe `pos_devices` (lungime fingerprint și nume) și `offline_sale_sync_log` (whitelist statusuri, format SHA-256 hex de 64 de caractere pe `payload_hash` și snapshot-uri `checksum`).
  - S-au securizat toate cele 4 RPC-uri prin clauza `SECURITY DEFINER` și `SET search_path = public` și s-au revocat explicit drepturile implicite de execuție pentru `PUBLIC` și `anon`, alocându-le doar pentru `authenticated` cu RBAC validat în tranzacție.
  - S-a proiectat și asigurat idempotency la nivel de sincronizare tranzacțională (clasificând automat duplicatele, mismatch-urile de preț/TVA/SGR și eșecurile de stoc sub formă de conflicte).
  - S-a creat scriptul de rollback idempotent `database/rollback_offline_data_cache_sales_queue_6app4.sql`.
  - S-a implementat testul static de verificare `test_offline_data_cache_sql_hardening_6app4.py`.
  - Toate testele trec cu succes, iar baza de date live Supabase și codul POS activ au rămas complet neschimbate.

- **Etapa 6APP.5 (Offline Data Cache SQL Manual Apply Verification)**: **PASS**
  - S-a verificat și confirmat aplicarea manuală a scriptului SQL pe baza de date live Supabase.
  - S-au adăugat corecții critice pentru câmpul `created_at` în query-ul pe `public.categories` și calificarea corectă la `extensions.digest` cu conversie la `bytea`.
  - S-au validat toate constrângerile catalogului, politicile RLS, drepturile RPC de securitate și izolarea datelor anonime.
  - Testele Playwright din `test_offline_data_cache_sql_apply_6app5.py` rulează și trec cu succes.
  - Raport oficial generat la `docs/offline_data_cache_sql_apply_verification_6app5_report.md`.

- **Etapa 6UX.0 (UI/UX Audit Baseline & Staged Plan)**: **PASS**
  - S-a realizat auditul baseline complet pe contrast,Spacing, butoane, responsivitate și unificarea componentelor pentru cele 15 ecrane cheie ale aplicației.
  - S-a creat raportul de audit detaliat în `docs/ui_ux_audit_baseline_6ux0_report.md` cu severitate (Critic/Major/Minor) și recomandări concrete.
  - S-a generat planul detaliat pe etape de execuție de la 6UX.1 la 6UX.6 în `docs/ui_ux_staged_plan_6ux0.md`, cu specificarea fișierelor vizate, riscurilor, metodelor de testare și restricțiilor stricte de ne-modificare.
  - S-a implementat testul static de verificare `test_ui_ux_audit_baseline_6ux0.py`.

- **Etapa 6UX.1 (Foundations, Design Tokens & Core Components)**: **PASS**
  - S-a definit setul complet de design tokens în `src/index.css` și s-a configurat `tailwind.config.js` pentru integrarea claselor utilitare `ui-*`.
  - S-au implementat 13 componente UI reutilizabile în folderul `src/shared/components/ui/` (Button, Input, Select, Card, Badge, Modal, Table, Alert, Tooltip, Tabs, PageHeader, EmptyState, LoadingState) exportate centralizat.
  - S-au aplicat corecții de contrast sigure în `ProductTable` și `Login.tsx` conform standardelor WCAG.
  - S-a implementat testul de validare static `test_ui_foundations_design_system_6ux1.py`.
  - Raport oficial generat la `docs/ui_foundations_design_system_6ux1_report.md`.

### Următorul pas recomandat:
- **`6UX.2 Layout, Navigation & Access Denied`** (Refactorizarea layout-urilor globale și restilizarea AccessDeniedCard).
- **`6APP.6 Local SQLite Cache Engine`** (Implementarea motorului SQLite local din Electron Main Process pentru caching date în client).




