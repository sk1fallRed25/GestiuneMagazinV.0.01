# Store Module Entitlements SQL Pre-Apply Hardening — Etapa 6F.1.3

## 1. Rezumat
- **Status**: Ready for manual SQL apply / Needs review
- **Bază de date modificată**: Nu (Doar fișierul SQL blueprint a fost modificat și securizat)
- **Frontend modificat**: Nu (Planificat și izolat)

În cadrul acestei sub-etape, am realizat auditul read-only al schemei active în baza de date Supabase și am întărit blueprint-ul SQL `database/proposed_store_module_entitlements_6f12.sql` pentru a elimina riscurile de securitate, a alinia stocarea jurnalizării la structura reală a tabelei `audit_logs` și a adăuga validări tranzacționale pentru dependențele dintre module.

---

## 2. Audit Live Schema

Am auditat prin interogări directe structurile active din baza de date a magazinului pentru a ne asigura de compatibilitate completă:

### A. Helperi Existenți în Schema Publică
- **`public.is_platform_owner()`**: Returnează `boolean`. Rulează cu `SECURITY DEFINER` și `SET search_path = public`. Verifică dacă utilizatorul curent are rolul `'platform_owner'` în tabela `profiles`. Poate fi utilizat în siguranță în RLS.
- **`public.current_user_store_ids()`**: Returnează o tabelă cu o singură coloană: `store_id uuid`. Rulează cu `SECURITY DEFINER` și `SET search_path = public`.
- **`public.has_store_role(p_store_id uuid, p_allowed_roles text[])`**: Returnează `boolean`. Verifică apartenența utilizatorului activ la magazin și rolul acestuia.
- **`public.update_updated_at_column()`**: Funcție trigger standard (fără `SECURITY DEFINER`, ceea ce este corect) folosită pentru setarea automată a timestamp-ului `updated_at`.

### B. Structură Tabele Existente
- **`public.stores`**: Conține coloanele `id`, `name`, `active` (boolean, nullable), `settings` (JSONB) etc.
- **`public.profiles`**: Conține constrângerea de verificare `profiles_role_check` limitată la valorile: `('platform_owner', 'admin', 'manager', 'gestionar', 'casier')`.
- **`public.store_members`**: Conține constrângerea `store_members_role_check` limitată la: `('admin', 'manager', 'gestionar', 'casier')`.
- **`public.audit_logs`**: Conține coloanele reale în format `snake_case`:
  - `id` (uuid)
  - `store_id` (uuid)
  - `profile_id` (uuid)
  - `action` (text)
  - `entity_type` (text)
  - `entity_id` (uuid)
  - `old_data` (jsonb)
  - `new_data` (jsonb)
  - `ip_address` (text)
  - `created_at` (timestamptz)

---

## 3. Table Hardening

Am adăugat constrângeri și indexuri defensive în tabela blueprint:

### A. platform_modules
- Constrângeri pe formatul `module_key`: `CHECK (module_key = lower(module_key) AND module_key ~ '^[a-z0-9_]+$')` pentru a bloca caractere ilegale sau majuscule.
- Constrângeri pe categoriile de module: `CHECK (category IN ('core','stock','sales','admin','reports','ai','fiscal','offline','platform'))`.
- Constrângeri pe stările modulului: `CHECK (status IN ('active','beta','disabled','planned'))`.
- Constrângeri de tip pentru rute: `CHECK (jsonb_typeof(route_paths) = 'array')`.
- Am adăugat comentarii detaliate (`COMMENT ON COLUMN...`) pentru toate coloanele importante pentru a asigura trasabilitatea DBA.

### B. store_module_access
- Constrângere pentru structura metadatelor: `CHECK (jsonb_typeof(metadata) = 'object')`.
- Indexuri suplimentare:
  - `idx_store_module_access_enabled_by` pe coloana de audit `enabled_by`.
  - `idx_store_module_access_updated_at` (ordonare descrescătoare) pentru audit rapid în consolele de administrare.

---

## 4. RLS & Grants

### A. Politici RLS cu `WITH CHECK` explicit
Am adăugat clauza `WITH CHECK` pentru a ne asigura că regulile de securitate sunt verificate atât la interogare (USING), cât și la inserare/actualizare (CHECK):
- **`platform_modules`**: `WITH CHECK (public.is_platform_owner())`
- **`store_module_access`**: `WITH CHECK (public.is_platform_owner())`

### B. Decizie Arhitecturală: Acces DML RPC-only
Pentru a împiedica bypass-ul logicii de audit și al validărilor de dependențe:
- Am revocat toate permisiunile de DML direct (`INSERT`, `UPDATE`, `DELETE`) de pe tabele pentru rolul `authenticated`.
- Utilizatorii pot citi tabelele (SELECT) în funcție de politicile RLS (membrii își văd magazinul, Platform Owner vede tot).
- Orice scriere sau actualizare de stare este permisă **exclusiv prin apelarea funcțiilor RPC** securizate cu `SECURITY DEFINER`.

---

## 5. RPC Hardening

### A. `get_platform_modules()`
- Am înlocuit `SELECT *` cu specificarea explicită a coloanelor pentru a preveni erori la modificări viitoare de schemă.
- Ordonare stabilă: `category`, `name`, `module_key`.

### B. `get_store_module_access(p_store_id)`
- Redenumit conceptual ca **Effective Access Provider**.
- Face un `LEFT JOIN` între catalogul de module (`platform_modules`) și override-urile explicite din `store_module_access`.
- Returnează valoarea calculată `effective_enabled = COALESCE(sma.enabled, pm.default_enabled)`.
- Dacă modulul are status global `disabled` sau `planned`, `effective_enabled` returnează direct `false`.
- Validează că `p_store_id` nu este null pentru utilizatorii non-owner.

### C. `set_store_module_access(...)`
- Returnează `JSONB` în loc de `VOID` pentru a oferi confirmare structurată în UI (ok, storeId, moduleKey, enabled, reason, changed, effectiveEnabled).
- Fallback automat pentru motiv (`reason`): `Activat administrativ` / `Dezactivat fără motiv specificat` în caz de trimitere string gol.

### D. `bulk_set_store_modules(...)`
- Returnează statistici sub formă de `JSONB`: `updatedCount`, `enabledModules` (array), `disabledModules` (array), `skippedModules` (array).
- Rulează atomic într-o singură tranzacție (orice eroare anulează tot bulk-ul).

### E. `user_can_access_store_module(...)`
- Întărit comportamentul pentru `platform_owner` (respectă starea `effective_enabled` dacă este specificat `p_store_id` pentru a reflecta vizualizarea clientului, dar nu cere magazin pentru module globale precum `owner_console`).
- Suport complet pentru rolul local din magazin (`store_members.role`) în detrimentul rolului global (`profiles.role`) pentru angajați.

---

## 6. Gestiunea Dependențelor

Am implementat un sistem robust de validare a dependențelor direct în baza de date:
- **La Activare**: Se verifică recursiv vectorul `dependencies` al modulului solicitat. Dacă vreun modul dependent nu este activ pe magazinul client, se aruncă o excepție clară (ex: *"Nu se poate activa modulul expiration_tracking. Este necesară activarea prealabilă a modulului: products"*).
- **La Dezactivare**: Se scanează dacă alte module active din magazin depind de cel curent. Dacă da, dezactivarea este blocată (ex: *"Nu se poate dezactiva modulul products deoarece modulul activ pos depinde de el"*).

---

## 7. Seeding & Defaults
- Seeding-ul este complet idempotent (`ON CONFLICT DO UPDATE`).
- Modulul comercial `ai_consultant` a fost configurat implicit pe `default_enabled = false`.
- Nu se execută backfill masiv în baza de date pentru magazinele existente. La aplicare, toate magazinele folosesc dinamic fallback-ul la `default_enabled`, reducând amprenta de stocare la zero până la realizarea primului override explicit din Owner Console.

---

## 8. Alinierea Jurnalizării de Audit
- Logurile de audit sunt înregistrate în tabela reală `audit_logs`, folosind structura de date confirmată:
  - Coloana `old_data`: `{ "enabled": boolean }`
  - Coloana `new_data`: `{ "enabled": boolean, "reason": text, "module_key": text }`
  - Acțiuni: `store.module_enable` / `store.module_disable`.

---

## 9. Riscuri Rămase & Integrare Viitoare
- **Garda Frontend**: Va trebui integrat apelul `user_can_access_store_module` în `ProtectedRoute.tsx` și `MainLayout.tsx`.
- **Backend Checking**: Pentru securizare maximă, RPC-urile operaționale (ex: `finalize_sale`, `receive_stock`) vor trebui să verifice intern entitlement-ul magazinului înainte de scrierea tranzacției.

---

## 10. Decizie

> [!TIP]
> **Ready for 6F.1.4 Module Entitlements SQL Apply Verification**  
> Blueprint-ul SQL este complet întărit, auditat în raport cu schema live și pregătit pentru testarea read-only în sandbox/editorul SQL.
