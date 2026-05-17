# Transfer RPC Migration — Etapa 5D.2

## 1. Rezumat
- **Ce s-a migrat**: Logica de execuție a transferului de marfă între zone (Depozit <-> Magazin) din serviciul frontend `transferService.ts`.
- **Ce RPC folosește**: `public.transfer_stock(p_store_id, p_profile_id, p_product_id, p_quantity, p_source_zone, p_target_zone)`.
- **Ce logică a fost eliminată din frontend**: Tot fluxul vulnerabil multi-step (citire stoc sursă, parcurgere loturi FEFO/FIFO în buclă, calcul manual cantități rămase, `UPDATE` pe loturile sursă, căutare/inserare pe loturile destinație, inserare manuală în `stock_movements`).
- **Status**: Realizat cu succes (Pass).

## 2. Înainte vs După

| Aspect | Înainte (Multi-step Frontend) | După (RPC Atomic) |
| :--- | :--- | :--- |
| **Număr de apeluri rețea** | N + 3 apeluri (select, update-uri multiple, insert) | **1 singur apel** (`supabase.rpc`) |
| **Consistență / Concurență** | Risc major de race conditions (fără lock tranzacțional) | **ACID compliant** (folosește `SELECT ... FOR UPDATE` intern) |
| **Securitate RLS** | Necesită permisiuni directe de `UPDATE`/`INSERT` pe tabele | Încapsulat prin `SECURITY DEFINER` (permisiuni tabele ascunse de client) |
| **Alocare Loturi** | Calculată în JavaScript în browser | Calculată și aplicată direct în motorul PostgreSQL |

## 3. Payload RPC
Apelul din `executeTransfer` trimite următorul obiect către funcția `transfer_stock`:
- `p_store_id`: UUID-ul magazinului curent.
- `p_profile_id`: UUID-ul utilizatorului autentificat care inițiază transferul.
- `p_product_id`: UUID-ul produsului selectat.
- `p_quantity`: Cantitatea numerică de transferat.
- `p_source_zone`: Text ('depozit' sau 'magazin', mapat din direcția selectată).
- `p_target_zone`: Text ('magazin' sau 'depozit', mapat din direcția selectată).

## 4. Validări păstrate în frontend
- **Direcție**: Verificarea valorii `direction` ('depozit_spre_magazin' vs 'magazin_spre_depozit') și maparea în string-uri de zonă.
- **Cantitate**: Verificarea ca valoarea introdusă să fie un număr valid, strict pozitiv (`quantity > 0`).
- **Produs selectat**: Prezența unui `productId` valid.
- **User/Store context**: Verificarea existenței sesiunii și a `storeId`-ului.

## 5. Validări mutate în DB
- **Rol**: Validarea permisiunilor de acces (`admin`, `gestionar`, `platform_owner`) via `has_store_role`.
- **Locking**: Blocarea concurentă a înregistrărilor prin `SELECT ... FOR UPDATE`.
- **FEFO/FIFO**: Sortarea automată a loturilor sursă (`expiry_date ASC, created_at ASC`).
- **Stoc insuficient**: Verificarea stocului disponibil și aruncarea excepției în caz de lipsă stoc.
- **Update batch sursă/destinație**: Ajustarea automată sau crearea de loturi noi în cadrul aceleiași tranzacții.
- **Stock movements**: Inserarea automată și garantată a istoricului mișcării de stoc.

## 6. Build
Rezultatul rulării `npm run build`:
```text
> sistem-magazin@1.0.0 build
> tsc && vite build

vite v7.3.0 building client environment for production...
transforming...
✓ 2492 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                       1.37 kB │ gzip:   0.65 kB
dist/assets/index-DMgTpQBC.css       53.70 kB │ gzip:   9.01 kB
dist/assets/index-UNxeAYnn.js       930.10 kB │ gzip: 262.17 kB
✓ built in 2.56s
```
Build-ul a trecut cu succes, fără erori TypeScript sau de bundling.

## 7. Test recomandat
Pași pentru validare manuală în mediu de staging/producție:
1. Login în aplicație ca `admin` sau `gestionar`.
2. Navighează la modulul Transfer Marfă și alege un produs cu stoc depozit > 0.
3. Inițiază un transfer de 1 buc din Depozit spre Magazin.
4. Verifică actualizarea imediată a stocurilor în UI (Depozit scade cu 1, Magazin crește cu 1).
5. Verifică tabela `stock_movements` în Supabase pentru a confirma apariția noii înregistrări cu `type = 'transfer'`.
6. Încearcă un transfer cu o cantitate mai mare decât stocul disponibil și confirmă afișarea mesajului de eroare corect ("Stoc insuficient pentru transfer.").
