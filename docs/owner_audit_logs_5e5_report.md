# Owner Audit Logs — Etapa 5E.5

## 1. Rezumat
- **Status**: IMPLEMENTED / READY FOR E2E
- **Ce s-a implementat**: Un sistem complet de trasabilitate și monitorizare a acțiunilor administrative critice efectuate de `platform_owner` (`admin@owner.com`) în cadrul Owner Console v2.
- **Ce acțiuni sunt auditate**: Crearea și editarea magazinelor/punctelor de lucru, alocarea membrilor la magazine, modificarea rolurilor și activarea/dezactivarea accesului.
- **Unde se vede auditul în Owner Console**: Într-un tab dedicat numit **Audit Logs**, integrat direct în bara de navigare a consolei.

**Facilități cheie incluse în interfață**:
- **Tab Audit Logs în Owner Console**: Afișează numărul total de înregistrări și lista detaliată.
- **Ultimele 50 acțiuni**: Preluare rapidă și ordonată descrescător după dată (`created_at`).
- **Filtre după acțiune și magazin**: Permite restrângerea vizualizării la anumite tipuri de evenimente sau entități specifice.
- **Căutare după magazin/actor/rezumat**: Filtrare instantanee client-side prin text liber.
- **Inspector modal oldData vs newData**: Un panou de inspecție avansat (cu formatare JSON și evidențiere vizuală) pentru a compara cu precizie starea anterioară cu noile modificări.

---

## 2. Tabela folosită

Sistemul utilizează tabela existentă în baza de date:
- `public.audit_logs`

**Câmpuri folosite**:
- `store_id`: UUID-ul magazinului asociat (nullable pentru acțiuni globale).
- `profile_id`: UUID-ul actorului care a inițiat acțiunea (`platform_owner`).
- `action`: Șir de caractere ce definește acțiunea (`store.create`, `store.update`, `member.assign`, etc.).
- `entity_type`: Tipul entității modificate (`store`, `store_member`).
- `entity_id`: Identificatorul unic al entității afectate.
- `old_data`: Structură JSONB ce stochează starea anterioară modificării.
- `new_data`: Structură JSONB ce stochează noile valori/setări.
- `ip_address`: Adresa IP (menținută null client-side din motive de securitate/arhitectură).
- `created_at`: Data și ora exactă a înregistrării evenimentului.

---

## 3. Acțiuni auditate

### `store.create`
- **entity_type**: `store`
- **oldData**: `null` (entitatea nu exista anterior)
- **newData**: Datele complete ale magazinului creat (nume, CUI, punct de lucru, cod de afișare, adresă, stare activare).

### `store.update`
- **entity_type**: `store`
- **oldData**: Snapshot-ul vechi al magazinului înainte de modificare (nume, adresă, CUI, active, setări).
- **newData**: Snapshot-ul nou cu valorile actualizate.

### `member.assign`
- **entity_type**: `store_member`
- **oldData**: Starea anterioară a asocierii (`existed: true/false`, rolul și starea `active` anterioare).
- **newData**: Datele noii alocări (`profileId`, `storeId`, `role`, `active`).

### `member.role_update`
- **entity_type**: `store_member`
- **oldData**: Obiect conținând rolul vechi (`{ role: 'casier' }`).
- **newData**: Obiect conținând rolul nou (`{ role: 'manager' }`).

### `member.active_update`
- **entity_type**: `store_member`
- **oldData**: Obiect conținând starea de activare veche (`{ active: true }`).
- **newData**: Obiect conținând starea de activare nouă (`{ active: false }`).

---

## 4. Strategie oldData/newData

- **Ce se salvează pentru fiecare acțiune**: Se salvează exclusiv câmpurile de business relevante pentru identificarea modificării (atribute de identificare magazin, roluri, stări de activare și metadate ne-sensibile).
- **Ce nu se salvează**: Date cu caracter confidențial sau tehnic strict intern.
- **Mențiune explicită de securitate**: Nu se loghează sub nicio formă:
  - Parole (inclusiv hash-uri)
  - Tokenuri de sesiune sau refresh
  - JWT (JSON Web Tokens)
  - Service keys sau chei de API
  - Date sensibile inutile

---

## 5. UI Owner Audit

Interfața cu utilizatorul este construită în componenta premium `OwnerAuditLogsPanel.tsx` și include:
- **Tab Audit**: Buton de navigare dedicat în `OwnerTabs.tsx`.
- **Tabel cu ultimele 50 acțiuni**: Afișare tabelară clară cu coloane pentru Dată & Oră, Badge Acțiune, Magazin, Actor, Rezumat și buton de inspecție.
- **Filtre**: Dropdown-uri pentru filtrare rapidă după acțiune și după magazin.
- **Search**: Casetă de căutare text în timp real.
- **Refresh**: Buton dedicat pentru reîncărcarea manuală a logurilor de audit de pe server.
- **Inspector modal**: Panou de tip overlay ce prezintă detalii complete și compară vizual blocurile JSON `oldData` și `newData`.
- **Empty state**: Mesaje clare și prietenoase atunci când nu există înregistrări sau când filtrele aplicate nu returnează rezultate.

---

## 6. Securitate

- **Fără `service_role`**: Toate operațiunile de audit se efectuează folosind cheia anon/client standard și tokenul utilizatorului autentificat.
- **Doar `platform_owner`**: Regăsirea și vizualizarea logurilor sunt protejate la nivel de rută și hook (`useOwnerConsole.ts`), fiind accesibile exclusiv utilizatorului cu rolul `platform_owner`.
- **Audit insert non-blocking**: Funcția `createOwnerAuditLog` este încapsulată într-un bloc `try-catch`. Orice eroare la scrierea în tabela de audit este logată ca avertisment, fără a bloca sau anula tranzacția principală a utilizatorului.
- **RLS rămâne sursa de adevăr**: Politicile Row Level Security din Supabase garantează că inserarea și citirea în `audit_logs` sunt corect autorizate.
- **`ip_address` rămâne null în frontend**: Din motive de securitate și limitări ale mediului de browser, adresa IP nu este colectată client-side.

---

## 7. Limitări

- Audit-ul operațional pentru modulele POS, Recepție, Transfer și Pierderi nu este inclus în Etapa 5E.5 (acestea au propriile mecanisme de mișcări de stoc).
- `ip_address` nu este capturat client-side.
- Auditarea server-side prin Edge Functions sau Webhooks poate reprezenta o etapă de extindere viitoare.
- Validarea E2E automatizată prin Playwright face obiectul etapei următoare (5E.5.1).

---

## 8. Build

Rezultatul rulării compilării TypeScript și împachetării Vite:
```bash
npm run build
```
```
> sistem-magazin@1.0.0 build
> tsc && vite build

vite v7.3.0 building client environment for production...
transforming...
✓ 2501 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                         1.37 kB │ gzip:   0.65 kB
dist/assets/index-CZ6CBZWk.css         62.19 kB │ gzip:   9.99 kB
dist/assets/index-B9BrwWKy.js       1,001.19 kB │ gzip: 274.48 kB
✓ built in 2.52s
```

---

## 9. Test recomandat

**Pași pentru verificarea manuală**:
1. Login cu contul `admin@owner.com`.
2. Creează un magazin test din secțiunea Magazine.
3. Editează magazinul test recent creat (modifică numele sau adresa).
4. Alocă un utilizator existent la magazin (din tab-ul Overview sau Profile Utilizatori).
5. Schimbă rolul membrului alocat (ex: din casier în manager).
6. Activează și apoi dezactivează accesul membrului respectiv.
7. Deschide tab-ul **Audit Logs**.
8. Confirmă că apar toate acțiunile efectuate mai sus în listă.
9. Inspectează fiecare înregistrare folosind butonul „Inspectează” pentru a verifica corectitudinea `oldData` și `newData`.

---

## 10. Decizie

- **Ready for 5E.5.1 Owner Audit Logs E2E Test**
