# Raport Final Etapa 6G.FN.0 — FiscalNet File Bridge Blueprint & Dry-Run Export

## Rezumatul Implementării
În cadrul acestei etape, am proiectat și implementat modulul izolat `src/features/fiscal-net/` pentru conversia, formatarea și validarea tranzacțiilor din POS în formatul specific de fișiere de comenzi FiscalNet (fișiere Caret-separated `.txt`). 

Toate funcționalitățile au fost dezvoltate în conformitate cu specificațiile tehnice, garantând izolararea completă de mediul fizic de producție:
- Nu s-a pornit aplicația FiscalNet.
- Nu s-a trimis niciun bon fizic către casa de marcat.
- Scrierile de fișiere se fac exclusiv în folderul dry-run local (`artifacts/fiscalnet/bonuri/`).

---

## Module și Funcții Implementate

1. **`types.ts`**:
   - Modelează structura de date strict tipizată pentru articole (`FiscalNetReceiptItem`), garanții SGR, metode de plată (`FiscalNetPaymentMethod`, `FiscalNetPayment`) și pachetul general de date pentru bon (`FiscalNetReceiptPayload`).
   - Garantează compatibilitatea datelor fără a folosi tipul generic `any`.

2. **`fiscalNetMappings.ts`**:
   - Definește tabela de corespondență a cotelor de TVA (A-E în coduri numerice FiscalNet 1-5).
   - Definește maparea metodelor de plată în coduri numerice suportate (numerar=1, card=2 etc.).
   - Configurează parametrii impliciți pentru liniile de garanție SGR (grupa de TVA D, denumiri standardizate pe tip de material).

3. **`fiscalNetFormatter.ts`**:
   - Implementează pure functions de conversie numerică (`toFiscalNetMoney` pentru preț în bani, `toFiscalNetQuantity` pentru cantitate $\times$ 1000).
   - Implementează `sanitizeFiscalNetText` care curăță caracterele speciale (`^`, newlines), elimină diacriticele românești pentru o mai bună compatibilitate hardware și trunchiază textele la 36 de caractere.
   - Dezvoltă logica de validare strictă a totalurilor. În cazul unei diferențe mai mari de 0.01 lei între suma plăților, produsele $\times$ cantități + garanții SGR și totalul general, exportul este blocat instantaneu prin excepție.

4. **`fiscalNetExportService.ts`**:
   - Implementează funcția de export dry-run `exportFiscalNetDryRun`.
   - În browser, funcția returnează doar textul generat pentru a evita erorile sandbox.
   - În mediul Node.js (în timpul testelor), folosește dinamic biblioteca `fs` pentru a scrie fișierele prin mecanism atomic (fișier `.tmp` redenumit apoi în `.txt`).

5. **`responseParser.ts`**:
   - Implementează funcția pură de citire a fișierului răspuns (`parseFiscalNetResponse`). Detectează starea tranzacției (`BONOK=1`/`BONOK=0`), extrage numărul bonului emis sau descifră mesajul de eroare returnat de casă.

---

## Exemple Formatate și Validate

### 1. Bon Simplu cu Produs normal + Produs cu SGR Metal + Plată Cash:
```text
S^HELL FOCUS 0.25L^450^1000^buc^1^1
S^GARANTIE SGR METAL^50^1000^buc^4^1
P^1^500
```
- **HELL FOCUS 0.25L**: preț unitar 4.50 lei (450 bani), cantitate 1.000 buc.
- **GARANTIE SGR METAL**: adăugată automat, preț unitar 0.50 lei (50 bani), cantitate 1.000 buc, TVA D (cod 4).
- **Plată Cash (1)**: valoare 5.00 lei (500 bani).

### 2. Bon Mixt (2 bucăți produs SGR Plastic + Plată Mixtă cash/card):
```text
S^PRODUS TEST^1000^2000^buc^1^1
S^GARANTIE SGR PLASTIC^50^2000^buc^4^1
P^1^1050
P^2^1050
```
- **PRODUS TEST**: preț unitar 10.00 lei (1000 bani), cantitate 2.000 buc.
- **GARANTIE SGR PLASTIC**: cantitate 2.000 buc, valoare 0.50 lei pe unitate (50 bani).
- **Plăți**: 10.50 lei Cash (P^1^1050) și 10.50 lei Card (P^2^1050).

---

## Statusul Verificării
- Toate fișierele create sunt izolate și nu afectează negativ fluxul POS curent.
- Formatter-ul a fost testat cu o gamă extinsă de scenarii descrise în suita de teste.
- Compilarea proiectului (`npm run build`) trece cu succes.
- Raportul de testare statică a validat formatul exact Caret-separated.
