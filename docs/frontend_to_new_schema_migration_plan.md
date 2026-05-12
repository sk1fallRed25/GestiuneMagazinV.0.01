# Plan de Migrare Frontend la Schema v2: Etapa 1J

Acest document descrie ordinea și modul de adaptare a aplicației React pentru a folosi noile tabele standardizate în locul celor legacy.

## 1. Ordinea Recomandată de Adaptare

Pentru a evita blocajele, migrarea frontend-ului trebuie făcută incremental:

1.  **Auth / Profile (`src/features/auth`):**
    - Schimbarea interogărilor din `Login.tsx` și `AuthContext` de la `utilizatori` la `profiles`.
    - Validarea rolurilor noi (ex: `platform_owner` vs `admin`).
2.  **Catalog Produse (`src/features/products`):**
    - `productService.ts` va interoga `products` (v2) în loc de `produse`.
    - Adaptarea componentelor de afișare pentru noile nume de coloane (ex: `name` în loc de `nume`).
3.  **Gestiune Stoc (Read Model):**
    - Înlocuirea coloanelor `stoc_magazin` din `produse` cu o interogare agregată pe `stock_batches`.
    - Aceasta este cea mai mare schimbare de logică (trecere de la câmp fix la loturi).
4.  **Recepție Marfă (`Receptie.tsx`):**
    - Mutarea înregistrării de la `receptii` la `receptions` și `reception_items`.
    - Generarea automată de `stock_batches` la fiecare intrare.
5.  **Transfer Marfă (`TransferMarfa.tsx`):**
    - Actualizarea logicii de mutare a cantităților între loturi și locații.
6.  **Pierderi / Casări (`src/features/losses`):**
    - Schimbarea serviciului `lossService.ts` pentru a folosi `waste_events`.
7.  **POS / Vânzare (`Vanzare.tsx`):**
    - Înregistrarea vânzărilor în `sales` și `sale_items`.
    - Scăderea automată din `stock_batches` (FIFO/LIFO sau selectiv).
8.  **Dashboard / Rapoarte:**
    - Reconstruirea graficelor pe baza noului istoric de vânzări și mișcări de stoc.

---

## 2. Maparea Serviciilor (Exemple)

### Product Service
- **Vechime:** `supabase.from('produse').select('*')`
- **Nou:** `supabase.from('products').select('*, product_prices(*)')`

### Sales Service
- **Vechime:** `supabase.from('vanzari').insert({ total, data_vanzare })`
- **Nou:** `supabase.from('sales').insert({ organization_id, total_amount, cashier_id })`

---

## 3. Strategia de Tranziție (Compatibilitate)

În timpul perioadei de migrare, se pot folosi **Wrappers** sau **Proxy Services** care să decidă din ce tabel citesc, pe baza unui flag de mediu (ex: `VITE_USE_V2_SCHEMA=true`).

### Recomandare:
- Nu ștergeți codul vechi imediat. Redenumiți serviciile vechi în `legacyProductService.ts` și creați versiuni noi paralele.
- Faceți switch-ul în `AppRoutes.tsx` pentru a direcționa utilizatorii către pagini noi care folosesc noile servicii.
