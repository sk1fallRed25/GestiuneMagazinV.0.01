# Raport Migrare Dashboard (v2)

Acest document descrie migrarea Dashboard-ului la schema normată v2.

## Tabele v2 Utilizate

- `sales`: Pentru vânzările de astăzi, lună și graficul pe 7 zile.
- `stock_batches`: Pentru calculul stocului agregat, valorii estimate și alertelor de expirare.
- `products`: Pentru numărul de produse active și detalii descriptive.
- `waste_events`: Pentru sumarul pierderilor din luna curentă.
- `profiles`: Pentru numele casierului în lista de vânzări recente.

## Logica de Calcul

### 1. Vânzări (Azi/Lună)
Vânzările sunt filtrate după `store_id`, `status='finalized'` și intervalul temporal (`created_at`). 
- **Azi**: Suma și numărul de bonuri din ziua curentă (00:00 - 23:59).
- **Lună**: Suma vânzărilor de la prima zi a lunii curente.

### 2. Agregare Stoc (Zone)
Logica de stoc a fost mutată de pe tabela `produse` pe `stock_batches`. Dashboard-ul realizează o agregare în memorie pe `product_id` pentru a determina:
- `stockMagazin`: Suma cantităților din zona 'magazin'.
- `stockDepozit`: Suma cantităților din zona 'depozit'.
- `stockTotal`: Suma totală pe ambele zone.
- `lowStockProducts`: Produse cu `stockTotal <= 5`.

### 3. Alerte Expirare (FEFO)
Sistemul analizează fiecare lot activ (`quantity > 0`) care are `expiry_date`:
- **Expired**: `daysUntilExpiry < 0`.
- **Critical**: `0 - 7 zile`.
- **Warning**: `8 - 30 zile`.

### 4. Valoare Estimată Stoc
Calculată ca `sum(quantity * purchase_price)` pentru toate loturile active unde prețul de achiziție este disponibil. Oferă o imagine de ansamblu asupra capitalului imobilizat.

### 5. Grafic Vânzări (7 Zile)
Utilizează `recharts` pentru a afișa evoluția zilnică a încasărilor. Datele sunt grupate client-side pentru a asigura afișarea tuturor celor 7 zile, chiar și a celor fără vânzări (valoare 0).

## Ce NU s-a modificat
- **Design Vizual**: S-au păstrat cardurile de statistici și stilul general, utilizând componentele `StatCard` existente.
- **Protocol de Gestiune**: Mesajele și link-urile către rapoartele de pierderi/istoric au fost menținute și adaptate la contextul v2.

## Limitări Actuale
- **Performanță**: Agregarea stocului se face client-side în `dashboardService`. Pentru inventare foarte mari (>10.000 loturi), se recomandă mutarea acestei logici într-un RPC SQL sau View materializat.
- **Real-time**: Momentan Dashboard-ul nu are subscripții active pe toate tabelele v2 (pentru a evita supraîncărcarea). Reîncărcarea se face manual prin butonul de refresh.

## Rezultat Build
- [X] `npm run build` confirmat.
