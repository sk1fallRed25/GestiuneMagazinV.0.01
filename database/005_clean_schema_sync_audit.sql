-- ############################################################################
-- SCHEMA SYNC & AUDIT v2 - JURNALE ȘI SINCRONIZARE OFFLINE
-- ############################################################################

-- 1. EVENIMENTE CLIENT (CLIENT EVENTS - PENTRU OFFLINE/SYNC)
CREATE TABLE IF NOT EXISTS public.client_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id),
    client_event_id UUID NOT NULL, -- ID-ul generat de client (ex: IndexedDB)
    type TEXT NOT NULL, -- 'create_sale', 'update_stock', etc.
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'conflict')),
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONFLICTE SINCRONIZARE (SYNC CONFLICTS)
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    client_event_id UUID NOT NULL REFERENCES public.client_events(id),
    server_data JSONB,
    client_data JSONB,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. JURNAL AUDIT (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'product', 'sale', 'batch', etc.
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RAPORTARE ERORI (ERROR REPORTS)
CREATE TABLE IF NOT EXISTS public.error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STATUS SINCRONIZARE DISPOZITIV (DEVICE SYNC STATUS)
CREATE TABLE IF NOT EXISTS public.device_sync_status (
    device_id UUID PRIMARY KEY REFERENCES public.devices(id) ON DELETE CASCADE,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID
);

-- INDEXURI
CREATE INDEX IF NOT EXISTS idx_client_events_lookup ON public.client_events(store_id, client_event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
