# POS RPC Migration — Etapa 5D.5

## 1. Rezumat
- **Ce s-a migrat**: Modulul POS / Vânzări (funcția `createSale` din `src/features/pos/services/posService.ts`).
- **RPC folosit**: `public.finalize_sale`.
- **Logica eliminată din frontend**: 
  - Iterarea array-urilor pentru verificări individuale de stoc (pre-verificare stoc frontend care ar genera race conditions).
  - Loop-ul frontend-side de selecție `stock_batches` folosind reguli FEFO/FIFO.
  - Insert-ul manual în `sales`.
  - Update-ul repetitiv (`update`) în `stock_batches` per lot și produs.
  - Insert-ul iterativ în `sale_items`.
  - Insert-ul iterativ în `stock_movements`.
  - Insert-ul în `payments`.
- **Status**: **MIGRAT ȘI COMPILAT CU SUCCES (Build PASS)**.

---

## 2. Înainte vs După

| Aspect | Înainte (Multi-step Frontend) | După (RPC Atomic) |
| :--- | :--- | :--- |
| **Integritate Tranzacțională** | Inexistentă (o eroare la pașii finali lăsa vânzarea incompletă). | Completă (ACID, blocare pe rânduri prin `FOR UPDATE`). |
| **Securitate RLS** | Vulnerabil la manipularea manuală a prețurilor și stocurilor de către client. | Acces interzis direct în DB; RPC securizat prin `SECURITY DEFINER` și verificări backend. |
| **Număr query-uri** | 1 (Sales) + 1 (Payments) + N*(3 query-uri pe item). Zeci de query-uri pe un coș. | 1 singur apel RPC (`supabase.rpc('finalize_sale')`). |
| **Prețuri și Total** | Total calculat în frontend, trimis către server ca sursă de adevăr. | Total recalculat server-side pe baza `product_prices`, evitând frauda. |

---

## 3. Payload RPC

Funcția apelează:
```typescript
await supabase.rpc('finalize_sale', {
  p_store_id: storeId,
  p_profile_id: profileId,
  p_items: itemsForRpc,
  p_payments: paymentsForRpc,
  p_shift_id: shiftId || null
});
```

---

## 4. Structură `p_items`
Array JSONB compus din:
- `product_id`: string (UUID)
- `quantity`: number
*(Notă: `unit_price` NU este trimis, el fiind extras de server direct din baza de date pentru securitate)*.

---

## 5. Structură `p_payments`
Array JSONB compus din una sau mai multe plăți:
- `method`: string (`'cash'` sau `'card'`)
- `amount`: number

---

## 6. Validări păstrate în frontend
- Existența coșului (`items.length > 0`).
- Validarea existenței ID-urilor de produs.
- Cantități și total UI pozitive (`> 0`).
- Selecția unei metode valide de plată.
- Sumele pentru metoda `mixed` cumulate trebuie să coincidă cu totalul UI (`Math.abs(paid - totalSaleUI) <= 0.01`).

---

## 7. Validări mutate în DB
- **Prețuri**: Sunt citite din tabela `product_prices`.
- **Total:** Serverul recalculează totalul real conform prețurilor. RPC-ul validează dacă suma plăților corespunde totalului calculat de server (altfel rollback).
- **Consum loturi**: Baza de date rulează acum ciclul FEFO/FIFO cu `FOR UPDATE` blocând loturile la concurență (race conditions evitate).
- **Consistență istoric**: Generarea transparentă în `sale_items`, `stock_movements` (tip `sale`), `payments` cu prețurile și sumele validate server-side.

---

## 8. Build
- **Rezultat `npm run build`**: `✓ built in 2.52s`
- Aplicația a compilat curat, tipizările payload-urilor și conversiile tipurilor stricte (`toNumberStrict`, conversia la String a UUID-ului `sale_id`) au fost aplicate corect.

---

## 9. Test recomandat (Etapa 5D.5.1)

**Pași E2E:**
1. Login ca `admin@admin.com` / `admin123`.
2. Navigare în modulul POS (Vânzare).
3. Adaugă produs(e) cu stoc > 0 în coș.
4. Finalizează o vânzare `cash`.
5. Verifică generarea corectă a înregistrărilor pe backend.
6. Testează cu plata pe `card`.
7. Testează metoda mixtă (`cash` + `card`).
8. Adaugă un produs fără stoc / cu stoc insuficient și așteaptă respingerea prin dialog/eroare.
9. *Dacă e posibil*, testează diferența de preț prin manipulare manuală sau lipsă preț configurat (așteptând eroarea serverului RPC).
