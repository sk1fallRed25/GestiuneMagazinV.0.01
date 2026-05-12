# Raport Migrare Modul Recepție (v2)

Acest document descrie migrarea modulului "Recepție Marfă" de la schema legacy la schema normată v2.

## Tabele v2 Utilizate

- `receptions`: Antetul documentului de recepție (NIR).
- `reception_items`: Liniile individuale de produse recepționate.
- `stock_batches`: Gestionarea stocurilor pe loturi (trasabilitate).
- `stock_movements`: Jurnalul tuturor mișcărilor de stoc.
- `product_prices`: Sincronizarea prețurilor de achiziție și vânzare.
- `products`: Nomenclatorul de produse.

## Maparea Logicii

### 1. Creare Recepție (`receptions`)
- Se inserează un rând în `receptions` cu `store_id`, `profile_id` și datele documentului (număr, dată, total, furnizor).

### 2. Creare Linii (`reception_items`)
- Pentru fiecare produs din UI, se creează un rând în `reception_items` legat de ID-ul recepției nou create.

### 3. Gestionare Loturi (`stock_batches`)
- Sistemul caută un lot existent în zona `depozit` care să aibă același:
    - `product_id`
    - `batch_number`
    - `expiry_date`
- Dacă lotul există, se incrementează `quantity`.
- Dacă nu există, se creează un lot nou.
- **Notă:** Toate operațiunile sunt filtrate strict după `store_id`.

### 4. Jurnalizare Mișcări (`stock_movements`)
- Fiecare adăugare de stoc generează un rând în `stock_movements` cu:
    - `type`: 'reception'
    - `source_zone`: 'external'
    - `target_zone`: 'depozit'
    - `reference_id`: ID-ul recepției.

### 5. Sincronizare Prețuri (`product_prices`)
- Se folosește operațiunea `upsert` pentru a actualiza prețul de achiziție, prețul de vânzare și cota TVA pentru produsul respectiv în magazinul curent.

## Import XML (e-Factura)

- **Funcționalitate:** Extrage automat furnizorul, CUI-ul, numărul facturii, data și liniile de produse.
- **Matching:** Se face matching exact case-insensitive după **numele produsului**.
- **Limitări:**
    - Momentan nu se extrage codul de bare din XML-ul standard RO e-Factura într-un mod garantat (nu toate facturile includ EAN în câmpuri standard).
    - Produsele care nu există în baza de date **nu sunt create automat**. Acestea trebuie adăugate manual în nomenclator înainte de procesarea XML-ului.

## Ce NU s-a modificat
- Designul vizual al paginii de recepție (păstrează estetica premium stabilită).
- Logica de calcul a adaosului și a prețului de vânzare nou.

## Optimizări Viitoare
- **Atomicitate (RPC):** Momentan, inserările se fac secvențial din frontend. Se recomandă mutarea acestora într-o funcție stocată PostgreSQL (RPC) pentru a garanta tranzacționalitatea (totul sau nimic).

## Rezultat Build
- [X] `npm run build` a rulat cu succes.
- [X] Fără erori de tipare (`any` eliminat).
