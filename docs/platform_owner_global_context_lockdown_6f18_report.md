# Platform Owner Global Context Lockdown & Visual Polish — Etapa 6F.1.8

## 1. Rezumat
- **Problema identificată**: Platform Owner putea selecta un magazin din topbar-ul global, provocând scurgerea contextului de magazin în sesiunea sa administrativă globală și încărcarea sidebar-ului cu module operaționale.
- **Decizia UX**: Platform Owner este restricționat permanent la modul "Platform Administration" (fără magazin activ global). Orice selecție de magazin în scop administrativ se face exclusiv local în panourile specifice din Consolă Proprietar, fără a altera starea globală a sesiunii sau `localStorage`.
- **Ce s-a modificat**: `AuthContext`, `ProtectedRoute`, `StoreContextSwitcher`, `MainLayout`, componenta de module, taburile din consolă și cardul cu profiluri neatribuite.
- **Ce nu s-a modificat**: DB schema, RLS, RPC-uri, logica POS sau a altor module operaționale comerciale.

---

## 2. Problema inițială
- Platform Owner putea schimba `currentStoreId` global prin dropdown-ul din topbar.
- Aceasta ducea la activarea greșită a meniurilor de magazin în sidebar și risc de operare accidentală de date comerciale de către administrator.
- Design-ul Consolei Proprietar prezenta de asemenea overflow orizontal pe viewports mai mici datorită structurii tab-urilor clasice.

---

## 3. Noua regulă
- Rolul `platform_owner` rămâne permanent într-un context gol de magazin (`currentStoreId === null` global).
- Valoarea din `localStorage` pentru `selected_store_id` este ignorată sau ștearsă la login-ul ca owner.
- Toate operațiunile administrative pe magazine în Consolă Proprietar folosesc stări locale componentelor, nu starea globală.

---

## 4. AuthContext
- În `AuthContext.tsx`, logica de restaurare a magazinului selectat blochează încărcarea dacă rolul este `platform_owner`.
- Funcția `selectStore` este blocată pentru owner, înregistrând un avertisment în consolă dacă este apelată.
- Utilizatorii non-owner (admin, manager, casier, gestionar) își păstrează neschimbat fluxul de selecție globală.

---

## 5. StoreContextSwitcher
- Ordinea hook-urilor React a fost aliniată la bunele practici (înainte de orice return condițional).
- Pentru `platform_owner` se returnează un badge static ("Platform Administration" · "Fără magazin activ" · "Administrare globală") cu `aria-label` și `title` descriptiv.
- Codul owner mort din logica de dropdown a fost eliminat, dropdown-ul rămânând activ doar pentru non-owner.

---

## 6. MainLayout / Sidebar
- S-a filtrat meniul de navigare din sidebar pentru `platform_owner`.
- Sunt ascunse toate rutele operaționale comerciale (POS, Produse, Recepție, Transfer, Rapoarte, Setări Magazin).
- Se afișează o casetă informativă care explică faptul că administrarea magazinelor se face direct din Consolă Proprietar.

---

## 7. ProtectedRoute
- S-a implementat o redirecționare absolută: dacă utilizatorul are rolul `platform_owner` și încearcă să acceseze o rută ce necesită context de magazin (`requiresStoreContext`), este trimis direct la `/owner`.
- Nu se auto-selectează niciun magazin global.

---

## 8. Owner Console Local Store Selection
- În tab-ul de module, selecția magazinului se face doar local, existând un disclaimer vizual: *"Această selecție nu schimbă contextul global al aplicației."*
- Modificările efectuate aici nu scriu în `localStorage` și nu modifică `AuthContext`.

---

## 9. Visual Polish
- Tab-urile din Consolă Proprietar (`OwnerTabs.tsx`) au fost reproiectate cu un stil tip pastilă (pills) cu flex-wrap, eliminând barele de derulare orizontală pe rezoluții mobile sau tablete.
- Layout-ul listei de module a fost aerisit prin mărirea padding-ului și a gap-ului elementelor.
- Cardul de informare globală din panoul profilurilor neatribuite a fost redesenat cu o temă discretă pe tonuri slate, potrivită unui design premium administrativ.

---

## 10. Teste
S-au rulat cu succes următoarele testele E2E Playwright:
1. `test_platform_owner_global_context_lockdown_6f18.py` — Validează izolarea globală a contextului de owner, badge-ul static, sidebarul simplificat și route guards de redirecționare (22/22 scenarii PASS).
2. `test_module_entitlements_visual_qa_6f17.py` — Regresie module entitlements (31/31 scenarii PASS).
3. `test_owner_module_management_6f16.py` — Regresie module management UI (PASS).

---

## 11. Build
S-a rulat `npm run build` confirmând o compilare TypeScript complet stabilă și generarea corectă a bundle-ului de producție Vite.

---

## 12. Decizie
Aplicația este complet pregătită pentru:
- **Ready for 6F.1.9 Store Lifecycle Management Blueprint** (sau direct pentru 6G.0 Pilot Rollout Strategy dacă lifecycle este amânat).
