# AI Server-Side Aggregation & Consent Report — Etapa 6AI.2

Acest raport detaliază deciziile de arhitectură, modelul de conformitate legislativă (GDPR & AI Act), mecanismele de auditare și riscurile de securitate abordate în designul blueprint-ului de consimțământ și agregare server-side pentru modulul **AI Consultant**.

---

## 1. Decizii Privind Consimțământul (Consent Separation Strategy)

Alegerea unui model de consimțământ granular separat pe **cinci niveluri** protejează libertatea decizională a administratorului de magazin, previne litigiile legale și reduce expunerea riscurilor cibernetice:

- **AI Consultant (UI Visibility)**: Determină exclusiv dacă utilizatorii magazinului pot vedea secțiunea AI în aplicație.
- **AI Data Preparation (Server Processing)**: Reprezintă permisiunea magazinului de a-și prelucra propriile date (vânzări, stocuri) pe serverul bazei de date. Fără acest acord, baza de date nu rulează calcule sau snapshot-uri intermediare pentru magazin.
- **Model Improvement (Opt-in contribution)**: Acordul voluntar de a oferi indicatori de performanță agrenați către algoritmul global de antrenament al platformei.
- **Anonymized Benchmarking (Cross-store comparison)**: Posibilitatea de a fi inclus în studii statistice anonime, obținând totodată acces la compararea propriei performanțe cu media pieței.
- **External AI Processing (External APIs)**: Consent separat pentru apelarea unor servicii externe (e.g. OpenAI GPT, Anthropic Claude). Acest indicator blochează orice transfer în afara rețelei interne a platformei magazinului.

---

## 2. Modelul de Date de Training ML (ML Training Snapshot Separation)

Datele de antrenament sunt izolate complet de datele operaționale de zi cu zi:

1. **Excludere PII (Personal Identifiable Information)**:
   - Numele clienților, codurile de fidelitate, adresele de email, numele angajaților sau adresele IP ale dispozitivelor POS sunt eliminate complet în faza de asamblare a datasetului în RPC-ul `create_training_snapshot_if_consented`.
   - Sunt folosite numai agregări și rapoarte proporționale (e.g., procentul de stoc scăzut, volum total zilnic, etc.) în locul tranzacțiilor brute.
2. **Minimizarea Datelor (Data Minimization)**:
   - În loc de a trimite articolele vândute cu marcă de timp exactă, datasetul conține doar agregările periodice la nivel de magazin.
3. **GDPR & Conformitate AI Act**:
   - Dreptul de retragere al consimțământului (`revoked_at`) este implementat nativ. În momentul în care adminul debifează opțiunea din UI, funcția de export din baza de date returnează automat `NULL` la următoarea încercare de compilare.
   - Retragerea consimțământului oprește prelucrarea datelor viitoare; datele deja agregate în dataset-urile istorice de modelare nu pot fi eliminate retroactiv în mod facil, aspect care este documentat explicit în microcopy-ul din UI pentru transparență contractuală.

---

## 3. Analiza de Securitate și Riscuri (Security Analysis)

| Risc Identificat | Nivel Risc | Strategie de Atenuare (Mitigation) |
| :--- | :--- | :--- |
| **Scurgerea de date brute între magazine (Multi-tenant breach)** | **CRITIC** | Izolare prin politici stricte de Row Level Security (RLS) pe tabelele `store_ai_snapshots` și `store_ai_consent`. Fiecare magazin își poate accesa doar propriile înregistrări (`current_user_store_id()`). |
| **Procesarea neautorizată a datelor de către platform_owner** | **MEDIU** | Funcția `create_training_snapshot_if_consented` verifică explicit dacă `allow_model_improvement = TRUE` și `revoked_at IS NULL` înainte de a efectua inserarea. Orice încercare neautorizată returnează `NULL`. |
| **Injectarea de cod sau modificarea setărilor de către casieri** | **MEDIU** | RPC-ul `update_store_ai_consent` verifică în mod direct rolul utilizatorului folosind `has_store_role(p_store_id, ARRAY['admin'])`. Utilizatorii cu rol de casier sau manager primesc erori de acces. |
| **Scurgerea datelor prin funcții neprotejate** | **MEDIU** | Toate cele 5 funcții RPC au clauza `REVOKE ALL FROM PUBLIC, anon` aplicată în mod explicit. Drepturile de rulare sunt acordate numai rolului `authenticated`. |

---

## 4. Jurnale de Audit detaliate (Audit Logs)

Fiecare eveniment critic este jurnalizat automat în tabela centrală `public.audit_logs`:

1. **Modificarea setărilor de consimțământ**:
   - `action`: `ai_consent_updated`
   - `entity_type`: `store_ai_consent`
   - `old_data` & `new_data`: Captură completă a rândului din tabelă înainte și după modificare, conținând stările tuturor toggle-urilor.
2. **Retragerea acordului**:
   - `action`: `ai_consent_revoked` (declanșat dacă `allow_model_improvement` trece din `TRUE` în `FALSE`).
3. **Crearea unui training snapshot**:
   - `action`: `ai_training_snapshot_created`
   - `entity_type`: `store_ai_training_snapshots`
   - `new_data`: Metadate despre perioada exportată, nivelul de anonimizare și ID-ul exportului creat.

---

## 5. Plan de Rollout pe Etape

- **Etapa 6AI.2 (Prezentă)**: Finalizarea blueprint-ului tehnic de securitate și a documentației de design.
- **Etapa 6AI.3 (Hardening SQL)**: Testarea scriptului SQL în sandbox local fără a afecta serverul live, validarea structurii de date și a comportamentului check constraints.
- **Etapa 6AI.4 (Instalare SQL)**: Aplicarea migrației pe baza de date de producție (creare tabele, triggers, RLS, RPCs).
- **Etapa 6AI.5 (Configurare UI Settings)**: Adăugarea zonei *"Setări AI și date"* în ecranul de setări magazin (`StoreSettingsPage.tsx`) cu butoane de salvare și microcopy legal.
- **Etapa 6AI.6 (Conectare Frontend)**: Modificarea `aiConsultantDataService` pentru a citi din `get_latest_store_ai_snapshot` și a declanșa re-calcularea server-side prin `refresh_store_ai_snapshot`.
- **Etapa 6AI.7 (Validare & Audit final)**: Verificare completă E2E Playwright a fluxurilor de consent și de caching, urmată de verificarea de conformitate GDPR.
