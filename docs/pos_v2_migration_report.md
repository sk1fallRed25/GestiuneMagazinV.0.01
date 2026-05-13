# Raport Migrare Modul POS (v2)

Acest document descrie migrarea modulului "Vânzare / POS" la schema normată v2.

## Tabele v2 Utilizate

- `products`: Sursa pentru datele de bază ale produsului.
- `product_prices`: Sursa pentru prețul de vânzare și TVA.
- `stock_batches`: Gestionarea stocului prin loturi (zona `magazin`).
- `sales`: Antetul tranzacției de vânzare.
- `sale_items`: Liniile de vânzare, legate de loturile consumate.
- `payments`: Detaliile plăților (cash/card/mixed).
- `stock_movements`: Înregistrarea descărcării de gestiune (tip `sale`).

## Logica de Gestiune (v2)

### 1. Căutare și Stoc
Spre deosebire de v1 unde stocul era un câmp în tabela de produse, în v2 `stockMagazin` este calculat dinamic ca sumă a cantităților din `stock_batches` pentru zona `magazin`.

### 2. Consum Loturi (FEFO/FIFO)
La finalizarea vânzării, sistemul consumă loturile din zona `magazin` folosind următoarea prioritate:
1. `expiry_date` crescător (cele mai apropiate de expirare primele).
2. `created_at` crescător (cele mai vechi loturi primele).

### 3. Trasabilitate
Fiecare linie din `sale_items` este legată de un `batch_id`, permițând raportări precise despre ce loturi au fost vândute și la ce preț de achiziție au fost recepționate.

## Schimbări UI/UX
- **Metode de Plată:** Am adăugat suport explicit pentru plăți **MIXT** (Cash + Card).
- **Online Only:** În această etapă, POS-ul funcționează exclusiv Online pentru a garanta integritatea loturilor. Modulul de offline/sync va fi refăcut ulterior pentru schema v2.

## Riscuri Reziduale
- **Atomicitate:** Fluxul de finalizare vânzare execută multiple operațiuni (insert sales, update batches, insert items, insert movements). Acesta trebuie mutat într-un **RPC SQL atomic** (`finalize_sale`) pentru a preveni inconsistențele în cazul erorilor de rețea la mijlocul tranzacției.

## Rezultat Build
- [X] `npm run build` a rulat cu succes.
- [X] Type safety confirmat (fără `any`).
