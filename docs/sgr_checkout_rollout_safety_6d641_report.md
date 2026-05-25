# SGR Checkout Rollout Safety Hotfix — Etapa 6D.6.4.1

## 1. Rezumat
- **Status**: PASS;
- **Scop**: Prevenirea riscului de payment mismatch în timpul rollout-ului funcționalității SGR checkout;
- **Baza de date live modificată**: Nu;
- **POS live modificat**: Nu;
- **finalize_sale live modificat**: Nu.

## 2. Risc Identificat
- Produsele din nomenclator pot fi deja marcate cu `sgr_enabled = true` în mod individual de către administratori în etapele anterioare (de exemplu, în cadrul testelor sau configurărilor de produse).
- POS-ul curent din runtime/frontend nu include încă taxa SGR (0.50 RON) în coșul de cumpărături, în totalul tranzacției sau în plățile trimise către backend.
- Blueprint-ul pentru patch-ul `finalize_sale` propus în etapa 6D.6.4 include SGR în totalul calculat pe backend (`v_total_calc`) și validează `SUM(payments.amount)` față de acest total recalculat.
- Dacă patch-ul de backend este aplicat separat/înainte ca POS frontend să fie actualizat, casierul va încerca să înregistreze o vânzare trimițând plăți egale cu totalul fără SGR, ceea ce va determina RPC-ul să respingă tranzacția cu eroare de payment mismatch.

## 3. Impact Posibil
- **Backend nou + POS vechi**: Tranzacțiile cu produse care au `sgr_enabled = true` vor fi respinse în totalitate la checkout, afectând plățile cash, card sau mixte și blocând activitatea comercială a magazinelor.
- **POS nou + Backend vechi**: Dacă interfața frontend este actualizată dar funcția de pe backend rămâne cea veche, checkout-ul va fi respins deoarece plățile trimise (inclusiv SGR) vor fi mai mari decât totalul simplu fără SGR calculat de baza de date.

## 4. Decizie Rollout
- S-a decis adoptarea strategiei **Synchronized Release** (Lansare Sincronizată):
  - Patch-ul SQL pentru `finalize_sale` și codul de POS frontend trebuie testate și aplicate/deployate în cadrul aceleiași ferestre de deploy.
  - Nu se va aplica patch-ul SQL individual în etapa următoare.
  - Ordinea etapelor din roadmap a fost ajustată astfel încât etapa 6D.6.5 să devină o etapă de Preflight pe POS Frontend, fără modificări live de SQL.

## 5. Blueprint Updates
- A fost adăugat un avertisment explicit (Rollout Warning) în antetul fișierului `database/proposed_sgr_finalize_sale_6d64.sql`.
- A fost adăugată o secțiune dedicată (`11. Corecție 6D.6.4.1 — Rollout Safety`) în documentul de blueprint `docs/sgr_pos_finalize_sale_blueprint_6d64.md`.
- Roadmap-ul din blueprint a fost actualizat pentru a impune ordinea corectă de rollout.

## 6. Rollback Plan
- Înainte de aplicarea patch-ului SQL pe baza de date în etapa 6D.6.6, se va efectua un backup complet al structurii funcției live `public.finalize_sale` prin interogarea de catalog:
  `SELECT pg_get_functiondef('public.finalize_sale'::regproc);`
- Rezultatul va fi stocat în `database/rollback_finalize_sale_before_sgr_6d65.sql`.
- În caz de eșec sau regresie post-deploy, se va reaplica definiția anterioară din backup, se va dezactiva temporar componenta SGR din UI-ul de POS, iar produsele SGR vor fi marcate ca non-blocking.

## 7. Decizie
**Ready for 6D.6.5 SGR POS Frontend Integration Preflight**.
