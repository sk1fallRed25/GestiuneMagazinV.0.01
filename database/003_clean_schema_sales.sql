-- ############################################################################
-- SCHEMA SALES v2 - POS ȘI VÂNZĂRI
-- ############################################################################

-- 1. TURE DE CASĂ (CASHIER SHIFTS)
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    device_id UUID REFERENCES public.devices(id),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    closing_balance DECIMAL(12,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- 2. ANTET VÂNZĂRI (SALES)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.cashier_shifts(id),
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mixed')),
    status TEXT NOT NULL DEFAULT 'finalized' CHECK (status IN ('finalized', 'cancelled', 'returned', 'partially_returned')),
    client_event_id UUID, -- Referință pentru sync offline
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LINII VÂNZARE (SALE ITEMS)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    batch_id UUID REFERENCES public.stock_batches(id),
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_item DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DETALII PLĂȚI (PAYMENTS)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('cash', 'card')),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXURI PENTRU RAPORTARE
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
