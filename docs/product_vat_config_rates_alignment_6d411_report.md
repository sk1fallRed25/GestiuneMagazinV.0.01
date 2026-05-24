# Product VAT Config Rates Alignment — Etapa 6D.4.1.1

## 1. Rezumat
- **Status**: **Ready for manual SQL apply and 6D.4.1.2 verification**.
- **Problema identificată**: Deși baza de date returnează în prezent ratele corecte (`21`, `11`, `11`, `0`, `0`) datorită faptului că setările magazinelor active nu conțin suprascrieri de TVA, funcția de merge `merge_store_settings_with_defaults` era vulnerabilă la suprascrieri legacy din partea clientului. Dacă o setare de magazin custom definea `tax.vat_groups.A.rate = 19`, logica anterioară de merge accepta și propaga aceste rate legacy în runtime.
- **Bază de date modificată de agent**: **NU** (nu s-a aplicat SQL direct pe baza de date de producție, conform restricțiilor din instrucțiuni).

---

## 2. Audit Cauză
S-a efectuat un audit read-only în baza de date Supabase pe următoarele componente:
- **`get_default_store_settings()`**: Returnează corect ratele standard stabilite în etapa precedentă (A=21, B=11, C=11, D=0, E=0).
- **`merge_store_settings_with_defaults(p_settings jsonb)`**: S-a depistat că logica de combinare folosea operatorul `||` direct pe grupurile de TVA primite din client, permițând astfel ca proprietăți precum `rate` trimise din exterior (de exemplu 19, 9, 5) să înlocuiască ratele standard ale sistemului.
- **`stores.settings`**: Toate cele 4 magazine active au fost interogate. Niciunul nu conține câmpul `tax` sau structuri custom de `vat_groups` în prezent, motiv pentru care la apelul standard se foloseau fallback-urile corecte.
- **`get_product_vat_config(store_id)`**: Returnează direct 21/11/11/0/0 pentru magazinul principal, confirmând că raportul anterior (6D.4.1) conținea o eroare de redactare a output-ului, însă codul bazei de date era vulnerabil la suprascrieri.

---

## 3. Rezultat Constatat
- Output-ul actual al funcției returnează `21` pentru grupa A, `11` pentru grupa B și `11` pentru grupa C.
- Cauza erorii din raportul anterior a fost o inconsecvență de redactare, dar investigația a relevat o problemă arhitecturală reală în funcția de fuziune a setărilor, care a fost imediat adresată prin hotfix.

---

## 4. Hotfix Pregătit
- **Fișier SQL**: `database/hotfix_product_vat_config_rates_6d411.sql`
- **Funcția reparată**: `public.merge_store_settings_with_defaults(p_settings jsonb)`
- **Detalii corecție**: Funcția a fost modificată pentru ca după efectuarea fuziunii cheilor să suprascrie explicit ratele (`rate`) și codurile fiscale (`fiscal_code`) ale tuturor grupelor A-E cu standardul rigid al sistemului. Utilizatorul poate personaliza în continuare eticheta (`label`), starea (`active`) sau setările de bază ale taxelor (`default_vat_group`, `vat_payer`), dar nu poate altera procentajele de taxare.
- **Impact date**: **Zero**. Funcția este `IMMUTABLE` și nu efectuează nicio operațiune de scriere directă în tabele, nefiind necesare migrații sau backfill de date.

---

## 5. Standard TVA Final Garantat
După aplicarea hotfix-ului, ratele de TVA vor fi forțate rigid la nivel de bază de date:
- **Grupa A**: rate = `21`, fiscal_code = `'A'`
- **Grupa B**: rate = `11`, fiscal_code = `'B'`
- **Grupa C**: rate = `11`, fiscal_code = `'C'`
- **Grupa D**: rate = `0`, fiscal_code = `'D'`
- **Grupa E**: rate = `0`, fiscal_code = `'E'`

---

## 6. Decizie
**Ready for manual SQL apply and 6D.4.1.2 verification**
- Recomandăm administratorilor rularea scriptului `database/hotfix_product_vat_config_rates_6d411.sql` pentru a imuniza sistemul împotriva eventualelor nealinieri transmise din frontend.
