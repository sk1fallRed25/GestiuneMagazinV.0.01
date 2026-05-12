# Plan Adaptare Frontend la Schema v2 (Reset Complet): Etapa 1J

Acest document descrie modul în care aplicația React trebuie să își schimbe interogările pentru a funcționa cu noua structură a bazei de date după reset.

## 1. Maparea Serviciilor și Tabelelor

| Modul React | Tabele Vechi (RO) | Tabele Noi (v2) | Observații |
| :--- | :--- | :--- | :--- |
| **Autentificare** | `utilizatori` | `profiles`, `store_members` | Se folosește `auth.uid()` pentru legătură. |
| **Produse** | `produse` | `products`, `product_prices` | Separare Catalog de Prețuri. |
| **Stocuri** | `produse.stoc_...` | `stock_batches` | Trecere la logică pe loturi (agregare). |
| **Recepție** | `receptii`, `receptii_detalii` | `receptions`, `reception_items` | Jurnalizarea automată în `stock_movements`. |
| **Transfer** | `produse.stoc_...` | `stock_movements` | Actualizare `stock_batches` (magazin/depozit). |
| **Pierderi** | `pierderi` | `waste_events`, `waste_items` | Trasabilitate per eveniment de casare. |
| **POS / Vânzare** | `vanzari`, `detalii_vanzare` | `sales`, `sale_items`, `payments` | Suport pentru plăți mixte și `client_event_id`. |
| **Offline Sync** | - | `client_events`, `devices` | Logica nouă pentru stocare locală/sync. |

---

## 2. Schimbări Majore de Logică

### A. Managementul Stocului (Batch-based)
În schema veche, stocul era un număr fix în tabelul `produse`. În v2, stocul total pentru un produs se calculează astfel:
```sql
SELECT SUM(quantity) FROM stock_batches WHERE product_id = '...' AND zone = 'magazin';
```
Serviciile frontend (`productService.ts`) trebuie să implementeze acest calcul sau să folosească un View.

### B. Roluri și Permisiuni
Interfața va depinde acum de `profiles.role` pentru navigație (vezi `permissions.ts`) și de `store_members` pentru a filtra datele per magazin.

---

## 3. Ordinea Implementării în Cod
1.  **Auth Layer:** Actualizare `useAuth` și `AuthContext` pentru a prelua profilul v2.
2.  **Product Layer:** Actualizare `ProductTable` și `productService` pentru noul Catalog.
3.  **Stock Aggregation:** Implementarea helperelor pentru calculul stocului din loturi.
4.  **Transaction Modules:** Adaptarea modulelor de scriere (Recepție, POS, Pierderi) la noile structuri de jurnalizare (`movements`).
5.  **Dashboard:** Reconstruirea metricilor pe baza noilor tabele de vânzări.
