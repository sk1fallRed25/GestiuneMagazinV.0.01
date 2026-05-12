# Raport Implementare: Products Adapter v2 (Etapa 2B)

**Status:** Finalizat (Gata pentru Etapa 2C)

## 1. Mapare Schema v2 -> Legacy UI

Am implementat un adaptor în `productService.ts` care transformă datele din noile tabele v2 în formatul compatibil cu interfața existentă de utilizator.

| Câmp Legacy UI | Sursă DB v2 | Notă |
| :--- | :--- | :--- |
| `id` | `products.id` | Acum este de tip **UUID (string)**. |
| `nume` | `products.name` | Mapare directă. |
| `cod_bare` | `products.barcode` | Mapare directă. |
| `um` / `unitate_masura` | `products.unit` | Consolidat întrun singur câmp în DB. |
| `pret_vanzare` | `product_prices.price_sale` | Preluat din cea mai recentă înregistrare de preț. |
| `pret_achizitie` | `product_prices.price_purchase`| Adăugat în interfață pentru trasabilitate. |
| `stoc_depozit` | `sum(stock_batches.quantity)` | Agregat unde `zone = 'depozit'`. |
| `stoc_magazin` | `sum(stock_batches.quantity)` | Agregat unde `zone = 'magazin'`. |
| `active` | `products.status === 'active'`| Soft delete prin status. |

## 2. Logică de Operare

### Agregarea Stocurilor
Deoarece schema v2 folosește loturi (`stock_batches`), listarea produselor efectuează acum o sumă a cantităților din toate loturile asociate produsului în magazinul curent, filtrând pe zonele 'depozit' și 'magazin'.

### Ajustare Stoc (Mod Compatibilitate)
Când un administrator modifică stocul direct din pagina de Produse (fără a trece prin Recepție/Transfer):
1. Se calculează diferența față de stocul agregat actual.
2. Se caută sau se creează un lot special numit `compat-default`.
3. Se actualizează cantitatea în lotul respectiv.
4. Se inserează o mișcare de tip `inventory_adjustment` în `stock_movements` pentru a păstra istoricul corect al schimbării.

### Arhivare (Soft Delete)
Ștergerea din UI nu mai execută `DELETE` în baza de date. În schimb, setează `status = 'deleted'` în tabela `products`. Query-urile de listare exclud automat produsele cu acest status.

## 3. Schimbări Tehnice

- **UUID Support:** Toate componentele (`ProductTable`, `ProductEditModal`, `useProducts`) au fost actualizate pentru a trata ID-urile ca `string`.
- **Store Context:** `useProducts` utilizează acum `currentStoreId` din `AuthContext` pentru a filtra datele. Dacă magazinul nu este selectat, UI-ul afișează un mesaj de avertizare.
- **TypeScript Safety:** Am eliminat majoritatea tipurilor `any` din modulele de Auth și Products, îmbunătățind stabilitatea codului.

## 4. Corecții Etapa 2B.1

Am aplicat o serie de corecții critice pentru a asigura integritatea datelor și securitatea operațiunilor:

- **Protecție Prețuri:** Logica de `upsert` în `product_prices` citește acum prețul existent înainte de actualizare. Astfel, prețul de achiziție nu mai este suprascris accidental cu 0 atunci când se modifică doar prețul de vânzare.
- **Securitate Loturi:** Toate interogările către `stock_batches` includ acum filtrul `.eq('store_id', storeId)`, prevenind scurgerile de date între magazine.
- **Blocaj Loturi Reale:** `adjustStock` aruncă acum o eroare dacă produsul are loturi reale (diferite de `compat-default`), obligând utilizatorul să folosească modulele de Recepție/Transfer pentru gestiunea stocului complex.
- **Validare UI:** `ProductEditModal` folosește un state local de tip string pentru editare fluidă și validează numeric (fără NaN, fără valori negative) la submit.
- **Error Handling:** Hook-ul `useProducts` a fost actualizat pentru a trata erorile ca `unknown`, conform standardelor moderne TS.

## 5. Rezultat Build

- Comanda `npm run build` a finalizat cu succes.
- Toate referințele la tabela legacy `produse` au fost eliminate din modulul de Produse.

## 6. Următorii Pași (Etapa 2C)

- **Migrare Recepție:** Adaptarea modulului de recepție pentru a genera loturi în `stock_batches` și prețuri în `product_prices`.
- **Migrare Transfer:** Adaptarea transferurilor între zone folosind `stock_movements`.
