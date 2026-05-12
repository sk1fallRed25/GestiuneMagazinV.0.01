# Strategie Nouă Schemă de Date (v2): Etapa 1J

Acest document definește direcția arhitecturală pentru modernizarea bazei de date a aplicației **GestiuneMagazinV0.0.1**, trecând de la o structură legacy hibridă la o schemă multi-tenant curată și scalabilă.

## 1. Executive Summary: De ce avem nevoie de o schemă nouă?

Starea actuală a bazei de date (hibrid RO-legacy + EN-modern) prezintă riscuri majore:
- **Duplicare și Confuzie:** Avem tabele cu roluri similare dar nume diferite (`produse`/`products`, `vanzari`/`sales`).
- **Module Reziduale:** Există peste 15 tabele legate de module eliminate (Agenți, Furnizori Externi) care încarcă schema și induc în eroare dezvoltatorii.
- **Securitate Slabă:** Schema legacy are RLS dezactivat și stochează parole în clar (`utilizatori.parola`).
- **Scalabilitate Limitată:** Schema veche nu suportă nativ multi-tenancy și gestiunea complexă a loturilor de marfă.

## 2. Decizie Arhitecturală Recomandată

**Varianta Aleasă: Optimizarea schemei `public` cu Tabele Moderne Coerente.**

Vom folosi schema `public` implicită a Supabase (pentru compatibilitate maximă cu clienții auto-generați), dar vom înlocui treptat toate referințele către tabelele românești cu un set nou de tabele în limba engleză, standardizate.

---

## 3. Schema Țintă (Core Components)

### A. Core & Multi-tenancy
- `organizations`: Entitatea principală (compania/magazinul).
- `profiles`: Datele extinse ale utilizatorilor legați de `auth.users`.
- `organization_members`: Relația dintre profil și magazin, cu roluri specifice.
- `locations`: Puncte de lucru (Depozit, Magazin, Stand).

### B. Catalog & Prețuri
- `categories`: Ierarhia de categorii de produse.
- `products`: Definiția generică a produsului (nume, cod bare, unitate).
- `product_prices`: Prețuri diferențiate per locație.

### C. Gestiune Stoc (Loturi)
- `stock_batches`: Cantități specifice cu preț de achiziție și dată expirare.
- `stock_movements`: Jurnalul tuturor mișcărilor (recepție, transfer, vânzare, casare).

### D. Operațiuni Gestiune
- `receptions` / `reception_items`: Intrări de marfă și documente asociate.
- `waste_events` / `waste_items`: Rapoarte de pierderi și casări.

### E. POS & Vânzare
- `cashier_shifts`: Gestiunea turelor și a sertarului de bani.
- `sales` / `sale_items`: Tranzacții finalizate.
- `payments`: Detalii plăți (cash, card, tichete).

### F. Audit & Sincronizare
- `audit_logs`: Jurnalul acțiunilor administrative.
- `devices`: Identificarea terminalelor/caselor de marcat active.

---

## 4. Maparea Migrării (Legacy -> v2)

| Tabel Vechi (RO) | Componentă Nouă (v2) | Observații |
| :--- | :--- | :--- |
| `utilizatori` | `profiles` + `organization_members` | Mutare către Supabase Auth. |
| `produse` | `products` + `stock_batches` | Separarea definiției de cantitatea fizică. |
| `vanzari` | `sales` + `payments` | Separarea totalului de metoda de plată. |
| `detalii_vanzare` | `sale_items` + `stock_movements` | Înregistrare automată în jurnal stoc. |
| `receptii` | `receptions` | Adăugare suport pentru documente atașate. |
| `pierderi` | `waste_events` | Structură granulară per item casat. |

---

## 5. Strategia RLS (Securitate)

Vom implementa politici RLS stricte:
1.  **Izolare Organizație:** Utilizatorii pot vedea/edita doar datele unde `organization_id` corespunde membrului respectiv.
2.  **Roluri (RBAC):**
    - `admin`: Acces total la nivel de organizație.
    - `gestionar`: Doar Catalog, Recepție, Transfer și Pierderi.
    - `casier`: Doar POS, Vânzări proprii și Schimburi de tură.
3.  **Audit:** Toate acțiunile de scriere pe tabele critice (Stoc, Preț) vor declanșa un log de audit.
