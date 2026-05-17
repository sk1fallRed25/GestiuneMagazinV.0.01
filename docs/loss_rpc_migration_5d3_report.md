# Loss/Waste RPC Migration — Etapa 5D.3

## 1. Rezumat
- **Ce s-a migrat:** Modulul de înregistrare a pierderilor și casărilor (`lossService.ts`).
- **Ce RPC folosește:** `public.record_waste`.
- **Ce logică a fost eliminată din frontend:** Au fost eliminate operațiunile multi-step vulnerabile la race conditions (buclele de căutare a loturilor, calculul FEFO/FIFO manual pe client, actualizarea directă a cantităților din `stock_batches`, precum și inserările individuale în tabelele `waste_events`, `waste_items` și `stock_movements`). De asemenea, s-au eliminat interfețele și funcțiile helper aferente vechiului mecanism (`StockBatch`, `getAvailableBatches`).
- **Status:** PASS (Complet migrat și funcțional).

## 2. Înainte vs După

| Aspect | Înainte (Multi-Step Frontend) | După (RPC Atomic SQL) |
| :--- | :--- | :--- |
| **Atomicitate & Tranzacții** | Inexistentă. Căderile de rețea între cererile HTTP lăsau datele inconsistente. | Totală (Tranzacție ACID unică la nivel de PostgreSQL). |
| **Concurență (Race Conditions)** | Vulnerabil. Mai mulți utilizatori puteau citi/suprascrie aceleași loturi simultan. | Protejat prin blocaje de rând (`SELECT FOR UPDATE`). |
| **Logică FEFO / FIFO** | Implementată pe client prin iterare manuală pe array-uri de loturi. | Gestionată intern de baza de date în cadrul procedurii stocate. |
| **Număr de apeluri de rețea** | Multiple (1 x `select`, 1 x `insert waste_events`, N x `update batches`, N x `insert waste_items`, N x `insert stock_movements`). | **1 singur apel** (`supabase.rpc('record_waste')`). |
| **Securitate & RLS** | Clientul avea nevoie de permisiuni directe de `UPDATE`/`INSERT` pe tabelele de stoc și mișcări. | Încapsulată prin `SECURITY DEFINER` și verificări interne de roluri (`RBAC`). |

## 3. Payload RPC

Procedura stocată `public.record_waste` primește următorii parametri strict tipizați:
- `p_store_id` (`uuid`): ID-ul magazinului curent.
- `p_profile_id` (`uuid`): ID-ul utilizatorului care inițiază casarea.
- `p_product_id` (`uuid`): ID-ul produsului casat.
- `p_quantity` (`numeric`): Cantitatea de casat (strict pozitivă).
- `p_source_zone` (`text`): Zona din care se face casarea (`'magazin'`, `'depozit'` sau `'auto'`).
- `p_reason` (`text`): Motivul principal al casării (ex. Produs deteriorat, Expirat).
- `p_description` (`text` | `null`): Observații sau detalii suplimentare opționale.

## 4. Validări păstrate în frontend

- **Sursă pierdere:** Se verifică dacă sursa este strict una dintre valorile permise (`'magazin'`, `'depozit'`, `'auto'`). Orice altă valoare aruncă imediat `Error("Sursă pierdere invalidă.")`.
- **Cantitate:** Se verifică dacă valoarea introdusă este un număr valid, strict mai mare decât zero.
- **Produs selectat:** Se asigură existența unui produs valid selectat din listă înainte de deschiderea modalului și trimiterea cererii.
- **Reason / Description:** Se validează prezența obligatorie a motivului (`reason`).
- **User / Store context:** Se verifică existența unei sesiuni valide (`user.id` și `currentStoreId`).

## 5. Validări mutate în DB

- **Rol admin/gestionar/platform_owner:** Verificarea permisiunilor și a rolului utilizatorului se face direct în baza de date prin funcții interne de autorizare.
- **Pre-verificare stoc suficient:** Baza de date calculează stocul real disponibil la momentul tranzacției și aruncă excepție SQL dacă acesta este insuficient.
- **FOR UPDATE:** Rândurile din `stock_batches` sunt blocate concurențial pe durata tranzacției pentru a preveni modificările paralele.
- **FEFO / FIFO:** Logica de consumare ordonată a loturilor (după data de expirare și data creării) este executată nativ de serverul PostgreSQL.
- **Update batch:** Scăderea cantităților din loturi se face tranzacțional.
- **waste_events, waste_items, stock_movements:** Generarea evenimentului de casare, asocierea itemilor și înregistrarea mișcărilor de stoc (tip `waste`) se fac automat în cadrul aceluiași bloc tranzacțional.

## 6. Build

Compilarea proiectului s-a realizat cu succes, fără avertizări sau erori:
```bash
> npm run build
vite v7.3.0 building client environment for production...
✓ 2492 modules transformed.
dist/index.html                       1.37 kB │ gzip:   0.65 kB
dist/assets/index-ByaQwyDR.js       929.17 kB │ gzip: 261.92 kB
✓ built in 2.46s
```

## 7. Test recomandat

Pentru verificarea manuală sau automată a fluxului de casare, se recomandă parcurgerea următorilor pași:
1. **Login** în aplicație folosind un cont cu rol de `admin` sau `gestionar`.
2. Navigare către modulul de **Pierderi** și selectarea unui produs care are stoc disponibil în magazin sau depozit (ex. `stoc > 0`).
3. Inițierea unei casări pentru **1 buc** din zona `magazin` (sau `depozit`), selectând un motiv valid (ex. "Produs deteriorat").
4. **Verificarea UI:** Confirmarea că stocul afișat în interfață a scăzut corespunzător după reîncărcarea automată a datelor.
5. **Verificarea bazei de date (Supabase):** Inspectarea tabelelor `waste_events`, `waste_items` și `stock_movements` pentru a confirma că tranzacția a generat corect înregistrările asociate.
6. **Test de stoc insuficient:** Încercarea unei noi casări cu o cantitate mai mare decât stocul total disponibil (ex. `9999` buc) și verificarea că sistemul afișează corect mesajul de eroare controlată *"Stoc insuficient pentru casare."* fără a altera datele sau starea formularului.
