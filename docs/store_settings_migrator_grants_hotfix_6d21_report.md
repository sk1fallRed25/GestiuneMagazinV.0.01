# Store Settings Migrator Grants Security Hotfix — Raport (Etapa 6D.2.1)

## 1. Rezumat
* **Status**: **Ready for manual SQL apply**
* **DB modificată de agent**: Nu (modificarea drepturilor de acces va fi efectuată manual de echipă, conform procedurii standard)
* **Frontend modificat**: Nu (fără impact asupra componentelor client)

---

## 2. Problema identificată
Funcția `public.migrate_stores_legacy_settings()` este o funcție administrativă destinată exclusiv migrării configurărilor vechi ale magazinului la schema v2. Aceasta nu este apelată de frontend și nu trebuie expusă API-ului client.

În etapa anterioară (6D.2), s-a constatat că Supabase, prin comportamentul său implicit (Default Schema Privileges), acordă automat permisiunea de execuție grupului `PUBLIC` și rolului `authenticated` pentru orice funcție nouă. Deși scriptul inițial a revocat accesul pentru `PUBLIC` și `anon`, permisiunea de execuție pentru rolul `authenticated` nu a fost revocată în mod explicit. Acest hotfix izolează complet funcția pentru a elimina riscul apelării neautorizate de către utilizatorii obișnuiți ai aplicației.

---

## 3. Hotfix pregătit
A fost creat fișierul SQL:
* [hotfix_store_settings_migrator_grants_6d21.sql](../database/hotfix_store_settings_migrator_grants_6d21.sql)

Acesta conține instrucțiunile de revocare a privilegiilor de execuție (`REVOKE EXECUTE`) pentru următoarele roluri:
1. `PUBLIC` (revocare generală)
2. `anon` (utilizatori neautentificați)
3. `authenticated` (utilizatori conectați)

---

## 4. Securitate post-aplicare
După aplicarea manuală a hotfix-ului:
* **anon**: **BLOCAT**
* **PUBLIC**: **BLOCAT**
* **authenticated**: **BLOCAT**

Funcția va putea fi apelată exclusiv de rolul administrativ `postgres` (folosit implicit de SQL Editor din consola Supabase) sau de alți administratori de bază de date autorizați, asigurând o izolare totală și respectarea principiului privilegiului minim.

---

## 5. Decizie
**Ready for manual SQL apply**. Următorul pas este aplicarea manuală a scriptului SQL din guide, urmată de **Etapa 6D.2.2 (Store Settings Migrator Grant Verification)**.
