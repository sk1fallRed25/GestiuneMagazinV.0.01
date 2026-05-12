# Checklist Execuție Reset Complet Bază de Date: Etapa 1J (Corectat)

Urmați acești pași în ordine strictă pentru a trece la schema v2.

## 1. Pregătire și Confirmare
- [ ] Confirmați că **NU mai avem nevoie de datele vechi** (Vânzări, Stocuri, Useri legacy).
- [ ] Realizați un backup complet al bazei de date curente.
- [ ] Exportați în format CSV lista de produse dacă doriți să le re-importați manual.

## 2. Configurare Auth (OBLIGATORIU ÎNAINTE DE SEED)
- [ ] În Supabase Dashboard -> Authentication -> Users, creați manual următorii utilizatori:
  - `admin@owner.com`
  - `admin@admin.com`
- [ ] Confirmați adresele de email (sau marcați-le ca confirmate).
- [ ] **IMPORTANT:** Fără acești utilizatori, scriptul `007_seed_initial_admins.sql` nu va funcționa corect.

## 3. Resetarea Schemei (Curățare)
- [ ] Deschideți `database/000_full_reset_warning.sql`.
- [ ] Decomentați secțiunile de `DROP TABLE`, `DROP FUNCTION` și `DROP TYPE`.
- [ ] Rulați scriptul în Supabase SQL Editor.
- [ ] **AVERTISMENT:** Din acest moment, aplicația React veche va înceta să funcționeze corect.

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
- [ ] Verificați mesajele de tip `NOTICE` în consola SQL pentru a confirma că userii au fost găsiți.

## 6. Adaptare Frontend (URGENT)
- [ ] Aplicația React trebuie adaptată imediat. **Prima prioritate: modulele Auth și Products.**
- [ ] Până la adaptarea serviciilor frontend la noile tabele (ex: `products` în loc de `produse`), majoritatea paginilor vor afișa erori.
- [ ] Consultați `docs/frontend_clean_schema_migration_plan.md` pentru detalii.
