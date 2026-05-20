# Sales Void MVP E2E Test — Etapa 6B.2.3

## 1. Rezumat
- **Status**: PASS
- **Script**: `test_sales_void_6b23.py`
- **Build**: PASS (`Exit code: 0`)
- **Rafinări test**:
  - S-a adăugat o etapă premergătoare de transfer (Depozit -> Magazin) în faza de configurare, asigurând prezența stocului faptic pe lotul din magazin înainte de inițierea POS-ului.
  - S-a înlocuit selectorul de stare `"text=Anulat"` cu un locator precis pe `span` cu regex exact (`^Anulat$`) pentru a preveni coliziunea cu elementele ascunse din filtrul de selecție ("Anulate").

## 2. Test Matrix
Scenarii validate E2E prin Playwright cu status 100% PASS:
- **Deschidere tură și realizare vânzare**: Deschidere POS, inițializare tură casier, adăugare produs (`OTET 1L`) și finalizare vânzare cash.
- **Validări UI detaliate în Istoric**: Vizualizarea butonului `ANULEAZĂ BON` pe bonul finalizat și deschiderea modalului `ANULARE BON (VOID)`.
- **Validare lungime motiv**: Blocarea butonului de confirmare a anulării dacă motivul introdus este gol sau are mai puțin de 3 caractere.
- **Anulare cu succes (Void)**: Procesare cu succes în interfață a anulării totale a bonului, închiderea modalului și afișarea statusului "Anulat" în tabelul de vânzări.
- **Verificare DB post-anulare**: Verificarea prin interogări de tip read-only a actualizării `sales.status` la `'voided'`, inserării rândurilor în `sale_returns` (cu tipul `'void'` și starea `'completed'`) și `sale_return_items`, generării mișcării de stoc de tip `'void'` în `stock_movements`, înregistrării acțiunii în `audit_logs` (`sale.void`), și restaurării corecte a stocului batch-ului în magazin.
- **Blocare dublă anulare**: Verificarea absenței butonului de anulare pe bonul deja anulat și respingerea încercărilor de apel direct din RPC-ul `void_sale`.
- **Blocare anulare în tură închisă**: Crearea unei noi vânzări, închiderea turei de POS asociate, verificarea afișării badge-ului "Ineligibil" în modal cu eroarea corespunzătoare (`Tura în care s-a emis bonul este închisă`) și dezactivarea butonului de confirmare.

## 3. Integritate și Consistență Tranzacțională
Verificările directe efectuate din scriptul E2E au confirmat consistența datelor în baza de date Supabase după finalizarea operațiunii de Void:
- **`sales`**: Actualizare în stare `voided`.
- **`sale_returns`**: Crearea înregistrării aferente cu motivul specificat de utilizator.
- **`sale_return_items`**: Copierea corectă a liniilor de bon anulate.
- **`stock_movements`**: Generarea unei singure mișcări de corecție de tip `void` cu semn pozitiv (intrare înapoi în stoc).
- **`stock_batches`**: Restaurarea automată a cantității pe lotul din locația magazin (stocul a crescut înapoi cu numărul de unități vândute).
- **`audit_logs`**: Înregistrarea acțiunii administrative `sale.void` legată direct de `entity_id`-ul returului.

## 4. Decizie
- **Pregătit pentru Etapa 6B.3 (Sales Advanced Returns - Blueprint)**: Modulul de Anulări Bonuri (Void MVP) este complet stabil, securizat tranzacțional la nivel de bază de date (RPC + RLS) și validat E2E în frontend.
