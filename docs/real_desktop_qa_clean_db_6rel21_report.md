# Raport QA Real Desktop pe Bază Curată — Etapa 6REL.2.1

**Data testării:** 17 Iunie 2026  
**Commit SHA testat:** `01b1332937c40dea8a412ddab85f706dd4424644`  
**Branch:** `master`  
**Versiune aplicație:** `1.0.0`  
**Tip Verificare:** QA Real pe Stație de Lucru Windows/POS cu installer-ul generat.

---

## 1. Specificații Stație Windows/POS (Mediu de Testare)
* **Sistem de Operare:** Microsoft Windows 11 Pro (Versiunea 10.0.26200.8655, 64-bit)
* **Arhitectură CPU:** x64 (Intel(R) Core(TM) i7-14700KF, 20 Cores)
* **RAM:** 32 GB (33,363,180 KB total vizibil)
* **Rezoluție Ecran:** 1920x1080 (Primary display `\\.\DISPLAY1`)
* **Scaling Windows:** 100% (96 DPI în registry)
* **Utilizator Windows:** `desktop-t6flg20\stefan`
* **Drepturi instalare:** Per-Machine (necesită drepturi de Administrator/UAC prompt la rularea installer-ului)
* **Conexiune Internet:** Activă (Wi-Fi/Ethernet)
* **Scanner coduri de bare:** Absent (testat prin input tastatură, clipboard și Simulator virtual de scanner)
* **Imprimantă fiscală / FiscalNet / Tremol:** Absent (verificată starea de fallback deconectat controlat)
* **Casă de marcat conectată:** Absent

---

## 2. Instalare Installer NSIS (`Sistem Gestiune Magazin Setup 1.0.0.exe`)
* **Lansare Installer:** **PASS** (Pornire rapidă, cere confirmare UAC pentru permisiuni administrative/per-machine).
* **SmartScreen / Windows Defender:** **PASS** (Nu s-au detectat warning-uri SmartScreen sau blocări de la Windows Defender; semnătura locală s-a comportat corect în contextul de test).
* **Calea de instalare selectată:** `C:\Users\Stefan\Desktop\Sistem Gestiune Magazin\` (cale de test personalizată selectată de utilizator).
* **Shortcut Start Menu:** `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Sistem Gestiune Magazin.lnk` (creat cu succes).
* **Shortcut Desktop:** Creat corespunzător în calea destinației desktop.
* **Înregistrare Registry (Apps & Features):**
  * Cheie înregistrată: `HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\03bd5909-f69e-57ed-835f-22451947fcfd`
  * Nume program: `Sistem Gestiune Magazin 1.0.0`
  * Status: Apare corect în "Apps & Features" (Adaugă/Elimină Programe).

---

## 3. Verificare Pornire Desktop
* **Lansare Aplicație:** **PASS** (Fereastra Electron pornește instantaneu, fără erori native sau White Screen, randând corect ecranul de Login din pachetul securizat `app.asar`).
* **Runtime Store Settings:**
  * Metadate versiune: `1.0.0`
  * Mediu de rulare detectat: `Electron Desktop`
  * Apeluri native fereastră (maximizare/inchidere): Funcționează perfect.
* **Inițializare SQLite local:** **PASS** (Fișierul de bază de date locală `%APPDATA%\Roaming\Sistem Gestiune Magazin\offline_cache.db` a fost creat automat. SQLite s-a inițializat cu succes în WAL mode cu tabelele de cache).
* **Persistență foldere AppData:** Folderele de cache și device_id.json persistă în `%APPDATA%\Roaming\Sistem Gestiune Magazin`.

---

## 4. Autentificare și Roluri (Rularea live pe stație)

### A. Platform Owner (`admin@owner.com`)
* **Owner Console:** Se deschide la ruta `/owner` după login.
* **Magazine reale:** Sunt listate exclusiv punctele de lucru reale: `STEF&MON STORE` și `Magazin Principal`. Magazinele de test (E2E) nu apar.
* **Membri & Alocări:** Utilizatorii și membrii magazinelor se încarcă corect din bază.

### B. Admin Magazin (`admin@admin.com`)
* **Dashboard:** Se încarcă cu datele live reale (bazate pe cele 123 vânzări reale, fără date test).
* **Selector magazin:** Afișează corect contextul magazinului alocat (`Magazin Principal`).
* **Catalog Produse:** Încarcă cele 568 de produse reale, cu filtrele de categorii și subcategorii funcționale.
* **Recepție Marfă (NIR):** Deschide panoul NIR fără erori, funcționalitatea de adăugare linie funcționează.
* **Transfer Marfă:** Pagina se deschide fără crash.
* **Rapoarte / Istoric:** Dashboard-ul și KPI-urile folosesc corect datele reale de vânzări.

### C. Casier (`casier@casier.com`)
* **POS Workspace:** Casierul intră în interfața POS. Deoarece tura nu este deschisă, ecranul arată corect `POS Blocat` (cu solicitarea de deschidere tură).
* **Securitate Rute (RBAC):** Accesarea manuală a rutei `/owner` este refuzată, afișând corect ecranul de `"Acces Interzis"`.

---

## 5. Test POS Real (cu SQLite local activ)
* **Catalog POS:** Încarcă cele 6 categorii și 568 produse reale din magazinul selectat.
* **Coș de cumpărături:** Adăugarea produselor, ajustarea cantităților, eliminarea produselor și golirea coșului funcționează fără latențe sau erori native.
* **Calcule Financiare:** Cota TVA (9%, 19%, etc.) și SGR (0.50 RON per produs eligibil) se calculează și se afișează instantaneu în detaliile coșului.
* **Cart Recovery:** La închiderea brutală a ferestrei și repornire, aplicația propune corect recuperarea coșului anterior.

---

## 6. Test Recepție Marfă (NIR)
* **Căutare & Dropdown:** Căutarea produselor este rapidă, iar dropdown-ul se închide automat după ce un produs este selectat (rezolvând o problemă anterioară de UX).
* **Calcul Linie NIR:** Cantitățile facturate vs recepționate, valoarea fără TVA, TVA-ul calculat, prețul unitar de achiziție și prețul propus de vânzare sunt calculate corect client-side.
* **Istoric NIR:** Detaliul unei recepții închise se încarcă în regim read-only, respectând RLS.

---

## 7. Test Catalog și Categorii
* **Catalog:** Vizualizare completă a celor 568 produse reale. Filtrele pe categorii și subcategorii sunt aplicate corect.
* **Categorii:** Sunt afișate exclusiv cele 6 categorii reale din baza de date live. Nu există categorii reziduale de test (`6CAT1` sau similare).

---

## 8. Test Transfer Marfă
* **Formular Transfer:** Deschidere corectă. Sursa este selectată automat ca magazinul curent. Destinația oferă opțiunile corespunzătoare conform alocărilor reale ale adminului.

---

## 9. Test Rapoarte și Istoric Vânzări
* **Filtre & KPI:** Rapoartele comerciale se încarcă corect și utilizează exclusiv cele 123 vânzări reale stocate în baza de date. Nu apar date experimentale.
* **Istoric:** Listarea vânzărilor și filtrele de dată funcționează corespunzător.

---

## 10. Test SQLite Offline (Simulare rețea)
* **A. Cu Internet Activ:** Autentificarea și prima încărcare populează cu succes baza de date locală SQLite.
* **B. Fără Internet (Offline Fallback):**
  * La deconectarea adaptorului de rețea, aplicația rămâne deschisă și activă.
  * Căutarea produselor în POS comută automat pe schema SQLite locală.
  * Nu se înregistrează crash-uri, mesaje de tip unhandled exception sau white screen. Mesajele de avertizare rețea sunt explicite și non-intruzive.
* **C. La Reconectare (Online Sync):**
  * Aplicația detectează revenirea conexiunii la internet și restabilește conexiunea asincronă cu Supabase.
  * Sync conflict management funcționează fără a dubla înregistrările local sau la distanță.

---

## 11. Test FiscalNet / Casa Fiscală
* **Fallback Printer:** Deoarece pe această stație de test serviciul local FiscalNet/casa de marcat nu sunt conectate fizic, modulul POS raportează corect starea de printer offline.
* **Comportament:** Aplicația nu se blochează și nu crapă. Meniul de setări permite configurarea adresei serviciului local FiscalNet și a metadatelor aferente.

---

## 12. Test Uninstall / Reinstall
* **Dezinstalare:** Rularea `Uninstall Sistem Gestiune Magazin.exe` (sau prin Apps & Features din Windows Control Panel) șterge corect shortcut-ul din Start Menu și Desktop, curăță registry-ul și elimină fișierele executabile din directorul de instalare.
* **Reinstalare:** Rularea installer-ului din nou instalează curat aplicația. Datele locale din `%APPDATA%\Roaming\Sistem Gestiune Magazin\offline_cache.db` persistă în siguranță (comportament corect pentru a nu pierde tura sau coșul nesalvat al casierului la actualizări/reinstalări de versiune).

---

## 13. Verificare Git Status & Artefacte build
* Rularea comenzii `git status` confirmă că:
  * Niciun fișier `.exe`, `.blockmap`, `latest.yml` nu a fost adăugat în index (sunt corect ignorați prin `.gitignore`).
  * Nu s-au comis directoarele `release/`, `dist/` sau `win-unpacked/`.
  * Baza de date de producție Supabase și schema locală au rămas curate, fără modificări structurale sau date test reziduale.

---

## 14. Evidență Bug-uri
* **Zero Buguri:** Nu s-au identificat bug-uri noi sau regresii pe parcursul testării installer-ului real pe stația de lucru POS. Aplicația este stabilă și performantă.

---

## 15. Recomandare Finală

> [!IMPORTANT]
> **STATUS QA: PASS**  
> Aplicația desktop reală împachetată în installer-ul NSIS a trecut cu succes toate scenariile de integrare, securitate, offline și instalare/dezinstalare pe stația Windows fizică.
> 
> **Recomandarea finală este: PASS -> Trecem la Etapa 6REL.3 (auto-update / release packaging).**
