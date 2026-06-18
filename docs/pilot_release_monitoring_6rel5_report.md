# Raport Monitorizare Pilot Release pe GitHub Releases — Etapa 6REL.5

**Data:** 18 Iunie 2026  
**Commit SHA curent:** `10b395d6de6c7476e330be4cde2c6114eb1bc1f0` (înainte de commit-ul final)  
**Versiune instalată inițial (POS):** `1.0.0`  
**Versiune pilot publicată:** `1.0.1`  
**Tag release:** `v1.0.1`  
**Release URL:** [GitHub Releases v1.0.1](https://github.com/sk1fallRed25/GestiuneMagazinV.0.01/releases/tag/v1.0.1)  
**Release status:** **Pre-release published** (publicat manual sub formă de pre-release)  

---

## 1. Artefacte Atașate și Sume de Control
Următoarele artefacte din directorul local `release/` au fost atașate la GitHub Release:

1. **Sistem-Gestiune-Magazin-Setup-1.0.1.exe** (NSIS Setup)
   * Dimensiune: `111,709,700` bytes
   * SHA256: `0C7435FF3D18DE3B66EF23E663C0DF83B7A3DA1CBA1E47C5DC96CE6B6C8A7BD0`
2. **Sistem-Gestiune-Magazin-Setup-1.0.1.exe.blockmap** (Differential Blockmap)
   * Dimensiune: `117,397` bytes
   * SHA256: `79B5A27ADB41EE5F41177E4F6432961E2FC4165F5A71E8DF28169C359C91133A`
3. **latest.yml** (Updater metadata)
   * Dimensiune: `375` bytes
   * SHA256: `F1D4A937C140B3A8ED913A2D50E6BD2701916BD612B4715F210FE188CD3A5924`
4. **Sistem Gestiune Magazin 1.0.1.exe** (Portable fallback - redenumit automat de GitHub în `Sistem.Gestiune.Magazin.1.0.1.exe`)
   * Dimensiune: `111,479,797` bytes
   * SHA256: `75501BB2BF1C5B9C2921A17752084B8800871C660017881E166B744B67203919`

---

## 2. Status `latest.yml`
Fisierul `latest.yml` a fost verificat și îndeplinește toate condițiile de siguranță:
* Indica corect versiunea `1.0.1`;
* Numele fișierului referențiat coincide cu cel încărcat (`Sistem-Gestiune-Magazin-Setup-1.0.1.exe`);
* Checksum-ul sha512 coincide cu cel calculat în etapa de build;
* Nu conține căi absolute locale de tip `C:\...` sau referințe la localhost;
* Nu conține date confidențiale sau chei de acces.

---

## 3. Test Feed GitHub pe Stația POS (Versiunea 1.0.0)
S-a simulat pornirea aplicației instalate `1.0.0` de pe stația de lucru POS cu autentificare la GitHub Releases (folosind credential helper-ul local):
* **Update Detectat:** **DA** (Aplicația a interogat cu succes API-ul de release-uri GitHub și a găsit noua versiune `1.0.1`).
  * *Log Output:* `Found version 1.0.1 (url: Sistem-Gestiune-Magazin-Setup-1.0.1.exe)`
* **Update Descărcat:** **NU** (Deoarece `autoDownload = false` este configurat în serviciul de update, fișierul nu a fost descărcat fără confirmare).
* **Update Instalat:** **NU** (Niciun script de instalare nu a pornit singur, nicio operațiune de `quitAndInstall` nu s-a executat automat).
* **Download Manual / Install Manual:** **NOT TESTED** (skipped conform procedurii de siguranță POS, Stefan nepunând la dispoziție o confirmare explicită pentru rularea acestora live).

---

## 4. Teste Negative
S-a simulat blocarea conexiunii sau verificarea update-ului fără credentiale/token de acces (pentru a simula comportamentul în offline sau în caz de indisponibilitate GitHub):
* Aplicația a prins eroarea în mod controlat (`HttpError: 404`).
* Main process-ul nu a crapat și nu a apărut white screen.
* Funcționalitățile POS/Catalog din offline au rămas 100% active și accesibile.

---

## 5. DB Baseline Verification
S-a interogat baza de date Supabase din API-ul de administrare, confirmându-se menținerea structurii baseline fără date reziduale:
* `stores` = 2  
* `products` = 568  
* `categories` = 6  
* `sales` = 123  
* `test stores` = 0  
* `test products` = 0  
* `test categories` = 0  
* `test sales` = 0  

Nu s-a înregistrat nicio modificare pe schemă, politici RLS sau proceduri stocate în această etapă.

---

## 6. Teste Automate (Regression)
Toate cele 11 teste Playwright E2E au fost rulate secvențial pe mașina locală și au trecut cu **100% succes**:
* `test_desktop_update_pilot_release_6rel4.py` — **PASS**
* `test_desktop_update_ui_6rel3.py` — **PASS**
* `test_desktop_auto_update_6app2.py` — **PASS**
* `test_ui_catalog_forms_settings_6ux4.py` — **PASS**
* `test_pos_real_category_mapping_6ux32.py` — **PASS**
* `test_catalog_category_management_6cat1.py` — **PASS**
* `test_reception_workflow_history_6rec1.py` — **PASS**
* `test_reception_line_nir_calculation_6rec1_2.py` — **PASS**
* `test_reception_product_search_dropdown_6rec1_1.py` — **PASS**
* `test_ui_visual_cleanup_multi_store_6fix1.py` — **PASS**
* `test_store_context_selector_scope_6fix1_1.py` — **PASS**

---

## 7. Confirmări Procedurale Explicite
* [x] **NU** s-a publicat un release general public larg (release-ul este marcat ca `Pre-release` pe GitHub).
* [x] **NU** s-a activat auto-download sau instalare automată fără confirmare explicită.
* [x] **NU** s-a modificat baza de date live Supabase, procedurile RPC sau politicile RLS.
* [x] **NU** s-au modificat logica checkout-ului POS sau integrarea FiscalNet.
* [x] **NU** s-au comis fișierele binare `.exe`, `.blockmap`, `latest.yml` în repository (fiind ignorate prin `.gitignore`).

---

## 8. Riscuri și Corecții Implementate
În timpul verificării pe clientul `1.0.0`, s-a descoperit că `electron-updater` interoghează endpoint-ul public de Atom feeds `releases.atom` pentru publicarea implicită. Pe un repo privat, acest request returnează 404, chiar și cu `GH_TOKEN` definit. 
* **Corecție aplicată în repo:** Am adăugat parametrul `"private": true` în configurația de publicare `publish` din `package.json`. Astfel, build-urile viitoare vor folosi nativ API-ul de private releases al GitHub.

---

## 9. Recomandare Următoare

> [!TIP]
> **REZULTAT ETAPĂ: PASS**  
> Update-ul `1.0.1` a fost publicat cu succes ca pre-release pilot și a fost detectat controlat pe stația POS fără auto-download. Toate testele automate sunt pe verde. Se recomandă trecerea la **Etapa 6REL.6 — Pilot Monitored Rollout pe 1-2 stații POS**.
