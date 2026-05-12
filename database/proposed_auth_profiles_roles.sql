/*
  =============================================================================
  PROPOSED DATABASE SCHEMA: AUTH, PROFILES & MULTI-TENANCY
  Proiect: Gestiune Magazin V.0.01
  Descriere: Structura pentru trecerea la Supabase Auth și izolare multi-tenant.
  =============================================================================
*/

-- 1. Tabel Tenants (Organizații)
-- Fiecare afacere/client va avea propriul Tenant ID
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cui TEXT UNIQUE,
    subscription_plan TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.tenants IS 'Identifică organizația sau firma mamă.';

-- 2. Tabel Stores (Puncte de lucru / Magazine)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.stores IS 'Identifică magazinul fizic/punctul de lucru aparținând unui tenant.';

-- 3. Tabel Profiles (Date Utilizatori legate de Auth)
-- Acest tabel extinde auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    nume TEXT NOT NULL,
    telefon TEXT,
    
    -- Control Roluri prin Constraint
    role TEXT NOT NULL DEFAULT 'casier',
    CONSTRAINT role_check CHECK (role IN (
        'platform_owner',
        'tenant_admin',
        'manager',
        'gestionar',
        'casier',
        'agent',
        'furnizor'
    )),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Extinde tabelul de autentificare cu date specifice de business și roluri.';

-- 4. Trigger pentru updated_at (Automatizare)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicare trigger pe tabelele noi
CREATE TRIGGER set_updated_at_tenants BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_stores BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Indexuri pentru performanță
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_stores_tenant_id ON public.stores(tenant_id);

-- 6. Notă pentru tabelele existente (PROPS)
-- Toate tabelele existente (produse, vanzari, receptii, etc.) 
-- ar trebui să primească coloana tenant_id în etapa următoare:
-- ALTER TABLE public.produse ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
