# SGR POS / finalize_sale Integration Blueprint — Etapa 6D.6.4

Acest document descrie blueprint-ul tehnic pentru integrarea Sistemului de Garanție SGR în componenta Point of Sale (POS) și procedura stocată tranzacțională `public.finalize_sale`.

## 1. Rezumat
Scopul acestei analize este definirea modului în care garanția SGR (0.50 RON per unitate, scutită de TVA — grupa fiscală D, 0%) este adăugată la totalul tranzacției, stocată ca snapshot istoric în tabelul `sale_items` și validată în mod absolut pe partea de backend.
Pentru a asigura conformitatea cu regulile de securitate ale platformei, **procedura stocată (RPC) reprezintă sursa unică de adevăr**, prevenind orice manipulare frauduloasă a prețului sau taxei prin client-side hacking.

## 2. Audit POS și finalize_sale
La momentul actual (înaintea aplicării acestei etape):
- **Payload POS**: Clientul trimite către RPC `finalize_sale` un payload ce conține `p_items` sub formă de array cu `{ product_id, quantity }` și `p_payments` ca array de metode de plată (`{ method, amount }`).
- **Validare plati**: RPC-ul încarcă prețurile direct din tabela securizată `public.product_prices`, calculează totalul tranzacției, și verifică dacă totalul plăților primite coincide la nivel de bani (diferență de maximum 0.01 lei) cu totalul calculat.
- **TVA**: Se calculează și salvează un snapshot complet pentru TVA-ul produsului în `sale_items` pe baza cotelor curente (`vat_group`, `vat_rate`, `vat_amount`, `price_without_vat`). SGR nu este încă tratat.

## 3. Model de Calcul SGR
Fiecare articol adăugat pe bon este supus următoarei formule matematice:

1. **Valoare Articol (Produs)**:
   $$\text{valoare\_produs} = \text{cantitate} \times \text{pret\_vanzare}$$
2. **Valoare Garanție SGR (Ambalaj)**:
   Dacă produsul are `sgr_enabled = true` în nomenclator:
   $$\text{valoare\_sgr} = \text{cantitate} \times 0.50\text{ LEI}$$
   Altfel:
   $$\text{valoare\_sgr} = 0.00\text{ LEI}$$
3. **Total Linie (Item)**:
   $$\text{total\_linie} = \text{valoare\_produs} + \text{valoare\_sgr}$$
4. **Total Bon Fiscal**:
   $$\text{total\_bon} = \sum (\text{total\_linie})$$
5. **Plăți**:
   $$\sum (\text{plati}) == \text{total\_bon}$$
6. **Defalcare Fiscală**:
   - Grupa fiscală a produsului (A, B, C sau E) calculează cota de TVA aplicată prețului de raft standard.
   - Garanția SGR este asociată automat grupei **D (TVA 0%)** și nu modifică baza de impozitare sau calculul TVA al produsului în sine.

## 4. SQL finalize_sale Blueprint
Scriptul blueprint [proposed_sgr_finalize_sale_6d64.sql](file:///c:/Users/stefan/WebstormProjects/GestiuneMagazinV.0.01/database/proposed_sgr_finalize_sale_6d64.sql) re-definește funcția de checkout pentru a include SGR:
- **Securitate client-side**: Pentru fiecare element din `p_items`, baza de date recitește valorile `sgr_enabled` și `sgr_type` direct din tabela `public.products`. Orice încercare a frontend-ului de a trimite o valoare modificată a garanției va fi ignorată, iar baza de date va forța calcularea corectă a sumelor de 0.50 RON per bucată.
- **Inserare în `sale_items`**: Include snapshot-ul complet SGR (`sgr_enabled`, `sgr_type`, `sgr_deposit_amount = 0.50`, `sgr_total_amount`, `sgr_vat_group = 'D'`, `sgr_vat_rate = 0`).
- **Verificare Plăți**: Tranzacția se finalizează exclusiv dacă plățile trimise de casier acoperă totalul recalculat format din prețul produselor + sumele totale de garanție.

## 5. POS Frontend Blueprint (Modificări Planificate)
Modificările ulterioare pe partea de client în cadrul etapei POS Frontend sunt:
- **Interogarea Produselor**: Serviciile `searchProducts` și `getProductByBarcode` vor selecta suplimentar proprietățile `sgr_enabled` și `sgr_type`.
- **Structura CartItem**: Se vor extinde interfețele cu:
  ```typescript
  sgrEnabled: boolean;
  sgrType: 'plastic' | 'metal' | 'glass' | null;
  sgrDepositAmount: number; // fix 0.50
  sgrTotalAmount: number;   // qty * 0.50
  ```
- **Interfața Coș**: Sub denumirea produsului în lista coșului, se va afișa vizibil linia adițională de garanție:
  `[+] Garanție SGR - [Plastic/Metal/Sticlă] x[Cantitate]: [Valoare] lei`
- **Total de Plată**: Panelul de plată va calcula `total_bon = produse + SGR`.
- **Mixed Payment**: Algoritmul de echilibrare automată a sumelor rămase de achitat (cash/card) va fi adaptat să se raporteze la noul total unificat.

## 6. Sales History / Bon Blueprint
În cadrul ecranului de istoric vânzări și a modului de vizualizare bon:
- **Linii detailate**: Fiecare linie de produs cu SGR activ va conține un element imbricat ce detaliază cantitatea de ambalaje și valoarea percepută.
- **Sumar Bon**:
  - Total produse: `X.XX lei`
  - Total garanții SGR: `Y.YY lei`
  - Total general: `(X.XX + Y.YY) lei`
- **Tabelă Categori TVA**:
  - Grupa D va fi listată explicit ca având o rată de 0% și o valoare brută egală cu suma garanțiilor SGR vândute, oferind o delimitare clară de grupa E (Neplătitori TVA global) sau grupa C/B (TVA 11%).

## 7. Returns Blueprint (Retururi Garanții)
Pentru fluxul de retur:
- **Regulă MVP**: Retururile de produse realizate prin RPC-ul `return_sale_items` vor returna automat și pro-rata garanția SGR reținută pe produsele returnate. De exemplu, dacă un bon are 3 sticle cu SGR și se returnează 1 sticlă, se stornă și 1x garanție SGR (0.50 lei) din plățile efectuate.
- **Retur fără produs**: Răscumpărarea directă de ambalaje goale de la clienți în schimbul unui bon valoric sau cash nu face obiectul etapei curente (MVP) și va fi proiectat în fazele comerciale ulterioare.

## 8. Riscuri și Edge Cases
- **Compatibilitate date istorice**: Bonurile finalizate înaintea implementării SGR nu conțin date de snapshot (sunt NULL). În SQL, `COALESCE(sgr_enabled, false)` garantează tratarea lor corectă ca non-SGR. Parserul frontend tratează datele lipsă afișând doar valorile corespunzătoare fără a returna erori.
- **Schimbarea nomenclatorului**: Dacă un administrator modifică tipul SGR sau dezactivează SGR pe un produs după ce acesta a fost vândut, snapshot-ul istoric stocat în `sale_items` rămâne neschimbat, păstrând exact condițiile financiare de la momentul emiterii bonului.
- **Modificări frauduloase**: Verificarea obligatorie a plăților la nivel de bază de date pe baza stării reale din nomenclator elimină posibilitatea bypass-ului prin comenzi falsificate în consola de frontend.

## 9. Etape Următoare
1. **6D.6.5 — SGR finalize_sale SQL Apply Verification**: Aplicarea scriptului în Supabase SQL Editor și scrierea testelor automate pentru validarea tranzacțională a calculelor.
2. **6D.6.6 — SGR POS Frontend Integration**: Integrarea în coșul POS, totalizator și plăți.
3. **6D.6.7 — SGR Sales History Integration**: Afișarea în bonul digital și sumarul TVA fiscal.
4. **6D.6.8 — SGR Returns Integration**: Corelarea cu fluxurile de stornare.
5. **6D.6.9 — SGR E2E / Visual QA**: Validarea completă integrată și generarea de dovezi vizuale.

## 10. Decizie
Planul și blueprint-ul de design sunt pregătite pentru:
**Ready for 6D.6.5 SGR finalize_sale SQL Apply Verification**.
