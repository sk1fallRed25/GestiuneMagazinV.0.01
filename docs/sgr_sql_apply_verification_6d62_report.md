# SGR SQL Apply Verification — Etapa 6D.6.2

## 1. Rezumat
- **Status**: PASS;
- **SQL aplicat**: Da, manual de către utilizator;
- **DB modificată prin script aprobat**: Da;
- **Frontend modificat**: Nu;
- **POS/finalize_sale modificat**: Nu;
- **Backfill**: Nu;
- **DML distructiv**: Nu.

## 2. Script aplicat
- **Path**: `database/proposed_sgr_containers_6d60.sql`;
- **Metodă**: Aplicare manuală în Supabase SQL Editor;
- **Status execuție**: Rulat fără erori;
- **Implicare Agent**: Agentul nu s-a conectat direct la Supabase și nu a modificat direct baza de date (zero live executions / connections).

## 3. Structură products
Verificarea structurii tabelei `public.products` arată următoarele detalii:
- **Coloane adăugate**:
  - `sgr_enabled` (tip `boolean`, `NOT NULL`, implicit `false`)
  - `sgr_type` (tip `text`, nullable, permite selectarea tipului de ambalaj)
- **Constraint**: `products_sgr_type_check`
  - Permite exclusiv stările:
    - `sgr_enabled = false` și `sgr_type IS NULL`
    - `sgr_enabled = true` și `sgr_type IN ('plastic', 'metal', 'glass')`
- **Indexuri create**:
  - `idx_products_sgr_enabled` pe coloana `sgr_enabled`
  - `idx_products_sgr_type` pe coloana `sgr_type`
- **Compatibilitate date existente**:
  - Total produse în bază: 566
  - Produse legacy/implicit (SGR dezactivat și tip nul): 566 (100% din total)
  - Produse SGR active: 0
  - Produse cu tip SGR configurat: 0
  - Starea curentă a catalogului de produse este perfect compatibilă cu noile constrângeri.

## 4. Structură sale_items
Verificarea structurii tabelei `public.sale_items` pentru snapshot-ul SGR arată următoarele detalii:
- **Coloane adăugate (cele 6 coloane snapshot SGR)**:
  - `sgr_enabled` (tip `boolean`, `NOT NULL`, implicit `false`)
  - `sgr_type` (tip `text`, nullable)
  - `sgr_deposit_amount` (tip `numeric(12,2)`, `NOT NULL`, implicit `0`)
  - `sgr_total_amount` (tip `numeric(12,2)`, `NOT NULL`, implicit `0`)
  - `sgr_vat_group` (tip `text`, nullable)
  - `sgr_vat_rate` (tip `numeric(5,2)`, `NOT NULL`, implicit `0`)
- **Constraint**: `sale_items_sgr_check`
  - Impune strict:
    - **Fără SGR**: `sgr_enabled = false` și toate celelalte 5 câmpuri de snapshot sunt goale sau zero (`sgr_type IS NULL`, `sgr_deposit_amount = 0`, `sgr_total_amount = 0`, `sgr_vat_group IS NULL`, `sgr_vat_rate = 0`).
    - **Cu SGR**: `sgr_enabled = true`, tipul de ambalaj este valid (`sgr_type IN ('plastic', 'metal', 'glass')`), valoarea garanției este fix **0.50 lei** (`sgr_deposit_amount = 0.50`), totalul este non-negativ (`sgr_total_amount >= 0`), grupa de TVA este strict **D** (`sgr_vat_group = 'D'`), iar rata de TVA este **0%** (`sgr_vat_rate = 0`).
- **Indexuri create**:
  - `idx_sale_items_sgr_enabled` pe `(store_id, sgr_enabled)`
  - `idx_sale_items_sgr_type` pe `(store_id, sgr_type)` unde `sgr_enabled = true`
- **Compatibilitate bonuri existente**:
  - Total itemuri înregistrate în istoric: 81
  - Itemuri compatibile legacy (cu toate câmpurile SGR pe false/zero): 81 (100%)
  - Itemuri SGR existente: 0
  - Structura existentă a bonurilor este 100% protejată și compatibilă cu schema nouă.

## 5. Helper get_sgr_deposit_config
Funcția utilitară `public.get_sgr_deposit_config()` returnează configurația centralizată a sistemului SGR:
- **JSON returnat**:
  ```json
  {
    "amount": 0.50,
    "currency": "RON",
    "vatGroup": "D",
    "vatRate": 0,
    "vatLabel": "Grupa D — 0%",
    "depositLabel": "Garanție SGR",
    "types": [
      {"key": "plastic", "label": "SGR - PLASTIC"},
      {"key": "metal", "label": "SGR - METAL"},
      {"key": "glass", "label": "SGR - STICLĂ"}
    ]
  }
  ```
- **Privilegii de execuție (Grants)**:
  - `PUBLIC`: `false` (revocat)
  - `anon`: `false` (revocat)
  - `authenticated`: `true` (acordat)
- **Definiție și Securitate**:
  - Marcată ca `IMMUTABLE` (nu accesează/modifică date, sigură pentru apeluri repetate);
  - `search_path` setat explicit la `public` (previne atacurile prin search_path hijacking). *Notă: O verificare automată anterioară a raportat false din cauza formatului cu ghilimele `'public'` în codul sursă SQL, însă analiza directă a definiției confirmă că search_path-ul este configurat corect.*

## 6. finalize_sale status
- Funcția `public.finalize_sale` a rămas **neatinsă** în această etapă.
- Nu conține referințe sau logici legate de `sgr_enabled`, `sgr_total_amount`, `sgr_vat_group`, sau `sgr_deposit_amount`.
- Snapshot-ul TVA existent pe bonuri (gruparea și calcularea taxelor) este păstrat integral și funcționează normal.
- Integrarea tranzacțională a SGR în fluxul de checkout și actualizarea funcției `finalize_sale` sunt programate pentru etapa următoare (6D.6.3).

## 7. Supabase Advisors
- **Security Advisors**: Există avertismente globale raportate în consolă referitoare la funcții fără search_path setat în alte zone ale bazei de date (e.g., funcții legacy din migrări mai vechi), utilizarea `SECURITY DEFINER` pe some funcții executabile public și politici RLS permisive. Nu s-a raportat niciun warning de securitate specific sau nou legat de funcția nou adăugată `get_sgr_deposit_config`.
- **Performance Advisors**: Raportează foreign keys neindexate pe tabele globale și indecși nefolosiți. Indecșii nou adăugați pentru SGR (`idx_products_sgr_enabled`, `idx_products_sgr_type`, `idx_sale_items_sgr_enabled`, `idx_sale_items_sgr_type`) apar ca unused. Acest comportament este normal în etapa actuală, întrucât interfețele POS și de raportare SGR nu au fost încă implementate și nu execută interogări pe aceste coloane.
- Aceste avertismente globale nu afectează validitatea etapei curente și nu sunt specifice modificărilor SGR.

## 8. Decizie
- **Decizie finală**: **PASS**
- Structura SQL a fost aplicată corect, este safe, nu aduce regresii și nu strică datele existente.
- Proiectul este pregătit pentru etapa următoare: **6D.6.3 SGR Product Forms Integration**.
