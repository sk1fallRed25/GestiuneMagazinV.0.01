# Raport de Migrare: Etapa 4B - FastAdd (Adăugare Rapidă Produse)

## Context
În cadrul **Etapei 4A** (Audit Global Anti-Legacy), s-a descoperit un blocaj critic: modulul `src/FastAdd.tsx` încă apela vechea tabelă `produse`, ceea ce bloca adăugarea de noi produse în platforma care funcționează exclusiv pe schema Supabase v2.

Etapa 4B remediază această problemă critică prin migrarea completă a fluxului de adăugare rapidă la noua arhitectură normalizată, fără a compromite viteza și ușurința în utilizare (scanare cod de bare -> preluare automată via OpenFoodFacts -> introducere prețuri -> salvare).

## Abordarea de Migrare

S-a adoptat varianta de **refactorizare modulară** prin crearea structurii `src/features/fast-add/`. Tipurile, logica și UI-ul au fost complet decuplate și rescrisă astfel:

- **Wrapper Legacy:** `src/FastAdd.tsx` exportă acum noul component `FastAddPage`, menținând rutele existente complet funcționale.
- **Interfețe Stricte:** S-a eliminat complet utilizarea lui `any`. `types.ts` definește exact formatul formularelor, payload-urilor și rezultatelor de la baza de date.

## Tabelele v2 Implicate

Noul serviciu `fastAddService.ts` orchestrează inserțiile sigure și legate relațional în mai multe tabele:

1. **`products`**:
   - Salvează detaliile de bază ale produsului (`name`, `barcode`, `unit`).
   - Se verifică inițial existența produsului (pe baza `store_id` și `barcode`, excluzând statusul `deleted`).
   - Dacă există, produsul curent NU se dublează; se reutilizează `id`-ul existent.

2. **`product_prices`**:
   - Stochează și suprascrie (`upsert`) prețurile introduse de la POS (`price_sale`, `price_purchase`, `vat_percent`).
   - Conflict trigger configurat pe `store_id` și `product_id`.

3. **`stock_batches`** (Condițional):
   - Dacă `initialStock > 0`, se creează automat un lot nou.
   - Default fallback pentru numele lotului este `fast-add` (dar utilizatorul poate completa opțional nr. lot și data expirării pe interfață).
   - Zona de stoc se alege direct din interfață (`depozit` sau `magazin`).

4. **`stock_movements`** (Condițional):
   - Urmărește acțiunea de creștere stoc ca `inventory_adjustment` provenit dintr-o zonă `external` către locația curentă de stoc, menținând un audit trasabil pentru introducerile din afara recepțiilor formale.

## Ce NU s-a modificat

- Nu s-a modificat nicio logică a altor module v2 existente (POS, Recepție, etc.).
- Baza de date nu a suferit nicio modificare structurală; s-au respectat tabelele v2 la nivel de API.
- Funcțiile heuristice vechi (`detecteazaCategorie`, `formateazaGramaj`) au fost izolate și păstrate intacte în `utils.ts` pentru a nu degrada compatibilitatea recunoașterii auto-completării OpenFoodFacts.

## Rezultate Tehnice (TypeScript & Build)

- Tratarea erorilor s-a făcut cu `err: unknown` cupe excepții și mesaje clare trimise în toast și state local.
- Codul curat elimină `any` și convertește rigid la `Number` înainte de injectarea payload-ului, protejând `numeric`-ul din baza de date.
- Comanda `npm run build` confirmă că transformarea nu generează erori TypeScript sau defazări de export. FastAdd v2 este complet decuplat, puternic tipizat și funcțional.
