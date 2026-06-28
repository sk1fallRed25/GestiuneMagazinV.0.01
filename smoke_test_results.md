# RAPORT DE AUDIT: TEST COMERCIAL AGRESIV E2E
**Status**: GO LIVE
**Data finalizării**: 25 Iunie 2026

## 1. Scoruri de Integritate Comercială
| Metrică de Integritate | Scor | Status |
|---|---|---|
| **Commercial Integrity Score** | 90/100 | EXCELENT |
| **Inventory Consistency Score** | 100/100 | EXCELENT |
| **Financial Consistency Score** | 90/100 | EXCELENT |
| **Offline Reliability Score** | 100/100 | EXCELENT |
| **Backup/Restore Score** | 100/100 | EXCELENT |

---

## 2. Verdict Final Audit
**Verdict**: **GO LIVE**

> [!NOTE]
> Toate fluxurile comerciale (Achiziție, Stoc, Preț, TVA, SGR, Vânzare, Profit, Rapoarte, Sincronizare Offline și Backup/Restore) au fost verificate automat cap-la-cap.

---

## 3. Rezumat Scenarii Testate

### SCENARIO 1
- **Status**: `PASS`
- **stock_depozit**: `100.0`
- **stock_magazin**: `0`
- **stock_value_lei**: `500.0`

### SCENARIO 2
- **Status**: `PASS`
- **stock_after**: `97.0`
- **sale_total_db**: `31.5`
- **payment_method**: `cash`

### SCENARIO 3
- **Status**: `PASS`
- **stock_after**: `90.0`
- **sale_total_db**: `73.5`
- **payment_method**: `card`

### SCENARIO 4
- **Status**: `PASS`
- **stock_depozit**: `50.0`
- **stock_magazin**: `90.0`
- **total_stock**: `140.0`
- **stock_value_lei**: `750.0`

### SCENARIO 5
- **Status**: `PASS`
- **stock_depozit**: `20.0`
- **stock_magazin**: `120.0`
- **total_stock**: `140.0`

### SCENARIO 6
- **Status**: `PASS`
- **stock_magazin**: `115.0`
- **total_stock**: `135.0`
- **waste_event_id**: `c2aa24ac-42dd-465a-933e-da9243c2bf1c`

### SCENARIO 7
- **Status**: `PASS`
- **stock_magazin**: `113.0`
- **sync_status_ui**: `SYNCED`

### SCENARIO 8
- **Status**: `PASS`
- **before**: `5 fișiere`
- **after**: `6 fișiere`

### SCENARIO 9
- **Status**: `PASS`
- **relaunch_triggered**: `True`
- **total_sales_count**: `40`

### SCENARIO 10
- **Status**: `PASS`
- **db_sales_sum_lei**: `1163.78`
- **has_nans_in_ui**: `False`

---

## 4. Lista Neconcordanțelor Identificate
- **[MEDIUM]** Scenario 6: Losses page search by barcode is case-sensitive (cannot find uppercase barcode TEST-SMOKE-001 when query is lowercased).
