# Raport Migrare Modul Istoric Vânzări (v2)

Acest document descrie migrarea modulului "Istoric Vânzări / Registru Vânzări" la schema normată v2.

## Tabele v2 Utilizate

- `sales`: Antetul tranzacțiilor (total, status, casier).
- `sale_items`: Articolele vândute, legate de loturile consumate.
- `payments`: Detalierea plăților (cash/card/mixed).
- `products`: Datele descriptive ale produselor.
- `profiles`: Numele casierului.
- `stock_batches`: Detalii despre loturile vândute (număr lot, expirare, preț achiziție).

## Arhitectură și Logica de Migrare

### 1. Agregare Date
În schema v2, informațiile despre o vânzare sunt distribuite. `salesHistoryService` realizează agregarea acestora:
- **ItemsCount**: Calculat prin numărarea rândurilor din `sale_items`.
- **PaymentsTotal**: Suma valorilor din tabela `payments` asociate unui `sale_id`.
- **Casier**: Join cu tabela `profiles` pe baza `profile_id`.

### 2. Detalii Avansate (Loturi)
În vizualizarea detaliată a bonului, acum afișăm informații de trasabilitate care nu erau disponibile în v1:
- Numărul de lot din care a provenit produsul.
- Data de expirare a lotului respectiv.
- Prețul de achiziție al lotului (util pentru analize ulterioare de marjă).

### 3. Calcul Sumar
Sumarul financiar (Total Încasări, Cash, Card, Bon Mediu) este calculat dinamic pe baza listei de vânzări filtrate, asigurând consistența între tabel și cardurile de sumar.

## Funcționalități Temporar Dezactivate / Viitoare
- **Anulare Vânzare / Retur**: Aceste funcționalități vor fi implementate într-o etapă separată, deoarece implică logica complexă de re-introducere în stoc a loturilor specifice consumate. Butoanele aferente sunt momentan dezactivate.
- **Fiscal Bridge**: Retipărirea bonului este pregătită ca interfață, urmând a fi conectată la modulul de fiscalizare.

## Rezultat Build
- [X] `npm run build` a rulat cu succes.
- [X] Integrare confirmată prin wrapper-ul `IstoricVanzari.tsx`.
