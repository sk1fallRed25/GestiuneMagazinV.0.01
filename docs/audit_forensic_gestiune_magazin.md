# Audit Forensic - Gestiune Magazin

## 1. Executive Summary
Proiectul **GestiuneMagazinV.0.01** este în stadiul de **Prototip Avansat / MVP Funcțional**, dar **NU este pregătit pentru producție** din cauza unor vulnerabilități de securitate critice. Deși interfața este modernă (premium) și fluxurile de business (POS offline, NIR XML) sunt bine conturate, arhitectura de securitate este compromisă prin stocarea parolelor în clar și controlul accesului exclusiv în frontend.

## 2. Stack detectat
- **Core:** React 18.2 + Vite 7.3 (TypeScript)
- **Runtime:** Electron 40.6 (Desktop App)
- **Database (Cloud):** Supabase (PostgreSQL)
- **Database (Local/Offline):** Dexie.js (IndexedDB)
- **Styling:** Tailwind CSS + Material UI (MUI)
- **Componente Cheie:** 
    - `electron-main.js`: Configurare main process Electron.
    - `src/db.ts`: Schema bazei de date locale pentru funcționare offline.
    - `src/supabaseClient.ts`: Inițializare client Supabase (folosește variabile de mediu).

## 3. Module existente
- **Autentificare:** `src/Login.tsx` (Sistem custom, nu Supabase Auth).
- **POS (Vânzare):** `src/Vanzare.tsx` (Suportă mod Online/Offline).
- **Gestiune Stocuri:** `src/Produse.tsx` (CRUD produse și vizualizare stocuri).
- **Recepție Marfă (NIR):** `src/Receptie.tsx` (Manual + Import XML e-Factura).
- **Raportare Pierderi:** `src/Pierderi.tsx` (Sistem de audit nominal).
- **AI Consultant:** `src/AiConsultant.tsx` (Analiză predictivă în frontend).
- **Aprovizionare:** `src/ComandaFurnizor.tsx`, `src/Comenzi.tsx`, `src/ListaCumparaturi.tsx`.
- **Gestiune Agenți/Furnizori:** `src/GestiuneAgenti.tsx`, `src/Furnizori.tsx`.

## 4. Probleme critice

| Descriere | Path exact | Risc | Impact | Recomandare |
|-----------|------------|------|--------|-------------|
| **Parole în clar (Plain Text)** | `src/Login.tsx:35` | Critic | Compromitere totală conturi | Trecerea imediată la Supabase Auth. |
| **Utilizatori Hardcodate** | `src/Login.tsx:46-57` | Critic | Backdoor permanent | Eliminarea logică `admin/admin`, `casier/1234`. |
| **Roluri în localStorage** | `src/App.tsx:391-412` | Critic | Bypass autorizare | Verificarea rolurilor pe server (RLS / JWT). |
| **Direct DB Mutation** | `src/Pierderi.tsx:120` | Critic | Corupere date / Frauda | Mutarea logicii de stoc în Postgres Functions (RPC). |
| **Lipsă RLS (Row Level Security)** | Baza de date | Critic | Acces neautorizat la date | Activarea RLS pe toate tabelele Supabase. |

## 5. Probleme majore

| Descriere | Path exact | Risc | Impact | Recomandare |
|-----------|------------|------|--------|-------------|
| **Lipsă Multi-tenant** | Toate interogările | Major | Date amestecate între clienți | Adăugarea coloanei `tenant_id` în toate tabelele. |
| **Sync Ineficient (Loop)** | `src/Vanzare.tsx:87-92` | Major | Inconsistență stoc | Utilizarea unei singure tranzacții sau RPC pentru sync. |
| **Logica AI în Frontend** | `src/AiConsultant.tsx` | Mediu | Performanță scăzută | Mutarea calculelor grele în Edge Functions / Python API. |
| **Lipsă Tranzacționalitate** | `src/Receptie.tsx:243-266` | Major | Update parțial stoc | Executarea întregului NIR într-o singură funcție DB. |

## 6. Probleme medii
- **Lipsă Validation Schema:** Input-urile nu sunt validate strict înainte de a ajunge în DB.
- **State Management:** `App.tsx` devine prea mare (499 linii), necesită fragmentare (Context API / Zustand).
- **Hardcoded Icons/Styles:** Unele stiluri sunt amestecate în componente.

## 7. Ce trebuie păstrat
- **Motorul Offline (Dexie.js):** Integrarea este corectă și vitală pentru POS.
- **Parser-ul XML (e-Factura):** `src/Receptie.tsx` are o logică de mapare XML foarte utilă.
- **Design System:** Estetica este premium, modernă și intuitivă.
- **Realtime Monitoring:** Sistemul de notificări pentru pierderi este un diferențiator bun.

## 8. Ce trebuie eliminat
- **Sistemul de Login custom:** Metoda de verificare `utilizatori.eq('parola', pass)` trebuie ștearsă.
- **Stocarea rolului în localStorage:** Nu mai trebuie folosit ca sursă de adevăr pentru UI.
- **Update-urile de stoc din UI:** Ștergerea apelurilor `.update({ stoc_magazin: ... })` directe.

## 9. Ce trebuie adăugat
- **Supabase Auth Integration:** Login real cu email/parolă (hash-uite).
- **Postgres Triggers:** Pentru calcularea automată a stocului la orice vânzare/recepție.
- **Audit Logs:** O tabelă serioasă de log-uri pentru orice lucru.
- **Bridge Fiscal:** Logică de comunicare cu casele de marcat (Electron IpcMain).

## 10. Ordinea recomandată de lucru
1.  **Securizarea Autentificării:** Migrarea utilizatorilor în Supabase Auth și ștergerea parolelor plain text.
2.  **Hardening Database:** Activarea RLS și scrierea politicilor de acces.
3.  **Integritate Stoc:** Implementarea funcțiilor Postgres (RPC) pentru vânzare, recepție și pierderi.
4.  **Multi-tenancy:** Introducerea structurii de clienți multipli (tenant_id).
5.  **Refactorizarea State-ului:** Separarea logicilor din `App.tsx` în hook-uri și context.
6.  **AI & Predictiv:** Migrarea logică de analiză din frontend în backend.

## 11. Concluzie
Proiectul are un potențial imens datorită integrării Electron + Offline-First. Totuși, în starea curentă, **este vulnerabil la orice atacator minim experimentat**. Primul pas tehnic obligatoriu este **securizarea bazei de date și a sistemului de autentificare**.
