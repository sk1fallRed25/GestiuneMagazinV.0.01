-- =###########################################################################
-- BLUEPRINT TEHNIC - ETAPA 6AI.2: AI SERVER-SIDE AGGREGATION, CONSENT & ML
-- IMPORTANT: ACEST FIȘIER ESTE UN BLUEPRINT DE PROIECTARE ȘI NU TREBUIE APLICAT
-- DIRECT PE BAZA DE DATE LIVE ÎN ACEASTĂ ETAPĂ.
-- =###########################################################################

-- ==========================================
-- 1. TABEL CONSIMȚĂMÂNT AI (STORE AI CONSENT)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.store_ai_consent (
    store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
    
    -- 1. ai_consultant_enabled: Vizibilitatea modulului în interfață (UI Guard)
    ai_consultant_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 2. ai_data_preparation_enabled: Permisiunea de a compila date și a pregăti snapshot-uri
    ai_data_preparation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 3. allow_model_improvement: Opt-in voluntar pentru îmbunătățirea modelului global ML al platformei
    allow_model_improvement BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 4. allow_anonymized_benchmarking: Permisiunea de a include date anonimizate în analize comparativ-analitice
    allow_anonymized_benchmarking BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 5. allow_cross_store_training: Permite antrenarea încrucișată (Cross-store model training), implicit FALSE
    allow_cross_store_training BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 6. allow_external_ai_processing: Permite transmiterea de date către servicii AI terțe externe (e.g. OpenAI), implicit FALSE
    allow_external_ai_processing BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Versiunea contractului / termenilor de consimțământ acceptați
    consent_version TEXT NOT NULL DEFAULT 'v1',
    
    -- Metadate de auditare și semnătură electronică internă
    accepted_by_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constrângere de validare: dacă allow_model_improvement este TRUE,
    -- trebuie completat profilul care a acceptat și data acceptării.
    CONSTRAINT chk_model_improvement_consent CHECK (
        NOT allow_model_improvement OR 
        (accepted_at IS NOT NULL AND accepted_by_profile_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.store_ai_consent IS 'Stochează opțiunile granulare de consimțământ pentru utilizarea datelor în modulele AI de către fiecare magazin în parte.';

-- ==========================================
-- 2. TABEL SNAPSHOT-URI OPERAȚIONALE (STORE AI SNAPSHOTS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.store_ai_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    period_days INTEGER NOT NULL DEFAULT 30,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indicatori cheie agrenați (KPIs cache)
    active_products_count INTEGER NOT NULL DEFAULT 0,
    total_stock_value NUMERIC NOT NULL DEFAULT 0.0,
    sales_total NUMERIC NOT NULL DEFAULT 0.0,
    sales_count INTEGER NOT NULL DEFAULT 0,
    low_stock_count INTEGER NOT NULL DEFAULT 0,
    no_stock_count INTEGER NOT NULL DEFAULT 0,
    expiry_risk_count INTEGER NOT NULL DEFAULT 0,
    waste_count INTEGER NOT NULL DEFAULT 0,
    
    -- Obiecte structurate complete pentru UI
    snapshot JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_ai_snapshots_store ON public.store_ai_snapshots(store_id, period_days);

COMMENT ON TABLE public.store_ai_snapshots IS 'Cache-ul server-side pentru snapshot-urile operaționale agregate necesare dashboard-ului AI Consultant.';

-- ==========================================
-- 3. TABEL SNAPSHOT-URI ANTRENAMENT ML (STORE AI TRAINING SNAPSHOTS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.store_ai_training_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metadate privind structura datasetului anonimizat
    aggregation_level TEXT NOT NULL DEFAULT 'daily_product_category',
    anonymization_level TEXT NOT NULL DEFAULT 'aggregated_store_level',
    
    -- Date agregate anonimizate excluzând orice PII (fără email, nume, profile_id, client_id, sau UUID-uri brute)
    payload_json JSONB NOT NULL,
    
    source_snapshot_id UUID NULL REFERENCES public.store_ai_snapshots(id) ON DELETE SET NULL,
    used_for_model_version TEXT NULL,
    exported_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_ai_training_store ON public.store_ai_training_snapshots(store_id);

COMMENT ON TABLE public.store_ai_training_snapshots IS 'Dataset-uri agregate și anonimizate, folosite exclusiv pentru antrenarea modelelor ML, generate doar în baza opt-in-ului explicit.';

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.store_ai_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ai_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ai_training_snapshots ENABLE ROW LEVEL SECURITY;

-- Politici pentru store_ai_consent:
-- Adminii/Managerii magazinului și platform_owner pot citi consimțământul.
CREATE POLICY "store_ai_consent_select" ON public.store_ai_consent
    FOR SELECT
    USING (
        store_id IN (SELECT current_user_store_id()) OR
        is_platform_owner()
    );

-- Doar Adminii magazinului pot actualiza opțiunile de consimțământ.
CREATE POLICY "store_ai_consent_update" ON public.store_ai_consent
    FOR UPDATE
    USING (
        store_id IN (SELECT current_user_store_id()) AND
        public.has_store_role(store_id, ARRAY['admin'])
    );

-- Politici pentru store_ai_snapshots:
-- Utilizatorii magazinului autorizați și platform_owner pot citi cache-ul.
CREATE POLICY "store_ai_snapshots_select" ON public.store_ai_snapshots
    FOR SELECT
    USING (
        store_id IN (SELECT current_user_store_id()) OR
        is_platform_owner()
    );

-- Politici pentru store_ai_training_snapshots:
-- Doar platform_owner poate selecta/exporta datele de training agregate globale.
CREATE POLICY "store_ai_training_snapshots_select" ON public.store_ai_training_snapshots
    FOR SELECT
    USING (
        is_platform_owner()
    );

-- ==========================================
-- 5. TRIGGERI ȘI JURNALIZARE AUDIT (AUDIT LOGS)
-- ==========================================

-- Trigger pentru înregistrarea automată a modificărilor în store_ai_consent
CREATE OR REPLACE FUNCTION public.fn_audit_store_ai_consent_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Obține ID-ul profilului utilizatorului curent
    v_profile_id := auth.uid();
    
    IF TG_OP = 'UPDATE' THEN
        -- Loghează doar dacă s-au schimbat efectiv opțiunile de consimțământ
        IF OLD.ai_consultant_enabled <> NEW.ai_consultant_enabled OR
           OLD.ai_data_preparation_enabled <> NEW.ai_data_preparation_enabled OR
           OLD.allow_model_improvement <> NEW.allow_model_improvement OR
           OLD.allow_anonymized_benchmarking <> NEW.allow_anonymized_benchmarking OR
           OLD.allow_cross_store_training <> NEW.allow_cross_store_training OR
           OLD.allow_external_ai_processing <> NEW.allow_external_ai_processing OR
           OLD.revoked_at IS DISTINCT FROM NEW.revoked_at THEN
           
            INSERT INTO public.audit_logs (
                store_id,
                profile_id,
                action,
                entity_type,
                entity_id,
                old_data,
                new_data
            ) VALUES (
                NEW.store_id,
                v_profile_id,
                CASE 
                    WHEN OLD.allow_model_improvement = TRUE AND NEW.allow_model_improvement = FALSE THEN 'ai_consent_revoked'
                    ELSE 'ai_consent_updated'
                END,
                'store_ai_consent',
                NEW.store_id,
                to_jsonb(OLD),
                to_jsonb(NEW)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_audit_store_ai_consent
    AFTER UPDATE ON public.store_ai_consent
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_store_ai_consent_changes();

-- ==========================================
-- 6. RPC-URI SECURIZATE (SECURITY DEFINER)
-- ==========================================

-- A. Obține consimțământul magazinului curent
CREATE OR REPLACE FUNCTION public.get_store_ai_consent(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consent RECORD;
BEGIN
    -- Verificare permisiuni rol: manager sau admin
    IF NOT (is_platform_owner() OR public.has_store_role(p_store_id, ARRAY['admin', 'manager'])) THEN
        RAISE EXCEPTION 'Acces neautorizat la consimțământul AI.';
    END IF;

    SELECT * INTO v_consent FROM public.store_ai_consent WHERE store_id = p_store_id;
    
    IF NOT FOUND THEN
        -- Creează o înregistrare implicită dacă nu există
        INSERT INTO public.store_ai_consent (store_id) 
        VALUES (p_store_id)
        RETURNING * INTO v_consent;
    END IF;

    RETURN to_jsonb(v_consent);
END;
$$;

-- B. Actualizează opțiunile de consimțământ ale magazinului (granular patch)
CREATE OR REPLACE FUNCTION public.update_store_ai_consent(p_store_id UUID, p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_current RECORD;
    v_new_ai_consultant_enabled BOOLEAN;
    v_new_ai_data_preparation_enabled BOOLEAN;
    v_new_allow_model_improvement BOOLEAN;
    v_new_allow_anonymized_benchmarking BOOLEAN;
    v_new_allow_cross_store_training BOOLEAN;
    v_new_allow_external_ai_processing BOOLEAN;
    v_new_consent_version TEXT;
BEGIN
    -- Doar Adminul magazinului are dreptul să editeze opțiunile de consent
    IF NOT public.has_store_role(p_store_id, ARRAY['admin']) THEN
        RAISE EXCEPTION 'Doar administratorul magazinului poate modifica setările de consimțământ AI.';
    END IF;

    v_profile_id := auth.uid();
    
    SELECT * INTO v_current FROM public.store_ai_consent WHERE store_id = p_store_id;
    IF NOT FOUND THEN
        INSERT INTO public.store_ai_consent (store_id) VALUES (p_store_id) RETURNING * INTO v_current;
    END IF;

    -- Parsare patch (extragere valori sau fallback la starea anterioară)
    v_new_ai_consultant_enabled := COALESCE((p_patch->>'ai_consultant_enabled')::BOOLEAN, v_current.ai_consultant_enabled);
    v_new_ai_data_preparation_enabled := COALESCE((p_patch->>'ai_data_preparation_enabled')::BOOLEAN, v_current.ai_data_preparation_enabled);
    v_new_allow_model_improvement := COALESCE((p_patch->>'allow_model_improvement')::BOOLEAN, v_current.allow_model_improvement);
    v_new_allow_anonymized_benchmarking := COALESCE((p_patch->>'allow_anonymized_benchmarking')::BOOLEAN, v_current.allow_anonymized_benchmarking);
    v_new_allow_cross_store_training := COALESCE((p_patch->>'allow_cross_store_training')::BOOLEAN, v_current.allow_cross_store_training);
    v_new_allow_external_ai_processing := COALESCE((p_patch->>'allow_external_ai_processing')::BOOLEAN, v_current.allow_external_ai_processing);
    v_new_consent_version := COALESCE(p_patch->>'consent_version', v_current.consent_version);

    UPDATE public.store_ai_consent
    SET 
        ai_consultant_enabled = v_new_ai_consultant_enabled,
        ai_data_preparation_enabled = v_new_ai_data_preparation_enabled,
        allow_model_improvement = v_new_allow_model_improvement,
        allow_anonymized_benchmarking = v_new_allow_anonymized_benchmarking,
        allow_cross_store_training = v_new_allow_cross_store_training,
        allow_external_ai_processing = v_new_allow_external_ai_processing,
        consent_version = v_new_consent_version,
        
        -- Dacă s-a activat îmbunătățirea modelului și anterior era dezactivată, populăm metadatele de audit
        accepted_by_profile_id = CASE 
            WHEN NOT v_current.allow_model_improvement AND v_new_allow_model_improvement THEN v_profile_id
            ELSE accepted_by_profile_id 
        END,
        accepted_at = CASE 
            WHEN NOT v_current.allow_model_improvement AND v_new_allow_model_improvement THEN NOW()
            ELSE accepted_at 
        END,
        
        -- Dacă s-a dezactivat model improvement, marcăm momentul retragerii
        revoked_at = CASE 
            WHEN v_current.allow_model_improvement AND NOT v_new_allow_model_improvement THEN NOW()
            ELSE revoked_at 
        END,
        updated_at = NOW()
    WHERE store_id = p_store_id
    RETURNING * INTO v_current;

    RETURN to_jsonb(v_current);
END;
$$;

-- C. Refresh operational cache snapshot server-side
CREATE OR REPLACE FUNCTION public.refresh_store_ai_snapshot(p_store_id UUID, p_period_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consent_active BOOLEAN;
    v_now TIMESTAMPTZ := NOW();
    v_days_limit TIMESTAMPTZ;
    
    -- Variabile statistici agregate
    v_products_count INTEGER;
    v_stock_val NUMERIC := 0.0;
    v_sales_val NUMERIC := 0.0;
    v_sales_cnt INTEGER := 0;
    v_low_stock_cnt INTEGER := 0;
    v_no_stock_cnt INTEGER := 0;
    v_expiry_risk_cnt INTEGER := 0;
    v_waste_cnt INTEGER := 0;
    
    v_snapshot_payload JSONB;
    v_recs_payload JSONB;
    v_snapshot_id UUID;
    v_new_snapshot RECORD;
BEGIN
    -- 1. Verificare permisiuni rol: manager sau admin
    IF NOT (is_platform_owner() OR public.has_store_role(p_store_id, ARRAY['admin', 'manager'])) THEN
        RAISE EXCEPTION 'Permisiuni insuficiente pentru refresh snapshot AI.';
    END IF;

    -- 2. Verificare dacă magazinul a permis pregătirea datelor (ai_data_preparation_enabled)
    SELECT ai_data_preparation_enabled INTO v_consent_active 
    FROM public.store_ai_consent 
    WHERE store_id = p_store_id;
    
    IF NOT COALESCE(v_consent_active, FALSE) THEN
        RAISE EXCEPTION 'Pregătirea datelor AI este dezactivată pentru acest magazin în setările de consimțământ.';
    END IF;

    v_days_limit := v_now - (p_period_days || ' days')::INTERVAL;

    -- 3. Agregare date nomenclator produse active
    SELECT count(*) INTO v_products_count 
    FROM public.products 
    WHERE store_id = p_store_id AND status = 'active';

    -- 4. Agregare valoare stoc (stock_batches)
    SELECT COALESCE(SUM(b.quantity * COALESCE(b.purchase_price, p.price_purchase, 0.0)), 0.0)
    INTO v_stock_val
    FROM public.stock_batches b
    JOIN public.products pr ON b.product_id = pr.id
    LEFT JOIN public.product_prices p ON pr.id = p.product_id AND p.store_id = p_store_id
    WHERE pr.store_id = p_store_id AND pr.status = 'active' AND b.zone IN ('magazin', 'depozit');

    -- 5. Agregare stoc zero și scăzut
    SELECT 
        COALESCE(count(*) FILTER (WHERE st.stock_total = 0), 0),
        COALESCE(count(*) FILTER (WHERE st.stock_total > 0 AND st.stock_total <= 5), 0)
    INTO v_no_stock_cnt, v_low_stock_cnt
    FROM (
        SELECT pr.id, COALESCE(SUM(b.quantity), 0) as stock_total
        FROM public.products pr
        LEFT JOIN public.stock_batches b ON pr.id = b.product_id AND b.zone IN ('magazin', 'depozit')
        WHERE pr.store_id = p_store_id AND pr.status = 'active'
        GROUP BY pr.id
    ) st;

    -- 6. Agregare vânzări 30 de zile
    SELECT COALESCE(SUM(total), 0.0), COALESCE(count(*), 0)
    INTO v_sales_val, v_sales_cnt
    FROM public.sales
    WHERE store_id = p_store_id AND status = 'finalized' AND created_at >= v_days_limit;

    -- 7. Agregare risc expirare (loturi active cu expirare sub 30 zile)
    SELECT COALESCE(count(*), 0) INTO v_expiry_risk_cnt
    FROM public.stock_batches b
    JOIN public.products pr ON b.product_id = pr.id
    WHERE pr.store_id = p_store_id AND pr.status = 'active'
      AND b.quantity > 0 
      AND b.expiry_date IS NOT NULL 
      AND b.expiry_date <= (v_now + INTERVAL '30 days');

    -- 8. Agregare pierderi (waste events)
    SELECT COALESCE(count(*), 0) INTO v_waste_cnt
    FROM public.waste_events
    WHERE store_id = p_store_id AND created_at >= v_days_limit;

    -- Structurare payloads JSON
    v_snapshot_payload := jsonb_build_object(
        'generatedAt', v_now,
        'activeProductsCount', v_products_count,
        'totalStockValue', v_stock_val,
        'lowStockCount', v_low_stock_cnt,
        'noStockCount', v_no_stock_cnt,
        'expiryRiskCount', v_expiry_risk_cnt,
        'sales30dTotal', v_sales_val,
        'sales30dCount', v_sales_cnt,
        'waste30dCount', v_waste_cnt
    );

    -- Euristici recomandări simple
    v_recs_payload := jsonb_build_array();
    
    IF v_low_stock_cnt > 0 THEN
        v_recs_payload := v_recs_payload || jsonb_build_object(
            'id', 'low-stock',
            'severity', 'warning',
            'title', 'Stoc scăzut la produse active',
            'description', 'Ai ' || v_low_stock_cnt || ' produse cu stoc sub limita minimă.',
            'actionLabel', 'Vezi stocuri'
        );
    END IF;

    IF v_no_stock_cnt > 0 THEN
        v_recs_payload := v_recs_payload || jsonb_build_object(
            'id', 'no-stock',
            'severity', 'critical',
            'title', 'Produse cu stoc zero',
            'description', 'Există ' || v_no_stock_cnt || ' produse active cu stoc epuizat.',
            'actionLabel', 'Refă stocul'
        );
    END IF;

    -- Salvare snapshot în baza de date
    INSERT INTO public.store_ai_snapshots (
        store_id,
        period_days,
        generated_at,
        active_products_count,
        total_stock_value,
        sales_total,
        sales_count,
        low_stock_count,
        no_stock_count,
        expiry_risk_count,
        waste_count,
        snapshot,
        recommendations,
        created_by
    ) VALUES (
        p_store_id,
        p_period_days,
        v_now,
        v_products_count,
        v_stock_val,
        v_sales_val,
        v_sales_cnt,
        v_low_stock_cnt,
        v_no_stock_cnt,
        v_expiry_risk_cnt,
        v_waste_cnt,
        v_snapshot_payload,
        v_recs_payload,
        'user_trigger'
    )
    RETURNING * INTO v_new_snapshot;

    RETURN to_jsonb(v_new_snapshot);
END;
$$;

-- D. Obține cel mai recent cache snapshot
CREATE OR REPLACE FUNCTION public.get_latest_store_ai_snapshot(p_store_id UUID, p_period_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_snapshot RECORD;
BEGIN
    IF NOT (is_platform_owner() OR public.has_store_role(p_store_id, ARRAY['admin', 'manager'])) THEN
        RAISE EXCEPTION 'Permisiuni insuficiente pentru citire snapshot AI.';
    END IF;

    SELECT * INTO v_snapshot 
    FROM public.store_ai_snapshots 
    WHERE store_id = p_store_id AND period_days = p_period_days
    ORDER BY generated_at DESC 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(v_snapshot);
END;
$$;

-- E. Creează training snapshot anonimizat DOAR DACĂ magazinul a dat acordul explicit (allow_model_improvement)
CREATE OR REPLACE FUNCTION public.create_training_snapshot_if_consented(
    p_store_id UUID, 
    p_period_start DATE, 
    p_period_end DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consent_model_improvement BOOLEAN;
    v_latest_snapshot RECORD;
    v_payload JSONB;
    v_training_id UUID;
BEGIN
    -- 1. Verificare permisiune de platform_owner sau admin magazin
    IF NOT (is_platform_owner() OR public.has_store_role(p_store_id, ARRAY['admin'])) THEN
        RAISE EXCEPTION 'Neautorizat pentru crearea dataset-ului de model training.';
    END IF;

    -- 2. Audit consimțământ: allow_model_improvement TREBUIE să fie TRUE și revoked_at IS NULL
    SELECT allow_model_improvement INTO v_consent_model_improvement 
    FROM public.store_ai_consent 
    WHERE store_id = p_store_id AND revoked_at IS NULL;

    IF NOT COALESCE(v_consent_model_improvement, FALSE) THEN
        -- Nu returnăm eroare blocantă, dar eșuăm în mod silențios/securizat prin returnarea NULL
        -- pentru a respecta strict dorința magazinului fără a opri batch job-urile globale.
        RETURN NULL;
    END IF;

    -- 3. Obține statistici din cel mai recent snapshot operațional din perioada respectivă
    SELECT * INTO v_latest_snapshot 
    FROM public.store_ai_snapshots 
    WHERE store_id = p_store_id
    ORDER BY generated_at DESC 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL; -- Date operaționale lipsă
    END IF;

    -- 4. Construiește payload-ul strict anonimizat (fără UUID-uri, email, sau nume proprii)
    v_payload := jsonb_build_object(
        'period_start', p_period_start,
        'period_end', p_period_end,
        'stats', jsonb_build_object(
            'sales_volume', v_latest_snapshot.sales_total,
            'sales_count', v_latest_snapshot.sales_count,
            'low_stock_ratio', CASE WHEN v_latest_snapshot.active_products_count > 0 THEN v_latest_snapshot.low_stock_count::numeric / v_latest_snapshot.active_products_count ELSE 0.0 END,
            'no_stock_ratio', CASE WHEN v_latest_snapshot.active_products_count > 0 THEN v_latest_snapshot.no_stock_count::numeric / v_latest_snapshot.active_products_count ELSE 0.0 END,
            'expiry_risk_count', v_latest_snapshot.expiry_risk_count,
            'waste_count', v_latest_snapshot.waste_count
        )
    );

    -- 5. Inserare în store_ai_training_snapshots
    INSERT INTO public.store_ai_training_snapshots (
        store_id,
        period_start,
        period_end,
        aggregation_level,
        anonymization_level,
        payload_json,
        source_snapshot_id
    ) VALUES (
        p_store_id,
        p_period_start,
        p_period_end,
        'aggregated_store_level',
        'fully_anonymized_kpi',
        v_payload,
        v_latest_snapshot.id
    )
    RETURNING id INTO v_training_id;

    -- 6. Jurnalizare în audit_logs a exportului de training
    INSERT INTO public.audit_logs (
        store_id,
        profile_id,
        action,
        entity_type,
        entity_id,
        new_data
    ) VALUES (
        p_store_id,
        auth.uid(),
        'ai_training_snapshot_created',
        'store_ai_training_snapshots',
        v_training_id,
        jsonb_build_object(
            'period_start', p_period_start,
            'period_end', p_period_end,
            'anonymization_level', 'fully_anonymized_kpi'
        )
    );

    RETURN v_training_id;
END;
$$;

-- ==========================================
-- 7. DREPTURI ȘI ZONĂ SECURE DE EXECUTARE (PRIVILEGES)
-- ==========================================

-- Revocă accesul implicit de la public și utilizatori anonimi
REVOKE ALL ON FUNCTION public.get_store_ai_consent(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_store_ai_consent(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refresh_store_ai_snapshot(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_latest_store_ai_snapshot(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_training_snapshot_if_consented(UUID, DATE, DATE) FROM PUBLIC, anon;

-- Acordă drepturi explicite doar utilizatorilor autentificați
GRANT EXECUTE ON FUNCTION public.get_store_ai_consent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_ai_consent(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_store_ai_snapshot(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_store_ai_snapshot(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_training_snapshot_if_consented(UUID, DATE, DATE) TO authenticated;

-- ==========================================
-- COMENTARII PRIVIND PLANUL DE ROLLOUT TEHNIC
-- ==========================================
-- A. Etapa 6AI.2 (Prezentă): Validarea statică a blueprint-ului și a arhitecturii de consent granular.
-- B. Etapa 6AI.3: Teste de pre-apply hardening SQL (dry-run, validare reguli în sandbox izolat).
-- C. Etapa 6AI.4: Executare SQL live, creare tabele reale, aplicare RLS și activare RPC-uri.
-- D. Etapa 6AI.5: Integrare interfață setări în StoreSettingsPage (toggle-uri dinamice și microcopy de securitate).
-- E. Etapa 6AI.6: Conectare dashboard AI Consultant la get_latest_store_ai_snapshot() și refresh_store_ai_snapshot().
-- F. Etapa 6AI.7: Verificare finală E2E Playwright și audit complet de securitate și GDPR.
