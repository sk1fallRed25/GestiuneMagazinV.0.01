# Raport de Audit și Decizie Cleanup (Etapa 6DATA.3)

Acest raport detaliază auditul datelor de test rămase în baza de date după curățarea controlată din etapa **6DATA.2**. Din cauza restricțiilor de integritate referențială (Foreign Key) și a instrucțiunilor de a nu șterge istoricul de vânzări în etapele anterioare, anumite produse și categorii de test au fost păstrate.

---

## 1. Rezumat Date Rămase după 6DATA.2
În etapa **6DATA.2**, s-a realizat curățarea tabelelor de test, însă au fost păstrate:
* **143 produse de test** (de tip `PRODUS_SGR_*`, `PRODUS_NORM_*`, `E2E_*`, `TEST-*`);
* **16 categorii de test** (de tip `Root E2E`, `Sub E2E`, `6CAT1`, `test`, `teste`);
* **140 vânzări de test** (`SAFE_TEST_SALE`) în `sales` care conțin exclusiv produse de test;
* **156 plăți de test** în `payments` legate direct de vânzările de test;
* **3 evenimente de casare** în `waste_events` (`TEST_WASTE_EVENT`) pe produse de test;
* **2 dispozitive POS** în `pos_devices`.

### Motivul păstrării:
Produsele de test sunt referențiate de istoricul de vânzări (`sale_items` -> `products`). Ștergerea directă a produselor ar genera erori de Foreign Key Constraint. Categoriile sunt legate de aceste produse sau au fost create ulterior de rularea testelor E2E (cum ar fi `Test Cat 6CAT1 94400`).

---

## 2. Audit Detaliat Produse Test Rămase
* **Total produse test identificate:** 143 produse.
* **Produse cu vânzări active (în `sale_items`):** 119 produse.
* **Produse fără vânzări active:** 24 produse.
  * **Fără nicio referință (Zero dependencies):** 21 produse. Pot fi șterse direct și în siguranță.
  * **Cu alte referințe active (fără vânzări):** 3 produse.
    1. `Produs Test Smoke 4I` (`TEST-4I-0101`) — Are un lot în stoc (`stock_batches`) și o înregistrare în casări (`waste_items`).
    2. `E2E_NORM_590419335067` (`590419335067`) — Are preț definit (`product_prices`).
    3. `E2E_SGR_590419336066` (`590419336066`) — Are preț definit (`product_prices`).

---

## 3. Audit Categorii Test Rămase
* **Total categorii test rămase:** 16 categorii.
* **Categorii utilizate de produse active:** 0 categorii (toate produsele de test rămase sunt asociate cu `category_id = NULL` sau cu categorii reale precum `Tarie`).
* **Categorii libere (Zero asociate):** 16 categorii. Pot fi șterse direct fără erori de integritate.
* **Categorii `test`/`teste` pe STEF&MON STORE:** Există 2 categorii (`test` și `teste`) pe magazinul `STEF&MON STORE`. Acestea au 0 produse asociate și pot fi curățate.

---

## 4. Audit Vânzări și Plăți Asociate
Analiza vânzărilor active din tabelul `sales` (263 în total) a generat următoarea clasificare:
1. **`SAFE_TEST_SALE`:** **140 vânzări** (Valoare totală: **1307.49 lei**). Conțin exclusiv produse de test și sunt generate în timpul testelor automate E2E.
2. **`MIXED_OR_UNKNOWN`:** **0 vânzări**. Nu există vânzări mixte care să combine produse reale cu produse de test.
3. **`KEEP_REAL_SALE`:** **123 vânzări** (Valoare totală: **2754.63 lei**). Conțin exclusiv produse reale și trebuie păstrate pentru pilot.

### Audit Plăți (`payments`):
* **Total plăți:** 299 plăți.
* **Plăți legate de vânzări de test (`SAFE_TEST_SALE`):** 156 plăți.
* **Plăți legate de vânzări reale (`KEEP_REAL_SALE`):** 143 plăți.
* **Risc de ștergere:** Niciunul pentru plățile asociate vânzărilor de test (se șterg în cascadă).

---

## 5. Audit Casări și Dispozitive POS
### Casări (`waste_events` și `waste_items`):
* **Total evenimente casare:** 11 evenimente.
* **Evenimente de test (`TEST`):** 3 evenimente (conțin doar produse de test). Recomandăm ștergerea lor.
* **Evenimente reale (`REAL`):** 8 evenimente (conțin doar produse reale). Recomandăm păstrarea lor.

### Dispozitive POS (`pos_devices`):
* **Total dispozitive active:** 2 dispozitive.
  1. `POS-TEST-E2E` (`dece2e99-...`): Folosit exclusiv în testele automate E2E.
  2. `POS-DESKTOP-6N68MP6` (`f685216b-...`): Dispozitivul local folosit pentru testare manuală și dezvoltare.
* **Recomandare:** Păstrarea ambelor pentru a nu bloca testarea locală/E2E, sau deactivarea flag-ului `active` pe cel de test.

---

## 6. Audit Utilizator `magazin@magazin.com`
* **Profil:** Există cu ID-ul `18a0f6d0-4dec-40d8-a4c7-16ec647fd144`.
* **Rol global:** `casier`.
* **Membru punct de lucru:** Are o asociere activă cu `STEF&MON STORE` cu rolul de `manager`.
* **Recomandare:** Păstrarea contului intact deoarece este folosit pentru testarea fluxurilor de casier/POS, însă rolul global ar trebui limitat la `casier` (cum este în prezent).

---

## 7. Opțiuni de Decizie pentru Etapa 6DATA.4

### VARIANTA A — Păstrare istoric test
* **Acțiune:** Se păstrează toate datele rămase intacte.
* **Avantaje:** Risc zero de erori Foreign Key, istoric complet al testelor trecute.
* **Dezavantaje:** Baza de date conține zgomot și date test în statistici/rapoarte financiare.

### VARIANTA B — Arhivare logică
* **Acțiune:** Se redenumesc produsele și categoriile de test adăugând prefixul `[ARCHIVED_TEST]`.
* **Avantaje:** Nu se rupe istoricul tranzacțiilor (vânzările rămân neschimbate).
* **Dezavantaje:** Datele test rămân în baza de date și pot denatura rapoartele de vânzări dacă nu sunt filtrate explicit în UI/backend.

### VARIANTA C — Cleanup complet istoric test (Recomandată)
* **Acțiune:** Se șterg tranzacțional plățile, articolele și vânzările de test (`SAFE_TEST_SALE`), evenimentele de casare de test, urmate de ștergerea tuturor produselor și categoriilor de test.
* **Avantaje:** Baza de date devine 100% curată, gata pentru pilotul de producție, fără reziduuri financiare sau stocuri de test.
* **Dezavantaje:** Necesită atenție sporită pentru a nu șterge vânzări reale (însă clasificarea arată o separare perfectă de 100% între vânzările reale și cele de test).

> [!IMPORTANT]
> **Recomandare preliminară:** Se recomandă **VARIANTA C** înainte de lansarea pilotului. Deoarece clasificarea a arătat o delimitare perfectă (0 vânzări mixte), curățarea completă este sigură și elimină datele fictive din rapoartele financiare.

---

## 8. Confirmări de Siguranță (6DATA.3)
> [!NOTE]
> * **NU** s-au executat ștergeri finale (`DELETE`) live în baza de date în această etapă.
> * **NU** s-au executat modificări de date (`UPDATE`) live.
> * **NU** s-a rulat `COMMIT` pentru scripturile de shape/modificare.
> * **NU** s-a modificat structura tabelelor (schema).
> * **NU** s-au modificat politici RLS sau funcții RPC.
> * **NU** s-au generat fișiere executabile (`.exe`) sau build-uri Electron.
