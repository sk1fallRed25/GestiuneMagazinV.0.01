-- ############################################################################
-- STORE MODULE ENTITLEMENTS BLUEPRINT - HARDENED (ETAPA 6F.1.3)
-- ############################################################################
-- NOTĂ: Acest script este un blueprint propus și întărit (hardened). 
-- NU a fost aplicat direct pe baza de date activă. 
-- Acest fișier servește ca specificație tehnică și model de date securizat.

-- ============================================================================
-- 1. SCHEMĂ ȘI TABELE
-- ============================================================================

-- Tabela Registry-ului oficial de module
CREATE TABLE IF NOT EXISTS public.platform_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT UNIQUE NOT NULL CONSTRAINT check_module_key CHECK (module_key = lower(module_key) AND module_key ~ '^[a-z0-9_]+$'),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CONSTRAINT check_category CHECK (category IN ('core','stock','sales','admin','reports','ai','fiscal','offline','platform')),
    route_paths JSONB NOT NULL DEFAULT '[]'::jsonb CONSTRAINT check_route_paths CHECK (jsonb_typeof(route_paths) = 'array'),
    default_enabled BOOLEAN NOT NULL DEFAULT false,
    requires_store_context BOOLEAN NOT NULL DEFAULT true,
    owner_only BOOLEAN NOT NULL DEFAULT false,
    minimum_roles TEXT[] NOT NULL DEFAULT '{}',
    dependencies TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CONSTRAINT check_status CHECK (status IN ('active', 'beta', 'disabled', 'planned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_modules IS 'Registrul centralizat al modulelor disponibile în platformă.';
COMMENT ON COLUMN public.platform_modules.module_key IS 'Identificatorul unic al modulului (lowercase snake_case, ex: expiration_tracking).';
COMMENT ON COLUMN public.platform_modules.category IS 'Gruparea logică a modulului pentru afișare/filtrare sidebar și prețuri.';
COMMENT ON COLUMN public.platform_modules.route_paths IS 'Array JSON de rute frontend asociate modulului.';
COMMENT ON COLUMN public.platform_modules.default_enabled IS 'Specifică dacă modulul este activat implicit la crearea unui magazin nou.';
COMMENT ON COLUMN public.platform_modules.requires_store_context IS 'Indică dacă modulul rulează în contextul unui magazin sau este global.';
COMMENT ON COLUMN public.platform_modules.owner_only IS 'Dacă este true, modulul este destinat exclusiv Platform Owner-ului.';
COMMENT ON COLUMN public.platform_modules.minimum_roles IS 'Rolurile minime necesare (RBAC) pentru a accesa acest modul.';
COMMENT ON COLUMN public.platform_modules.dependencies IS 'Cheile modulelor de care depinde funcționarea acestui modul.';

-- Tabela de acces granular per magazin (Entitlements)
CREATE TABLE IF NOT EXISTS public.store_module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL REFERENCES public.platform_modules(module_key) ON DELETE CASCADE ON UPDATE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    enabled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb CONSTRAINT check_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (store_id, module_key)
);

COMMENT ON TABLE public.store_module_access IS 'Configurări explicite de activare/dezactivare module per magazin (Overrides).';
COMMENT ON COLUMN public.store_module_access.store_id IS 'ID-ul magazinului pentru care se aplică configurarea.';
COMMENT ON COLUMN public.store_module_access.module_key IS 'Cheia modulului configurat.';
COMMENT ON COLUMN public.store_module_access.enabled IS 'Starea explicită a modulului pentru magazin.';
COMMENT ON COLUMN public.store_module_access.enabled_by IS 'Profilul Platform Owner-ului care a realizat modificarea.';
COMMENT ON COLUMN public.store_module_access.reason IS 'Motivul activării/dezactivării modulului (ex: factură restantă, upgrade plan).';

-- ============================================================================
-- 2. INDEXURI PENTRU OPTIMIZAREA INTEROGĂRILOR
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_store_module_access_store_enabled 
    ON public.store_module_access (store_id) 
    WHERE (enabled = true);

CREATE INDEX IF NOT EXISTS idx_store_module_access_module_enabled 
    ON public.store_module_access (module_key) 
    WHERE (enabled = true);

CREATE INDEX IF NOT EXISTS idx_store_module_access_store_module 
    ON public.store_module_access (store_id, module_key);

CREATE INDEX IF NOT EXISTS idx_store_module_access_enabled_by
    ON public.store_module_access (enabled_by);

CREATE INDEX IF NOT EXISTS idx_store_module_access_updated_at
    ON public.store_module_access (updated_at DESC);

-- ============================================================================
-- 3. TRIGGERI PENTRU TIMESTAMPS
-- ============================================================================
DROP TRIGGER IF EXISTS set_updated_at_platform_modules ON public.platform_modules;
CREATE TRIGGER set_updated_at_platform_modules
    BEFORE UPDATE ON public.platform_modules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_store_module_access ON public.store_module_access;
CREATE TRIGGER set_updated_at_store_module_access
    BEFORE UPDATE ON public.store_module_access
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_module_access ENABLE ROW LEVEL SECURITY;

-- Politici platform_modules
DROP POLICY IF EXISTS "platform_modules_read_authenticated" ON public.platform_modules;
CREATE POLICY "platform_modules_read_authenticated" 
    ON public.platform_modules 
    FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "platform_modules_write_owner" ON public.platform_modules;
CREATE POLICY "platform_modules_write_owner" 
    ON public.platform_modules 
    FOR ALL 
    TO authenticated 
    USING (public.is_platform_owner())
    WITH CHECK (public.is_platform_owner());

-- Politici store_module_access
DROP POLICY IF EXISTS "store_module_access_read_policy" ON public.store_module_access;
CREATE POLICY "store_module_access_read_policy" 
    ON public.store_module_access 
    FOR SELECT 
    TO authenticated 
    USING (
        public.is_platform_owner() 
        OR 
        store_id IN (SELECT store_id FROM public.current_user_store_ids())
    );

DROP POLICY IF EXISTS "store_module_access_write_owner" ON public.store_module_access;
CREATE POLICY "store_module_access_write_owner" 
    ON public.store_module_access 
    FOR ALL 
    TO authenticated 
    USING (public.is_platform_owner())
    WITH CHECK (public.is_platform_owner());

-- ============================================================================
-- 5. GRANTS HARDENING (RPC-ONLY WRITES)
-- ============================================================================
-- Revocăm tot accesul implicit
REVOKE ALL ON public.platform_modules FROM PUBLIC, anon;
REVOKE ALL ON public.store_module_access FROM PUBLIC, anon;

-- Acordăm drepturi de citire utilizatorilor autentificați
GRANT SELECT ON public.platform_modules TO authenticated;
GRANT SELECT ON public.store_module_access TO authenticated;

-- NOTĂ DE SECURITATE: Nu se acordă drepturi DML (INSERT/UPDATE/DELETE) direct 
-- utilizatorilor authenticated pe aceste tabele pentru a forța utilizarea 
-- exclusivă a RPC-urilor securizate care înregistrează loguri de audit și validează dependențele.

-- ============================================================================
-- 6. INTERFEȚE API (RPC FUNCTIONS)
-- ============================================================================

-- A. Obținerea listei de module disponibile pe platformă (Citire explicită)
CREATE OR REPLACE FUNCTION public.get_platform_modules()
RETURNS TABLE (
    id UUID,
    module_key TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    route_paths JSONB,
    default_enabled BOOLEAN,
    requires_store_context BOOLEAN,
    owner_only BOOLEAN,
    minimum_roles TEXT[],
    dependencies TEXT[],
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        pm.id,
        pm.module_key,
        pm.name,
        pm.description,
        pm.category,
        pm.route_paths,
        pm.default_enabled,
        pm.requires_store_context,
        pm.owner_only,
        pm.minimum_roles,
        pm.dependencies,
        pm.status,
        pm.created_at,
        pm.updated_at
    FROM public.platform_modules pm 
    ORDER BY pm.category, pm.name, pm.module_key;
END;
$$;

-- B. Obținerea stării de acces efective a modulelor pentru un magazin specific (Effective Access)
CREATE OR REPLACE FUNCTION public.get_store_module_access(p_store_id UUID)
RETURNS TABLE (
    module_key TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    route_paths JSONB,
    status TEXT,
    default_enabled BOOLEAN,
    explicit_enabled BOOLEAN,
    effective_enabled BOOLEAN,
    reason TEXT,
    enabled_by UUID,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    dependencies TEXT[],
    minimum_roles TEXT[],
    requires_store_context BOOLEAN,
    owner_only BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validare drepturi acces
    IF p_store_id IS NULL THEN
        -- Platform Owner poate cere lista globală cu stările implicite ale modulelor
        IF NOT public.is_platform_owner() THEN
            RAISE EXCEPTION 'Acces interzis. Trebuie specificat un ID de magazin valid.';
        END IF;
    ELSE
        IF NOT (public.is_platform_owner() OR p_store_id IN (SELECT store_id FROM public.current_user_store_ids())) THEN
            RAISE EXCEPTION 'Acces interzis. Nu aveți permisiunea de a vizualiza configurările acestui magazin.';
        END IF;
    END IF;

    RETURN QUERY 
    SELECT 
        pm.module_key,
        pm.name,
        pm.description,
        pm.category,
        pm.route_paths,
        pm.status,
        pm.default_enabled,
        sma.enabled AS explicit_enabled,
        CASE 
            WHEN pm.status = 'disabled' THEN false
            WHEN pm.status = 'planned' THEN false
            ELSE COALESCE(sma.enabled, pm.default_enabled)
        END AS effective_enabled,
        sma.reason,
        sma.enabled_by,
        sma.enabled_at,
        sma.disabled_at,
        pm.dependencies,
        pm.minimum_roles,
        pm.requires_store_context,
        pm.owner_only
    FROM public.platform_modules pm
    LEFT JOIN public.store_module_access sma 
        ON sma.module_key = pm.module_key 
       AND sma.store_id = p_store_id
    ORDER BY pm.category, pm.name, pm.module_key;
END;
$$;

-- C. Modificarea stării unui modul pentru un magazin specific (cu validări de dependențe și audit logs)
CREATE OR REPLACE FUNCTION public.set_store_module_access(
    p_store_id UUID, 
    p_module_key TEXT, 
    p_enabled BOOLEAN, 
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old_enabled BOOLEAN;
    v_audit_action TEXT;
    v_module_status TEXT;
    v_owner_only BOOLEAN;
    v_dependencies TEXT[];
    v_dep TEXT;
    v_dep_enabled BOOLEAN;
    v_dependent_key TEXT;
    v_reason TEXT;
    v_changed BOOLEAN;
BEGIN
    -- 1. Securizare: Doar platform_owner poate modifica entitlements
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Acces interzis. Doar Platform Owner poate activa sau dezactiva module.';
    END IF;

    -- 2. Validări de bază
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
        RAISE EXCEPTION 'Magazinul specificat nu există.';
    END IF;

    SELECT status, owner_only, dependencies
    INTO v_module_status, v_owner_only, v_dependencies
    FROM public.platform_modules 
    WHERE module_key = p_module_key;

    IF v_module_status IS NULL THEN
        RAISE EXCEPTION 'Modulul specificat (%) nu există în registry.', p_module_key;
    END IF;

    -- Prevenire activare module dezactivate global
    IF p_enabled AND v_module_status = 'disabled' THEN
        RAISE EXCEPTION 'Modulul % este dezactivat global pe platformă și nu poate fi activat.', p_module_key;
    END IF;

    -- Prevenire activare module exclusive Platform Owner
    IF p_enabled AND v_owner_only THEN
        RAISE EXCEPTION 'Modulele destinate exclusiv Platform Owner-ului nu pot fi activate pentru magazine.';
    END IF;

    -- 3. Validare dependențe la activare
    IF p_enabled AND v_dependencies IS NOT NULL AND array_length(v_dependencies, 1) > 0 THEN
        FOREACH v_dep IN ARRAY v_dependencies LOOP
            SELECT CASE 
                WHEN pm.status = 'disabled' THEN false
                WHEN pm.status = 'planned' THEN false
                ELSE COALESCE(sma.enabled, pm.default_enabled)
            END INTO v_dep_enabled
            FROM public.platform_modules pm
            LEFT JOIN public.store_module_access sma 
                ON sma.module_key = pm.module_key AND sma.store_id = p_store_id
            WHERE pm.module_key = v_dep;

            IF v_dep_enabled IS NULL OR NOT v_dep_enabled THEN
                RAISE EXCEPTION 'Nu se poate activa modulul %. Este necesară activarea prealabilă a modulului: %', p_module_key, v_dep;
            END IF;
        END LOOP;
    END IF;

    -- 4. Validare dependențe la dezactivare (Prevenire cascade dezordonat)
    IF NOT p_enabled THEN
        FOR v_dependent_key IN 
            SELECT pm.module_key 
            FROM public.platform_modules pm
            WHERE p_module_key = ANY(pm.dependencies)
        LOOP
            SELECT CASE 
                WHEN pm.status = 'disabled' THEN false
                WHEN pm.status = 'planned' THEN false
                ELSE COALESCE(sma.enabled, pm.default_enabled)
            END INTO v_dep_enabled
            FROM public.platform_modules pm
            LEFT JOIN public.store_module_access sma 
                ON sma.module_key = pm.module_key AND sma.store_id = p_store_id
            WHERE pm.module_key = v_dependent_key;

            IF v_dep_enabled = true THEN
                RAISE EXCEPTION 'Nu se poate dezactiva modulul % deoarece modulul activ % depinde de el.', p_module_key, v_dependent_key;
            END IF;
        END LOOP;
    END IF;

    v_user_id := auth.uid();
    
    -- Formatare motiv de audit
    v_reason := COALESCE(NULLIF(trim(p_reason), ''), CASE WHEN p_enabled THEN 'Activat administrativ' ELSE 'Dezactivat fără motiv specificat' END);

    -- Preluăm valoarea curentă pentru a detecta schimbarea reală
    SELECT enabled INTO v_old_enabled 
    FROM public.store_module_access 
    WHERE store_id = p_store_id AND module_key = p_module_key;

    v_changed := (v_old_enabled IS NULL OR v_old_enabled != p_enabled);

    IF v_changed THEN
        -- Aplicăm modificarea
        INSERT INTO public.store_module_access (
            store_id,
            module_key,
            enabled,
            enabled_by,
            enabled_at,
            disabled_at,
            reason,
            updated_at
        )
        VALUES (
            p_store_id,
            p_module_key,
            p_enabled,
            v_user_id,
            CASE WHEN p_enabled THEN now() ELSE NULL END,
            CASE WHEN NOT p_enabled THEN now() ELSE NULL END,
            v_reason,
            now()
        )
        ON CONFLICT (store_id, module_key)
        DO UPDATE SET
            enabled = p_enabled,
            enabled_by = v_user_id,
            enabled_at = CASE WHEN p_enabled THEN now() ELSE NULL END,
            disabled_at = CASE WHEN NOT p_enabled THEN now() ELSE NULL END,
            reason = v_reason,
            updated_at = now();

        -- Jurnalizare în audit_logs
        v_audit_action := CASE WHEN p_enabled THEN 'store.module_enable' ELSE 'store.module_disable' END;
        
        INSERT INTO public.audit_logs (
            store_id,
            profile_id,
            action,
            entity_type,
            entity_id,
            old_data,
            new_data
        )
        VALUES (
            p_store_id,
            v_user_id,
            v_audit_action,
            'store_module',
            NULL,
            CASE WHEN v_old_enabled IS NOT NULL THEN jsonb_build_object('enabled', v_old_enabled) ELSE NULL END,
            jsonb_build_object('enabled', p_enabled, 'reason', v_reason, 'module_key', p_module_key)
        );
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'storeId', p_store_id,
        'moduleKey', p_module_key,
        'enabled', p_enabled,
        'reason', v_reason,
        'changed', v_changed,
        'effectiveEnabled', p_enabled
    );
END;
$$;

-- D. Modificare în masă (Bulk) a modulelor unui magazin (Atomic Preset apply)
CREATE OR REPLACE FUNCTION public.bulk_set_store_modules(
    p_store_id UUID,
    p_modules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_module JSONB;
    v_module_key TEXT;
    v_enabled BOOLEAN;
    v_reason TEXT;
    v_updated_count INT := 0;
    v_enabled_modules JSONB := '[]'::jsonb;
    v_disabled_modules JSONB := '[]'::jsonb;
    v_skipped_modules JSONB := '[]'::jsonb;
    v_res JSONB;
BEGIN
    -- 1. Securizare
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Acces interzis. Doar Platform Owner poate activa sau dezactiva module.';
    END IF;

    -- 2. Validare tip de date
    IF jsonb_typeof(p_modules) != 'array' THEN
        RAISE EXCEPTION 'Parametrul p_modules trebuie să fie un array JSON de obiecte.';
    END IF;

    -- 3. Iterare și apel atomic. Întreaga funcție rulează într-o singură tranzacție.
    FOR v_module IN SELECT * FROM jsonb_array_elements(p_modules) LOOP
        v_module_key := v_module->>'module_key';
        v_enabled := (v_module->>'enabled')::boolean;
        v_reason := v_module->>'reason';

        IF v_module_key IS NULL OR v_enabled IS NULL THEN
            RAISE EXCEPTION 'Fiecare element din p_modules trebuie să conțină module_key și enabled.';
        END IF;

        -- Apelul setării individuale care se ocupă de validări, logică și audit individual
        v_res := public.set_store_module_access(p_store_id, v_module_key, v_enabled, v_reason);
        
        IF (v_res->>'changed')::boolean THEN
            v_updated_count := v_updated_count + 1;
            IF v_enabled THEN
                v_enabled_modules := jsonb_insert(v_enabled_modules, '{0}', to_jsonb(v_module_key));
            ELSE
                v_disabled_modules := jsonb_insert(v_disabled_modules, '{0}', to_jsonb(v_module_key));
            END IF;
        ELSE
            v_skipped_modules := jsonb_insert(v_skipped_modules, '{0}', to_jsonb(v_module_key));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'updatedCount', v_updated_count,
        'enabledModules', v_enabled_modules,
        'disabledModules', v_disabled_modules,
        'skippedModules', v_skipped_modules
    );
END;
$$;

-- E. Verificare acces utilizator/magazin la modul (Poartă principală securitate)
CREATE OR REPLACE FUNCTION public.user_can_access_store_module(
    p_store_id UUID,
    p_module_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_store_role TEXT;
    v_module_exists BOOLEAN;
    v_default_enabled BOOLEAN;
    v_requires_store_context BOOLEAN;
    v_owner_only BOOLEAN;
    v_minimum_roles TEXT[];
    v_status TEXT;
    v_enabled BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Verificare existență modul în catalogul platformei
    SELECT true, default_enabled, requires_store_context, owner_only, minimum_roles, status
    INTO v_module_exists, v_default_enabled, v_requires_store_context, v_owner_only, v_minimum_roles, v_status
    FROM public.platform_modules
    WHERE module_key = p_module_key;

    IF NOT COALESCE(v_module_exists, false) THEN
        RETURN false;
    END IF;

    -- Module dezactivate sau planificate nu sunt accesibile la runtime
    IF v_status IN ('disabled', 'planned') THEN
        RETURN false;
    END IF;

    -- 2. Identificare rol global utilizator curent
    SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Tratament special Platform Owner
    IF v_user_role = 'platform_owner' THEN
        -- Dacă este un modul global / independent de context magazin (ex: owner_console), acces direct permis
        IF NOT v_requires_store_context THEN
            RETURN true;
        END IF;
        
        -- Dacă modulul cere context de magazin, Platform Owner trebuie să selecteze explicit un magazin
        IF p_store_id IS NULL THEN
            RETURN false;
        END IF;
        
        -- Respectăm starea modulului pentru magazinul selectat (nu bypassăm entitlements la testarea interfeței)
        SELECT CASE 
            WHEN status = 'disabled' THEN false
            WHEN status = 'planned' THEN false
            ELSE COALESCE(sma.enabled, pm.default_enabled)
        END INTO v_enabled
        FROM public.platform_modules pm
        LEFT JOIN public.store_module_access sma 
            ON sma.module_key = pm.module_key AND sma.store_id = p_store_id
        WHERE pm.module_key = p_module_key;
        
        RETURN COALESCE(v_enabled, false);
    END IF;

    -- Pentru restul utilizatorilor, modulele exclusive Platform Owner sunt interzise
    IF v_owner_only THEN
        RETURN false;
    END IF;

    -- 4. Verificare dacă modulul este global (nu depinde de magazin)
    IF NOT v_requires_store_context THEN
        -- Verificăm rolul global
        IF array_length(v_minimum_roles, 1) IS NOT NULL AND NOT (v_user_role = ANY(v_minimum_roles)) THEN
            RETURN false;
        END IF;
        RETURN true;
    END IF;

    -- 5. Pentru modulele de magazin, avem nevoie obligatoriu de un magazin selectat
    IF p_store_id IS NULL THEN
        RETURN false;
    END IF;

    -- 6. Verificăm rolul local în magazin (store_members.role)
    SELECT role INTO v_store_role 
    FROM public.store_members 
    WHERE store_id = p_store_id 
      AND profile_id = v_user_id 
      AND active = true;
      
    IF v_store_role IS NULL THEN
        RETURN false; -- Utilizatorul nu este membru activ al magazinului selectat
    END IF;

    -- Verificăm dacă rolul din magazin este inclus în rolurile permise ale modulului
    IF array_length(v_minimum_roles, 1) IS NOT NULL AND NOT (v_store_role = ANY(v_minimum_roles)) THEN
        RETURN false;
    END IF;

    -- 7. Verificare Entitlement (Dacă magazinul are modulul activat)
    SELECT CASE 
        WHEN status = 'disabled' THEN false
        WHEN status = 'planned' THEN false
        ELSE COALESCE(sma.enabled, pm.default_enabled)
    END INTO v_enabled
    FROM public.platform_modules pm
    LEFT JOIN public.store_module_access sma 
        ON sma.module_key = pm.module_key AND sma.store_id = p_store_id
    WHERE pm.module_key = p_module_key;

    RETURN COALESCE(v_enabled, false);
END;
$$;

-- Revocare acces public la RPC-uri
REVOKE EXECUTE ON FUNCTION public.get_platform_modules() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_module_access(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_store_module_access(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bulk_set_store_modules(UUID, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_store_module(UUID, TEXT) FROM PUBLIC, anon;

-- Acordare permisiuni exclusiv utilizatorilor autentificați
GRANT EXECUTE ON FUNCTION public.get_platform_modules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_module_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_store_module_access(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_set_store_modules(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_store_module(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 7. POPULARE REGISTRY DIRECTORY (SEED IDEMPOTENT)
-- ============================================================================
INSERT INTO public.platform_modules (
    module_key, name, description, category, route_paths, 
    default_enabled, requires_store_context, owner_only, 
    minimum_roles, dependencies, status
) VALUES
('dashboard', 'Tablou de Bord', 'Statistici generale și rezumatul activității magazinului.', 'core', '["/"]'::jsonb, true, true, false, '{"admin", "manager"}'::text[], '{}'::text[], 'active'),
('products', 'Catalog Produse', 'Gestiunea catalogului de produse, prețuri și categorii.', 'stock', '["/produse"]'::jsonb, true, true, false, '{"admin", "manager", "gestionar"}'::text[], '{}'::text[], 'active'),
('expiration_tracking', 'Urmărire Expirare', 'Monitorizarea termenelor de valabilitate pentru loturile de produse.', 'stock', '["/expirari"]'::jsonb, true, true, false, '{"admin", "manager", "gestionar"}'::text[], '{"products"}'::text[], 'active'),
('loss_reporting', 'Raportare Pierderi', 'Înregistrarea produselor deteriorate, expirate sau pierdute.', 'stock', '["/pierderi"]'::jsonb, true, true, false, '{"admin", "gestionar"}'::text[], '{"products"}'::text[], 'active'),
('reception', 'Recepție Marfă', 'Înregistrarea intrărilor de stoc și recepția produselor de la furnizori.', 'stock', '["/receptie"]'::jsonb, true, true, false, '{"admin", "gestionar"}'::text[], '{"products"}'::text[], 'active'),
('transfer', 'Transfer Stocuri', 'Transferul de stocuri între puncte de lucru / magazine.', 'stock', '["/transfer"]'::jsonb, true, true, false, '{"admin", "gestionar"}'::text[], '{"products"}'::text[], 'active'),
('waste_audit', 'Audit Pierderi', 'Istoricul și analiza pierderilor și rebuturilor.', 'admin', '["/istoric-pierderi"]'::jsonb, true, true, false, '{"admin", "manager"}'::text[], '{"loss_reporting"}'::text[], 'active'),
('commercial_reports', 'Rapoarte Comerciale', 'Rapoarte detaliate de vânzări, stocuri și performanță financiară.', 'reports', '["/rapoarte"]'::jsonb, true, true, false, '{"admin", "manager"}'::text[], '{}'::text[], 'active'),
('store_settings', 'Setări Magazin', 'Configurarea profilului magazinului, caselor de marcat și metodelor de plată.', 'admin', '["/setari-magazin"]'::jsonb, true, true, false, '{"admin", "manager"}'::text[], '{}'::text[], 'active'),
('ai_consultant', 'Consultant AI', 'Asistent inteligent pentru optimizarea prețurilor, stocurilor și prognoze de vânzări.', 'ai', '["/ai-consultant"]'::jsonb, false, true, false, '{"admin", "manager"}'::text[], '{}'::text[], 'active'),
('pos', 'Punct de Vânzare (POS)', 'Interfața de vânzare rapidă, scanare coduri de bare și emitere bonuri.', 'sales', '["/pos", "/vanzare"]'::jsonb, true, true, false, '{"admin", "casier"}'::text[], '{"products"}'::text[], 'active'),
('sales_history', 'Istoric Vânzări', 'Istoricul tranzacțiilor POS și gestiunea bonurilor emise.', 'reports', '["/istoric-vanzari"]'::jsonb, true, true, false, '{"admin", "manager"}'::text[], '{"pos"}'::text[], 'active'),
('quick_add', 'Adăugare Rapidă', 'Interfață simplificată pentru adăugarea rapidă a produselor la raft.', 'admin', '["/fast-add"]'::jsonb, true, true, false, '{"admin"}'::text[], '{"products"}'::text[], 'active'),
('owner_console', 'Consolă Proprietar', 'Administrarea globală a chiriașilor, magazinelor și modulelor platformei.', 'platform', '["/owner"]'::jsonb, true, false, true, '{"platform_owner"}'::text[], '{}'::text[], 'active'),
('fiscal_bridge', 'Fiscal Bridge', 'Conectare directă cu case de marcat fizice și transmitere rapoarte Z/fiscalizare.', 'fiscal', '[]'::jsonb, false, true, false, '{"admin"}'::text[], '{"pos"}'::text[], 'planned'),
('offline_sync', 'Sincronizare Offline', 'Funcționare offline a POS-ului și sincronizare ulterioară la restabilirea conexiunii.', 'offline', '[]'::jsonb, false, true, false, '{"admin"}'::text[], '{}'::text[], 'planned'),
('advanced_returns', 'Retururi Avansate', 'Sistem extins pentru procesarea retururilor de produse, stornări și vouchere.', 'sales', '[]'::jsonb, false, true, false, '{"admin", "manager"}'::text[], '{"pos"}'::text[], 'beta'),
('vat_reports', 'Rapoarte TVA', 'Rapoarte detaliate privind cotele de TVA colectate și deduse per magazin.', 'reports', '[]'::jsonb, false, true, false, '{"admin", "manager"}'::text[], '{"commercial_reports"}'::text[], 'beta')
ON CONFLICT (module_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    route_paths = EXCLUDED.route_paths,
    default_enabled = EXCLUDED.default_enabled,
    requires_store_context = EXCLUDED.requires_store_context,
    owner_only = EXCLUDED.owner_only,
    minimum_roles = EXCLUDED.minimum_roles,
    dependencies = EXCLUDED.dependencies,
    status = EXCLUDED.status;

-- ============================================================================
-- 8. INITIALIZARE BACKFILL (OPȚIONALĂ, COMENTATĂ PENTRU SIGURANȚĂ)
-- ============================================================================
-- NOTĂ: În regim standard de funcționare, magazinele existente folosesc valoarea 
-- implicită (default_enabled) din registrul platform_modules datorită mecanismului 
-- de COALESCE implementat în get_store_module_access și user_can_access_store_module.
-- Dacă doriți să forțați override-uri inițiale în store_module_access, se poate rula următorul script:
/*
DO $$
DECLARE
    r_store RECORD;
    r_mod RECORD;
BEGIN
    FOR r_store IN SELECT id FROM public.stores LOOP
        FOR r_mod IN SELECT module_key, default_enabled FROM public.platform_modules WHERE requires_store_context = true LOOP
            INSERT INTO public.store_module_access (store_id, module_key, enabled, reason)
            VALUES (r_store.id, r_mod.module_key, r_mod.default_enabled, 'Inițializare automată sistem entitlements')
            ON CONFLICT (store_id, module_key) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;
*/
