# Raport Eliminare Module Agenți și Comenzi Furnizori

Conform noii direcții de produs, am simplificat aplicația prin eliminarea fluxurilor complexe de agenți, portal parteneri și comenzi automate către furnizori. Aplicația se concentrează acum pe gestiunea internă a magazinului (POS, Stocuri, Recepție Marfă).

## 1. Fișiere Eliminate
Am șters următoarele fișiere care nu mai sunt necesare:
- `src/InregistrareAgent.tsx` (Portal înregistrare parteneri)
- `src/AgentDashboard.tsx` (Interfața pentru agenți)
- `src/GestiuneAgenti.tsx` (Managementul listei de agenți)
- `src/ComandaFurnizor.tsx` (Creare comenzi noi)
- `src/Comenzi.tsx` (Istoric și status comenzi furnizori)
- `src/DetaliiComandaAgent.tsx` (Vizualizare comandă pentru agent)
- `src/GestiuneProduseFurnizor.tsx` (Alocare produse către parteneri)
- `src/ListaCumparaturi.tsx` (Modul auxiliar aprovizionare)
- `src/DetaliiComanda.tsx` (Vizualizare detalii comandă internă)
- `src/ReceptieComanda.tsx` (Fluxul de recepție bazat pe comandă existentă)

## 2. Modificări în `App.tsx`
- **Rute eliminate**: Toate rutele către `/partener`, `/agent-dashboard`, `/comenzi`, `/comanda-furnizor`, etc. au fost șterse.
- **Navigație**: Am eliminat secțiunile „Aprovizionare”, „Gestiune Agenți” și „Alocare Directă” din sidebar.
- **Roluri**: Am eliminat logica de randare condiționată pentru rolurile `agent` și `furnizor`.
- **Dashboard**: Am eliminat statistica „Comenzi Furnizor” din dashboard.

## 3. Modificări în `Login.tsx`
- **Link înregistrare**: Eliminat link-ul către `/partener`.
- **Logică Auth**: Eliminată verificarea în tabelele `agenti` și `cereri_furnizori`.
- **Roluri permise**: Autentificarea legacy (dacă este activă) acceptă acum doar `admin`, `gestionar` și `casier`.

## 4. Modificări în `Furnizori.tsx`
- Modulul a fost simplificat pentru a fi o listă pură de entități fiscale.
- A fost eliminată posibilitatea de a adăuga/gestiona agenți asociați unui furnizor.
- Datele sunt acum folosite strict ca referință pentru recepția de marfă.

## 5. Modificări în Auth Infrastructure
- **`src/features/auth/types.ts`**: Eliminat `agent` și `furnizor` din `UserRole`.
- **`src/features/auth/authService.ts`**: Eliminat maparea pentru aceste roluri.

## 6. Rezultat Build
```text
✓ 1772 modules transformed.
✓ built in 1.82s
dist/assets/index-H1VmvQ08.js       567.12 kB
```
Build-ul a trecut cu succes. Nu există referințe rupte sau erori de tip.

## 7. Ce a rămas și de ce
- **Tabela `furnizori`**: Păstrată în cod și interfață pentru a permite selectarea furnizorului în timpul recepției de marfă (NIR).
- **Modulul `Receptie`**: Păstrat fluxul de recepție manuală, dar eliminat cel bazat pe comenzi preexistente.
- **AI Consultant**: Păstrat, dar curățat de referințele la agenți/comenzi externe.

## 8. Riscuri și Note
- **Baza de date**: Tabelele `agenti`, `cereri_furnizori`, `comenzi_catre_furnizor` încă există în baza de date. Acestea pot fi șterse prin migrații ulterioare, dar codul curent nu le mai accesează.
- **Incompatibilitate**: Utilizatorii logați anterior cu rolul de `agent` vor fi delogați automat sau vor primi erori de acces (corect conform noii direcții).
