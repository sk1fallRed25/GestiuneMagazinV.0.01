# Sales History VAT Display Parser & Fallback Rate Hotfix — Etapa 6D.5.5.1

## 1. Rezumat
- **Problema identificată:** Utilizarea tipului generic `any` în parserul `salesHistoryService.ts` la selectarea prețului magazinului. În plus, ratele de rezervă (fallback) pentru bonurile legacy se bazau pe `vat_percent` din setările curente ale produsului. Dacă acest procent conținea valori legacy greșite (de exemplu, 19%), calculele de estimare puteau fi eronate.
- **Ce s-a corectat:**
  1. Înlocuirea `any` cu interfața TypeScript `ProductPriceJoin` definită la nivel local.
  2. Derivarea ratelor standard din grupa de TVA (A=21%, B=11%, C=11%, D=0%, E=0%) în loc de utilizarea directă a `vat_percent`.
  3. Adăugarea helper-elor stricte `normalizeVatGroup` și `getStandardVatRateForGroup`.
- **Ce nu s-a modificat:** Snapshot-urile reale salvate direct în `sale_items` nu sunt afectate și rămân adevărul istoric neatins pentru vânzările noi. Baza de date, RLS, POS și procedurile stocate nu au fost modificate.

## 2. Parser TypeScript (Hygiene)
- Tipul `any` a fost complet eliminat din linia:
  `const storePrice = pricesArray.find((p) => p.store_id === storeId) ?? pricesArray[0] ?? null;`
- Parserul folosește acum interfața definită:
  ```typescript
  interface ProductPriceJoin {
      store_id: string;
      vat_group: string | null;
      vat_percent: number | string | null;
  }
  ```

## 3. Fallback TVA Legacy (Standard Rates)
- Calculele locale sunt declanșate doar când snapshot-ul este `NULL`.
- În loc de citirea `vat_percent`, parserul utilizează:
  ```typescript
  const fallbackVatGroup = normalizeVatGroup(storePrice?.vat_group ?? null);
  const fallbackVatRate = getStandardVatRateForGroup(fallbackVatGroup);
  ```
- Rezolvarea grupelor:
  * **A:** 21%
  * **B / C:** 11%
  * **D / E:** 0%
  * Alte valori / invalid -> `null` (TVA Indisponibil).

## 4. Snapshot Real
- Pentru itemurile cu `vat_group` și `vat_rate` populate din baza de date, se păstrează exact valorile stocate în snapshot fără a le recalcula sau suprascrie.

## 5. UI & Fallback
- Itemele fără cotă fallback validă sunt excluse din sumarele din subsol (`tfoot`) și afișează badge-ul roșu `TVA indisponibil`.
- Itemele cu fallback valid afișează badge-ul `Estimativ` și avertismentul corespunzător în footer.

## 6. Teste de Validare
- `npm run build`: **PASS** (compilare Vite/TypeScript curată, cod zero erori).
- `test_sales_history_vat_display_6d55.py`: **PASS** (rulare completă cu Playwright, plus un test static adăugat ce validează codul sursă al serviciului pentru a confirma că rata provine din grupă și nu din procentul bazei de date).
- `verify_vat_snapshot_e2e.py`: **PASS** (calcule corecte și RLS blocat).

## 7. Decizie
**Ready for 6D.5.6 Sales History VAT Display E2E / Visual QA**.
