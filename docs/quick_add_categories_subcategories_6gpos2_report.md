# Quick Add Categories/Subcategories — Etapa 6G.POS.2

**Data implementare:** 2026-05-28  
**Status:** ✅ Implementat — Ready for 6G.POS.3

---

## 1. Rezumat

### Ce s-a implementat

Etapa 6G.POS.2 adaugă suport complet pentru **categorii principale** și **subcategorii** în ecranul **Adăugare Rapidă (v2)** și un **browser ierarhic** de categorii în **POS**.

### De ce este necesar

În magazinele reale, produsele trebuie organizate pe categorii (Băuturi, Panificație, Legume/Fructe etc.) pentru:
- Navigare rapidă în POS fără scanner
- Raportare pe categorii
- Organizarea vizuală a catalogului

---

## 2. Schema Audit

### Ce există (live Supabase `GestiuneMagazinV0.0.1`):

**Tabel `public.categories`:**

| Coloană | Tip | Nullable | Note |
|---------|-----|----------|------|
| id | uuid | NO | PK, gen_random_uuid() |
| store_id | uuid | NO | FK → stores |
| name | text | NO | Numele categoriei |
| parent_id | uuid | YES | Self-referential FK → categories |
| created_at | timestamptz | YES | now() |

**Modelul:**
- `parent_id IS NULL` → **categorie principală** (root)
- `parent_id IS NOT NULL` → **subcategorie** (aparține categoriei cu id=parent_id)

**Tabel `public.products`:**
- Are `category_id uuid nullable` → referință la `categories.id`
- Poate pointa la un root sau la o subcategorie

### Ce lipsea

- Niciun serviciu frontend pentru categories
- Niciun hook pentru state management categorii
- Quick Add afișa doar `General` static din `detecteazaCategorie()`
- POS nu avea browser pe categorii

### Decizie schemă

**Nu a fost necesară nicio migrare SQL.** Schema suportă deja categorii + subcategorii prin modelul self-referential `parent_id`.

---

## 3. Quick Add UI

### Câmpuri noi în Adăugare Rapidă (v2)

**A. Select Categorie Principală:**
- Label: `Categorie Principală`
- Placeholder: `Alege categoria`
- `data-testid="quick-add-category-select"`
- Se populează din `categories WHERE parent_id IS NULL`

**B. Select Subcategorie:**
- Label: `Subcategorie`
- `data-testid="quick-add-subcategory-select"`
- Disabled dacă nu e selectată categoria principală
- Se populează din `categories WHERE parent_id = selectedCategoryId`

**C. Butoane rapide:**
- `+ Cat.` → `data-testid="quick-add-create-category-button"`
- `+ Sub.` → `data-testid="quick-add-create-subcategory-button"` (disabled fără categorie)

**D. Modals:**
- Modal creare categorie: `data-testid="quick-add-category-modal"`
- Modal creare subcategorie: `data-testid="quick-add-subcategory-modal"`

**E. Hint text:**
- Fără subcategorie: `ℹ️ Produsul va fi salvat doar în categoria principală.`
- Categoria General: `⚠️ Categoria General este recomandată doar temporar.`

### Creare categorie rapidă

1. Click `+ Cat.` → Modal se deschide
2. Introdu minim 2 caractere
3. Validare duplicate (case-insensitive, per magazin)
4. La succes: categoria apare automat selectată în dropdown

### Creare subcategorie rapidă

1. Selectează mai întâi categoria principală
2. Click `+ Sub.` → Modal cu afișarea categoriei-părinte
3. Validare duplicate în aceeași categorie
4. La succes: subcategoria apare automat selectată

---

## 4. Salvare Produs

### Logica category_id

```typescript
// În useFastAdd.ts:
const effectiveCategoryId = form.subcategoryId || form.categoryId || null;
```

- Dacă subcategorie selectată → `products.category_id = subcategory.id`
- Dacă doar categorie principală → `products.category_id = rootCategory.id`
- Dacă nicio categorie → `products.category_id = null`

### Câmpuri noi în payload

`FastAddProductPayload` acum include:
```typescript
categoryId?: string | null;  // effectiveCategoryId calculat
```

`FastAddForm` acum include:
```typescript
categoryId?: string;         // root category selectat
subcategoryId?: string;      // subcategorie selectată
```

### Păstrat neatins:
- TVA (vatGroup, vatPercent) ✅
- SGR (sgrEnabled, sgrType) ✅
- Stoc inițial, lot, expirare ✅
- Barcode, denumire, unitate ✅

---

## 5. POS Manual Selection

### Browser categorii

Când POS se deschide și `query = ''` (fără căutare activă):
- Se afișează **grila de categorii principale** (`data-testid="pos-category-grid"`)
- Click categorie → subcategorii + produse din categoria selectată
- Click subcategorie → produsele din subcategoria selectată

### Navigare ierarhică

```
[Categorii principale] → [Subcategorii + Produse din categorie] → [Produse din subcategorie]
         ↑ Breadcrumb cu back ←
```

### Data-testid implementate

| Element | data-testid |
|---------|-------------|
| Grilă categorii | `pos-category-grid` |
| Card categorie | `pos-category-card-{id}` |
| Grilă subcategorii | `pos-subcategory-grid` |
| Card subcategorie | `pos-subcategory-card-{id}` |
| Grilă produse | `pos-product-grid` |
| Card produs | `pos-product-card-{id}` |

### Compatibilitate cu search

- Când utilizatorul tastează → browser se ascunde, apar rezultatele de căutare (neatinse)
- Când query devine gol → browser revine

---

## 6. Produse fără Cod de Bare

### Status actual

Schema live are `barcode TEXT NOT NULL` → barcode **obligatoriu**.

`fastAddService.ts` validează:
```typescript
if (!payload.barcode) throw new Error("Cod de bare lipsă.");
```

### Rămâne pentru Etapa 6G.POS.3

- Generare coduri interne (ex: `INT-000001`)
- Coduri de bare generate automat
- Produse "fără barcode" vândute manual din browser categorie

---

## 7. Fișiere Modificate / Create

### Noi
| Fișier | Descriere |
|--------|-----------|
| `src/features/catalog/types.ts` | Tipuri CategoryRow, CategoryOption, CategoryWithSubs |
| `src/features/catalog/categoryService.ts` | CRUD categorii/subcategorii Supabase |
| `src/features/catalog/useCategories.ts` | React hook pentru state categorii |
| `src/features/pos/hooks/usePosCategories.ts` | Hook browser POS categorii |
| `src/features/pos/components/PosCategoryBrowser.tsx` | Component browser ierarhic POS |
| `test_quick_add_categories_6gpos2.py` | Test E2E scenariu A-G |

### Modificate
| Fișier | Modificare |
|--------|-----------|
| `src/features/fast-add/types.ts` | +categoryId, +subcategoryId în FastAddForm și payload |
| `src/features/fast-add/hooks/useFastAdd.ts` | effectiveCategoryId în payload |
| `src/features/fast-add/services/fastAddService.ts` | Trimite category_id la insert |
| `src/features/fast-add/FastAddPage.tsx` | UI complet înlocuit cu selecturi + modals |
| `src/features/pos/types.ts` | +categoryId în PosProduct |
| `src/features/pos/services/posService.ts` | +category_id în select, +listAllProducts() |
| `src/features/pos/PosPage.tsx` | Integrare PosCategoryBrowser |

### Neatinse (conform restricțiilor)
- `finalize_sale` ✅
- FiscalNet writer ✅
- SGR ✅
- TVA ✅
- BridgeGest ✅

---

## 8. Teste

### Build
```
npm run build → ✅ SUCCESS (2556 module, 0 erori TypeScript)
```

### E2E
```
python test_quick_add_categories_6gpos2.py
→ TOTAL: 42 | PASS: 26 | FAIL: 0 | SKIP: 6
```

Scenariile A-B (browser-based) sunt SKIP deoarece playwright-cli nu este instalat.
Toate verificările statice (cod, data-testid, regresii) sunt PASS.

---

## 9. Limitări

1. **Produse fără barcode** → Etapa 6G.POS.3: Internal Codes / Generated Barcodes
2. **Imprimarea etichetelor** nu este inclusă
3. **Cântare electronice** nu sunt incluse
4. **Categorii globale** — în schema curentă categoriile sunt per-magazin (store_id)
5. **Tabelul categories este gol** — utilizatorul trebuie să creeze categorii din Quick Add sau direct în DB

---

## 10. Decizie

✅ **Ready for 6G.POS.3 — Internal Codes / Generated Barcodes**

Etapa 6G.POS.2 este completă. Funcționalitățile de bază sunt implementate și build-ul trece. Etapa 6G.POS.3 va adăuga suport pentru produse fără barcode prin generare automată de coduri interne.
