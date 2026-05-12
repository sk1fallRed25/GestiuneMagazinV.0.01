# Plan de Curățare Bază de Date: Etapa 1I

Acest plan detaliază pașii necesari pentru eliminarea tabelelor legacy care nu mai sunt necesare în urma simplificării aplicației (eliminare Agenți, Furnizori Externi, Comenzi).

## 1. Ce NU ștergem acum
Următoarele tabele sunt protejate deoarece aplicația curentă depinde de ele pentru interfața de gestiune:
- `produse`, `vanzari`, `detalii_vanzare`
- `receptii`, `receptii_detalii`
- `pierderi`
- `utilizatori` (până la finalizarea migratorului către `profiles`)
- `bonuri`, `bon_detalii`, `niruri`, `nir_detalii`

## 2. Ordine de Curățare Recomandată

Curățarea trebuie făcută în etape pentru a evita ruperea constrângerilor de integritate:

### Faza 1: Audit și Backup
1.  Generare backup complet al bazei de date (structură + date).
2.  Verificarea dacă există Views sau Funcții SQL (RPC) care depind de tabelele de furnizori/agenți.

### Faza 2: Eliminarea Constrângerilor (Foreign Keys)
Înainte de a șterge tabelele, trebuie eliminate cheile externe care le leagă de tabelele „KEEP”.
- Exemplu: `produse.furnizor_id` (trebuie făcut nullable sau eliminat).
- Exemplu: `vanzari.agent_id` (trebuie eliminat).

### Faza 3: Drop Tabele Nedorite
Eliminarea tabelelor din următoarele categorii:
- **Module Eliminante:** `agenti`, `agenti_produse`, `furnizori`, `furnizor_produse`.
- **Comenzi/Logistica:** `comenzi_furnizor`, `comenzi_agenti`, `livrari`, `retururi_furnizor`.

## 3. Lista Tabelelor Candidate pentru Drop

| Tabel | Motiv | Risc |
| :--- | :--- | :--- |
| `furnizori` | Modul eliminat din UI. | Mic (după relaxare `receptii`) |
| `agenti` | Modul eliminat din UI. | Mic (după relaxare `vanzari`) |
| `comenzi_furnizor` | Proces eliminat. | Inexistent. |
| `cereri_furnizori` | Conține parole în clar, proces eliminat. | Inexistent. |
| `lista_cumparaturi` | Funcție nefolosită. | Inexistent. |
| `agenti_produse` | Relație legacy nefolosită. | Inexistent. |

## 4. Riscuri și Atenționări
- **Date Istorice:** Dacă există date în `furnizori` care sunt legate de `receptii` vechi, ștergerea tabelului `furnizori` fără a seta `ON DELETE SET NULL` pe FK va eșua.
- **RPC-uri:** Multe funcții SQL vechi ar putea referi aceste tabele. Auditul funcțiilor este obligatoriu.
- **Frontend Code:** Deși UI-ul a fost eliminat, codul ar putea încă avea importuri sau interogări reziduale.

## 5. Pași Următori
1.  Rularea scriptului de audit SQL (vezi `database/proposed_safe_cleanup...sql`).
2.  Testarea aplicației într-un mediu de staging după drop-ul tabelelor.
