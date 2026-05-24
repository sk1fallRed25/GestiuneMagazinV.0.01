# Raport Tehnologic: POS Mixed Payment Auto-Balance UX Hotfix (Etapa 6D.5.2)

## 1. Descriere
Acest hotfix adresează o problemă critică de UX (User Experience) în ecranul de POS (Punct de Vânzare). Atunci când metoda de plată selectată este `MIXT` (Numerar + Card), utilizatorul era nevoit să introducă manual ambele sume astfel încât totalul lor să corespundă cu valoarea bonului. Lipsa unei auto-echilibrări dinamice ducea la o experiență greoaie și la erori frecvente de operare.

Hotfix-ul implementează calculul automat bidirecțional cu respectarea preferinței utilizatorului pentru ultimul câmp editat și formatarea riguroasă a sumelor pe evenimentul de `blur`.

---

## 2. Soluție Tehnică & Arhitectură

### A. Gestiunea Stărilor ca Șiruri de Caractere (String-based States)
Pentru a asigura o editare fluidă a inputurilor numerice (în special când utilizatorul șterge text sau introduce zecimale parțiale precum `1.`), am refactorizat stările `cashAmount` și `cardAmount` din tipul `number` în tipul `string`.

### B. Algoritmul de Auto-Echilibrare (Auto-Balancing)
1. **Preferința de Editare**: Se salvează o stare `lastEditedMixedField` care indică dacă ultimul câmp modificat direct de utilizator a fost cel de `cash` sau `card`.
2. **Auto-calcul**:
   - Când utilizatorul tastează în `SUMĂ CASH`, valoarea din `SUMĂ CARD` se calculează instant ca `totalBon - cashInput`.
   - Când utilizatorul tastează în `SUMĂ CARD`, valoarea din `SUMĂ CASH` se calculează instant ca `totalBon - cardInput`.
3. **Echilibrare la Modificarea Coșului**: Dacă totalul bonului se schimbă (de exemplu prin scanarea/adăugarea unui nou produs sau modificarea cantității în coș), sistemul ajustează câmpul *non-editat* pentru a asigura balanța corectă:
   - Dacă `lastEditedMixedField` este `'card'`, se păstrează valoarea cardului și se auto-ajustează numerarul: `cashAmount = totalBon - cardAmount`.
   - În orice alt caz (inclusiv inițial), se păstrează valoarea numerarului și se auto-ajustează cardul: `cardAmount = totalBon - cashAmount`.

### C. Normalizare și Validare pe Evenimentul de Blur (`onBlur`)
Formatarea valorilor se face doar la `blur` pentru a nu întrerupe experiența de tastare:
- Sumele sunt rotunjite corect la 2 zecimale folosind o funcție dedicată `roundMoney(val)`.
- Se previn valorile negative. Dacă o sumă calculată sau introdusă este negativă sau depășește totalul, se plafonează corespunzător în intervalul `[0.00, totalBon]`.

### D. Securitate și Validare la Finalizare (Backend `finalizeSale`)
În hook-ul `usePos`, înainte de a trimite datele către baza de date (RPC-ul `finalize_sale`), se aplică o validare strictă a sumelor mixte:
```typescript
if (method === 'mixed') {
    const cash = parseFloat(cashStr);
    const card = parseFloat(cardStr);
    if (Math.abs((cash + card) - total) > 0.01) {
        throw new Error("Suma plăților mixt (Cash + Card) nu coincide cu totalul bonului!");
    }
}
```

---

## 3. Fișiere Modificate
- **[`src/features/pos/hooks/usePos.ts`](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/pos/hooks/usePos.ts)**:
  - Refactorizare stări în `string`
  - Handlere de auto-echilibrare: `handleMixedCashChange`, `handleMixedCardChange`
  - Handlere de blur: `handleMixedCashBlur`, `handleMixedCardBlur`
  - Efecte de sincronizare a totalului la modificarea coșului
  - Securizare validare finală în `finalizeSale`
- **[`src/features/pos/components/PosPaymentPanel.tsx`](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/pos/components/PosPaymentPanel.tsx)**:
  - Schimbare tip input în `type="text"`, adăugare `inputMode="decimal"` și pattern zecimal
  - Legare callback-uri `onBlur`
- **[`src/features/pos/PosPage.tsx`](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/pos/PosPage.tsx)**:
  - Propagarea noilor callback-uri de blur din hook în panoul de plată.

---

## 4. Testare Automatizată (Playwright)
Am creat testul Playwright **[`test_pos_mixed_payment_autobalance_6d52.py`](file:///c:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/test_pos_mixed_payment_autobalance_6d52.py)** pentru a valida comportamentele cheie:
1. **Verificare Inițială**: Activarea plății mixte setează sumele corecte (CASH = Total, CARD = 0.00).
2. **Modificare CASH**: Modificarea câmpului CASH calculează automat restul în CARD.
3. **Modificare CARD**: Modificarea câmpului CARD calculează automat restul în CASH.
4. **Sincronizare Coș**: Creșterea totalului coșului păstrează câmpul editat anterior fix și re-echilibrează celălalt câmp.
5. **Finalizare & Salvare DB**: Finalizarea tranzacției mixte salvează corect în baza de date Supabase cele două înregistrări asociate plății (metoda `mixed` cu înregistrări distincte de tip `cash` și `card` cu sumele respective).

### Rezultat Execuție Test:
```
1. Navigating to login...
[PASS] Logged in successfully.
Checking active store...
Already on Magazin Principal.

2. Ensuring active shift is open...
[PASS] Shift is open.

3. Navigating to POS page...
Searching for OTET 1L...
Incrementing quantity to 20 in cart using + button...
Total Text extracted: 2.60 LEI
Total numeric value: 2.6
Clicking MIXT payment method...
Initial cash value: '2.60', card value: '0.00'

TEST 1: Filling CASH with '1.50'...
After CASH edit -> CASH: '1.50', CARD: '1.10'
[PASS] Test 1: Modifying CASH auto-balances CARD.

TEST 2: Filling CARD with '2.00'...
After CARD edit -> CASH: '0.60', CARD: '2.00'
[PASS] Test 2: Modifying CARD auto-balances CASH.

TEST 3: Adding 21st OTET 1L to cart...
New total value: 2.73
After cart update -> CASH: '0.73', CARD: '2.00'
[PASS] Test 3: Cart total change respects last-edited field preference.

TEST 4: Finalizing sale with auto-balanced payments...
[DEBUG] Intercepted dialog (confirm): Finalizezi vânzarea în valoare de 2.73 lei? (Metodă: mixt)
[DEBUG] Dialog accepted successfully.
Final cart total: 0.0
[PASS] Test 4: Sale finalized successfully, cart reset.

5. Verifying sale record in database...
DB Payments: CASH=0.73, CARD=2
[PASS] Database sale and payments verified successfully.

[SUCCESS] E2E test for POS Mixed Payment Auto-Balance passed!
```

Toate testele E2E au trecut cu succes, iar integritatea proiectului a fost verificată prin `npm run build`.
