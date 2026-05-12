-- ############################################################################
-- SECURIZARE RLS v2 - ROW LEVEL SECURITY (COMPLETĂ)
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
    SELECT sm.store_id FROM public.store_members sm 
    WHERE sm.profile_id = auth.uid() AND sm.active = true;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_store_role(p_store_id UUID, p_allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = p_store_id
        AND sm.profile_id = auth.uid()
        AND sm.active = true
        AND sm.role = ANY(p_allowed_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. ACTIVARE RLS PE TOATE TABELELE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sync_status ENABLE ROW LEVEL SECURITY;


-- 3. POLITICI GENERICE (PLATFORM OWNER - TOATE TABELELE)
-- Pentru simplitate, folosim un loop în procesul de dezvoltare sau definim per tabel.
-- Aici definim politicile principale per categorie de tabel.

-- ############################################################################
-- CATEGORIA 1: CORE (Profiles, Stores, Members)
-- ############################################################################

CREATE POLICY "Platform Owner ALL" ON public.profiles FOR ALL USING (is_platform_owner());
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins view store profiles" ON public.profiles FOR SELECT USING (
    id IN (SELECT profile_id FROM public.store_members WHERE store_id IN (SELECT store_id FROM current_user_store_ids()))
    AND current_user_role() IN ('admin', 'manager')
);

CREATE POLICY "Stores access" ON public.stores FOR SELECT USING (id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Admins manage store" ON public.stores FOR UPDATE USING (has_store_role(id, ARRAY['admin']) OR is_platform_owner());

-- ############################################################################
-- CATEGORIA 2: INVENTORY (Categories, Products, Stock)
-- ############################################################################

CREATE POLICY "Inventory view" ON public.products FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Inventory manage" ON public.products FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

CREATE POLICY "Stock view" ON public.stock_batches FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Stock manage" ON public.stock_batches FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

CREATE POLICY "Movements view" ON public.stock_movements FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Movements insert" ON public.stock_movements FOR INSERT WITH CHECK (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar', 'casier']) OR is_platform_owner());

-- ############################################################################
-- CATEGORIA 3: SALES & POS (Shifts, Sales, Payments)
-- ############################################################################

CREATE POLICY "Sales view" ON public.sales FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Sales create" ON public.sales FOR INSERT WITH CHECK (has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR is_platform_owner());

CREATE POLICY "Shifts access" ON public.cashier_shifts FOR ALL USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

-- ############################################################################
-- CATEGORIA 4: RECEPTION & WASTE
-- ############################################################################

CREATE POLICY "Reception access" ON public.receptions FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());
CREATE POLICY "Waste access" ON public.waste_events FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

-- ############################################################################
-- CATEGORIA 5: SYNC & AUDIT
-- ############################################################################

CREATE POLICY "Client events create" ON public.client_events FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Audit view" ON public.audit_logs FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Error reporting" ON public.error_reports FOR INSERT WITH CHECK (true); -- Oricine poate raporta o eroare
