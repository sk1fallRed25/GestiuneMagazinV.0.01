# Raport Rezumat: Store Lifecycle Management Blueprint — Etapa 6F.1.9

## 1. Ce s-a decis
S-a proiectat un sistem securizat prin care Platform Owner (Proprietarul Platformei) poate administra ciclul de viață al magazinelor (stores) chiriașe/clienților din sistem.
S-a decis introducerea unui model pe 5 stări (`active`, `suspended`, `archived`, `pending_deletion`, `deleted`), interzicându-se complet ștergerea directă a magazinelor care au activitate comercială reală în sistem.

---

## 2. De ce este periculos "Hard Delete"
La nivel de bază de date, majoritatea tabelelor tranzacționale (`sales`, `pos_shifts`, `stock_movements`, `receptions`, `waste_events` etc.) au cheile externe configurate cu clauza `ON DELETE CASCADE` legate de `stores(id)`. 

Dacă s-ar executa un hard delete pe un magazin activ:
- S-ar șterge automat tot istoricul de vânzări, detalii plăți și stocuri conexe.
- Aceasta ar crea breșe severe de securitate, pierderi de date financiare/fiscale necesare pentru audit legal și jurnale de audit neconforme.

**Soluția adoptată**: Ștergerea fizică este blocată automat la nivel de eligibilitate dacă magazinul are orice înregistrare tranzacțională în tabelele critice. Clienții care își încheie colaborarea vor fi mutați în starea `archived` (care este read-only și sigură).

---

## 3. Modelul Propus de Lifecycle Status
1. **`active`**: Magazin complet funcțional și deschis.
2. **`suspended`**: Blocare temporară din motive operaționale sau financiare (plăți restante). POS-ul și mișcările de stoc sunt inaccesibile.
3. **`archived`**: Închidere definitivă a colaborării pentru magazine reale. Datele sunt conservate ca read-only pentru audit. Magazinul este exclus din interfețele operaționale.
4. **`pending_deletion`**: Marcaj intermediar pentru magazine goale/de test pregătite pentru eliminare.
5. **`deleted`**: Tombstone logic în cazul în care datele tranzacționale sunt curățate dar se dorește păstrarea unei înregistrări minimale pentru conformitate.

---

## 4. SQL Blueprint Creat
A fost generat blueprint-ul SQL în:
`database/proposed_store_lifecycle_6f19.sql`

Acesta propune:
- Adăugarea coloanelor de lifecycle în tabela `public.stores`: `lifecycle_status`, `suspended_at`, `suspended_by`, `suspension_reason`, `archived_at`, `archived_by`, `archive_reason`, `deletion_requested_at`, `deletion_requested_by`, `deletion_reason`.
- Un constraint `CHECK` care validează valorile stărilor.
- Un index dedicat pe stări (`idx_stores_lifecycle_status`) și un index compus (`idx_stores_active_lifecycle`).
- Un trigger pentru sincronizarea automată a coloanei legacy `active` (boolean) cu statusul lifecycle curent (pentru retrocompatibilitate).

---

## 5. RPC-uri Propuse
Au fost proiectate 7 RPC-uri securizate (cu `SECURITY DEFINER`, `search_path = public` și verificarea strictă a drepturilor de `platform_owner`):
1. `get_store_lifecycle_status(p_store_id)`: Returnează starea și metadatele de audit alături de contoarele de activitate comercială.
2. `suspend_store(p_store_id, p_reason)`: Setează starea suspendată și înregistrează audit log.
3. `reactivate_store(p_store_id, p_reason)`: Reactivează magazinul.
4. `archive_store(p_store_id, p_reason)`: Arhivează magazinul (read-only).
5. `get_store_deletion_eligibility(p_store_id)`: Centralizează datele din tabelele conexe pentru a valida dacă este sigur hard delete-ul.
6. `request_store_deletion(p_store_id, p_reason)`: Marchează magazinul ca `pending_deletion` doar dacă eligibilitatea este pozitivă.
7. `hard_delete_store_if_eligible(p_store_id, p_confirmation, p_reason)`: Execută ștergerea fizică exclusiv dacă textul de confirmare este exact `"STERG DEFINITIV MAGAZINUL"` și verificarea de eligibilitate este validă.

---

## 6. Ce NU s-a modificat (Boundaries)
Conform instrucțiunilor stricte pentru această etapă:
- **Nu s-a aplicat SQL-ul propus**: Scripturile sunt salvate ca blueprint-uri.
- **Nu s-a modificat baza de date live** sau schemele actuale.
- **Nu s-a implementat interfața de utilizator (UI)** în Owner Console sau alte panouri frontend.
- **Nu s-au modificat politicile RLS active**.
- **Nu s-au efectuat acțiuni reale de delete**.

---

## 7. Următorul Pas Recomandat
Următorul pas în implementare este **Etapa 6F.1.10: Store Lifecycle SQL Pre-Apply Hardening**, urmată de aplicarea migrației pe baza de date de test și scrierea testelor automate (6F.1.11, 6F.1.12, 6F.1.13).

> [!NOTE]
> **Ajustare 6F.1.10**: În cadrul etapei 6F.1.10, s-a realizat auditul și întărirea acestui blueprint. S-a decis blocarea completă a ștergerii fizice reale din primul rollout de aplicare (transformată în stub excepție), adăugarea funcției de anulare a cererii de ștergere, securizarea RPC-urilor cu `SELECT FOR UPDATE` și verificarea strictă a 18 tabele din schema live.

