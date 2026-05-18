# Sales Returns & Voids Blueprint — Etapa 6B.1

## 1. Rezumat
- **Scop**: Proiectarea arhitecturii complete, sigure și idempotente pentru gestionarea anulărilor (voids) și retururilor (returns) de marfă provenite din vânzările POS.
- **De ce este P0**: În orice flux comercial real de retail, posibilitatea de a sturna bonuri fiscale (total sau parțial) și de a readuce marfa în stoc este obligatorie din punct de vedere legal și operațional înainte de lansarea pilotului în producție.
- **Ce se proiectează acum**: Arhitectura tabelelor, constrângerilor de stare, politicilor de securitate RLS și procedurilor stocate atomice (RPC-uri), fără a aplica modificări în baza de date sau în codul de producție în această etapă.

## 2. Audit Existent
În urma inspecției statice a bazei de date și a codului sursă (`src/features/sales-history`, `src/features/pos/services/posService.ts`), au fost identificate următoarele structuri și mecanisme:
- **`sales`**: Conține antetul tranzacțiilor (`id`, `store_id`, `total`, `payment_method`, `status`, `shift_id`, `profiles`).
- **`sale_items`**: Conține liniile bonului (`id`, `sale_id`, `store_id`, `product_id`, `quantity`, `unit_price`, `total_item`, `batch_id`).
- **`payments`**: Conține defalcarea plăților (`id`, `sale_id`, `store_id`, `method`, `amount`, `created_at`).
- **`stock_batches`**: Conține loturile de marfă și cantitățile disponibile în magazin (`batch_number`, `expiry_date`, `purchase_price`, `quantity`).
- **`stock_movements`**: Tabela centrală de trasabilitate a mișcărilor de stoc.
- **`sales-history`**: Modulul frontend care listează bonurile și permite filtrarea lor după metode de plată și statusuri.
- **`pos_shifts`**: Tabela de gestiune a turelor de casierie (`open`, `closed`, totaluri curente).

## 3. Tipuri de Operațiuni
S-a stabilit o diferențiere clară a operațiunilor comerciale:
- **A. Void / Anulare Vânzare**:
  - Anularea totală a unei vânzări recente, permisă în mod ideal în aceeași tură/aceeași zi.
  - Readuce toate produsele în stoc în loturile originale.
  - Creează mișcări de stoc inverse de tip `void`.
  - Marchează vânzarea originală cu statusul `voided`.
- **B. Return / Retur**:
  - Retur parțial sau total efectuat ulterior vânzării inițiale.
  - Permite selectarea produselor și a cantităților returnate.
  - Readuce stocul în magazin și menține trasabilitatea tranzacției originale.
  - Marchează bonul cu statusul `partially_returned` sau `returned`.
- **C. Correction / Ajustare**:
  - Destinată corecțiilor de erori interne sau neconcordanțe tehnice.
  - Nu se implementează în această etapă (rezervată pentru iterații viitoare).

## 4. Model de Date Propus
Blueprint-ul SQL (`database/proposed_sales_returns_voids_6b1.sql`) propune următoarele entități:
- **`sale_returns`**: Tabela antet pentru stornări (`id`, `store_id`, `original_sale_id`, `shift_id`, `profile_id`, `type`, `status`, `reason`, `total_refund`, `refund_method`, `notes`).
- **`sale_return_items`**: Tabela pentru liniile returnate (`id`, `store_id`, `return_id`, `original_sale_item_id`, `product_id`, `batch_id`, `quantity`, `unit_price`, `total_item`).
- **`refund_payments` (Opțional pentru robustețe)**: Suport pentru înregistrarea defalcată a rambursărilor prin metode multiple (cash, card, voucher).
- **`sales statuses`**: Extinderea constrângerilor sau enum-urilor de pe tabela `sales` pentru a include valorile `voided`, `partially_returned`, `returned`.

## 5. RPC-uri Propuse
- **`void_sale(p_store_id, p_profile_id, p_sale_id, p_reason, p_notes)`**: Procedură atomică ce validează starea bonului, blochează înregistrările concurente `FOR UPDATE`, generează antetul și liniile de anulare, readuce stocul în loturile inițiale și marchează bonul ca `voided`.
- **`return_sale_items(p_store_id, p_profile_id, p_sale_id, p_items, p_reason, p_refund_method, p_notes)`**: Procedură atomică ce procesează un array JSON de articole și cantități, validează limitele returnabile, recalculează rambursările direct din baza de date pentru securitate maximă și actualizează statusul vânzării în consecință.
- **`get_sale_return_eligibility(p_store_id, p_sale_id)`**: Procedură de consultare ce returnează detaliile vânzării, starea turei, cantitățile vândute, cantitățile deja returnate și permisiunile dinamice (`can_void`, `can_return`).

## 6. Integrare Stoc
- **Lotul Original (`batch_id`)**: Sistemul prioritizează reintroducerea cantităților în exact același `batch_id` din care s-a efectuat vânzarea inițială.
- **Mișcări Inverse**: Se generează automat înregistrări în `stock_movements` cu `source_zone = 'customer'`, `target_zone = 'magazin'` și `type = 'return'` sau `'void'`.
- **Evitarea Dublului Retur**: Validările stricte la nivel de RPC și blocările de rânduri `FOR UPDATE` elimină complet riscul de concurență (race conditions) și retururi multiple pe aceleași cantități.

## 7. Integrare Ture
- **Efect asupra totalurilor de tură (Cash/Card)**: Pentru MVP, nu se modifică retroactiv sau dinamic câmpurile agregate `total_*` din `pos_shifts` pe durata rulării turei; totalurile nete se vor calcula la închidere prin agregarea vânzărilor și scăderea stornărilor.
- **Adaptare viitoare `close_pos_shift`**: Blueprint-ul propune ca în viitor procedura de închidere a turei să calculeze explicit `net_cash = total_cash_sales - total_cash_refunds` și `expected_cash = opening_cash + net_cash`.

## 8. UX Propus
- **Istoric Vânzări**: Adăugarea butoanelor de acțiune rapidă („Anulează bon” pentru tranzacții din tura curentă și „Retur marfă” pentru bonuri finalizate), alături de badge-uri vizuale distincte pentru noile statusuri.
- **Modal Anulare**: Fereastră de confirmare ce prezintă sumarul bonului, solicită un motiv obligatoriu și avertizează utilizatorul cu privire la repunerea mărfii în stoc.
- **Modal Retur**: Interfață avansată ce listează produsele bonului, indică cantitatea maximă eligibilă pentru retur, permite introducerea cantităților parțiale, selectarea motivului și a metodei de rambursare.

## 9. Reguli Business și Securitate
- **Roluri și Limite**:
  - Casierii pot anula exclusiv vânzările proprii efectuate în cadrul turei curente active.
  - Managerii și Administratorii au permisiunea de a efectua retururi și anulări pe orice bon din magazin.
- **Motiv Obligatoriu**: Orice operațiune de stornare necesită completarea explicită a câmpului `reason`.
- **Securitate RLS/RPC**: Toate tabelele au RLS activat cu verificări prin funcția `has_store_role`. RPC-urile rulează ca `SECURITY DEFINER` și sunt expuse doar rolului `authenticated`.

## 10. Riscuri și Mitigări
- **Neconcordanțe la reconcilierea sertarului de bani**: Mitigat prin evidențierea separată a rambursărilor cash în rapoartele de tură.
- **Retururi nelegitime sau pe marfă deteriorată**: Mitigat prin obligativitatea motivului de retur și trasabilitatea completă în tabela `audit_logs`.
- **Concurență și retururi multiple**: Mitigat prin tranzacții atomice și row-level locking (`SELECT ... FOR UPDATE`).

## 11. Plan 6B.2 (Recomandare MVP)
Pentru implementarea efectivă, se recomandă abordarea iterativă:
1. **Etapa 6B.2 (Sales Void MVP)**: Aplicarea manuală a structurilor SQL și implementarea exclusivă a fluxului de anulare totală (`void_sale`) pentru bonurile din tura curentă. Aceasta oferă valoare operațională imediată casierilor cu o complexitate redusă.
2. **Etapa 6B.3 (Sales Return Advanced)**: Implementarea ulterioară a fluxului de retur parțial sau total pe bază de selecție de articole (`return_sale_items`).

## 12. Decizie
- **Ready for 6B.2 Sales Void MVP Implementation**: Blueprint-ul este complet, riguros și acoperă toate scenariile arhitecturale și de securitate necesare.
