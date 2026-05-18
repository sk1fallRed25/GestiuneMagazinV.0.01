# Owner Console v2 Store Management E2E Test — Etapa 5E.4.1

## 1. Rezumat
- **Status**: PASS
- **Utilizator owner testat**: `admin@owner.com`
- **CUI testat**: `12345678`
- **Puncte de lucru testate**: `901`, `902`
- **Data testului**: 18 Mai 2026

## 2. Test Matrix

| Scenariu | Rezultat Așteptat | Rezultat Observat | Status | Observații |
| :--- | :--- | :--- | :--- | :--- |
| **Creare magazin 12345678 / 901** | Magazinul se creează în DB și UI, fără erori RLS, displayCode `12345678 / 901` | Magazin creat cu succes, modal închis, rând vizibil în StoresTable, date corecte în DB | **PASS** | S-a validat inserția completă și afișarea corectă. |
| **Editare magazin 12345678 / 901** | Actualizare nume, adresă și note în DB și UI, menținere CUI și punct de lucru | Modificări salvate cu succes în DB și UI, displayCode și CUI menținute | **PASS** | Funcționează corect actualizarea fără alterarea setărilor critice. |
| **Blocare duplicat 12345678 / 901** | Eroare UI afișată, rând necreat în DB | Eroare afișată corect în UI, count-ul în DB a rămas 1 | **PASS** | Validarea de unicitate CUI + workpointNumber funcționează perfect. |
| **Creare același CUI punct diferit 12345678 / 902** | Magazin creat cu succes, store_id diferit, displayCode `12345678 / 902` | Magazinul 902 a fost creat cu un UUID diferit în tabela `stores` | **PASS** | Sistemul suportă multiple puncte de lucru sub același CUI. |
| **Alocare user la magazin nou** | Rând adăugat în `store_members` pentru `magazin@magazin.com` și noul store_id | Asociere creată cu succes (rol `manager`), rolul global din `profiles` a rămas neschimbat | **PASS** | Izolarea multi-store minimală și gestiunea permisiunilor sunt corecte. |
| **Login user multi-store** | Verificare vizibilitate magazine și selector | `magazin@magazin.com` nu are parola `admin123` (status 400 la login) | **NOT TESTED** | Marcat ca NOT TESTED conform instrucțiunilor (fără resetare parolă). |

## 3. Verificări Supabase
- **stores create/update**: Inserare și actualizare verificate prin apeluri read-only către `window.supabase`. Rândurile conțin UUID-uri unice, `name`, `address` și `active` corecte.
- **settings.workpointNumber**: Stocat corect ca număr întreg (`901`, respectiv `902`) în JSONB-ul `settings`.
- **settings.displayCode**: Generat și stocat corect în formatul `"CUI / N"` (`"12345678 / 901"`, `"12345678 / 902"`).
- **duplicate count**: Verificarea count-ului în baza de date a confirmat că încercarea de creare a duplicatului a fost respinsă de validarea de business, existând exact 1 rând pentru `901`.
- **store_id diferite pentru puncte diferite**: Cele două magazine au UUID-uri distincte (`847183fb-47c6-44d2-bcfc-774d05de20cc` vs `cf946d43-c197-4dde-bc27-18c77195492...`).
- **store_members pentru magazin nou**: S-a verificat existența asocierii între profilul `magazin@magazin.com` și magazinul `902` cu rolul de `manager`.
- **profiles.role neschimbat**: S-a confirmat că rolul global al utilizatorului (`casier`) a rămas intact în tabela `profiles`.

## 4. Probleme găsite
- **Store Context Switcher**: Aplicația alege în prezent primul magazin automat sau magazinul principal la login pentru utilizatorii asociați mai multor unități. Lipsește un selector explicit de magazin (`Store Context Switcher`) în interfața principală. Aceasta este o oportunitate de îmbunătățire (gap UX), nu un bug critic.

## 5. Decizie
- **Needs Store Context Switcher 5E.4.2**: Pentru a asigura o experiență optimă utilizatorilor cu acces multi-store, se recomandă implementarea unui selector de magazin în bara de navigare înainte sau în paralel cu Audit Logs.
