# Raport Corecții Blueprint RPC (Etapa 5D.0.1)

## 1. Context și Obiectiv
Acest document rezumă alinierea scriptului de proceduri stocate (`database/proposed_atomic_rpcs_5d.sql`) și a documentației aferente (`docs/rpc_atomic_hardening_audit_5d0.md`) la structura reală a bazei de date Supabase din mediul curent de lucru. Obiectivul a fost corectarea posibilelor erori de mapare, a tipurilor de date și a logicii de domeniu care să reflecte exact stadiul actual al aplicației (Gestiune Magazin v2).

## 2. Incompatibilități Identificate și Corectate

### A. Tabela `sales` și `sale_items`
- **Incompatibilitate**: Blueprint-ul folosea coloanele `total_amount` (sales) și `total_price` (sale_items).
- **Corecție**: Înlocuite cu coloanele reale din baza de date: `total` și respectiv `total_item`.
- **Incompatibilitate**: Lipsa parametrului obligatoriu `batch_id` pe `sale_items`.
- **Corecție**: Parametrul a fost integrat obligatoriu la momentul populării detaliilor vânzării.
- **Incompatibilitate**: Prezența nejustificată a variabilei/comentariilor pentru `notes`, deși coloana nu există pe tabelul de `sales`.
- **Corecție**: Eliminat complet. 

### B. Validarea Prețurilor la Vânzare
- **Incompatibilitate**: Funcția se baza pe prețul `unit_price` trimis din frontend.
- **Corecție**: Funcția preia strict prețul prin interogarea DB (`SELECT price_sale FROM product_prices`), adăugând siguranță maximă.

### C. Validarea Plăților
- **Incompatibilitate**: Compararea strictă a egalității matematice ridica posibile probleme pe server de rotunjiri JavaScript/Postgres.
- **Corecție**: Verificarea totalului de plată se face acum cu toleranță de zecimală (0.01).

### D. Securitate și Reguli de Business
- **Incompatibilitate**: Roluri nealiniate cu cerințele stricte (ex. `manager` putea face casări și recepții implicite).
- **Corecție**: Restrânse la `admin`, `gestionar`, `platform_owner` (și `casier` doar pe POS).
- **Incompatibilitate**: `receive_stock` folosea dată nealiniată pe tip `DATE`.
- **Corecție**: Ajustat pe tipul SQL corect `DATE`.
- **Incompatibilitate**: `record_waste` calcula stocul în tranzacție abia când ajungea la pasul scăderilor per lot, creând event block invalid.
- **Corecție**: Inserat `SELECT SUM(quantity)` ca pre-verificare rapidă la începutul procedurii.

## 3. Ce rămâne de verificat înainte de aplicare (Etapa 5D.1)
- **Constraint-ul UNIQUE pe `product_prices`**: Scriptul de recepție folosește comanda `ON CONFLICT (store_id, product_id) DO UPDATE`. Este absolut vital să ne asigurăm (printr-un query de verificare constraint-uri DB) că această regulă există fizic în baza de date Supabase, altfel execuția funcției va returna eroare SQL la rulare.

## 4. Status Curent
- Fișierul `database/proposed_atomic_rpcs_5d.sql` **este complet revizuit și aliniat cu schema reală.**
- Este gata pentru pre-apply verification (verificarea finală a schemei în Supabase Dashboard) și aplicare ulterioară.
- NICIUN COD SQL NU A FOST EXECUTAT în acest pas. Sistemul operațional curent funcționează perfect folosind arhitectura multi-step din frontend.
