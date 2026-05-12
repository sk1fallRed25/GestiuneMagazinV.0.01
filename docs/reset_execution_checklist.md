# Checklist Execuție Reset Complet Bază de Date: Etapa 1J

Urmați acești pași în ordine strictă pentru a trece la schema v2.

## 1. Pregătire și Confirmare
- [ ] Confirmați cu echipa că **NU mai avem nevoie de datele vechi** (Vânzări, Stocuri, Useri legacy).
- [ ] Realizați un backup complet al bazei de date curente (via Supabase Dashboard -> Database -> Backups).
- [ ] Exportați în format CSV lista de produse (nume, cod bare) dacă doriți să le re-importați manual mai târziu.

## 2. Configurare Auth
- [ ] În Supabase Dashboard -> Authentication -> Users, asigurați-vă că există:
  - `admin@owner.com`
  - `admin@admin.com`
- [ ] Dacă nu există, creați-i manual și confirmați-le adresa de email.

## 3. Resetarea Schemei (Curățare)
- [ ] Deschideți `database/000_full_reset_warning.sql`.
- [ ] Decomentați secțiunile de `DROP TABLE`.
- [ ] Rulați scriptul în Supabase SQL Editor. **ATENȚIE: Datele vor dispărea definitiv.**

## 4. Reconstrucția Bazei de Date (v2)
Rulați următoarele scripturi în ordine:
- [ ] `001_clean_schema_core.sql`
- [ ] `002_clean_schema_inventory.sql`
- [ ] `003_clean_schema_sales.sql`
- [ ] `004_clean_schema_reception_waste.sql`
- [ ] `005_clean_schema_sync_audit.sql`
- [ ] `006_clean_schema_rls.sql`

## 5. Inițializare Date (Seed)
- [ ] Rulați `007_seed_initial_admins.sql`.
- [ ] Verificați în tabelul `public.profiles` că utilizatorii au fost creați corect.
- [ ] Verificați în tabelul `public.store_members` că `admin@admin.com` este legat de magazin.

## 6. Validare și Finalizare
- [ ] Încercați să vă conectați în aplicație cu `admin@admin.com`.
- [ ] Verificați dacă sidebar-ul afișează modulele corecte conform rolului.
- [ ] Încercați să adăugați un produs de test.
- [ ] Verificați dacă logurile de audit înregistrează acțiunea.
