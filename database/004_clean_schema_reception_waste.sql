-- ############################################################################
-- SCHEMA RECEPTION & WASTE v2 - INTRĂRI ȘI PIERDERI
-- ############################################################################

-- 1. RECEPȚII MARFĂ (RECEPTIONS)
CREATE TABLE IF NOT EXISTS public.receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    document_number TEXT NOT NULL,
    document_date DATE NOT NULL,
    total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    supplier_text TEXT, -- Nume furnizor (informativ, nu necesită tabelă separată)
    supplier_cui TEXT,  -- CUI furnizor (informativ)
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LINII RECEPȚIE (RECEPTION ITEMS)
CREATE TABLE IF NOT EXISTS public.reception_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    reception_id UUID NOT NULL REFERENCES public.receptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity DECIMAL(12,3) NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL,
    sale_price_new DECIMAL(12,2), -- Preț de vânzare setat la recepție
    vat_percent DECIMAL(5,2) DEFAULT 19,
    batch_number TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EVENIMENTE PIERDERI (WASTE EVENTS)
CREATE TABLE IF NOT EXISTS public.waste_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    reason TEXT NOT NULL, -- Expirați, Deteriorat, Consum propriu, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LINII PIERDERI (WASTE ITEMS)
CREATE TABLE IF NOT EXISTS public.waste_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    waste_id UUID NOT NULL REFERENCES public.waste_events(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    batch_id UUID REFERENCES public.stock_batches(id),
    quantity DECIMAL(12,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXURI
CREATE INDEX IF NOT EXISTS idx_receptions_doc ON public.receptions(store_id, document_number);
CREATE INDEX IF NOT EXISTS idx_waste_events_store ON public.waste_events(store_id, created_at);
