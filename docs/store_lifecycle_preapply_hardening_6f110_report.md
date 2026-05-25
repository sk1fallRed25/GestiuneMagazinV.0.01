# Raport: Store Lifecycle SQL Pre-Apply Hardening — Etapa 6F.1.10

## 1. Rezumat
- **Status**: **Ready for manual SQL apply** (Blueprint-ul SQL este complet securizat și pregătit pentru faza de aplicare manuală în editorul SQL Supabase în Etapa 6F.1.11).
- **Bază de date modificată**: **Nu** (Toate propunerile sunt salvate ca blueprint-uri scriptice, nicio modificare nu a fost aplicată pe baza de date live).
- **Frontend modificat**: **Nu** (Nu s-a modificat nicio componentă de UI).
- **Scopul etapei**: Auditarea statică a schemei de date active din proiect și întărirea din punct de vedere al securității și tranzacționalității a blueprint-ului SQL creat în Etapa 6F.1.9, rezolvând problemele de securitate ale funcțiilor de eligibilitate și neutralizând operațiunea distructivă de hard delete.

---

## 2. Audit Live Schema
În urma analizei fișierelor de schemă din baza de date (`001_clean_schema_core.sql`, `002_clean_schema_inventory.sql`, `003_clean_schema_sales.sql`, `004_clean_schema_reception_waste.sql` și `005_clean_schema_sync_audit.sql`), s-au confirmat următoarele aspecte de compatibilitate:

### Tabela `public.stores`:
- Conține coloana `active` de tip `boolean` (implicit `true`).
- Conține coloanele standard `created_at` și `updated_at`.
- Dispune de un trigger automată pe `updated_at` care apelează funcția helper `public.update_updated_at_column()`.

### Tabele dependente (ON DELETE CASCADE):
S-a confirmat că tabelele de mai jos sunt legate de `stores(id)` prin constrângeri de tip `ON DELETE CASCADE`. Aceasta înseamnă că ștergerea fizică a unui magazin va șterge iremediabil toate înregistrările tranzacționale aferente magazinului respectiv:
- `store_members`, `devices`, `categories`, `products`, `product_prices`, `stock_batches`, `stock_movements`, `pos_shifts`, `cashier_shifts` (legacy), `sales`, `sale_items`, `payments`, `receptions`, `reception_items`, `waste_events`, `waste_items`, `sale_returns`, `sale_return_items`, `client_events`, `sync_conflicts`, `audit_logs`, `error_reports`.

### Structura tabelei `public.audit_logs`:
Structura reală din baza de date se potrivește perfect cu logica de scriere din blueprint-ul SQL:
- `store_id` (UUID references stores)
- `profile_id` (UUID references profiles)
- `action` (TEXT)
- `entity_type` (TEXT)
- `entity_id` (UUID)
- `old_data` (JSONB)
- `new_data` (JSONB)
- `created_at` (TIMESTAMPTZ)

### Semnături funcții helper din baza de date:
- `public.is_platform_owner() RETURNS boolean` (SECURITY DEFINER, verifică dacă `role = 'platform_owner'`).
- `public.current_user_store_ids() RETURNS TABLE(store_id uuid)` (SECURITY DEFINER, returnează store id-urile active ale userului).
- `public.has_store_role(p_store_id uuid, p_allowed_roles text[]) RETURNS boolean` (SECURITY DEFINER, verifică permisiunea la nivel de magazin).
- `public.update_updated_at_column() RETURNS trigger` (helperul pentru updated_at).

---

## 3. Decizie privind "Hard Delete"
Ștergerea fizică a unui magazin este o operațiune de risc maxim:
1. ** cascade delete**: Date istorice de vânzări și stocuri pot fi distruse involuntar.
2. **Ștergerea logului de audit**: Din cauză că `audit_logs` are `ON DELETE CASCADE` pe legătura cu `stores`, logul de audit care arată că magazinul a fost șters (`store.hard_delete`) se va șterge automat împreună cu magazinul! Acest lucru elimină orice trasabilitate.

### Decizie pentru MVP:
- **NU aplicăm hard delete real** în primul rollout.
- Funcția `hard_delete_store_if_eligible` a fost transformată într-un **stub defensiv** care returnează o excepție controlată:
  `RAISE EXCEPTION 'Hard delete is disabled in this release. Use archive_store for real clients.';`
- Pentru toți clienții reali se impune starea de arhivă (`archive_store`), care păstrează datele ca read-only.
- Ștergerea definitivă a magazinelor eligibile va fi implementată separat în etapa viitoare: **6F.1.14 Store Hard Delete Export/Tombstone & Final Deletion** (unde se vor defini procese de backup securizate și tombstone tabele).

---

## 4. Întărirea RPC-urilor (Security Hardening)
Toate cele 8 RPC-uri au fost revizuite și complet securizate prin:
- **`SECURITY DEFINER`** și **`SET search_path = public`** pe fiecare funcție pentru a elimina riscurile de escaladare a privilegiilor și atacuri de tip search-path shadowing (recomandare Supabase Advisor).
- Verificarea explicită **`public.is_platform_owner()`** la începutul fiecărui RPC, inclusiv în funcția de eligibilitate.
- Validarea existenței magazinului și ridicarea unei excepții dacă ID-ul trimis nu există.
- Utilizarea clauzei **`SELECT FOR UPDATE`** la începutul operațiunilor de scriere pe tabela `stores` pentru a bloca rândul respectiv și a preveni actualizările concurente nesigure.
- Validarea motivelor: Toate câmpurile de motiv (`p_reason`) sunt trim-uite (`trim(p_reason)`) și trebuie să aibă o lungime minimă de 3 caractere.

### Matricea de Tranziție a Stărilor Enunțată în Cod:
- `active -> suspended` (Permis)
- `active -> archived` (Permis)
- `active -> pending_deletion` (Permis doar dacă eligibilitatea este pozitivă)
- `suspended -> active` (Permis)
- `suspended -> archived` (Permis)
- `suspended -> pending_deletion` (Permis doar dacă eligibilitatea este pozitivă)
- `archived -> active` (Permis doar pentru Platform Owner cu motiv)
- `archived -> pending_deletion` (Permis doar dacă eligibilitatea este pozitivă)
- `pending_deletion -> active` (Permis prin `cancel_store_deletion_request`)
- `pending_deletion -> archived` (Permis prin `archive_store`)
- `deleted` (Tombstone - nicio tranziție permisă)

---

## 5. Întărirea Verificărilor de Eligibilitate
Funcția `get_store_deletion_eligibility(p_store_id)` a fost extinsă pentru a număra înregistrările din toate cele **18 tabele din schema reală de date**:
1. `sales` (vânzări finalized)
2. `pos_shifts` (ture POS active sau închise)
3. `cashier_shifts` (ture legacy)
4. `stock_movements` (istoric modificări stocuri)
5. `stock_batches` (loturi de stoc active cu cantitate > 0)
6. `sale_returns` (bonuri stornate)
7. `waste_events` (evenimente de casare/pierderi)
8. `store_members` (membri activi)
9. `store_module_access` (configurații de acces module)
10. `audit_logs` (jurnale de audit generate de magazin)
11. `receptions` (recepții de marfă)
12. `reception_items` (linii de recepție)
13. `waste_items` (linii de casare)
14. `client_events` (evenimente offline stocate)
15. `sync_conflicts` (conflicte de sincronizare client-server)
16. `error_reports` (rapoarte de erori generate)
17. `products` (produse din catalog)
18. `product_prices` (prețuri setate per produs)
19. `categories` (categorii din catalog)
20. `devices` (dispozitive asociate)

Dacă oricare dintre aceste tabele conține vreo înregistrare legată de `store_id`, valoarea `canDelete` devine `false`, iar acțiunea recomandată este forțată pe `archive`.

---

## 6. Jurnalizarea Auditului (Audit Logs)
Toate operațiunile loghează automat în `public.audit_logs`:
- **Acțiuni**: `store.suspend`, `store.reactivate`, `store.archive`, `store.deletion_request`, `store.cancel_deletion`, `store.hard_delete_blocked`.
- **Date logate**:
  - `old_data`: JSONB care conține statusul lifecycle precedent (`old_lifecycle_status`).
  - `new_data`: JSONB care conține noul status (`new_lifecycle_status`), motivul trimis de Platform Owner (`reason`) și raportul de eligibilitate complet (unde este cazul).

---

## 7. Drepturi și Permisiuni (Grants)
S-a implementat o politică restrictivă de acces la nivel de bază de date:
- Dreptul de execuție pe toate cele 8 RPC-uri a fost **revocat în mod explicit** de la rolurile `PUBLIC` și `anon`.
- Permisiunea de execuție a fost acordată exclusiv rolului `authenticated` (care oricum va fi verificat la runtime de helperul `public.is_platform_owner()`).

---

## 8. Sincronizarea Active / Lifecycle
Trigger-ul `sync_store_active_with_lifecycle` a fost optimizat:
- Nu folosește `SECURITY DEFINER` nejustificat, prevenind abuzul de privilegii.
- Setarea explicită `SET search_path = public` previne problemele de securitate semnalate de Supabase Advisor.
- Sursa de adevăr este exclusiv `lifecycle_status`, iar coloana `active` este un flag legacy de citire (sincronizat automat la `true` doar când statusul este `active`). Modificările manuale din exterior direct pe coloana `active` vor fi rescrise de trigger pentru a menține consistența.

---

## 9. Note de Integrare Viitoare (Integration Notes)
Pentru etapele viitoare de implementare (6F.1.12 în Owner Console și 6F.1.13 E2E):
1. **Frontend / AuthContext**: Când utilizatorul se autentifică, contextul de magazin nu trebuie să permită selectarea magazinelor unde `lifecycle_status` este diferit de `active` (pentru roluri non-owner).
2. **Frontend / Route Guarding**: Adăugarea unui control la nivel de rută de magazin pentru a redirecționa automat utilizatorul către o pagină tip `SuspendedStorePage` dacă magazinul asociat devine inactiv la runtime.
3. **Backend / RPCs operaționale**: În etapele de hardening viitoare, toate RPC-urile tranzacționale (`finalize_sale`, `receive_stock`, `transfer_stock`, `record_waste`) trebuie să conțină o verificare la început:
   `IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id AND lifecycle_status = 'active') THEN RAISE EXCEPTION 'Store is not active.';`
4. **Owner Console UI**: În panoul magazinelor se vor afișa badge-uri cu statusul exact, iar modalele de suspendare/arhivare vor fi controlate prin butoane cu ID-uri stabile pentru a fi testabile automat.

---

## 10. Riscuri Rămase
- **Lipsa procedurii de export**: Deoarece hard delete-ul real este blocat, nu există încă o procedură automată pentru exportul complet al bazei de date (JSON/CSV) pentru magazin înainte de curățare.
- **Păstrarea datelor fiscale**: Clienții care solicită ștergerea definitivă, dar au activitate comercială înregistrată, nu pot fi șterși fizic din cauza legislației de reținere a datelor fiscale din România (care cere păstrarea datelor contabile pe o perioadă de 5-10 ani). Arhivarea rămâne singura opțiune validă.

---

## 11. Decizie
- [x] **Ready for 6F.1.11 Store Lifecycle SQL Apply Verification** (Blueprint-ul SQL este pregătit și imunizat din punct de vedere al securității și consistenței datelor).
- [ ] **Needs 6F.1.10.1 SQL Hotfix** (Sunt necesare ajustări suplimentare înainte de aplicare).
