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
1. **6D.6.5 — SGR POS Frontend Integration Preflight**:
   - POS citește SGR din nomenclator.
   - Coșul afișează linia de garanție SGR.
   - Totalul din interfață include taxa SGR.
   - Algoritmul de mixed payment folosește totalul cu SGR.
   - Fără deploy final sau activare live SQL pe baza de date de producție.
2. **6D.6.6 — SGR finalize_sale SQL Manual Apply + Backend Verification**:
   - Aplicarea manuală a patch-ului SQL `finalize_sale`.
   - Verificarea manuală direct în baza de date / RPC.
3. **6D.6.7 — SGR POS + finalize_sale E2E**:
   - Testare E2E completă: produs cu SGR, verificare total în interfață, verificare plăți corecte, creare vânzare, stocare corectă în `sale_items` cu ambele tipuri de snapshot (TVA și SGR).
4. **6D.6.8 — SGR Sales History / Receipt Integration**:
   - Afișarea detaliată în istoricul vânzărilor și pe bon.
5. **6D.6.9 — SGR Returns Integration**:
   - Corelarea stornărilor de SGR cu retururile.
6. **6D.6.10 — SGR Final Visual QA**:
   - Validare vizuală finală și înregistrare dovezi.

## 10. Decizie
Planul și blueprint-ul de design sunt pregătite pentru:
**Ready for 6D.6.5 SGR POS Frontend Integration Preflight**.

## 11. Corecție 6D.6.4.1 — Rollout Safety

### Riscul de Payment Mismatch
A fost identificat un risc critic de blocare a vânzărilor în cazul unei lansări nesincronizate:
- **Backend nou + POS vechi**: Dacă funcția `finalize_sale` cu suport SGR este aplicată înainte ca interfața POS frontend să includă SGR în calculul totalului și al plăților, orice vânzare cu produse având `sgr_enabled = true` va fi respinsă cu eroare de tip payment mismatch (plățile trimise vor fi mai mici decât totalul calculat de DB cu 0.50 RON per unitate).
- **POS nou + Backend vechi**: Dacă frontend-ul trimite plăți incluzând SGR, dar funcția `finalize_sale` de pe backend nu a fost actualizată, apelul RPC va fi respins deoarece plățile primite vor fi mai mari decât totalul simplu fără SGR calculat de baza de date.

### Strategia de Rollout Recomandată
Se recomandă strategia **Synchronized Release**:
1. Pregătirea simultană a patch-ului SQL `finalize_sale` și a integrării POS frontend.
2. Aplicarea patch-ului SQL și deploy-ul frontend-ului în aceeași fereastră de mentenanță.
3. Rularea unui test E2E imediat cu produse SGR pentru a valida checkout-ul.
4. În caz de erori neprevăzute, activarea imediată a planului de rollback.

### Rollback Plan
1. Înainte de aplicarea patch-ului SQL în etapa 6D.6.6, se va rula interogarea `SELECT pg_get_functiondef('public.finalize_sale'::regproc)` pentru a obține definiția exactă a funcției active.
2. Definiția funcției de backup va fi salvată în fișierul `database/rollback_finalize_sale_before_sgr_6d65.sql`.
3. În caz de incident, se va aplica scriptul de rollback pentru a restabili funcția anterioară `finalize_sale`.
4. Se va dezactiva temporar interfața POS SGR din frontend (prin toggle de configurare sau rollback cod frontend) și se vor marca produsele SGR ca non-blocking sau se va evita vânzarea lor până la remedierea problemei.

