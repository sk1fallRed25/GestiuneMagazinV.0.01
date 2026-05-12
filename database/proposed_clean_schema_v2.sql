-- ############################################################################
-- SCHEMA CURATĂ v2 - GESTIUNEMAGAZIN (NEAPLICATĂ)
-- Acest script definește structura finală dorită pentru aplicație.
-- ############################################################################

-- 1. CORE & MULTI-TENANCY
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    fiscal_code TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('platform_owner','tenant_admin','admin','manager','gestionar','casier')),
    active BOOLEAN DEFAULT true,
    default_organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    PRIMARY KEY (organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('store', 'warehouse', 'combined')),
    address TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATALOG
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.categories(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id),
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT,
    unit TEXT DEFAULT 'buc',
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_prices (
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    price_brut DECIMAL(12,2) NOT NULL DEFAULT 0,
    price_net DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_percent DECIMAL(5,2) DEFAULT 19,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, location_id)
);

-- 3. GESTIUNE STOC & MIȘCĂRI
CREATE TABLE IF NOT EXISTS public.stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(12,2),
    expiry_date DATE,
    zone TEXT DEFAULT 'magazin' CHECK (zone IN ('magazin', 'depozit')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.stock_batches(id),
    type TEXT NOT NULL CHECK (type IN ('reception','transfer','sale','return','waste','inventory_adj')),
    quantity DECIMAL(12,3) NOT NULL,
    source_zone TEXT,
    target_zone TEXT,
    reference_id UUID, -- ID-ul vânzării, recepției sau transferului
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POS & VÂNZARE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES public.profiles(id),
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    fiscal_receipt_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    vat_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'voucher', 'other')),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PIERDERI / CASĂRI
CREATE TABLE IF NOT EXISTS public.waste_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waste_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_event_id UUID NOT NULL REFERENCES public.waste_events(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    batch_id UUID REFERENCES public.stock_batches(id),
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,2)
);

-- ############################################################################
-- SECURIZARE RLS (ROW LEVEL SECURITY)
-- ############################################################################

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Politici de bază (Exemplu pentru Products)
-- CREATE POLICY "Org Isolation Products" ON public.products
-- FOR ALL USING (organization_id = (SELECT default_organization_id FROM profiles WHERE id = auth.uid()));

-- INDEXURI PENTRU PERFORMANȚĂ
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_product_location ON public.stock_batches(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON public.sales(organization_id, created_at);
