-- ############################################################################
-- SCHEMA INVENTORY v2 - CATALOG ȘI GESTIUNE STOCURI
-- ############################################################################

-- 1. CATEGORII PRODUSE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATALOG PRODUSE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id),
    name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    unit TEXT DEFAULT 'buc',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, barcode)
);

-- 3. PREȚURI PRODUSE (PER MAGAZIN)
CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price_sale DECIMAL(12,2) NOT NULL DEFAULT 0,
    price_purchase DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_percent DECIMAL(5,2) DEFAULT 19,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, product_id)
);

-- 4. LOTURI DE STOC (BATCHES)
CREATE TABLE IF NOT EXISTS public.stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number TEXT,
    expiry_date DATE,
    zone TEXT NOT NULL CHECK (zone IN ('depozit', 'magazin')),
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JURNAL MIȘCĂRI STOC (MOVEMENTS)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.stock_batches(id),
    type TEXT NOT NULL CHECK (type IN ('reception','transfer','sale','return','waste','inventory_adjustment')),
    quantity DECIMAL(12,3) NOT NULL,
    source_zone TEXT,
    target_zone TEXT,
    reference_id UUID, -- ID-ul tranzacției care a generat mișcarea
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXURI PENTRU PERFORMANȚĂ
CREATE INDEX IF NOT EXISTS idx_products_store_barcode ON public.products(store_id, barcode);
CREATE INDEX IF NOT EXISTS idx_stock_batches_lookup ON public.stock_batches(store_id, product_id, zone);

-- TRIGGER PENTRU UPDATED_AT
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_product_prices_updated_at BEFORE UPDATE ON public.product_prices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
