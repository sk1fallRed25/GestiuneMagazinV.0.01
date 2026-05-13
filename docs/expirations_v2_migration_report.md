# Raport Migrare Modul Expirări (v2)

Acest document descrie migrarea modulului "Expirări" de la schema legacy la schema normată v2.

## Tabele v2 Utilizate

- `stock_batches`: Sursa principală de date. Expirarea este acum monitorizată la nivel de **lot**, nu de produs.
- `products`: Utilizat pentru a obține detaliile produsului (nume, cod bare, unitate).

## Schimbări Arhitecturale Majore

### 1. Granularitate: Produs -> Lot
În schema legacy, expirarea era adesea tratată la nivel de produs. În v2, un produs poate avea:
- Lotul A: expiră în 5 zile (Magazin).
- Lotul B: expiră în 30 zile (Depozit).
Modulul identifică acum precis care lot și din ce zonă trebuie procesat.

### 2. Categorisire Status
Statusurile sunt calculate dinamic pe baza câmpului `daysUntilExpiry`:
- **Expired:** < 0 zile.
- **Critical:** 0 - 7 zile.
- **Warning:** 8 - 30 zile.
- **OK:** > 30 zile.

### 3. Valoare la Risc
Sistemul calculează acum `estimatedValue` pentru fiecare lot (Cantitate * Preț Achiziție), oferind managerului o viziune clară asupra pierderilor potențiale în lei.

## Integrare cu Modulul Pierderi
Butonul "Casare" navighează acum inteligent către `/pierderi`, pre-completând:
- Produsul selectat.
- **Sursa exactă** (zona din care provine lotul expirat).
- Motivul ("Produs Expirat").

## Ce NU s-a modificat
- Estetica premium bazată pe carduri de sumar și tabel detaliat.
- Filtrarea după denumire și cod bare.

## Rezultat Build
- [X] `npm run build` a rulat cu succes.
- [X] Type safety confirmat (fără `any`).
