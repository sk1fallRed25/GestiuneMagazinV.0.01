# Raport Migrare Modul Pierderi/Casări (v2)

Acest document descrie migrarea modulului "Pierderi" de la schema legacy la schema normată v2.

## Tabele v2 Utilizate

- `products`: Nomenclatorul de produse (pentru nume, cod bare, unitate).
- `stock_batches`: Gestionarea stocurilor pe loturi (trasabilitate).
- `waste_events`: Antetul evenimentului de pierdere (motiv, descriere).
- `waste_items`: Liniile detaliate ale pierderii (referință la lot).
- `stock_movements`: Jurnalul tuturor mișcărilor de stoc (audit).

## Maparea Logicii

### 1. Calcul Stoc Agregat
- În UI, produsele sunt afișate cu `stoc_depozit`, `stoc_magazin` și `stoc_total`.
- Aceste valori sunt calculate prin sumarea `quantity` din toate loturile (`stock_batches`) active, filtrate după zona corespunzătoare (`depozit` sau `magazin`).

### 2. Algoritmul de Casare pe Loturi (FIFO/FEFO)
- Utilizatorul alege sursa casării:
  - **Magazin:** Consumă doar din loturile din zona `magazin`.
  - **Depozit:** Consumă doar din loturile din zona `depozit`.
  - **Auto (FIFO):** Consumă întâi din `magazin`, apoi din `depozit`.
- În cadrul fiecărei zone, loturile sunt consumate în ordinea:
  1. `expiry_date` ASC (FEFO - cele care expiră primele).
  2. `created_at` ASC (FIFO - cele mai vechi loturi intrate).

### 3. Înregistrare Pierdere
- Se creează o intrare în `waste_events` pentru contextul global (motiv, cine a raportat).
- Pentru fiecare fragment de cantitate luat dintr-un lot, se creează:
  - O intrare în `waste_items` (leagă pierderea de un lot specific).
  - O intrare în `stock_movements` cu `type = 'waste'`, `source_zone = <zona>`, `target_zone = 'external'`.

## Ce NU s-a modificat
- Fluxul vizual: Grid de produse -> Search -> Modal Raportare.
- Motivele de casare (păstrate și extinse).

## Note Tehnice Importante
- **Atomicitate:** Ca și la celelalte module v2, fluxul este momentan secvențial din frontend. Se recomandă mutarea în RPC `create_waste_event` pentru a asigura consistența tranzacțională (rollback în caz de eroare la jumătatea consumului de loturi).
- **Protecție Stoc:** Sistemul verifică disponibilitatea pe zona selectată înainte de a începe tranzacția.

## Rezultat Build
- [X] `npm run build` a rulat cu succes.
- [X] Type safety confirmat (fără `any`).
