# Raport Tehnic Proiectare: Store Module Entitlements — Etapa 6F.1.2

## 1. Rezumatul Lucrărilor
În cadrul acestei etape, am proiectat în detaliu arhitectura sistemului de **Store Module Entitlements** (Abonamente și Activare Module per Magazin/Client). Scopul principal este realizarea unui control granular de activare/dezactivare a modulelor din platformă de către Platform Owner, decuplând complet controlul bazat pe roluri (RBAC) de cel bazat pe funcționalități (Entitlements).

Conform cerințelor etapei, **nu au fost efectuate modificări în baza de date activă, nu s-a aplicat cod SQL și nu s-a modificat codul de frontend**. Toate elementele au fost pre-auditate, planificate și salvate ca fișiere blueprint propuse și documentație tehnică.

---

## 2. Detalii Arhitecturale Proiectate

### A. Registry Oficial de Module (18 Module Platformă)
Am definit catalogul oficial al tuturor celor 18 module funcționale ale aplicației (POS, Recepție, Urmărire Expirări, Consultant AI, Rapoarte TVA, etc.). Fiecare modul este configurat cu:
- Identificator unic `module_key`.
- Mapare rute URL asociate (`route_paths`) pentru Route Guard.
- Roluri minime admise (RBAC).
- Dependențe directe (ex: `expiration_tracking` cere prezența `products`).
- Stare de disponibilitate în platformă (`status`: active, beta, disabled, planned).

### B. Structură Bază de Date (Model Stocare Dedicat)
După o analiză comparativă între stocarea în format JSONB în tabela `stores` și folosirea unor tabele dedicate, s-a selectat **Varianta Tabelelor Dedicate** pentru a asigura auditabilitatea și performanța de nivel Enterprise.
1. **Tabela `platform_modules`**: Catalogul centralizat al modulelor platformei.
2. **Tabela `store_module_access`**: Tabelă de legătură ce mapă activarea modulelor per magazin. Conține atribute de audit: `enabled_by`, `enabled_at`, `disabled_at` și `reason`.
3. **Indexuri optimizate**: Indexuri parțiale pentru interogarea rapidă a modulelor active (`enabled = true`).
4. **Triggeri**: Conectarea la trigger-ul existent `public.update_updated_at_column()` pentru auto-actualizarea `updated_at`.
5. **RLS (Row Level Security)**: 
   - `platform_modules`: citire de către utilizatorii autentificați, scriere permisă doar pentru `platform_owner`.
   - `store_module_access`: citire de către membrii magazinului respectiv sau `platform_owner`, scriere exclusivă `platform_owner`.

### C. Interfețe API (RPC Functions)
Am proiectat 5 funcții RPC sigure (`SECURITY DEFINER`, cu `search_path = public` și revocare drepturi publice):
- `get_platform_modules()`: Listarea cataloagelor.
- `get_store_module_access(p_store_id)`: Preluarea stărilor curente pentru un magazin.
- `set_store_module_access(p_store_id, p_module_key, p_enabled, p_reason)`: Activarea/dezactivarea individuală cu logare automată în tabela `audit_logs`.
- `bulk_set_store_modules(p_store_id, p_modules)`: Activare în masă în aceeași tranzacție atomică.
- `user_can_access_store_module(p_store_id, p_module_key)`: Poarta principală de verificare a accesului pe baza identității token-ului JWT (rol utilizator + stare entitlement magazin).

---

## 3. Strategia de Integrare în Frontend

1. **Route Guard Adaptiv (`ProtectedRoute.tsx`)**:
   - Extinderea wrapper-ului pentru a mapa calea URL curentă la cheia modulului.
   - Restricționarea accesului direct prin URL la paginile dezactivate și afișarea unui ecran elegant cu mesaj personalizat (ex: „Modulul [X] nu este activat pentru magazinul dumneavoastră”).
2. **Filtrare Sidebar (`MainLayout.tsx`)**:
   - Ascunderea linkurilor din sidebar dacă magazinul curent nu are entitlement activat sau dacă modulul este dezactivat la nivel global de platformă.
3. **State Management & Cache**:
   - Citirea stărilor la schimbarea magazinului în `AuthContext` și păstrarea lor în cache local (`enabledModules: string[]`), evitând request-uri repetate pe parcursul sesiunii.

---

## 4. Preset-uri Comerciale (Planuri)
Am proiectat configuratorul de planuri comerciale pentru a automatiza procesul de activare în Owner Console:
- **Basic**: `dashboard`, `products`, `pos`, `sales_history`.
- **Standard**: *Basic* + `reception`, `loss_reporting`, `waste_audit`, `store_settings`.
- **Premium**: *Standard* + `expiration_tracking`, `transfer`, `commercial_reports`, `quick_add`.
- **Enterprise**: *Premium* + `ai_consultant`, `advanced_returns`, `vat_reports` (plus configurări opționale pentru `fiscal_bridge` și `offline_sync`).

---

## 5. Aliniere cu Separarea Contextului de Platform Owner (6F.1.1)
Acest blueprint construiește pe baza logică din etapa anterioară (6F.1.1), asigurând că:
- Cât timp utilizatorul `platform_owner` se află în **Platform Administration** (fără magazin selectat), toate modulele operaționale sunt dezactivate, iar verificările de entitlement pentru ele returnează `false` în mod securizat.
- Drepturile sunt evaluate dinamic imediat ce un magazin este selectat în Store Context Switcher.

---

## 6. Fișiere Create și Modificate
- **[NEW] Blueprint SQL**: [proposed_store_module_entitlements_6f12.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/proposed_store_module_entitlements_6f12.sql)
- **[NEW] Ghid Blueprint Arhitectural**: [store_module_entitlements_blueprint_6f12.md](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/docs/store_module_entitlements_blueprint_6f12.md)
- **[NEW] Raport Tehnic**: [store_module_entitlements_6f12_report.md](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/docs/store_module_entitlements_6f12_report.md)
- **[MODIFY] Raport Istoric Context Hotfix**: [platform_owner_context_hotfix_6f11_report.md](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/docs/platform_owner_context_hotfix_6f11_report.md)
