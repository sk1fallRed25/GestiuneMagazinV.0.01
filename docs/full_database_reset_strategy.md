# Strategie Resetare Completă Bază de Date: Etapa 1J (Corectată)

Acest document descrie viziunea tehnică pentru un **Reset Complet** al bazei de date Supabase, abandonând orice dependență de datele legacy în favoarea unei structuri curate, moderne și optimizate pentru performanță și securitate.

## 1. De ce facem reset complet?
Baza de date actuală este un hibrid incoerent de tabele în română și engleză, cu multiple duplicări și resturi de la module eliminate (Agenți, Furnizori). Un reset complet este singura cale pentru a:
- **Elimina datoria tehnică:** Scăpăm de peste 25 de tabele inutile.
- **Standardiza nomenclatura:** Toate tabelele și coloanele vor fi în limba engleză.
- **Implementa securitatea corect:** Activăm RLS nativ de la zero.
- **Optimiza performanța:** Structuri UUID, indexuri corecte și relații optimizate.

## 2. Ce se pierde?
Prin executarea acestui plan, **TOATE DATELE EXISTENTE VOR FI ȘTERSE**, inclusiv:
- Istoricul de vânzări și stocuri din tabelele RO.
- Utilizatorii din tabela legacy `utilizatori`.
- Orice configurare a magazinelor vechi.
*Notă: Utilizatorii din `auth.users` (Supabase Auth) sunt păstrați, dar profilurile lor vor fi recreate.*

## 3. Arhitectura Nouă (v2)
Folosim o structură simplificată, adaptată pentru un singur magazin sau un sistem multi-locație simplu:
- **Core:** `stores`, `profiles`, `store_members`.
- **Inventory:** `products`, `stock_batches`, `stock_movements`.
- **Operations:** `sales`, `receptions`, `waste_events`.
- **Sync/Audit:** `client_events`, `audit_logs`.

## 4. De ce NU facem migrare?
Migrarea de la BigInt la UUID și de la o logică de stoc fix la una pe loturi (batches) ar introduce o complexitate enormă și risc de corupere a datelor. Având în vedere că proiectul este în stadiu de refactorizare majoră, un început curat ("clean slate") este mai eficient.

## 5. Ordinea Aplicării Scripturilor
1. `000_full_reset_warning.sql` - Curățare totală.
2. `001_clean_schema_core.sql` - Infrastructură useri/magazine.
3. `002_clean_schema_inventory.sql` - Produse și stocuri.
4. `003_clean_schema_sales.sql` - POS și vânzări.
5. `004_clean_schema_reception_waste.sql` - Intrări și pierderi.
6. `005_clean_schema_sync_audit.sql` - Jurnale și sync offline.
7. `006_clean_schema_rls.sql` - Securizare.
8. `007_seed_initial_admins.sql` - Date inițiale admin.

## 6. Riscuri și Atenuare
- **Pierdere totală date:** Atenuată prin backup obligatoriu înainte de reset.
- **Downtime:** Resetul se face într-o fereastră de mentenanță.
- **Erori de Frontend:** Atenuate prin maparea riguroasă a serviciilor la noua schemă.
