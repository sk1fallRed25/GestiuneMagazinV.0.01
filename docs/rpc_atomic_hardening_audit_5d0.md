# RPC Atomic Hardening Audit — Etapa 5D.0

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
**BLUEPRINT ONLY**. În această etapă (5D.0), s-a realizat auditul tehnic complet al codului frontend și s-a proiectat arhitectura funcțiilor stocate PostgreSQL (RPC). Niciun script SQL nu a fost aplicat pe baza de date de producție și niciun serviciu frontend nu a fost încă modificat.

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
Finalizează o vânzare de la POS într-o singură tranzacție atomică garantată de PostgreSQL.

### Input Recomandat (JSON)
```json
{
  "p_store_id": "uuid",
  "p_profile_id": "uuid",
  "p_items": [
    { "product_id": "uuid", "quantity": 2.5, "unit_price": 15.00 }
  ],
  "p_payments": [
    { "method": "card", "amount": 37.50 }
  ],
  "p_notes": "Client fidel"
}
```

### Operații Atomice
1. Validează existența și permisiunile utilizatorului (`p_store_id`, `p_profile_id`).
2. Recalculează totalul bonului direct în baza de date, eliminând dependența de calculele din frontend.
3. Verifică egalitatea strictă între suma plăților și totalul calculat.
4. Pentru fiecare produs, identifică loturile din zona `magazin` și aplică algoritmul **FEFO/FIFO** (`ORDER BY expiry_date ASC NULLS LAST, created_at ASC`).
5. Blochează rândurile selectate folosind **`FOR UPDATE`** pentru a preveni modificările concurente.
6. Scade stocul, prevenind strict stocul negativ la nivel de rând.
7. Inserează antetul în `sales`.
8. Inserează liniile în `sale_items`.
9. Inserează înregistrările de plată în `payments`.
10. Inserează mișcările de stoc în `stock_movements` (`type='sale'`).

### Tabele Afectate
`sales`, `sale_items`, `payments`, `stock_batches`, `stock_movements`.

### Roluri Permise
`admin`, `casier`, `manager`, `gestionar`, `platform_owner`.

### Riscuri și Mitigări
- **Split pe loturi**: Dacă necesarul unui produs depășește cantitatea unui singur lot, funcția împarte automat consumul pe mai multe loturi și generează înregistrări de mișcare/vânzare distincte pentru fiecare lot consumat.
- **Prețuri**: Prețul este preluat/validat strict pentru a asigura concordanța financiară.

---

## 4. RPC `receive_stock`

### Scop
Procesează o recepție de marfă (NIR) în mod atomic.

### Input Recomandat (JSON)
```json
{
  "p_store_id": "uuid",
  "p_profile_id": "uuid",
  "p_document_number": "NIR-102",
  "p_document_date": "2026-05-17",
  "p_supplier_name": "Furnizor ABC SRL",
  "p_supplier_cui": "RO123456",
  "p_observations": "Marfă perisabilă",
  "p_items": [
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
}
```

### Operații Atomice
1. Validează rolul utilizatorului.
2. Calculează valoarea totală a recepției.
3. Inserează antetul în `receptions`.
4. Inserează liniile în `reception_items`.
5. Efectuează `upsert` pe tabela `product_prices` pentru a actualiza prețul de vânzare și achizție la nivel de magazin.
6. Caută un lot existent (`stock_batches`) cu aceleași caracteristici (`batch_number`, `expiry_date`, `zone`) blocându-l cu **`FOR UPDATE`**. Dacă există, crește cantitatea; dacă nu, inserează un lot nou.
7. Inserează mișcările în `stock_movements` (`type='reception'`).

### Tabele Afectate
`receptions`, `reception_items`, `product_prices`, `stock_batches`, `stock_movements`.

### Roluri Permise
`admin`, `gestionar`, `manager`, `platform_owner`.

### Riscuri și Mitigări
- **Concurență pe prețuri**: Folosirea `ON CONFLICT (store_id, product_id) DO UPDATE` garantează actualizarea corectă și fără erori a prețurilor.

---

## 5. RPC `transfer_stock`

### Scop
Transferă stoc între zonele magazinului (`depozit` <-> `magazin`) garantând conservarea cantităților.

### Input Recomandat
- `p_store_id` (UUID)
- `p_profile_id` (UUID)
- `p_product_id` (UUID)
- `p_quantity` (DECIMAL)
- `p_source_zone` (TEXT: `depozit` sau `magazin`)
- `p_target_zone` (TEXT: `magazin` sau `depozit`)

### Operații Atomice
1. Validează zonele sursă și destinație.
2. Selectează loturile sursă disponibile cu **`FOR UPDATE`** (ordonate FEFO/FIFO).
3. Scade cantitatea din loturile sursă.
4. Caută sau creează loturile corespondente în zona destinație (păstrând `batch_number`, `expiry_date` și `purchase_price`), blocându-le de asemenea cu **`FOR UPDATE`**.
5. Inserează mișcările de stoc în `stock_movements` (`type='transfer'`).

### Tabele Afectate
`stock_batches`, `stock_movements`.

### Roluri Permise
`admin`, `gestionar`, `manager`, `platform_owner`.

### Riscuri și Mitigări
- **Blocaje în lanț (Deadlocks)**: Deoarece accesarea loturilor se face întotdeauna într-o ordine deterministă (FEFO/FIFO după dată și ID), riscul de deadlock între tranzacții concurente este minimizat.

---

## 6. RPC `record_waste`

### Scop
Înregistrează o casare sau pierdere de inventar în mod atomic.

### Input Recomandat
- `p_store_id` (UUID)
- `p_profile_id` (UUID)
- `p_product_id` (UUID)
- `p_quantity` (DECIMAL)
- `p_source_zone` (TEXT: `magazin`, `depozit`, sau `auto`)
- `p_reason` (TEXT: motivul casării)
- `p_description` (TEXT, opțional)

### Operații Atomice
1. Validează permisiunile și cantitatea.
2. Creează antetul în `waste_events`.
3. Selectează loturile sursă cu **`FOR UPDATE`**. Dacă zona sursă este `auto`, caută întâi în `magazin`, apoi în `depozit`.
4. Scade cantitatea din loturi.
5. Inserează liniile de detaliu în `waste_items`.
6. Inserează mișcările în `stock_movements` (`type='waste'`).

### Tabele Afectate
`waste_events`, `waste_items`, `stock_batches`, `stock_movements`.

### Roluri Permise
`admin`, `gestionar`, `manager`, `platform_owner`.

### Riscuri și Mitigări
- **Sursa Auto**: Algoritmul `CASE WHEN zone = 'magazin' THEN 1 ELSE 2 END` implementează elegant prioritatea de consum direct în clauza `ORDER BY` a interogării SQL.

---

## 7. Security / RLS / Grants

### SECURITY DEFINER
Toate cele 4 proceduri stocate sunt definite cu clauza **`SECURITY DEFINER`**. Aceasta este o decizie arhitecturală fundamentală:
- Permite funcției să se execute cu privilegiile utilizatorului care a creat-o (proprietarul bazei de date / postgres).
- Utilizatorii finali (ex. casierii) nu au nevoie de permisiuni directe de `UPDATE` sau `DELETE` pe tabelele sensibile (`stock_batches`, `sales`, etc.) în politicile RLS, prevenind modificările manuale sau malițioase din afara fluxurilor standard.

### search_path
Pentru a preveni atacurile de tip *schema injection* (conform recomandărilor de securitate Supabase), toate funcțiile includ clauza strictă:
```sql
SET search_path = public
```

### Restricții Anon și Permisiuni Authenticated
În mod implicit, funcțiile `SECURITY DEFINER` din PostgreSQL pot fi executate de clasa `PUBLIC` (inclusiv utilizatori anonimi). Pentru a elimina acest risc major de securitate, blueprint-ul propune explicit revocarea accesului public și acordarea permisiunii exclusiv rolului `authenticated`:

```sql
REVOKE EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.finalize_sale(UUID, UUID, JSONB, JSONB, TEXT) TO authenticated;
```
*(Același model este aplicat pentru toate cele 4 funcții).*

---

## 8. Plan de implementare ulterior

Pentru a asigura o tranziție lină și fără riscuri în producție, se propune următorul calendar de implementare în etapele viitoare:

1. **Etapa 5D.1**: Aplicarea manuală a scriptului SQL `proposed_atomic_rpcs_5d.sql` în Supabase SQL Editor și verificarea existenței funcțiilor în dashboard.
2. **Etapa 5D.2**: Migrarea modulului **Transfer** (`transferService.ts`) pentru a apela `supabase.rpc('transfer_stock')`.
3. **Etapa 5D.3**: Migrarea modulului **Pierderi** (`lossService.ts`) pentru a apela `supabase.rpc('record_waste')`.
4. **Etapa 5D.4**: Migrarea modulului **Recepție** (`receptionService.ts`) pentru a apela `supabase.rpc('receive_stock')`.
5. **Etapa 5D.5**: Migrarea modulului critic **POS / Vânzare** (`posService.ts`) pentru a apela `supabase.rpc('finalize_sale')`.
6. **Etapa 5D.6**: Executarea unui **Smoke Test Tranzacțional** complet pentru a valida consistența datelor sub sarcină și simularea unor întreruperi de rețea.

---

## 9. Ce NU s-a făcut în această etapă

Pentru a respecta cu strictețe cerințele de siguranță ale Etapei 5D.0:
- **NU s-a aplicat niciun script SQL** pe baza de date.
- **NU s-a modificat nicio tabelă sau politică RLS** în Supabase.
- **NU s-a modificat codul serviciilor frontend** (`posService.ts`, `receptionService.ts`, etc.), acestea funcționând în continuare pe varianta curentă multi-step.
- **NU s-a integrat Fiscal Bridge** sau mecanisme de sincronizare offline.
