# RPC Atomic Hardening Audit — Etapa 5D.0 & 5D.0.1

## 1. Rezumat Executiv

### De ce sunt necesare RPC-uri atomice?
În prezent, aplicația **Gestiune Magazin v2** orchestrează fluxurile complexe de stoc (vânzări, recepții, transferuri, casări) direct din frontend prin multiple apeluri succesive către Supabase REST API (ex. `supabase.from('sales').insert()`, urmat de bucle de `update` pe `stock_batches` și `insert` pe `stock_movements`). 

Deși această abordare funcționează corect în condiții ideale de rețea și utilizare singulară, ea prezintă un risc major de **non-atomicitate (lipsa tranzacționalității ACID)**:
- Dacă conexiunea de rețea se întrerupe între două request-uri, baza de date rămâne într-o stare parțial actualizată (ex. antetul de vânzare este creat, dar stocul nu este scăzut sau mișcările lipsesc).
- În cazul concurenței ridicate (mai mulți casieri sau gestionari operând simultan pe aceleași produse), pot apărea *race conditions*, ducând la stocuri negative sau inconsistențe de calcul.

### Fluxuri afectate
1. **POS / Vânzare (`finalize_sale`)**
2. **Recepție Marfă (`receive_stock`)**
3. **Transfer Intern (`transfer_stock`)**
4. **Casări / Pierderi (`record_waste`)**

### Status curent
**BLUEPRINT ONLY**. În etapa 5D.0.1 s-a realizat alinierea strictă la schema reală. Niciun script SQL nu a fost aplicat pe baza de date de producție și niciun serviciu frontend nu a fost încă modificat.

---

## 2. Audit servicii frontend

Tabelul de mai jos sintetizează starea curentă a serviciilor operaționale din frontend și riscurile identificate:

| Modul | Service | Operații DB Curente | Risc Atomicitate | Recomandare RPC |
| :--- | :--- | :--- | :--- | :--- |
| **POS** | `posService.ts` (`createSale`) | 1. Pre-verificare `stock_batches`<br>2. `insert` antet `sales`<br>3. Bucle `update` pe `stock_batches`<br>4. `insert` `sale_items`<br>5. `insert` `stock_movements`<br>6. `insert` `payments` | **CRITIC**. O eroare de rețea în timpul buclei de produse generează comenzi orfane, stocuri nesincronizate și lipsa înregistrărilor de plată/mișcare. | Creare RPC `finalize_sale` |
| **Recepție** | `receptionService.ts` (`createReception`) | 1. `insert` antet `receptions`<br>2. Bucle `insert` `reception_items`<br>3. `select`/`insert`/`update` `stock_batches`<br>4. `insert` `stock_movements`<br>5. `upsert` `product_prices` | **RIDICAT**. Inserarea parțială a liniilor de recepție sau eșecul la actualizarea prețurilor lasă catalogul și gestiunea în stări inconsistente. | Creare RPC `receive_stock` |
| **Transfer** | `transferService.ts` (`executeTransfer`) | 1. `select` stoc total<br>2. `select` loturi sursă (FEFO)<br>3. Bucle `update` lot sursă<br>4. `select`/`insert`/`update` lot destinație<br>5. `insert` `stock_movements` | **RIDICAT**. Eșecul la pasul de adăugare în destinație (după scăderea din sursă) duce la pierderea fantomă a stocului. | Creare RPC `transfer_stock` |
| **Pierderi** | `lossService.ts` (`createLoss`) | 1. `select` loturi disponibile<br>2. `insert` antet `waste_events`<br>3. Bucle `update` `stock_batches`<br>4. `insert` `waste_items`<br>5. `insert` `stock_movements` | **RIDICAT**. Eșecul în bucla de scădere a loturilor lasă evenimentul de pierdere fără trasabilitate completă (menționat explicit în comentariile din cod). | Creare RPC `record_waste` |

---

## 3. RPC `finalize_sale`

### Scop
Finalizează o vânzare de la POS într-o singură tranzacție atomică garantată de PostgreSQL. Prețurile de vânzare sunt verificate strict din baza de date.

### Input Recomandat (JSON)
```json
{
  "p_store_id": "uuid",
  "p_profile_id": "uuid",
  "p_items": [
    { "product_id": "uuid", "quantity": 2.5 }
  ],
  "p_payments": [
    { "method": "card", "amount": 37.50 }
  ]
}
```

### Operații Atomice
1. Validează existența și permisiunile utilizatorului (`p_store_id`, `p_profile_id`). Permite doar `admin`, `casier`, `platform_owner`.
2. Pentru fiecare produs, se citește prețul real de vânzare direct din tabela `product_prices`.
3. Recalculează totalul bonului direct în baza de date.
4. Verifică cu o toleranță de `0.01` egalitatea între suma plăților furnizate (`amount > 0` și `method` validă) și totalul calculat.
5. Pentru fiecare produs, identifică loturile din zona `magazin` și aplică algoritmul **FEFO/FIFO** (`ORDER BY expiry_date ASC NULLS LAST, created_at ASC`).
6. Blochează rândurile selectate folosind **`FOR UPDATE`** pentru a preveni modificările concurente.
7. Scade stocul, prevenind strict stocul negativ la nivel de rând.
8. Inserează antetul în `sales` (folosind coloana `total` și determinând metoda principală de plată din `payments` sau `mixed`).
9. Inserează liniile în `sale_items` (populând `batch_id` și `total_item`).
10. Inserează înregistrările de plată în `payments`.
11. Inserează mișcările de stoc în `stock_movements` (`type='sale'`).

### Tabele Afectate
`sales`, `sale_items`, `payments`, `product_prices`, `stock_batches`, `stock_movements`.

### Roluri Permise
`admin`, `casier`, `platform_owner`. (Managerul și gestionarul nu operează de regulă direct pe POS).

### Riscuri și Mitigări
- **Split pe loturi**: Dacă necesarul unui produs depășește cantitatea unui singur lot, funcția împarte automat consumul pe mai multe loturi și generează înregistrări de mișcare/vânzare distincte pentru fiecare lot consumat.
- **Prețuri calculate pe DB**: Utilizatorul nu mai poate forța un preț prin payload de frontend, prevenind un atac direct sau o discrepanță de preț din cauza unor taburi vechi deschise.

---

## 4. RPC `receive_stock`

### Scop
Procesează o recepție de marfă (NIR) în mod atomic.

### Input Recomandat
Parametrul de dată este `DATE` (`p_document_date`), produsele din JSON:
```json
[
  {
    "product_id": "uuid",
    "quantity": 50,
    "purchase_price": 10.00,
    "sale_price": 15.00,
    "vat_percent": 19,
    "batch_number": "LOT-2026",
    "expiry_date": "2026-12-31",
    "zone": "depozit"
  }
]
```

### Operații Atomice
1. Validează rolul utilizatorului (exclusiv `admin`, `gestionar`, `platform_owner`).
2. Calculează valoarea totală a recepției pe baza `quantity` * `purchase_price`.
3. Inserează antetul în `receptions`.
4. Inserează liniile în `reception_items`.
5. Efectuează `upsert` pe tabela `product_prices` pentru a actualiza prețul de vânzare și achiziție la nivel de magazin. **Necesită existența unei constrângeri unice (UNIQUE constraint) pe coloanele `(store_id, product_id)` în tabela `product_prices`**.
6. Caută un lot existent (`stock_batches`) cu aceleași caracteristici (`batch_number`, `expiry_date`, `zone`) blocându-l cu **`FOR UPDATE`**. Dacă există, crește cantitatea; dacă nu, inserează un lot nou.
7. Inserează mișcările în `stock_movements` (`type='reception'`).

### Tabele Afectate
`receptions`, `reception_items`, `product_prices`, `stock_batches`, `stock_movements`.

### Roluri Permise
`admin`, `gestionar`, `platform_owner`.

### Riscuri și Mitigări
- **Concurență pe prețuri**: Folosirea `ON CONFLICT (store_id, product_id) DO UPDATE` garantează actualizarea corectă și fără erori a prețurilor, cu excepția cazului în care lipsește constrângerea de bază de date.

---

## 5. RPC `transfer_stock`

### Scop
Transferă stoc între zonele magazinului (`depozit` <-> `magazin`) garantând conservarea cantităților.

### Operații Atomice
1. Validează zonele sursă și destinație, iar rolul este restrâns la `admin`, `gestionar`, `platform_owner`.
2. Selectează loturile sursă disponibile cu **`FOR UPDATE`** (ordonate FEFO/FIFO).
3. Efectuează o pre-verificare defensivă: `IF v_batch.quantity < v_qty_to_take THEN RAISE EXCEPTION ...` pentru siguranță.
4. Scade cantitatea din loturile sursă.
5. Caută sau creează loturile corespondente în zona destinație, blocându-le cu **`FOR UPDATE`**. (Tabela reală nu asociază explicit `target_batch_id` în `stock_movements`, se menține asociația cu `batch_id` sursă).
6. Inserează mișcările de stoc în `stock_movements`.

### Tabele Afectate
`stock_batches`, `stock_movements`.

---

## 6. RPC `record_waste`

### Scop
Înregistrează o casare sau pierdere de inventar în mod atomic.

### Operații Atomice
1. Validează permisiunile (`admin`, `gestionar`, `platform_owner`) și cantitatea.
2. Efectuează o **pre-verificare totală** prin obținerea sumei cantităților loturilor pentru produsul respectiv în zonele selectate (`SUM(quantity)`). Dacă stocul este insuficient total, aruncă o excepție imediat, evitând crearea inutilă de date tranzacționale în antet.
3. Creează antetul în `waste_events`.
4. Selectează loturile sursă cu **`FOR UPDATE`**. Dacă zona sursă este `auto`, caută întâi în `magazin`, apoi în `depozit`.
5. Scade cantitatea din loturi și inserează liniile în `waste_items`.
6. Inserează mișcările în `stock_movements`.

---

## 7. Security / RLS / Grants

### SECURITY DEFINER & search_path
Toate procedurile sunt definite cu **`SECURITY DEFINER`** și includ clauza strictă:
```sql
SET search_path = public
```

### Restricții Anon și Permisiuni Authenticated
Blueprint-ul propune explicit revocarea accesului public și anonim și acordarea permisiunii exclusiv rolului `authenticated`:

```sql
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB) TO authenticated;
```

---

## 8. Plan de implementare ulterior

1. **Etapa 5D.1**: Verificarea existenței constrângerii UNIQUE pentru `product_prices(store_id, product_id)`.
2. **Etapa 5D.2**: Aplicarea scriptului `database/proposed_atomic_rpcs_5d.sql`.
3. **Etapele 5D.3 - 5D.6**: Migrarea serviciilor frontend și execuția Smoke Testului Tranzacțional.

---

## 9. Ce NU s-a făcut în această etapă

- **NU s-a aplicat niciun script SQL** pe baza de date.
- **NU s-a modificat codul serviciilor frontend**.

---

## 10. Corecții Etapa 5D.0.1 & 5D.0.2 — Aliniere cu schema reală și Pre-Apply Verification

În etapa 5D.0.1 și 5D.0.2, documentația și scriptul SQL aferent blueprint-ului (`database/proposed_atomic_rpcs_5d.sql`) au fost actualizate pentru o aliniere 100% cu structura exactă a schemei de date din Supabase, pe baza analizei codului sursă frontend (`posService.ts`, `receptionService.ts`, etc.):
- **`sales`**: S-a folosit coloana reală `total` în loc de `total_amount`. Parametrul `p_notes` a fost eliminat. **În etapa 5D.0.2 s-a adăugat parametrul `p_shift_id`**, necesar pentru a asocia vânzarea cu un shift deschis, conform schemei `sales`.
- **Validări JSON**: S-au adăugat verificări stricte de tip array (`jsonb_typeof`) pentru `p_items` și `p_payments` în funcțiile `finalize_sale` și `receive_stock`.
- **`sale_items`**: S-a folosit coloana reală `total_item` în loc de `total_price` și a fost adăugat parametrul lipsă obligatoriu `batch_id`.
- **Prețuri de vânzare citite exclusiv din DB**: `finalize_sale` nu mai primește `unit_price` ca parametru JSON de la interfață, ci interoghează `product_prices`.
- **Toleranțe matematice la plăți**: Compararea diferențelor dintre `payments.amount` și calculele vânzărilor utilizează toleranță `< 0.01`.
- **`p_document_date`**: Semnătura lui `receive_stock` acceptă acum tipul `DATE` conform bazei de date.
- **Verificare statică servicii**: Analiza serviciilor frontend a confirmat că payload-urile curente sunt perfect compatibile (cu mici mapări la nivel de chei) cu semnăturile RPC.
- S-a menținut integritatea sistemului curent. SQL-ul propus încă NU este aplicat.
