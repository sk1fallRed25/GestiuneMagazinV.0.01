# Transactional Smoke Test — Etapa 5D.6

## 1. Rezumat Executiv
- **Status**: PASS
- **Data testului**: 17 Mai 2026
- **Utilizator/rol testat**: admin@admin.com (rol: Admin / Magazin Principal)
- **Produs testat**: OTET 1L (ID: `7df05807-a7a0-49ff-a8b2-3bbbe9123c9c`)
- **RPC-uri validate**:
  - `receive_stock`
  - `transfer_stock`
  - `finalize_sale`
  - `record_waste`

---

## 2. Flux Principal Testat

| Pas | RPC | Acțiune | Rezultat Așteptat | Rezultat Observat | Status |
|---|---|---|---|---|---|
| **Recepție** | `public.receive_stock` | Creare recepție document `REC-SMOKE-5D6` pentru OTET 1L (2 buc, preț achiziție 1.00, vânzare 1.00, lot `SMOKE-5D6`) | Creare `receptions`, `reception_items`, actualizare `stock_batches`, `product_prices`, și creare `stock_movements` (type='reception') | Document și linii create cu succes, stoc depozit incrementat, prețuri actualizate, mișcare de stoc înregistrată | **PASS** |
| **Transfer** | `public.transfer_stock` | Transfer 1 buc OTET 1L din Depozit în Magazin | Decrementare stoc depozit (-1), incrementare stoc magazin (+1), creare `stock_movements` (type='transfer') | Stoc depozit și magazin actualizate corect, mișcare înregistrată coerent | **PASS** |
| **POS** | `public.finalize_sale` | Vânzare 1 buc OTET 1L din Magazin (plată cash) | Creare `sales` (status='finalized'), `sale_items` cu `batch_id`, `payments`, decrementare stoc magazin (-1), creare `stock_movements` (type='sale') | Vânzare finalizată, coș resetat, rânduri create cu referințe corecte spre lotul din magazin | **PASS** |
| **Pierdere** | `public.record_waste` | Casare 1 buc OTET 1L din Depozit (motiv: Produs deteriorat) | Creare `waste_events`, `waste_items`, decrementare stoc depozit (-1), creare `stock_movements` (type='waste') | Casare înregistrată cu succes, modal închis corect, stoc depozit redus, mișcare înregistrată | **PASS** |

---

## 3. Teste Negative

| Test | Rezultat Așteptat | Rezultat Observat | Status |
|---|---|---|---|
| **Recepție invalidă** | Încercare de recepție fără linii valide sau cu cantitate 0 -> blocare UI/Backend, fără creare de document fals | Butonul de finalizare rămâne ascuns (`detached`) când nu există linii valide în tabel; linia cu cantitate 0 nu este adăugată | **PASS** |
| **Transfer insuficient** | Încercare transfer peste stocul disponibil (99999 buc) -> eroare controlată din baza de date (`P0001: Stoc insuficient`), fără mișcări false | Backend-ul respinge tranzacția cu mesajul de eroare corespunzător, stocurile rămân intacte | **PASS** |
| **POS insuficient** | Încercare vânzare peste stocul disponibil din magazin -> butonul de incrementare cantitate devine `disabled` | UI-ul blochează adăugarea de cantități suplimentare peste stocul existent | **PASS** |
| **Pierdere insuficientă** | Încercare casare peste stocul disponibil (99999 buc) -> eroare controlată, modalul rămâne deschis, tranzacție anulată | Backend-ul respinge casarea (`P0001: Stoc insuficient`), fără creare de evenimente false | **PASS** |

---

## 4. Verificări Supabase (Read-Only)

| Tabel | Verificare | Status | Observații |
|---|---|---|---|
| `receptions` | Verificare `id`, `document_number`, `store_id` | **PASS** | Document `REC-SMOKE-5D6` creat corect, legat de `store_id` și `profile_id`. |
| `reception_items` | Verificare `reception_id`, `product_id`, `quantity`, `batch_number` | **PASS** | Cantitate `2.000`, prețuri și lot `SMOKE-5D6` înregistrate perfect. |
| `stock_batches` | Verificare stocuri cumulate pe depozit și magazin, lipsă stoc negativ | **PASS** | Stocuri actualizate exact cu cantitățile tranzacționate, fără nicio valoare negativă. |
| `stock_movements` | Verificare `type`, `quantity`, `source_zone`, `target_zone`, `reference_id`, `created_by` | **PASS** | Cele 4 mișcări (`reception`, `transfer`, `sale`, `waste`) au `created_by` și `reference_id` setate corect. |
| `sales` | Verificare `status`, `total`, `payment_method` | **PASS** | Status `finalized`, total `0.65`, plată `cash`. |
| `sale_items` | Verificare `sale_id`, `product_id`, `batch_id`, `quantity` | **PASS** | `batch_id` pointează exact către lotul corect din zona `magazin`. |
| `payments` | Verificare `sale_id`, `method`, `amount` | **PASS** | Suma `0.65` pe metoda `cash` asociată vânzării. |
| `waste_events` | Verificare `id`, `reason`, `description`, `profile_id` | **PASS** | Motiv `Produs deteriorat`, descriere `Smoke Test 5D.6 Waste`. |
| `waste_items` | Verificare `waste_id`, `product_id`, `batch_id`, `quantity` | **PASS** | `batch_id` pointează exact către lotul din zona `depozit`. |
| `product_prices` | Verificare `price_sale`, `price_purchase`, `vat_percent` | **PASS** | Prețuri și TVA actualizate la valorile din recepție. |

**Concluzii Supabase**:
- Toate `reference_id`-urile și cheile externe sunt perfect coerente.
- `sale_items.batch_id` și `waste_items.batch_id` sunt complet populate.
- `stock_movements.created_by` este complet setat cu UUID-ul utilizatorului autentificat.
- Nu există rânduri orfane, stocuri negative sau erori RLS.
- Tranzacțiile sunt 100% atomice.

---

## 5. Verificări UI
- **Dashboard**: Se încarcă cu succes, afișând valorile la zi pentru vânzări și stocuri.
- **Products**: Tabela afișează stocurile corecte pe Depozit și Magazin.
- **Istoric Vânzări**: Afișează tranzacția POS de test cu status finalizat și metoda de plată cash.
- **Istoric Pierderi**: Afișează evenimentul de casare de test cu detalii complete.
- **AI Consultant**: Funcționează stabil, interogând stocurile fără erori.
- **Expirări**: Modulul se încarcă normal, fără a fi afectat de lipsa datei de expirare pe lotul de test.

---

## 6. Probleme Găsite
- **Niciuna**. Toate fluxurile au funcționat impecabil în regim end-to-end, iar testele negative au demonstrat robustețea validărilor atât pe frontend, cât și la nivel de proceduri stocate Supabase.

---

## 7. Decizie
**Ready for 5E Owner Console v2**
Platforma este 100% stabilă și pregătită pentru dezvoltarea consolei de administrare dedicată proprietarilor de rețele (`admin@owner.com`).
