# Reception RPC Migration — Etapa 5D.4

## 1. Rezumat
- **Ce s-a migrat**: Logica de salvare a recepției din `src/features/reception/services/receptionService.ts`.
- **Ce RPC folosește**: `public.receive_stock`.
- **Ce logică a fost eliminată din frontend**: Tot fluxul secvențial multi-step (inserare în `receptions`, bucla de inserare în `reception_items`, căutarea și actualizarea/crearea în `stock_batches`, inserarea în `stock_movements`, și upsert-ul în `product_prices`).
- **Status**: **PASS** (Migrare completă, build validat).

---

## 2. Înainte vs După

| Aspect | Înainte (Multi-step Frontend) | După (RPC Atomic) |
| :--- | :--- | :--- |
| **Număr cereri rețea** | `1 + 4 * N` cereri (inserare header + 4 tabele per linie) | **1 singură cerere** către `supabase.rpc('receive_stock')` |
| **Atomicitate / ACID** | Inexistentă (o eroare la linia 2 lăsa linia 1 salvată și stocul parțial modificat) | **Completă** (tot documentul și stocurile se salvează într-o singură tranzacție) |
| **Concurență stocuri** | Risc de race condition la căutarea și actualizarea loturilor existente | Protejat prin `FOR UPDATE` la nivel de rând în PostgreSQL |
| **Securitate** | Necesita permisiuni directe de `INSERT`/`UPDATE` pe 5 tabele separate | Tabele blocate direct; acces prin funcție cu `SECURITY DEFINER` |

---

## 3. Payload RPC

Procedura stocată primește următorul payload strict:
- `p_store_id`: UUID magazin curent
- `p_profile_id`: UUID utilizator curent
- `p_document_number`: Număr document / factură
- `p_document_date`: Data documentului (format YYYY-MM-DD)
- `p_supplier_name`: Nume furnizor (sau `null`)
- `p_supplier_cui`: CUI furnizor (sau `null`)
- `p_observations`: Observații (sau `null`)
- `p_items`: Array JSONB cu liniile recepției

---

## 4. Structură `p_items`

Fiecare element din array-ul JSONB conține:
- `product_id`: UUID produs
- `quantity`: Cantitate recepționată
- `purchase_price`: Preț unitar de achiziție
- `sale_price`: Preț nou de vânzare
- `vat_percent`: Cota TVA (ex. 19)
- `batch_number`: Număr lot (sau număr document)
- `expiry_date`: Data expirării (sau `null`)
- `zone`: Zona de stocare implicită (`'depozit'`)

---

## 5. Validări păstrate în frontend
- Verificarea existenței `storeId` și `profileId`.
- Verificarea prezenței numărului de document și a validității datei.
- Validarea existenței a cel puțin unei linii în recepție.
- Validarea prezenței `productId`, cantității pozitive (`> 0`) și prețurilor/TVA-ului pozitive (`>= 0`) pentru fiecare linie în parte înainte de apelul RPC.

---

## 6. Validări mutate în DB
- **Roluri și Permisiuni**: Verificarea rolului de `admin`, `gestionar` sau `platform_owner` prin funcția `has_store_role`.
- **Integritate Relațională**: Crearea automată a înregistrării în `receptions` și `reception_items`.
- **Logica de Stocuri**: Căutarea și actualizarea sau crearea loturilor în `stock_batches` (cu blocare `FOR UPDATE`).
- **Istoric Mișcări**: Generarea automată a mișcărilor de stoc (`stock_movements` de tip `reception`).
- **Politica de Prețuri**: Efectuarea `UPSERT`-ului în `product_prices`.

---

## 7. Build
Comanda `npm run build` a rulat cu succes:
```
> tsc && vite build
✓ 2492 modules transformed.
dist/assets/index-C4MlXOn4.js       928.18 kB │ gzip: 261.94 kB
✓ built in 2.51s
```

---

## 8. Test recomandat

Pentru validarea operațională completă, se recomandă următorii pași de testare manuală sau E2E:
1. **Login** în aplicație ca utilizator cu rol `admin` sau `gestionar`.
2. **Creare recepție manuală** introducând un număr de factură (ex. `REC-001`), selectând 1 produs și setând cantitatea 1.
3. **Verificare DB (`receptions` / `reception_items`)**: Confirmarea apariției noii înregistrări și a liniilor asociate.
4. **Verificare DB (`product_prices`)**: Confirmarea actualizării prețului de achiziție și de vânzare.
5. **Verificare DB (`stock_batches`)**: Verificarea creșterii stocului în zona `depozit`.
6. **Verificare DB (`stock_movements`)**: Confirmarea apariției mișcării cu `type='reception'`.
7. **Testare erori**: Încercarea trimiterii unui formular fără număr document sau cu cantitate invalidă pentru a verifica afișarea corectă a mesajelor de eroare.
8. **Testare import XML / e-Factura**: Încărcarea unui fișier XML valid pentru a confirma popularea automată a liniilor și salvarea prin noul RPC.
