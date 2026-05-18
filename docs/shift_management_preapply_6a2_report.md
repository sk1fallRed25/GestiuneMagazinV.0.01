# Shift Management Pre-Apply Verification — Etapa 6A.2

## 1. Rezumat
- **SQL aplicat**: nu
- **DB modificată**: nu
- **status**: ready for manual apply (folosind noul script rafinat `proposed_shift_management_6a2.sql`)

## 2. Verificare schema curentă
În urma auditului read-only efectuat asupra schemei `public` din Supabase (proiectul `iwlmlhhjzqnwlfoittot`), situația se prezintă astfel:
- **`sales.shift_id`**: Coloana există, are tipul `uuid`, este `nullable` și deține o constrângere Foreign Key legacy (`sales_shift_id_fkey`) către `public.cashier_shifts.id`.
- **`public.cashier_shifts`**: Tabela legacy există, dar are **0 rânduri** (`rows: 0`). Aceasta înseamnă că toate cele 31 de tranzacții existente în tabela `sales` au `shift_id` setat la `null`.
- **`public.pos_shifts`**: Tabela nu există încă în baza de date.
- **`public.cash_registers`**: Tabela nu există încă în baza de date.
- **`public.payments`**: Tabela există (39 rânduri), deține coloana `method` (`cash`, `card`) și sumele tranzacționate, fiind pregătită pentru agregările de închidere de tură.

## 3. Verificare funcții
- **`open_pos_shift`**: Nu există în baza de date.
- **`get_active_pos_shift`**: Nu există în baza de date.
- **`close_pos_shift`**: Nu există în baza de date.
- **`cancel_pos_shift`**: Nu există în baza de date.
- **`finalize_sale`**: Există în baza de date. Semnătura curentă acceptă parametrul opțional `p_shift_id UUID DEFAULT NULL`, dar nu execută nicio validare de existență sau stare activă a turei în momentul tranzacției.

## 4. Riscuri
- **FK legacy**: Deoarece `sales.shift_id` punctează spre `cashier_shifts`, orice inserare în `sales` cu un ID din `pos_shifts` ar eșua pe o eroare de constrângere. *Atenuare*: Deoarece `cashier_shifts` are 0 rânduri, putem șterge în siguranță vechiul FK și adăuga noul FK către `pos_shifts`.
- **Vânzări istorice fără shift**: Cele 31 de vânzări existente au `shift_id` null. *Atenuare*: Coloana `sales.shift_id` rămâne `nullable` la nivel de DDL pentru a nu invalida istoricul, obligativitatea turei fiind impusă exclusiv la nivelul logicii de tranzacție din `finalize_sale` pentru tranzacțiile noi.
- **Lipsă cash_register seed**: Pentru ca turele să poată fi deschise imediat după migrare, este necesară existența cel puțin a unei case de marcat per magazin activ. *Atenuare*: Includerea unui query de seeding în scriptul SQL.
- **`finalize_sale` nullable shift**: Permite tranzacții fără tură. *Atenuare*: Patch SQL pentru a valida activarea turei înainte de procesarea stocurilor.

## 5. SQL recomandat
Se recomandă utilizarea fișierului **`database/proposed_shift_management_6a2.sql`** (creat special în această etapă pentru a asigura o idempotență perfectă a politicilor RLS și triggerelor, migrarea curată a FK-ului, seeding-ul casei de marcat și întărirea procedurii `finalize_sale`).

## 6. Pași manuali
1. **Aplică SQL în Supabase SQL Editor**: Copiază și rulează conținutul fișierului `database/proposed_shift_management_6a2.sql` în consola Supabase.
2. **Verifică tabele/funcții**: Confirmă crearea tabelelor `cash_registers` și `pos_shifts` și prezența celor 4 proceduri stocate (`open_pos_shift`, `get_active_pos_shift`, `close_pos_shift`, `cancel_pos_shift`).
3. **Creează/confirmă Casa 1**: Confirmă că fiecare magazin activ a primit o înregistrare 'Casa 1' în `cash_registers`.
4. **Rulează integrarea frontend**: După validarea contractului backend, aplicația va impune automat fluxul de deschidere tură și va bloca vânzările în lipsa acesteia.
