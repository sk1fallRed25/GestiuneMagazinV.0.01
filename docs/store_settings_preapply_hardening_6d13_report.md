# Store Settings Pre-Apply Security & Robustness Hardening — Etapa 6D.1.3

## 1. Rezumat
* **Status**: Ready for manual SQL apply
* **DB modificată**: Nu (numai blueprint SQL pregătit)
* **Frontend modificat**: Nu (numai blueprint SQL și documentație)

---

## 2. Security Definer Hardening
Toate funcțiile cu clauza `SECURITY DEFINER` au fost auditate și corectate pentru a preveni atacurile bazate pe manipularea variabilei `search_path`. 

### Funcții verificate și corectate:
* `public.get_store_setting_text(uuid, text[], text)` — Adăugat `SET search_path = public`.
* `public.get_store_setting_numeric(uuid, text[], numeric)` — Adăugat `SET search_path = public`.
* `public.get_store_setting_boolean(uuid, text[], boolean)` — Adăugat `SET search_path = public`.
* `public.get_store_settings(uuid)` — Deținea deja `SET search_path = public`.
* `public.update_store_settings(uuid, jsonb)` — Deținea deja `SET search_path = public`.
* `public.get_store_operational_config(uuid)` — Deținea deja `SET search_path = public`.

Funcțiile care nu sunt declarate ca `SECURITY DEFINER` (precum `validate_store_settings_schema`, `get_default_store_settings` și `merge_store_settings_with_defaults`) au fost lăsate fără `SET search_path` deoarece rulează în contextul de securitate al apelantului.

---

## 3. TVA Tax Groups Final
Modelul de date pentru TVA este acum pe deplin aliniat la grupele fiscale din România (Tax Groups).

* **Proprietate standard**: `tax.default_vat_group` și `tax.vat_groups` (obiect).
* **Definiție Grupe**:
  * **Grupa A**: 21% (Standard VAT)
  * **Grupa B**: 11% (Reduced VAT)
  * **Grupa C**: 11% (Reduced VAT - Services/Horeca)
  * **Grupa D**: 0% (Exempt VAT with deduction)
  * **Grupa E**: 0% / NEPLĂTITOR TVA (Exempt VAT without deduction)
* **Confirmare curățare**:
  * Variabilele vechi `vat_default_group` și `tax_groups` au fost eliminate complet din blueprint-ul SQL.
  * Nu există referiri la cheia `percent` pentru definirea cotelor TVA, ci exclusiv la proprietatea standard `rate`.
  * Cotele vechi default `19`, `9`, `5` nu mai apar ca implicite în funcția de configurare implicită sau în migrator. Ele sunt menționate doar în logica de mapare legacy pentru compatibilitatea cu baza de date anterioară, fiind însoțite de comentarii explicative.

---

## 4. Merge Robustness
Logica funcției `public.merge_store_settings_with_defaults(p_settings jsonb)` a fost întărită pentru a proteja integritatea datelor la actualizări parțiale.

* **Păstrarea grupelor A-E**: Dacă input-ul conține un obiect `tax.vat_groups` parțial (de exemplu, doar modificarea unei grupe, cum ar fi schimbarea statusului active pe A), celelalte grupe implicite (B, C, D, E) nu sunt șterse. Am implementat o iterare la nivel de cheie în obiectul JSONB (`jsonb_each`) pentru a realiza fuziunea (merge) structurii pe fiecare cheie individuală.
* **Tratarea `vat_payer = false`**: Dacă setarea `vat_payer` este marcată ca `false`, fuziunea forțează automat `default_vat_group` la valoarea `'E'` (Neplătitor TVA).
* **Tratarea `vat_payer = true`**: Dacă `vat_payer` este `true` și valoarea curentă pentru `default_vat_group` este `'E'`, sistemul revine automat la `'A'` (TVA Standard) ca fallback de siguranță.

---

## 5. Grants
Secțiunea de privilegii din blueprint a fost securizată:

* **Revocare**: Toate cele 10 funcții create au clauza explicită `REVOKE EXECUTE ... FROM PUBLIC, anon` pentru a preveni accesul anonim.
* **Permisiuni Runtime**: Funcțiile utilizate direct de API-ul client/frontend (`get_store_settings`, `get_store_operational_config`, `update_store_settings`, precum și helperii de citire `get_store_setting_text`/`get_store_setting_numeric`/`get_store_setting_boolean`) au primit privilegii `GRANT EXECUTE TO authenticated`.
* **Migrator**: Funcția `public.migrate_stores_legacy_settings()` are doar clauza de revocare față de public/anon, dar **NU** acordă drepturi rolului `authenticated`. Acest migrator va fi executat exclusiv manual de administrator/DBA prin SQL Editor în mod controlat.

---

## 6. Probleme Rămase
* Niciuna identificată în această fază. Toate regulile de securitate și robustețe sunt acum satisfăcute în blueprint.

---

## 7. Decizie
**Ready for 6D.2 Store Settings SQL Apply Verification**. Blueprint-ul îndeplinește toate condițiile de securitate, validare și consistență pentru a fi aplicat manual pe baza de date.
