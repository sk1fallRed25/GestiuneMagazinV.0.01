# Transfer RPC Manual Test — Etapa 5D.2.1

## 1. Rezumat
- status: PASS
- metodă testare: Playwright E2E / test_transfer_rpc.py
- user/rol testat: admin sau gestionar, conform testului executat
- produs testat: OTET 1L
- RPC folosit: public.transfer_stock
- build: PASS

## 2. Test Matrix

Tabel cu scenarii:

1. Depozit -> Magazin
- input: 1 buc
- rezultat așteptat: transfer reușit
- rezultat observat: formular resetat, succes
- status: PASS

2. Magazin -> Depozit
- input: 1 buc
- rezultat așteptat: transfer reușit
- rezultat observat: formular resetat, succes
- status: PASS

3. Stoc insuficient
- input: 9999 buc
- rezultat așteptat: eroare business controlată
- rezultat observat: mesaj stoc insuficient, formular păstrat populat
- status: PASS

4. Confirmări native
- window.confirm interceptat și acceptat de Playwright
- status: PASS

## 3. Verificări RPC
Include:
- transferService.ts apelează supabase.rpc('transfer_stock')
- nu se mai face update manual stock_batches din frontend
- nu se mai inserează manual stock_movements din frontend
- FEFO/FIFO și FOR UPDATE sunt în DB

## 4. Build
Include output sumar:
npm run build
Exit code: 0
2492 modules transformed
built in 2.52s

## 5. Probleme găsite
- none

## 6. Decizie
- Ready for 5D.3 Loss RPC migration
