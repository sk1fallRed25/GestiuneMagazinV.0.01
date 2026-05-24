# Product VAT Group Blueprint — Etapa 6D.4.0

## 1. Rezumat
Acest document reprezintă planul arhitectural și tehnic (blueprint) pentru stocarea și manipularea grupei de TVA (VAT Group) la nivel de produs. 
**Scop**: După implementarea setărilor de magazin (Etapa 6D.3), este necesară conectarea modelului fiscal la operațiunile de zi cu zi (înregistrarea și gestiunea produselor). Această etapă stabilește regulile schemei și pregătește terenul pentru UI, fără a aplica modificări imediate în baza de date.

## 2. Audit DB

În urma analizei frontend-ului și a tipurilor definite (ex: `src/features/products/types.ts`), schema curentă din Supabase pentru obiectele de catalog include:
- `products`: informații globale despre produs (`id`, `name`, `barcode`, `category_id`, `unit`, `status`)
- `product_prices`: informații specifice magazinului pentru un anumit produs (`store_id`, `product_id`, `price_sale`, `price_purchase`, `vat_percent`)
- `stock_batches`: gestiune stocuri (`store_id`, `product_id`, `quantity`, `purchase_price` etc.)
- Tabele operaționale asociate (`sale_items`, `reception_items`, etc.) stochează valoarea cantitativă a prețului și TVA-ului calculat procentual.

**Coloane TVA existente**: 
- `product_prices` conține `vat_percent`. Aceasta reprezintă o valoare fixă procentuală (ex: 19, 9) hardcodată în vechea versiune a aplicației.
- Nu există o referință către noua arhitectură bazată pe litere de **grupă TVA (A, B, C, D, E)**.

## 3. Audit Frontend

- **Products**: Formularele de creare și editare (inclusiv modals) vor avea nevoie să seteze grupa de TVA în loc de un procent fix, în funcție de `vatPayer` la nivel de magazin.
- **Quick Add**: Formularul rapid trebuie să adopte aceeași logică — citirea `defaultVatGroup` din magazin sau permiterea selecției.
- **Reception**: Recepția rapidă de produse noi se aliniază la regula de Store Settings.
- **POS / Reports**: În viitor (dincolo de 6D.4), calculele de taxe pe bonuri fiscale (Z-uri) și pe documente (NIR-uri) vor utiliza grupa de TVA asociată din `product_prices`.

## 4. Decizie Arhitecturală

Am decis că **grupa TVA trebuie stocată în `product_prices.vat_group`**, NU în `products.vat_group`.

**Argumente**:
1. **Model multi-magazin (Multi-Store)**: Produsele din `products` sunt elemente globale ale catalogului. Dar statutul fiscal (TVA) depinde strict de punctul de lucru (magazinul) care comercializează produsul. Un magazin (SRL) poate fi plătitor de TVA (Grupa A), în timp ce altul poate fi neplătitor (Grupa E). Așadar, taxa aplicată produsului depinde de `store_id`.
2. Consistență arhitecturală: Așa cum `price_sale` și `price_purchase` variază în funcție de magazin în tabelul `product_prices`, la fel trebuie să se comporte și componenta fiscală (`vat_group`).

## 5. Blueprint SQL Propus

Fișier generat: `database/proposed_product_vat_group_6d40.sql`
- **Coloană nouă**: `ALTER TABLE product_prices ADD COLUMN vat_group text NOT NULL DEFAULT 'A';`
- **Constraint**: `CHECK (vat_group IN ('A', 'B', 'C', 'D', 'E'))` pentru a respecta strict categoriile ANAF (România).
- **Index**: `CREATE INDEX idx_product_prices_store_vat_group ON product_prices (store_id, vat_group);` (Pentru viitoare rapoarte fiscale aggregate pe grupe).
- **RPC Helper**: `get_product_vat_config(p_store_id uuid)` — Returnează configurația din `stores.settings` (`vatPayer`, `defaultVatGroup`, `vatGroups`, `priceTaxPolicy`) pentru a oferi frontend-ului informația de care are nevoie fără un apel extra către Settings RPC (utilizat în paginile de formulare).
- **Backfill Logic**: Un bloc PL/pgSQL documentat pentru a itera prin magazine și a pre-insera valoarea corectă ('E' pentru neplătitori, default din magazin pentru plătitori). Acest backfill este controlat și manual (nu se rulează automat la aplicarea schemei).

## 5.1 Corecție 6D.4.0.1 — Security & Defaults Hardening

În cadrul etapei 6D.4.0.1, s-au aplicat următoarele măsuri de întărire pentru blueprint:
- **Validare explicită de acces**: `get_product_vat_config` verifică acum dacă utilizatorul apelant are rolul de `admin`, `manager`, `gestionar` sau `casier` pe magazinul respectiv sau este `platform_owner`. Altfel, se aruncă o eroare explicită de acces.
- ** defaults robuste**: Pentru a evita obținerea de valori nule sau invalide dacă setările magazinului sunt incomplete, se folosește funcția `public.merge_store_settings_with_defaults` și un fallback către `public.get_default_store_settings() -> 'tax'`.
- **Revocare explicită anon/PUBLIC**: S-au adăugat instrucțiuni explicite în script pentru revocarea execuției către utilizatorii neautentificați (`anon`) și public.
- **Mecanismul de Backfill**: Este documentat clar și lăsat exclusiv ca opțiune manuală. Aplicarea schemei din 6D.4.1 nu va rula automat acest script, evitând riscul de a altera date de producție fără validare directă.
- **Compatibilitate `vat_percent`**: Coloana existentă `vat_percent` nu este eliminată din structură, ci este menținută pentru compatibilitatea cu codul existent. Frontend-ul (în 6D.4.2) va scrie în `vat_group`, iar valoarea procentuală va fi derivată corespunzător.

## 6. Reguli Funcționale
- **Plătitor TVA**: Grupa se poate alege (A/B/C/D/E), cu fallback la `store.settings.tax.default_vat_group`.
- **Neplătitor TVA**: Grupa este strict `E`.
- Dacă setările magazinului devin invalide sau sunt resetate accidental, backfill-ul și constraintul mențin modelul E pentru non-payers și A (fallback global) pentru payers.

## 7. Plan Frontend Viitor (6D.4.1 / 6D.4.2)
- Modificarea interfețelor din `src/features/products` și `quick-add`.
- Ascunderea selectorului de TVA dacă `vatPayer === false`.
- Modificarea tabelului de produse pentru a afișa Grupa TVA curentă per magazin în loc de `vat_percent`.

## 8. Securitate
- Funcția helper RPC `get_product_vat_config` este definită cu `SECURITY DEFINER` și execută acțiunile cu privilegiile creatorului (pentru a putea accesa tabela `stores` independent de politicile RLS directe în anumite contexte controlate), însă **accesul este validat explicit în corpul funcției** apelând `has_store_role` și `is_platform_owner`.
- Politicile RLS de pe `product_prices` continuă să asigure că utilizatorii pot vedea/edita prețurile doar pentru magazinele permise.
- Rolurile neautentificate (`anon`) nu pot apela sub nicio formă această metodă (revocare explicită).

## 9. Riscuri și Limitări
- Funcționarea rapoartelor curente: Ele se bazează pe sume nete/brute. Odată introduse rapoarte fiscale stricte pe `vat_group` (Z, X), rapoartele comerciale vor trebui aliniate cu grupa din momentul vânzării (`sale_items`).
- Nu s-a creat integrarea cu bridge-ul fiscal încă. Datele pregătite aici vor fi vitale pentru driverul caselor de marcat.

## 10. Pași Următori
- **6D.4.1**: Product VAT SQL Apply Verification (Aplicare pe baza de date și verificare)
- **6D.4.2**: Product VAT Frontend Integration (Formulare Produse)
- **6D.5**: Store Settings + Product VAT E2E Test

## 11. Decizie
**Ready for 6D.4.1 SQL Apply Verification**

