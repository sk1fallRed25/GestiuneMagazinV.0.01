# Audit de Aliniere Bază de Date: Etapa 1I

Acest document analizează starea curentă a bazei de date Supabase în raport cu aplicația **GestiuneMagazinV0.0.1** și propune măsuri pentru curățare, securizare și migrare.

## 1. Executive Summary
Baza de date actuală se află într-o stare de tranziție „mixtă”. Există două scheme conceptuale care coexistă în schema `public`:
1.  **Schema Legacy (Limba Română):** Folosită activ de aplicația curentă pentru toate operațiunile critice (stocuri, vânzări, recepții).
2.  **Schema Modernă (Limba Engleză / Multi-tenant):** Prezentă structural, dar parțial nepopulată sau nefolosită de logica de business actuală.

**Concluzie:** Aplicația depinde critic de tabelele legacy, dar securitatea acestora este minimă (RLS dezactivat, parole în clar).

---

## 2. Tabele folosite de aplicația actuală

Aceste tabele sunt **critice** pentru funcționarea curentă și NU trebuie șterse în această etapă.

| Nume Tabel | Modul / Serviciu Dependent | Risc la Modificare | Status Recomandat |
| :--- | :--- | :--- | :--- |
| `produse` | `productService.ts`, `Produse.tsx` | **Critic.** Pierdere date stoc. | **KEEP** (Securizare RLS) |
| `utilizatori` | `Login.tsx`, `AuthContext.tsx` | **Critic.** Blocare acces useri. | **MIGRATE** către `profiles` |
| `vanzari` | `salesService.ts`, `Vanzare.tsx` | **Critic.** Pierdere istoric vânzări. | **KEEP** |
| `detalii_vanzare`| `salesService.ts` | **Critic.** Pierdere detalii bonuri. | **KEEP** |
| `receptii` | `Receptie.tsx` | **Mediu.** Pierdere trasabilitate intrări. | **KEEP** |
| `receptii_detalii`| `Receptie.tsx` | **Mediu.** Pierdere detalii intrări. | **KEEP** |
| `pierderi` | `lossService.ts`, `Pierderi.tsx` | **Mediu.** Pierdere istoric casări. | **KEEP** |
| `bonuri` / `bonuri_detalii` | POS / Printare | **Mediu.** Probleme la generare bon. | **KEEP** |
| `niruri` / `nir_detalii` | Gestiune Documente | **Mediu.** Probleme legale/audit. | **KEEP** |

---

## 3. Tabele legacy nedorite (Epurare necesară)

Aceste tabele aparțin modulelor eliminate (Agenți, Portal Parteneri, Comenzi Furnizori) și pot fi eliminate după un backup complet.

- **Legate de Furnizori:** `furnizori`, `furnizor_produse`, `acces_furnizor`, `cereri_furnizori`, `comenzi_furnizor`, `comenzi_catre_furnizor`, `retururi_furnizor`.
- **Legate de Agenți:** `agenti`, `agent_produse`, `comenzi_agenti`, `comenzi_agenti_detalii`.
- **Alte tabele legacy:** `comenzi_aprovizionare`, `lista_cumparaturi`, `livrari`, `detalii_livrare`.

**Recomandare:** Arhivarea datelor (dacă există) și eliminarea tabelelor pentru a reduce complexitatea schemei.

---

## 4. Tabele moderne multi-tenant

Schema modernă (în engleză) este pregătită pentru o scalare viitoare, dar necesită o strategie de migrare a datelor.

| Nume Tabel | Status Curent | Utilizare Propusă |
| :--- | :--- | :--- |
| `profiles` | 0 - 1 rânduri | Preluarea rolurilor și datelor din `utilizatori`. |
| `organizations` | Prezentă | Suport pentru multi-magazin real. |
| `products` | Prezentă (EN) | Destinație finală pentru datele din `produse`. |
| `stock_movements`| Prezentă | Înlocuirea logicii de update direct cu jurnalizare. |
| `sales` / `sale_items` | Prezentă | Migrarea istoric de vânzări din `vanzari`. |

**Decizie:** Aplicația va fi migrată **gradual**. În prima fază, migrăm doar Autentificarea (`utilizatori` -> `profiles`), păstrând restul datelor în tabelele RO pentru a nu rupe interfața.

---

## 5. Probleme de Securitate Identificate

1.  **RLS Dezactivat:** Tabelele legacy (`produse`, `vanzari`) nu au Row Level Security activat, permițând oricărui utilizator cu anon key să citească/modifice datele dacă nu este blocat la nivel de API.
2.  **Parole în Clar:** `utilizatori.parola` și `agenti.parola` stochează parole ne-encriptate. **URGENT:** Migrare la Supabase Auth.
3.  **Profiles Incomplete:** Tabela `profiles` nu este sincronizată cu utilizatorii existenți, ducând la eșecuri în `AuthContext`.
4.  **Anon Key Exposure:** Riscul de acces neautorizat este mare atâta timp cât RLS este OFF.

---

## 6. Decizie Recomandată: Strategia B (Migrare Graduală Controlată)

**Direcția:** Păstrăm temporar schema legacy pentru a asigura stabilitatea UI-ului, dar aplicăm imediat următoarele:
1.  **Securizăm Auth:** Migrăm logica de login pe `auth.users` + `public.profiles`.
2.  **Activăm RLS:** Activăm RLS pe tabelele legacy cu politici permisive inițial, apoi restrictive.
3.  **Clean-up:** Eliminăm tabelele de Agenți/Furnizori care induc în eroare dezvoltatorii.
4.  **Sync:** Populăm `profiles` pe baza datelor din `utilizatori` pentru a menține compatibilitatea.
