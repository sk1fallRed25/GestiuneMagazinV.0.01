# Stadiul Proiectului — Gestiune Magazin v2 (Sursa de Adevăr)

Acest document reprezintă **Sursa Unică de Adevăr (Single Source of Truth)** privind stadiul curent de dezvoltare, arhitectura de securitate și nivelul de pregătire al platformei **Gestiune Magazin v2**.

> [!IMPORTANT]
> Toate rapoartele, analizele și documentele generate în etapele anterioare (Etapele 1 - 4) au caracter **istoric**. Orice afirmație din vechile rapoarte care contrazice stadiul descris în acest document (ex. mențiuni că RLS nu ar fi activat, că login-ul legacy ar fi permis sau că Owner Console ar sincroniza starea globală a profilelor) trebuie considerată depășită și invalidă.

---

## 1. Status Actual: MVP-Ready (Etapa 5A)

Platforma a finalizat cu succes toate etapele de dezvoltare, refactorizare și securizare aferente fazei MVP (Minimum Viable Product). Aplicația este stabilă, auditată și pregătită pentru demonstrații interne (Internal Demo) și testare operațională în regim controlat.

### Starea Componentelor Cheie:
- **Baza de date & Supabase**: Schema v2 este complet funcțională și populată cu date de test (produse, prețuri, stocuri).
- **Securitate (RLS)**: Row Level Security este **activat și întărit (hardened)** pe toate tabelele din public, conform auditului 4H.2. Accesul public necontrolat este complet blocat.
- **Autentificare & RBAC**: Sistemul folosește exclusiv Supabase Auth v2, cu rute protejate și permisiuni ierarhice stricte (`platform_owner`, `admin`, `manager`, `gestionar`, `casier`).
- **Owner Console**: Modulul este complet funcțional și securizat (Hardening 4J.1). Acesta gestionează permisiunile la nivel de magazin (`store_members`) și **NU** atinge/sincronizează starea globală sau rolul din tabela `profiles`.
- **Build & Stabilitate**: Proiectul se compilează perfect (`npm run build` returnează `Exit code: 0`), fără erori sau avertizări TypeScript/Vite.

---

## 2. Documentația Oficială Curentă (Etapa 5A)

Pentru planificarea demonstrațiilor, verificarea stării tehnice sau auditarea istoricului de dezvoltare, consultați exclusiv următoarele documente actualizate:

1. [Ghid Operațional Demo Intern (Etapa 5A)](./internal_demo_operational_guide_5a.md)
   - Conține instrucțiunile de utilizare, descrierea rolurilor, fluxul recomandat în 12 pași și datele de test recomandate.
2. [Checklist Tehnic Final (Etapa 5A)](./internal_demo_technical_checklist_5a.md)
   - Grila de verificare tehnică a mediului, a bazei de date, a rutei de autentificare și a modulelor operaționale.
3. [Changelog MVP & Istoric Etape (Etapa 5A)](./mvp_internal_changelog_5a.md)
   - Sinteza cronologică a tuturor celor 20 de sub-etape parcurse de la inițializarea proiectului până în prezent.

---

## 3. Documente Istorice (A NU se interpreta ca stare curentă)

Următoarele categorii de afirmații prezente în rapoartele vechi (din folderul `docs/`) reflectau stadii intermediare de dezvoltare și **NU** mai sunt valabile:

- ❌ *„RLS nu este aplicat sau este configurat în mod permisiv”* 👉 **FALS**: RLS a fost activat și întărit conform etapei 4H.2.
- ❌ *„Sistemul permite fallback la login legacy prin VITE_ALLOW_LEGACY_LOGIN”* 👉 **FALS**: Mecanismele legacy au fost complet eliminate în etapa 4E.
- ❌ *„Owner Console sincronizează câmpurile active și role din tabela profiles”* 👉 **FALS**: Logica a fost decuplată și securizată în etapa 4J.1; se modifică exclusiv `store_members`.
- ❌ *„Etapa următoare este curățarea codului sau implementarea de bază POS”* 👉 **FALS**: Toate aceste module sunt deja implementate și funcționale.

---

## 4. Următorii Pași Recomandați (Post-5A)

După finalizarea demonstrației interne pe baza ghidului 5A, echipa poate opta pentru una dintre următoarele direcții strategice:

- **Etapa 5B (Opțiunea 1)**: Demo intern ghidat / Colectare listă de feedback (Feedback list & UX fine-tuning).
- **Etapa 5B (Opțiunea 2)**: Întărirea securității prin proceduri stocate atomice (Atomic RPC hardening) pentru toate fluxurile de stoc (eliminarea completă a calculelor multi-step din frontend).
