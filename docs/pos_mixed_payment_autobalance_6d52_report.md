# POS Mixed Payment Auto-Balance — Etapa 6D.5.2

## 1. Rezumat
- **Status**: PASS
- **Problema UX**: Anterior, când metoda de plată selectată în POS era `MIXT`, utilizatorul era nevoit să introducă manual atât suma numerar (CASH) cât și suma card (CARD) astfel încât suma lor să fie egală cu totalul bonului. În caz contrar, finalizarea vânzării eșua sau nu era auto-ajustată corespunzător.
- **Ce s-a implementat**: S-a introdus un algoritm de calcul bidirecțional în timp real bazat pe tipuri de date `string` (pentru a tolera tastarea corectă a zecimalelor) în hook-ul `usePos.ts` și input-uri responsive pe evenimentul de focus/blur în frontend. S-a implementat memorarea preferinței utilizatorului pentru ultimul câmp editat (`lastEditedMixedField`), astfel încât schimbarea totalului de coș să re-echilibreze automat celălalt câmp. De asemenea, s-au implementat limite stricte `[0, total]` pentru prevenirea valorilor negative sau depășirii totalului.
- **Ce nu s-a modificat**: Nu s-a modificat nicio procedură stocată (RPC) din baza de date (inclusiv `finalize_sale`), schema bazei de date, configurările de TVA, logica de Shift Management, Fiscal Bridge sau printarea fiscală.

## 2. Comportament implementat
- **Cash $\rightarrow$ Card rest**: Introducerea unei sume în câmpul `SUMĂ CASH` recalculează instant câmpul `SUMĂ CARD` ca `totalBon - cash`.
- **Card $\rightarrow$ Cash rest**: Introducerea unei sume în câmpul `SUMĂ CARD` recalculează instant câmpul `SUMĂ CASH` ca `totalBon - card`.
- **Valori peste total**: Dacă utilizatorul introduce o valoare mai mare decât totalul bonului, acea sumă este limitată la totalul bonului (`totalBon`), iar suma din celălalt câmp devine `0.00`.
- **Modificare total bon**: La adăugarea/ștergerea produselor sau modificarea cantității în coș, se recalculează dinamic suma din câmpul opus preferinței (`lastEditedMixedField`), păstrând neschimbată valoarea pe care utilizatorul a editat-o ultima dată.

## 3. Validări
- **Cash/Card $\ge 0$**: Ambele sume sunt forțate în intervalul `[0, total]` pe evenimentele de schimbare și blur, excluzând valorile negative.
- **Cash + Card = Total**: Validat matematic în frontend în timp real, iar pe backend la nivelul hook-ului `finalizeSale` înainte de transmiterea payload-ului.
- **Rotunjire la 2 zecimale**: S-a implementat funcția `roundMoney(val)` care folosește `Number.EPSILON` pentru a evita erorile de aproximare la rotunjire.
- **Fără erori floating point**: Toate calculele sunt normalizate prin transformarea inputului string în float, rotunjirea la 2 zecimale și formatarea finală cu `toFixed(2)`.

## 4. Payload RPC
- **`finalize_sale` neschimbat**: Semnătura și execuția RPC-ului au rămas complet nemodificate.
- **`sales.payment_method = mixed`**: Tranzacția este salvată în tabela `sales` cu metoda de plată `'mixed'` (lowercase, conform schemei Postgres).
- **`payments.method = cash / card`**: Cele două plăți sunt salvate corect în tabela `payments` sub formă de rânduri distincte având metodele `'cash'` și `'card'`.
- **Sumele salvate corect**: Sumele auto-echilibrate din interfață sunt trimise exact ca numere în payload-ul de payments, corespunzând exact cu datele din tabela de vânzări.

## 5. Test E2E
- **Fișier test**: `test_pos_mixed_payment_autobalance_6d52.py`
- **Scenarii testate**:
  1. Autentificare securizată și verificare că tura POS este deschisă.
  2. Adăugarea a 20 de bucăți de `OTET 1L` în coș (total 2.60 LEI).
  3. Activare plată mixtă (verificare setare implicită: CASH = 2.60, CARD = 0.00).
  4. Introducere CASH = 1.50 $\rightarrow$ auto-ajustare CARD = 1.10 (Test 1 PASS).
  5. Introducere CARD = 2.00 $\rightarrow$ auto-ajustare CASH = 0.60 (Test 2 PASS).
  6. Introducere CASH = 3.60 (peste total) $\rightarrow$ limitare CASH = 2.60 și CARD = 0.00 (Test 2B PASS).
  7. Resetare CARD = 2.00, incrementare cantitate la 21 în coș (total 2.73 LEI) $\rightarrow$ menținere preferință CARD = 2.00 și re-echilibrare CASH = 0.73 (Test 3 PASS).
  8. Finalizare tranzacție, golire coș (Test 4 PASS).
  9. Validare record DB în Supabase (verificare status `'finalized'`, `payment_method = 'mixed'`, `payments` cu sumele `0.73` cash și `2.00` card) (Test 5 PASS).
- **Rezultat**: SUCCESS
- **Exit code**: `0`

## 6. Build
- **Comandă**: `npm run build` (execută `tsc && vite build`)
- **Rezultat**: SUCCESS (fără avertismente sau erori runtime).

## 7. Limitări
- Nu modifică Fiscal Bridge (integrarea cu driverele fizice de case de marcat).
- Nu modifică POS RPC în baza de date.
- Nu modifică comportamentul de retururi sau anulări (`void_sale`, `return_sale_items`).
- Nu modifică rapoartele fiscale de TVA.

## 8. Decizie
- **Ready for 6D.5.3 Sales History VAT Display Audit & Snapshot Blueprint**
