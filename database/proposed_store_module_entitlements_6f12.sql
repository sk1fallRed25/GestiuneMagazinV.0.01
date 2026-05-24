-- ############################################################################
-- STORE MODULE ENTITLEMENTS BLUEPRINT (ETAPA 6F.1.2)
-- ############################################################################
-- NOTĂ: Acest script este un blueprint propus. NU a fost aplicat direct pe baza
-- de date activă. Acest fișier servește ca specificație tehnică și model de date.

-- ============================================================================
-- 1. SCHEMĂ ȘI TABELE
-- ============================================================================

-- Tabela Registry-ului oficial de module
CREATE TABLE IF NOT EXISTS public.platform_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT UNIQUE NOT NULL CONSTRAINT check_module_key CHECK (module_key ~ '^[a-z0-9_]+$'),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CONSTRAINT check_category CHECK (length(trim(category)) > 0),
    route_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_enabled BOOLEAN NOT NULL DEFAULT false,
    requires_store_context BOOLEAN NOT NULL DEFAULT true,
    owner_only BOOLEAN NOT NULL DEFAULT false,
    minimum_roles TEXT[] NOT NULL DEFAULT '{}',
    dependencies TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CONSTRAINT check_status CHECK (status IN ('active', 'beta', 'disabled', 'planned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (store_id, module_key)
);

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
    USING (public.is_platform_owner());

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
    USING (public.is_platform_owner());

-- Grants
GRANT SELECT ON public.platform_modules TO authenticated;
GRANT SELECT ON public.store_module_access TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_modules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_module_access TO authenticated;

-- ============================================================================
-- 5. INTERFEȚE API (RPC FUNCTIONS)
-- ============================================================================

-- A. Obținerea listei de module disponibile pe platformă
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
    RETURN QUERY SELECT * FROM public.platform_modules ORDER BY category, name;
END;
$$;

-- B. Obținerea stării de acces a modulelor pentru un magazin specific
CREATE OR REPLACE FUNCTION public.get_store_module_access(p_store_id UUID)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    module_key TEXT,
    enabled BOOLEAN,
    enabled_by UUID,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validare drepturi acces
    IF NOT (public.is_platform_owner() OR p_store_id IN (SELECT store_id FROM public.current_user_store_ids())) THEN
        RAISE EXCEPTION 'Acces interzis. Nu aveți permisiunea de a vizualiza configurările acestui magazin.';
    END IF;

    RETURN QUERY 
    SELECT sma.* 
    FROM public.store_module_access sma
    WHERE sma.store_id = p_store_id;
END;
$$;

-- C. Modificarea stării unui modul pentru un magazin specific
CREATE OR REPLACE FUNCTION public.set_store_module_access(
    p_store_id UUID, 
    p_module_key TEXT, 
    p_enabled BOOLEAN, 
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old_enabled BOOLEAN;
    v_audit_action TEXT;
BEGIN
    -- Securizare: Doar platform_owner poate modifica entitlements
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Acces interzis. Doar Platform Owner poate activa sau dezactiva module.';
    END IF;

    -- Validări integritate referențială
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
        RAISE EXCEPTION 'Magazinul specificat nu există.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.platform_modules WHERE module_key = p_module_key) THEN
        RAISE EXCEPTION 'Modulul specificat nu există în registry.';
    END IF;

    v_user_id := auth.uid();

    -- Preluăm valoarea curentă pentru jurnalizarea în audit
    SELECT enabled INTO v_old_enabled 
    FROM public.store_module_access 
    WHERE store_id = p_store_id AND module_key = p_module_key;

    -- Actualizare stări
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
        p_reason,
        now()
    )
    ON CONFLICT (store_id, module_key)
    DO UPDATE SET
        enabled = p_enabled,
        enabled_by = v_user_id,
        enabled_at = CASE WHEN p_enabled THEN now() ELSE store_module_access.enabled_at END,
        disabled_at = CASE WHEN NOT p_enabled THEN now() ELSE store_module_access.disabled_at END,
        reason = p_reason,
        updated_at = now();

    -- Jurnalizare în audit_logs
    IF v_old_enabled IS NULL OR v_old_enabled != p_enabled THEN
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
            jsonb_build_object('enabled', p_enabled, 'reason', p_reason)
        );
    END IF;
END;
$$;

-- D. Modificare în masă (Bulk) a modulelor unui magazin
CREATE OR REPLACE FUNCTION public.bulk_set_store_modules(
    p_store_id UUID,
    p_modules JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_module JSONB;
    v_module_key TEXT;
    v_enabled BOOLEAN;
    v_reason TEXT;
BEGIN
    -- Securizare
    IF NOT public.is_platform_owner() THEN
        RAISE EXCEPTION 'Acces interzis. Doar Platform Owner poate activa sau dezactiva module.';
    END IF;

    -- Validare tip de date
    IF jsonb_typeof(p_modules) != 'array' THEN
        RAISE EXCEPTION 'Parametrul p_modules trebuie să fie un array JSON de obiecte.';
    END IF;

    FOR v_module IN SELECT * FROM jsonb_array_elements(p_modules) LOOP
        v_module_key := v_module->>'module_key';
        v_enabled := (v_module->>'enabled')::boolean;
        v_reason := v_module->>'reason';

        IF v_module_key IS NULL OR v_enabled IS NULL THEN
            RAISE EXCEPTION 'Fiecare element din p_modules trebuie să conțină module_key și enabled.';
        END IF;

        PERFORM public.set_store_module_access(p_store_id, v_module_key, v_enabled, v_reason);
    END LOOP;
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
    v_module_exists BOOLEAN;
    v_default_enabled BOOLEAN;
    v_requires_store_context BOOLEAN;
    v_owner_only BOOLEAN;
    v_minimum_roles TEXT[];
    v_enabled BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Verificare existență modul în catalogul platformei
    SELECT true, default_enabled, requires_store_context, owner_only, minimum_roles
    INTO v_module_exists, v_default_enabled, v_requires_store_context, v_owner_only, v_minimum_roles
    FROM public.platform_modules
    WHERE module_key = p_module_key;

    IF NOT COALESCE(v_module_exists, false) THEN
        RETURN false;
    END IF;

    -- 2. Identificare rol utilizator curent
    SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Platform Owner are acces global la orice modul (cu condiția respectării fluxului de interfață)
    IF v_user_role = 'platform_owner' THEN
        RETURN true;
    END IF;

    -- Module exclusive Owner Console nu sunt accesibile pentru restul rolurilor
    IF v_owner_only THEN
        RETURN false;
    END IF;

    -- 4. Verificare RBAC (Rol minim cerut de modul)
    IF array_length(v_minimum_roles, 1) IS NOT NULL AND NOT (v_user_role = ANY(v_minimum_roles)) THEN
        RETURN false;
    END IF;

    -- 5. Dacă modulul nu depinde de magazinul selectat, accesul e permis pe baza rolului
    IF NOT v_requires_store_context THEN
        RETURN true;
    END IF;

    -- 6. Dacă modulul cere magazin, dar nu avem magazin curent, accesul este respins
    IF p_store_id IS NULL THEN
        RETURN false;
    END IF;

    -- 7. Verificare Entitlement (Dacă magazinul are modulul activat)
    SELECT enabled INTO v_enabled
    FROM public.store_module_access
    WHERE store_id = p_store_id AND module_key = p_module_key;

    IF v_enabled IS NOT NULL THEN
        RETURN v_enabled;
    ELSE
        -- Returnează starea implicită a modulului în absența unei configurări explicite
        RETURN v_default_enabled;
    END IF;
END;
$$;

-- Revocare acces public
REVOKE EXECUTE ON FUNCTION public.get_platform_modules() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_module_access(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_store_module_access(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bulk_set_store_modules(UUID, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_store_module(UUID, TEXT) FROM PUBLIC, anon;

-- Acordare permisiuni exclusiv utilizatorilor autentificați (pentru a fi chemate prin API-ul Supabase)
GRANT EXECUTE ON FUNCTION public.get_platform_modules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_module_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_store_module_access(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_set_store_modules(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_store_module(UUID, TEXT) TO authenticated;


-- ============================================================================
-- 6. POPULARE REGISTRY DIRECTORY (SEED DATA)
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
