# Raport Final Etapa 6G.FN.1 — FiscalNet Manual Export from Sales History

## 1. Rezumat
În cadrul acestei etape, am proiectat și implementat funcționalitatea de **Export Manual FiscalNet** direct din interfața de Istoric Vânzări (în modalul de detalii bon). 
- Utilizatorii pot acum previzualiza formatul text al bonului, copia conținutul în clipboard sau descărca fișierul `.txt` corespunzător.
- Nu s-a configurat scrierea automată în folderul real FiscalNet (`C:\FiscalNet\Bonuri`).
- Nu se emite niciun bon fiscal automat și nu se pornește utilitarul FiscalNet în mod activ în producție.

---

## 2. Sales History Mapping
S-a creat funcția de mapare pură `mapSaleDetailsToFiscalNetPayload` în [`salesHistoryToFiscalNet.ts`](file:///C:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/fiscal-net/salesHistoryToFiscalNet.ts).
Aceasta procesează datele din istoricul tranzacțiilor:
- **Articole**: Fiecare `SaleItemDetails` este convertit în `FiscalNetReceiptItem` utilizând prețul cu TVA inclus (`unitPrice`) și cantitatea originală. Grupa de TVA este extrasă din snapshot-ul original.
- **SGR**: Pentru articolele cu SGR activ, se extrage tipul materialului (`plastic`/`metal`/`glass`) și se validează. Se asociază automat valoarea garanției și cota de TVA D (cod 4 in FiscalNet).
- **Plăți**: Se citesc detaliile de plată (`payments`). Dacă tranzacția are plăți multiple (mixed payment), acestea se mapează separat, suportând exact sumele plătite.
- **Validări**: Se recalculează totalurile (`productsTotal + sgrTotal`). Dacă totalul recalculat nu corespunde cu totalul înregistrat în baza de date (cu o toleranță maximă de 0.01 lei), se aruncă o eroare clară de neconcordanță și se blochează exportul.

---

## 3. Export UI
A fost integrată o nouă secțiune în modalul de detalii al bonului ([`SaleDetailsModal.tsx`](file:///C:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/src/features/sales-history/components/SaleDetailsModal.tsx)):
- **Buton de Export**: „EXPORT FISCALNET” (cu `data-testid="fiscalnet-export-button"`). Apare doar pentru bonuri finalizate.
- **Mesaj de Atenționare**: Un banner galben (cu `data-testid="fiscalnet-export-warning"`) care avertizează explicit că acțiunea nu emite un bon fiscal real automat și că fișierul descărcat trebuie mutat manual în folderul `FiscalNet\Bonuri` pentru simulare fiscală.
- **Câmp CIF**: Permite introducerea manuală a unui CIF/CUI de client înainte de export pentru generarea liniei `CF^...`.

---

## 4. FiscalNet TXT Output
La declanșarea exportului, aplicația generează preview-ul text (cu `data-testid="fiscalnet-export-preview"`) și permite descărcarea lui.
- **Filename**: `${saleId}.txt` (cu `data-testid="fiscalnet-download-filename"`).
- **Format**: Text separat prin caret (`^`) și delimitat prin `\r\n` (CRLF), conform specificației FiscalNet:
  - Articole: `S^Denumire^Pret^Cantitate^UM^GrTVA^GrDep`
  - Garanție SGR: Adăugată ca linie separată imediat după articolul asociat.
  - Plăți: Linii `P^TipPlata^Valoare`.

---

## 5. Response Parser Manual
Sub secțiunea de export, utilizatorul are acces la o zonă de testare a răspunsurilor casei de marcat:
- **Textarea**: (cu `data-testid="fiscalnet-response-input"`) permite lipirea manuală a conținutului fișierului răspuns generat de FiscalNet în folderul `Raspuns`.
- **Buton**: „PARSEAZĂ RĂSPUNS” (cu `data-testid="fiscalnet-response-parse-button"`).
- **Panou Rezultat**: (cu `data-testid="fiscalnet-response-result"`) afișează:
  - Succes (`BONOK=1` sau număr bon implicit) cu insignă verde și numărul bonului fiscal extras.
  - Eroare (`BONOK=0`) cu insignă roșie, codul de eroare și mesajul descifrat (de ex: „Hartie lipsa”).

---

## 6. Teste E2E și Conformance
S-a creat fișierul de test [`test_fiscalnet_manual_export_6gfn1.py`](file:///C:/Users/Stefan/WebstormProjects/GestiuneMagazinV.0.01-1/test_fiscalnet_manual_export_6gfn1.py).
Scenarii verificate și trecute cu succes:
1. **Static Conformance**: Verificarea existenței mapperului și a selectorilor `data-testid` ceruți în componentele UI, plus confirmarea absenței scrierilor directe pe disc în frontend.
2. **E2E Flow**:
   - Autentificarea în aplicație ca administrator.
   - Crearea unei vânzări de test cu produs SGR (metal, cantitate 2, plată mixtă cash/card) prin API-ul de seed.
   - Navigarea la Istoric Vânzări, deschiderea modalului de detalii pentru acea vânzare.
   - Verificarea butoanelor și a bannerului de avertizare.
   - Generarea preview-ului și validarea structurii liniilor (`S`, SGR `S`, multiple `P`).
   - Verificarea corectitudinii numelui fișierului.
   - Testarea parserului de răspuns pentru scenariul de succes (`BONOK=1\n12345`) și eroare (`BONOK=0\nE01\nHartie lipsa`).
   - Curățarea datelor de test din baza de date.

---

## 7. Limitări
- **Fără Automatizare**: Acest modul nu scrie automat fișierele de bon direct în calea de producție `C:\FiscalNet\Bonuri` datorită sandbox-ului de browser web și a securității POS-ului.
- **Fără Monitorizare directă**: Răspunsurile nu sunt detectate automat; citirea se bazează pe introducere manuală.
- **Status Neschimbat**: Baza de date nu își actualizează starea tranzacției ca fiind fiscalizată sau nu în Supabase în urma acestei acțiuni.

---

## 8. Decizie
Modulul este pe deplin funcțional în regim dry-run/manual. 

---

## Actualizare 6G.FN.2 — Controlled Real Folder Pilot
În cadrul Etapei 6G.FN.2, s-a implementat pilotul controlat pentru scriere în directoare locale.
- **Detecție Runtime**: UI-ul afișează dinamic modul de operare (Sandbox vs Electron Bridge).
- **Siguranță sporită**: S-au adăugat avertismente specifice pilotului, o cale configurabilă salvată în local storage și un dialog de dublă confirmare cu text obligatoriu `SCRIE BON FISCALNET`.
- **Scriere atomică**: Pentru Electron s-a configurat scrierea atomică `.tmp` -> `.txt`.
- **Response Reader**: S-a adăugat posibilitatea citirii semi-automate a fișierului de răspuns direct din folderul configurat.
- **Teste**: S-au scris teste Playwright cuprinzătoare care confirmă ambele cazuri (Browser/Sandbox dezactivat și Electron/IPC activ prin mock-are).
- **Status**: **PASS**. Recomandăm trecerea la **6G.0 FiscalBridge Discovery & Integration Blueprint**.
