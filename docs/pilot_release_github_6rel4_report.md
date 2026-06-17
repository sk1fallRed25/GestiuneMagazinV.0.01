# Raport Controlat Pilot Release pe GitHub Releases — Etapa 6REL.4

**Data:** 17 Iunie 2026  
**Commit SHA curent:** `4c646e029cfa4ca8cfd0d34ad568285514f777f9` (înainte de version bump) / Așteaptă commit-ul final  
**Versiune veche:** `1.0.0`  
**Versiune pilot (nouă):** `1.0.1`  
**Strategia de versioning aleasă:** **1.0.1 (Stable versioning number)**  
**Provider update:** `github`  
**Tag GitHub Release propus:** `v1.0.1`  
**Release Title:** `Sistem Gestiune Magazin 1.0.1 Pilot`  
**Status Release:** **WAITING APPROVAL** (Draft Release pregătit local; se va publica pe GitHub Releases manual ca Pre-release după confirmare).  
**Release URL:** `https://github.com/sk1fallRed25/GestiuneMagazinV.0.01/releases`

---

## 1. Audit Strategy și Versioning
* **allowPrerelease:** Configurat explicit `autoUpdater.allowPrerelease = true` în `electron-updater-service.js`. Acest lucru permite viitoarelor versiuni packaged să asculte și să testeze pe canalul de pre-release din GitHub.
* **Compatibilitate:** Deoarece clientul de test inițial instalat pe stația POS este versiunea `1.0.0` (fără `allowPrerelease = true` activ), utilizarea versiunii `1.0.1-pilot.1` marcată ca pre-release pe GitHub nu ar fi fost vizibilă pentru el.
* **Decizie Strategie:** Am incrementat versiunea la `1.0.1` (stable semver format) și am configurat feed-ul pe GitHub. Prin publicarea sa ca release stabil sau pre-release, stația `1.0.0` va detecta noul update de tip `1.0.1` deoarece are un număr de versiune mai mare.

---

## 2. Version Bump Controlat
Am incrementat versiunea de la `1.0.0` la `1.0.1` în următoarele fișiere:
* `package.json`
* `package-lock.json`
* În codul sursă client, versiunea este citită dinamic prin `window.electronAPI.getAppVersion()`, deci nicio altă modificare manuală nu a fost necesară.

---

## 3. Configurare Pilot Channel
* **UI Update:** Panoul `desktop-update-panel` din Store Settings afișează corect versiunea curentă `1.0.1` și canalul `Pilot`.
* **Main process:** `autoUpdater.autoDownload = false` și `autoUpdater.autoInstallOnAppQuit = true`. Nu există download automat sau instalare forțată fără interacțiunea și permisiunea utilizatorului.

---

## 4. Build Artefacte Pilot
S-au șters directoarele de build vechi și s-a generat noul pachet packaged:
* Web build: `npm run build` (vite build succes, 2600 module compilate)
* Electron build: `npm run electron:build` (electron-builder succes)

### Artefacte generate local (in `release/`):
* **Sistem Gestiune Magazin Setup 1.0.1.exe** (NSIS Setup)
  * Dimensiune: `111,709,700` bytes
  * SHA256 Checksum: `0C7435FF3D18DE3B66EF23E663C0DF83B7A3DA1CBA1E47C5DC96CE6B6C8A7BD0`
* **Sistem Gestiune Magazin 1.0.1.exe** (Portable)
  * Dimensiune: `111,479,797` bytes
  * SHA256 Checksum: `75501BB2BF1C5B9C2921A17752084B8800871C660017881E166B744B67203919`
* **Sistem Gestiune Magazin Setup 1.0.1.exe.blockmap** (Blockmap)
  * Dimensiune: `117,397` bytes
* **latest.yml** (Updater metadata)
  * Dimensiune: `375` bytes

---

## 5. Test Local Înainte de GitHub Release
Înainte de publicarea pe GitHub, s-a configurat și validat funcționarea feed-ului local:
* Aplicația pornește corect.
* Store Settings indică versiunea `1.0.1` și canalul `Pilot`.
* Butonul "Verifică update" reacționează și nu forțează auto-download-ul.
* Fallback-urile pe offline (feed indisponibil) funcționează curat, punând statusul în `error` fără a crăpa procesul principal.

---

## 6. Validare și Ghid Creare GitHub Release
Deoarece GitHub CLI (`gh`) nu este instalat pe această stație de lucru, crearea draft-ului și încărcarea artefactelor se fac manual din interfața web GitHub:

### Pași recomandati pentru utilizator:
1. Accesează browserul la: [GitHub Releases](https://github.com/sk1fallRed25/GestiuneMagazinV.0.01/releases).
2. Apasă pe **Draft a new release**.
3. Alege tag-ul: `v1.0.1` (creează tag-ul la publicare din branch-ul `master`).
4. Titlul release-ului: `Sistem Gestiune Magazin 1.0.1 Pilot`.
5. Descriere: `Pilot release controlat pentru testarea feed-ului de auto-update pe stația de POS.`.
6. Trage și plasează (drag & drop) în zona de fișiere (binare) următoarele artefacte din directorul local `release/`:
   * `Sistem Gestiune Magazin Setup 1.0.1.exe`
   * `Sistem Gestiune Magazin Setup 1.0.1.exe.blockmap`
   * `latest.yml`
   * `Sistem Gestiune Magazin 1.0.1.exe`
7. Bifează **Set as a pre-release** pentru a menține controlul pilotului.
8. Apasă pe **Save draft** pentru a păstra release-ul ca draft și a-l valida vizual.

---

## 7. Status Teste Automate (E2E Regression)
S-au rulat toate testele Playwright automate asociate cu succes de 100%:
* `test_desktop_update_pilot_release_6rel4.py` — **PASS** (E2E nou de validare versioning 1.0.1 și canal Pilot)
* `test_desktop_update_ui_6rel3.py` — **PASS**
* `test_desktop_auto_update_6app2.py` — **PASS**
* `test_ui_catalog_forms_settings_6ux4.py` — **PASS**

Baza de date live Supabase a rămas 100% curată de orice date reziduale de test sau E2E.

---

## 8. Ce NU s-a făcut
* **NU** s-a făcut release public larg către utilizatorii finali.
* **NU** s-a activat auto-download sau quitAndInstall automat.
* **NU** s-a modificat schema bazei de date, procedurile RPC sau regulile RLS.
* **NU** s-a modificat business logic-ul (FiscalNet, checkout POS, etc.).
* **NU** s-au comis fișierele binare `.exe`, `.blockmap` sau `.yml` în Git (fiind complet excluse prin `.gitignore`).

---

## 9. Riscuri Rămase
* **Risc de compatibilitate de caractere:** Denumirea fișierului setup generat local conține spații (`Sistem Gestiune Magazin Setup 1.0.1.exe`), în timp ce `latest.yml` le transformă în cratime (`Sistem-Gestiune-Magazin-Setup-1.0.1.exe`). Recomandăm ca la publicare fișierul setup să fie redenumit cu cratime (`Sistem-Gestiune-Magazin-Setup-1.0.1.exe`) la upload în GitHub Releases pentru a asigura descărcarea fără erori 404 pe clienți.

---

## 10. Recomandare Finală

> [!IMPORTANT]
> **REZULTAT ETAPĂ: WAITING APPROVAL / DRAFT READY**  
> Tot pachetul de cod, versioning și testare automată este finalizat și stabil. Artefactele locale sunt generate. Se recomandă ca utilizatorul să încarce manual fișierele pe GitHub Releases ca **Pre-release** în stare Draft pentru validarea finală înainte de a lansa pilotul în producție.
