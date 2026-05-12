# Raport Migrare Modul Transfer (v2)

Acest document descrie migrarea modulului "Transfer Marfă" de la schema legacy la schema normată v2.

## Tabele v2 Utilizate

- `products`: Nomenclatorul de produse.
- `stock_batches`: Gestionarea stocurilor pe loturi (trasabilitate).
- `stock_movements`: Jurnalul tuturor mișcărilor de stoc.

## Maparea Logicii

### 1. Calcul Stoc Agregat
- În UI-ul de transfer, stocul este afișat ca `stoc_depozit` și `stoc_magazin`.
- Aceste valori sunt calculate dinamic prin sumarea `quantity` din toate loturile (`stock_batches`) care aparțin magazinului și produsului respectiv, filtrate pe zona corespunzătoare.

### 2. Algoritmul de Transfer pe Loturi (FIFO/FEFO)
- Sistemul nu mai face un simplu update de coloană. 
- La transfer, sistemul identifică toate loturile sursă cu stoc pozitiv.
- Loturile sunt ordonate după `expiry_date` (FEFO) și apoi după `created_at` (FIFO).
- Cantitatea cerută este "consumată" succesiv din aceste loturi.

### 3. Creare/Actualizare Loturi Țintă
- Pentru fiecare fragment de cantitate mutat dintr-un lot sursă, sistemul caută un lot corespondent în zona țintă (aceleași atribute: `batch_number`, `expiry_date`, `purchase_price`).
- Dacă există, se actualizează cantitatea.
- Dacă nu, se creează un lot nou în zona țintă.

### 4. Trasabilitate (`stock_movements`)
- Fiecare fragment de transfer generează o înregistrare în jurnalul de mișcări, permițând auditul exact al momentului în care un lot specific a fost mutat.

## Ce NU s-a modificat
- Fluxul de utilizare: selectare produs -> direcție -> cantitate -> confirmare.
- Estetica vizuală (păstrează designul premium).

## Optimizări Viitoare
- **Atomicitate (RPC):** Ca și la recepție, fluxul de transfer implică multiple operațiuni (select, update sursă, upsert țintă, insert movement). Se recomandă mutarea acestuia într-un RPC `transfer_stock` pentru a garanta că transferul nu rămâne "la jumătate" în caz de eroare de rețea.

## Rezultat Build
- [X] `npm run build` a rulat cu succes.
- [X] Fără erori de tipare (`any` eliminat).
