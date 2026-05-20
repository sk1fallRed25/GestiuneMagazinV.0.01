# Sales Void Frontend Integration — Etapa 6B.2.2

## 1. Rezumat
În această etapă s-a realizat integrarea completă în interfața grafică (frontend) a funcționalității de stornare/anulare totală de bon fiscal (Sales Void MVP). 
- **Ce s-a integrat**: Butonul de anulare, modalul de confirmare cu validarea obligatorie a motivului, integrarea serviciilor de verificare a eligibilității și stornare, respectiv actualizarea badge-urilor de status.
- **RPC-uri folosite**: RPC-ul database securizat `get_sale_void_eligibility` pentru verificarea eligibilității tranzacției și `void_sale` pentru executarea atomică în baza de date a stornării complete.
- **Ce NU este inclus**: Returul parțial (care face obiectul etapei 6B.3) nu este inclus în acest MVP, axat exclusiv pe stornarea integrală a unui bon.

## 2. Service
Serviciul API (`src/features/sales-history/services/salesHistoryService.ts`) a fost extins cu:
- `getSaleVoidEligibility`: Interoghează RPC-ul `get_sale_void_eligibility` folosind `storeId`, `profileId` (din AuthContext ca `user.id`) și `saleId`, efectuând o parsare defensivă a JSONB-ului returnat de Supabase.
- `voidSale`: Apelează RPC-ul `void_sale`. Include mecanisme de interceptare a erorilor PostgreSQL (ex. tura închisă, motiv gol, status necorespunzător) și maparea acestora în mesaje de eroare intuitive în limba română (ex: *"Bonul poate fi anulat doar cât timp tura aferentă este deschisă."*).

## 3. Hook / State
Hook-ul `useSalesHistory.ts` a fost actualizat pentru a gestiona noul flux:
- **Eligibilitate**: Încărcarea asincronă a stării de eligibilitate la selectarea unui bon.
- **Modal**: Controlul deschiderii/închiderii modalului de stornare.
- **Loading/Error**: Urmărirea progresului operațiunii și raportarea erorilor returnate de API.
- **Refresh după anulare**: Reîncărcarea automată a listei globale de vânzări și a detaliilor bonului curent pentru a actualiza instant interfața la noul status `voided`.
- **Adaptabilitate**: `openVoidModal` primește fie `SaleSummary` fie `SaleDetails` și face conversia corespunzătoare pentru a preveni erorile de tip.

## 4. UI
Interfața grafică a primit îmbunătățiri de design premium:
- **Buton ANULEAZĂ BON**: Integrat direct în `SaleDetailsModal.tsx` folosind lucide icon `AlertTriangle` și nuanțe de roșu specifice acțiunilor distructive reversibile, vizibil exclusiv dacă statusul bonului este `finalized`.
- **VoidSaleModal**: O componentă modală complet nouă cu avertismente dinamice bazate pe regulile de eligibilitate, afișarea detaliilor financiare ale bonului, articolele returnate și input pentru motiv.
- **Status Badges**: `SaleStatusBadge.tsx` a fost extins pentru a suporta noile stări:
  - `voided` -> „Anulat” (roșu)
  - `returned` -> „Returnat” (portocaliu)
  - `partially_returned` -> „Returnat parțial” (galben)
  - `cancelled` -> „Anulat Vechi” (gri)

## 5. Securitate
- **Modificarea stocului**: Este realizată exclusiv la nivel de bază de date prin trigger-ul aferent din schema Supabase SQL, nu din frontend.
- **Fără calcule de refund/stoc în frontend**: UI-ul trimite doar cererea de anulare și motivul. Serverul (Supabase RPC) validează sumele și restabilește stocul pe loturile originale.
- **Motiv obligatoriu**: Formularul blochează confirmarea dacă motivul este gol sau are sub 3 caractere.

## 6. Limitări
- Returul parțial nu este implementat în acest MVP (este prevăzut în Etapa 6B.3).
- Testarea automată a scenariilor E2E este planificată separat pentru Etapa 6B.2.3.

## 7. Build
Procesul de build a fost verificat prin comanda `npm run build` și s-a finalizat cu **SUCCES** (exit code 0).

## 8. Decizie
Sistemul este complet integrat în frontend și service și este pregătit pentru testarea automată: **Ready for 6B.2.3 Sales Void E2E Test**.
