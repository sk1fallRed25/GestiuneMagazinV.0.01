# Plan de Execuție Curățare Bază de Date: Etapa 1J

Acest document descrie pașii operaționali pentru tranziția de la schema legacy la schema curată v2, minimizând riscul de pierdere a datelor sau de întrerupere a serviciului.

## PASUL 1: Backup și Pregătire
1.  **Backup Complet:** Exportarea întregii scheme `public` și a datelor din tabelele legacy (`produse`, `vanzari`, `utilizatori`, etc.) în format SQL/CSV.
2.  **Freeze Development:** Notificarea echipei că nu se mai fac modificări la structura DB-ului vechi.

## PASUL 2: Aplicarea Schemei v2 (Side-by-Side)
1.  Aplicarea scriptului `proposed_clean_schema_v2.sql`.
2.  Scriptul va crea tabele noi sau va completa tabelele moderne existente fără a afecta tabelele legacy (RO).
3.  Activarea RLS pe noile tabele cu politici de test.

## PASUL 3: Migrarea Datelor (Pilot)
1.  Popularea tabelei `organizations` cu un magazin de test.
2.  Executarea migratorului de utilizatori (`utilizatori` -> `auth.users` + `profiles`).
3.  Migrarea unui set de date de test (ex: 50 de produse) din `produse` în `products` și `stock_batches`.

## PASUL 4: Adaptarea Frontend-ului
1.  Modificarea serviciilor React (ex: `productService.ts`) pentru a interoga noile tabele.
2.  Validarea funcționalității în mediul de dezvoltare.
3.  Testarea fluxurilor de Vânzare (POS) și Recepție pe noua structură.

## PASUL 5: Migrarea Finală a Datelor de Producție
1.  Oprirea scrierii în tabelele legacy.
2.  Rularea scriptului `proposed_legacy_to_v2_migration_map.sql` pentru a muta tot istoricul de vânzări și stocuri.
3.  Verificarea sumelor de control (număr total produse, total vânzări per zi).

## PASUL 6: Eliminarea Tabelelor Inactive (Epurare)
1.  **Faza 6.1:** Ștergerea tabelelor aferente modulelor eliminate definitiv (Agenți, Furnizori Externi, Comenzi).
2.  **Faza 6.2:** Ștergerea tabelelor legacy (RO) după 30 de zile de funcționare stabilă pe schema v2.
3.  Utilizarea scriptului `proposed_drop_legacy_tables_after_backup.sql`.

---

## Matrice de Risc și Atenuare
- **Risc:** Erori la maparea ID-urilor (BigInt -> UUID).
  - *Atenuare:* Păstrarea coloanei `legacy_id` în noile tabele pentru referință.
- **Risc:** Performanță scăzută la migrare.
  - *Atenuare:* Executarea migratorului în tranșe (batching).
- **Risc:** Cod frontend nesincronizat.
  - *Atenuare:* Teste automate de tip E2E pe noile rute.
