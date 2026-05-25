# SGR POS / finalize_sale Integration Blueprint & Pre-Apply Hardening — Etapa 6D.6.4

## 1. Rezumat
- **Status**: PASS;
- **Obiectiv**: Analiza, auditarea și proiectarea integrării SGR în sistemul de vânzare (POS) și checkout tranzacțional (`finalize_sale`);
- **SQL Blueprint Creat**: Da, salvat în `database/proposed_sgr_finalize_sale_6d64.sql`;
- **Documentație Tehnică**: Da, salvată în `docs/sgr_pos_finalize_sale_blueprint_6d64.md`;
- **Modificări Live Active**: **Niciuna** (zero executări de scheme, zero modificări de cod frontend, zero înlocuiri live de funcții);
- **Următorul Pas**: 6D.6.5 SGR finalize_sale SQL Apply Verification.

## 2. Rezultate Audit & Decizii Arhitecturale

### A. Audit POS Frontend și Backend
- **Fluxul actual**: În prezent, serviciul POS din frontend (`posService.ts`) trimite o listă simplificată de itemuri `{ product_id, quantity }` către backend-ul RPC `finalize_sale`. Prețurile reale de vânzare și cotele de TVA ale produselor sunt preluate direct de pe server din `product_prices` pentru a asigura tranzacții securizate.
- **Model de Integrare SGR**: S-a ales ca datele referitoare la starea SGR a produselor să fie citite direct din tabela `public.products` pe backend. Această strategie previne orice tentativă de bypass sau fraudare a prețului garanției din partea clientului.

### B. Formula de Calcul SGR
- Fiecare articol cu `sgr_enabled = true` primește o garanție fixă de **0.50 lei/ambalaj**, scutită de TVA (grupa fiscală **D, 0%**).
- Suma totală a bonului recalculată în baza de date se definește ca:
  $$\text{Total Bon} = \sum (\text{Cantitate} \times \text{Pret Produs}) + \sum (\text{Cantitate SGR} \times 0.50\text{ lei})$$
- Validarea plăților se va face pe baza totalului complet unificat (Produse + SGR).

### C. Blueprint SQL (`database/proposed_sgr_finalize_sale_6d64.sql`)
A fost creat un patch complet pentru procedura `finalize_sale`, păstrând intacte toate regulile critice existente:
- Controlul rolurilor la nivel de magazin (`has_store_role` și `is_platform_owner`);
- Validarea turei active de casier (`pos_shifts`);
- Logica FEFO de selecție și descărcare a loturilor din `stock_batches`;
- Inserarea mișcărilor de stoc `stock_movements`;
- Generarea corectă a snapshot-ului de TVA pentru produse și adăugarea structurii noi de snapshot SGR în `sale_items`.

### D. Securitate și Hardening
- Procedura propusă utilizează explicit `SECURITY DEFINER` și setează `search_path = public` pentru a elimina riscul atacurilor prin search_path hijacking.
- S-au revocat în totalitate permisiunile de execuție publică (`PUBLIC` și `anon`), rezervând apelurile exclusiv rolului `authenticated`.

## 3. Decizie finală
- **Status**: **PASS**
- Blueprint-urile și analizele îndeplinesc toate normele de securitate stabilite și sunt gata pentru etapa următoare.

## 4. Corecție 6D.6.4.1 — Rollout Safety
- **Risc identificat**: Risc critic de payment mismatch dacă patch-ul SQL pentru `finalize_sale` (care validează plățile incluzând taxa SGR de 0.50 lei pe produs) este aplicat înainte ca POS frontend să implementeze calcularea totalului și a plăților cu SGR.
- **Decizie**: Nu se aplică SQL-ul în etapa următoare. Aplicarea SQL-ului trebuie sincronizată complet cu deploy-ul interfeței POS frontend (Synchronized Release).
- **Modificări Roadmap**: Etapa 6D.6.5 devine **SGR POS Frontend Integration Preflight** (fără modificări SQL live), iar aplicarea SQL-ului este mutată în etapa 6D.6.6.

