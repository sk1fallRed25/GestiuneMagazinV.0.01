# Roadmap Post-Demo — Gestiune Magazin v2

Acest document definește direcția strategică și ordinea de prioritizare a etapelor de dezvoltare pentru platforma **Gestiune Magazin v2**, imediat după finalizarea și validarea demonstrațiilor interne (Etapa 5B).

---

## 1. Decizie Strategică

În urma analizei de feedback și a evaluării riscurilor operaționale, echipa de arhitectură adoptă următoarea decizie strategică:

> [!IMPORTANT]
> **Decizie**: Se alege **Stabilizarea UX și Întărirea Tranzacțională (RPC Atomic Hardening)** ca prioritate absolută înainte de introducerea oricăror funcționalități noi de cod sau integrări hardware externe.

### Argumentație:
1. **Siguranță și Consistență**: Deși aplicația este stabilă în condiții ideale de rețea, executarea fluxurilor complexe de stoc prin interogări multiple din frontend prezintă un risc teoretic de inconsistență la căderi de conexiune. Trecerea pe proceduri stocate atomice (RPC) elimină complet acest risc.
2. **Experiența Utilizatorului**: Introducerea confirmărilor de siguranță și explicarea clară a conceptelor de stoc (Magazin vs. Depozit) sunt esențiale pentru a preveni erorile umane în operarea zilnică a personalului comercial.
3. **Pregătire pentru Hardware**: O integrare viitoare cu casele de marcat fizice (Fiscal Bridge) necesită o bază tranzacțională de o robustețe impecabilă, pe care pachetul 5C + 5D o va garanta.

---

## 2. Următoarele Etape Recomandate (Prioritizare)

### 5C — UX Polish & Safety Confirmations
Această etapă se concentrează exclusiv pe rafinarea interfeței și prevenirea erorilor umane de operare:
- **Confirmări pentru acțiuni sensibile**: Ferestre modale (dialoguri de confirmare) la finalizarea vânzărilor POS, la înregistrarea pierderilor, la recepții și transferuri mari.
- **Texte explicative pentru stoc**: Tooltip-uri, insigne și legende clare care explică diferența operațională dintre stocul de Depozit (rezervă) și cel de Magazin (raft POS).
- **Empty States**: Ilustrații și mesaje de îndrumare (Call to Action) atractive pentru tabelele fără înregistrări.
- **Loading States**: Tranziții line și skeleton loaders unificați pentru a elimina senzația de blocaj la încărcarea datelor.
- **Mesaje de eroare uniformizate**: Înlocuirea erorilor brute de rețea cu alerte prietenoase, traduse în limba română.

### 5D — RPC Atomic Hardening
Etapa dedicată securizării și garantării integrității datelor la nivel de server (Supabase Postgres):
- **`finalize_sale` RPC**: Procedură stocată unică care primește coșul de produse și execută atomic verificarea stocului, consumul loturilor (FEFO/FIFO), crearea antetului de vânzare (`sales`), a liniilor (`sale_items`), a mișcărilor (`stock_movements`) și a plăților (`payments`).
- **`receive_stock` RPC**: Funcție atomică pentru recepția de marfă și crearea/actualizarea loturilor în `stock_batches`.
- **`transfer_stock` RPC**: Funcție atomică pentru mutarea stocului între locațiile Depozit și Magazin.
- **`record_waste` RPC**: Înregistrarea atomică a pierderilor/casărilor și scăderea stocului.
- **Audit logs în DB**: Jurnalizare avansată și automată a tuturor tranzacțiilor la nivel de trigger/RPC.
- **Reducerea operațiunilor multi-step din frontend**: Eliminarea completă a secvențelor lungi de interogări din codul React.

### 5E — Owner Console v2
Extinderea capacităților panoului de administrare pentru proprietarul platformei:
- **Creare / Invitare user**: Flux securizat de adăugare a noilor membri prin trimiterea de invitații pe email.
- **Asignare la magazin**: Interfață de alocare rapidă a utilizatorilor pe unul sau mai multe magazine din rețea.
- **Audit acțiuni owner**: Jurnal vizibil în UI cu istoricul tuturor modificărilor de permisiuni și roluri realizate de proprietar.

### 5F — Fiscal Bridge Discovery
Faza de cercetare și analiză tehnică preliminară pentru conectarea hardware:
- **Analiză tehnică fără implementare**: Studierea documentației și a cerințelor de comunicare hardware.
- **Protocol Tremol / Datecs**: Evaluarea protocoalelor specifice principalelor case de marcat din România.
- **Bridge Windows Service**: Arhitecturarea unui serviciu local (daemon) instalat pe PC-ul POS care să preia comenzile web și să le trimită prin portul COM/USB către casa de marcat.
- **Simulare bon nefiscal / fiscal**: Definirea clară a separării dintre proformele interne și bonurile fiscale ANAF.

### 5G — Offline Sync v2
Arhitecturarea suportului de funcționare complet deconectată:
- **Strategie Dexie**: Optimizarea stocării locale în IndexedDB pentru catalogul de produse și prețuri.
- **Queue local**: Mecanism de stocare temporară a tranzacțiilor POS efectuate offline.
- **Conflict handling**: Reguli de rezolvare a conflictelor de stoc la reconectarea online.
- **Retry mechanism**: Serviciu de sincronizare automată în fundal (background sync) la restabilirea conexiunii la internet.

---

## 3. Ce NU Trebuie Început Încă (Out of Scope)

Pentru a menține focusul echipei pe stabilitate și lansarea comercială de bază, următoarele direcții complexe sunt strict amânate pentru etapele ulterioare (v3+ / Enterprise):

- ❌ **Billing & Abonamente SaaS**: Integrarea sistemelor de plată recurentă (Stripe Billing) pentru taxarea magazinelor.
- ❌ **SaaS Public Self-Service**: Portal de înregistrare deschisă unde orice client își poate crea singur un cont și un magazin nou fără validare manuală.
- ❌ **Multi-tenant Enterprise Complex**: Arhitecturi cu baze de date fizice separate sau sharding pe clienți.
- ❌ **Predicții AI / ML Reale**: Antrenarea de modele de machine learning pe datele de vânzări (asistentul actual folosește prompt engineering avansat pe LLM, suficient pentru stadiul curent).
- ❌ **Integrare Fiscală Completă**: Scrierea de cod efectiv pentru drivere hardware înainte de finalizarea etapei de Discovery (5F).
