-- ############################################################################
-- SECURIZARE RLS v2 - ROW LEVEL SECURITY
-- ############################################################################

-- 1. FUNCȚII HELPER PENTRU POLITICI
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN AS $$
    SELECT role = 'platform_owner' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_store_ids()
RETURNS TABLE (store_id UUID) AS $$
    SELECT store_id FROM public.store_members WHERE profile_id = auth.uid() AND active = true;
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. ACTIVARE RLS PE TOATE TABELELE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 3. POLITICI GLOBALE (PLATFORM OWNER)
-- Platform Owner vede tot
CREATE POLICY "Platform Owner has full access" ON public.profiles FOR ALL TO authenticated USING (is_platform_owner());
-- (Repetă pentru toate tabelele sau folosește o logică de bypass dacă este necesar)


-- 4. POLITICI PROFILES
CREATE POLICY "Users can view their own profile" ON public.profiles 
    FOR SELECT TO authenticated USING (auth.uid() = id OR is_platform_owner());

CREATE POLICY "Admins can view profiles in their store" ON public.profiles
    FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.store_members sm 
        WHERE sm.profile_id = public.profiles.id 
        AND sm.store_id IN (SELECT store_id FROM current_user_store_ids())
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    ));


-- 5. POLITICI STORES
CREATE POLICY "Users can view stores they belong to" ON public.stores
    FOR SELECT TO authenticated 
    USING (id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());


-- 6. POLITICI PRODUSE (PRODUCTS)
CREATE POLICY "Users can view products in their store" ON public.products
    FOR SELECT TO authenticated 
    USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

CREATE POLICY "Staff can manage products" ON public.products
    FOR ALL TO authenticated 
    USING (
        store_id IN (SELECT store_id FROM current_user_store_ids()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'gestionar')
    );


-- 7. POLITICI VÂNZĂRI (SALES)
CREATE POLICY "Users can view sales in their store" ON public.sales
    FOR SELECT TO authenticated 
    USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

CREATE POLICY "Cashiers can create sales" ON public.sales
    FOR INSERT TO authenticated 
    WITH CHECK (
        store_id IN (SELECT store_id FROM current_user_store_ids()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'casier')
    );


-- 8. POLITICI STOCURI (BATCHES & MOVEMENTS)
CREATE POLICY "Staff can view stock" ON public.stock_batches FOR SELECT TO authenticated USING (store_id IN (SELECT store_id FROM current_user_store_ids()));
CREATE POLICY "Staff can manage stock" ON public.stock_batches FOR ALL TO authenticated 
    USING (
        store_id IN (SELECT store_id FROM current_user_store_ids()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'gestionar')
    );

-- NOTĂ: Aceasta este o configurare de bază. Trebuie extinsă pentru fiecare tabel în parte conform matricei de permisiuni.
