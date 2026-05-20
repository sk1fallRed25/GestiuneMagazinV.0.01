# Sales Advanced Returns Pre-Apply Hardening — Etapa 6B.3.0

## 1. Rezumat
- **Ce s-a verificat**: Existența tabelelor `sale_returns` și `sale_return_items`, check constraints-urile pe statusuri/tipuri, existența și semnăturile funcțiilor de securitate/roluri și datele din testele anterioare.
- **Ce se implementează în 6B.3**:
  - Un flux tranzacțional complet pentru retururi parțiale sau totale pe articole selectate.
  - RPC-ul `get_sale_return_eligibility` (pentru frontend).
  - RPC-ul `return_sale_items` (pentru executarea returului cu actualizarea stocurilor, generare de mișcări tip `return` și auditare).
  - Indexuri adiționale de optimizare.
  - Patch de reconciliere a numerarului în tura POS activă/la închidere (`get_active_pos_shift`, `close_pos_shift`).
- **Ce NU se implementează încă**:
  - Interfața utilizator (frontend UI/UX) pentru returul parțial (rezervată pentru 6B.3.2).
  - Tabela `refund_payments` (se folosește direct `refund_method` și `total_refund` pe antet în MVP pentru simplitate și performanță).
  - Retururi fără tură POS deschisă sau pentru alți utilizatori decât managerii/administratorii.

---

## 2. Verificări Supabase Read-Only
Prin interogări read-only efectuate în baza de date Supabase, am confirmat starea curentă a schemei:
- **Tabele existente**:
  - `sale_returns` și `sale_return_items` există în schema `public`.
  - `refund_payments` **nu există** în baza de date (se va folosi structura MVP simplificată).
- **Constrângeri active**:
  - `sales_status_check`: Permite stările `partially_returned` și `returned`, pe lângă `finalized`, `voided`, `pending` și `cancelled`.
  - `stock_movements_type_check`: Permite tipul `return` (pe lângă `void`, `sale` etc.).
  - `sale_returns_type_check`: Permite tipul `return`.
  - `sale_returns_status_check`: Permite statusul `completed` și `cancelled`.
  - `sale_returns_refund_method_check`: Permite metodele `cash`, `card`, `voucher`, `mixed`.
- **RPC-uri**:
  - Funcțiile `return_sale_items` și `get_sale_return_eligibility` nu sunt create în schema publică, lăsând cale liberă pentru aplicarea noului blueprint.
- **Semnături de securitate**:
  - Funcția `has_store_role(p_store_id uuid, p_allowed_roles text[])` și `is_platform_owner()` sunt confirmate ca funcționale și securizate cu `SECURITY DEFINER`.

---

## 3. Decizii MVP (Business & Tehnic)
- **Cine poate efectua retururi**: Strict utilizatorii cu rolul `admin`, `manager` sau `platform_owner` (recomandat în MVP pentru a reduce semnificativ frauda la POS). Casierii simpli nu au permisiunea de a iniția retururi.
- **Statusuri eligibile**: Bonurile cu statusul `finalized` sau `partially_returned`. Bonurile care sunt deja `voided`, `returned` sau `cancelled` sunt **blocate**.
- **Metode de rambursare**: Single payment (`cash`, `card` sau `voucher`). Rambursarea de tip `mixed` este păstrată în constrângeri pentru viitor, dar nu este suportată direct în logica MVP-ului din această etapă.
- **Tură de retur**: Operatorul (manager/admin) care procesează returul trebuie să aibă o tură POS deschisă activă în magazin. Suma rambursată cash va afecta direct numerarul acestei ture active (nu tura originală a vânzării).
- **Stoc & Lot (Batch)**: Returul readuce stocurile exclusiv pe lotul original (`batch_id` de pe linia de vânzare). Dacă `batch_id` lipsește, se face fail-fast (eroare tranzacțională) pentru a preveni dereglarea trasabilității stocurilor.

---

## 4. Structura SQL Propusă
Fișierul [proposed_sales_returns_advanced_6b3.sql](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/database/proposed_sales_returns_advanced_6b3.sql) conține:
- **Indexuri**: Creare indexuri de performanță pe cheile străine din retururi.
- **`get_sale_return_eligibility`**: Calculează în timp real cantitățile disponibile pentru retur pe fiecare articol (cantitatea vândută minus cantitățile deja returnate din retururi finalizate `completed`), plus metodele permise de refund.
- **`return_sale_items`**: Procesează tranzacțional lista de articole, blochează rândurile (`FOR UPDATE`), validează stocurile și loturile, actualizează stocul pe lot, scrie mișcările de stoc de tip `return`, actualizează statusul vânzării (`partially_returned` sau `returned`) și creează logul de audit.
- **Patch Reconciliere Ture**:
  - Modifică `get_active_pos_shift` și `close_pos_shift` pentru a include plățile din bonurile cu stările `partially_returned` și `returned` (astfel încât tura originală unde s-a vândut bonul să nu piardă retroactiv datele istorice).
  - Scade sumele returnate cash (`total_cash_refunds`) din numerarul așteptat în tura curentă în care s-a efectuat returul (`expected_cash = opening_cash + total_cash - total_cash_refunds`).

---

## 5. Reguli de Securitate
- **SECURITY DEFINER**: Toate funcțiile folosesc `SECURITY DEFINER` și forțează contextul securizat `SET search_path = public`.
- **Restricționare Granturi**:
  - Drepturile pentru `PUBLIC` și `anon` sunt revocate în mod explicit.
  - Doar utilizatorii autentificați (`authenticated`) primesc drept de execuție pe RPC-uri.
- **Validări RLS**: Tabela `sale_returns` și `sale_return_items` au politici RLS active care verifică apartenența la store și rolurile staff-ului.

---

## 6. Analiză de Riscuri & Atenuare
- **Frauda la POS**: Blocat prin limitarea execuției retururilor doar la manageri/administratori.
- **Double Return (Sincronizare concurentă)**: Atenuat prin blocarea explicită a vânzării și a liniilor de bon (`FOR UPDATE`) în cadrul aceleiași tranzacții.
- **Reconcilierea Turei**: Protejată prin patch-ul din `close_pos_shift` care ține cont de stările `partially_returned` / `returned` ale vânzărilor istorice și de retururile cash din tura curentă.
- **Loturi lipsă**: Blocat prin validarea strictă (fail-fast) a câmpului `batch_id` pe linii.

---

## 7. Pași Următori
1. **Aplicare manuală SQL**: Aplicarea scriptului `database/proposed_sales_returns_advanced_6b3.sql` de către administratorul bazei de date.
2. **Verificare 6B.3.1**: Verificarea read-only în Supabase a corectitudinii aplicării procedurilor și indexurilor.
3. **Integrare UI 6B.3.2**: Integrarea modalului de retur parțial în frontend-ul Istoricului de Vânzări.
4. **E2E 6B.3.3**: Rularea testelor end-to-end automate pentru confirmarea integrității fluxului.

---

## 8. Decizie
> [!IMPORTANT]
> **Ready for manual SQL apply**. Scriptul este testat din punct de vedere sintactic, logic și de permisiuni și este gata pentru a fi aplicat în baza de date.
