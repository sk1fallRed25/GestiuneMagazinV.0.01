-- ############################################################################
-- SECURIZARE RLS v2 - ROW LEVEL SECURITY (EXHAUSTIVĂ)
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


-- 2. ACTIVARE RLS PE TOATE TABELELE (23 TABELE)
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


-- 3. DEFINIRE POLITICI EXPLICITE PER TABEL

-- ############################################################################
-- CORE MODULE
-- ############################################################################

-- PROFILES
CREATE POLICY "Profiles: owner access" ON public.profiles FOR ALL USING (is_platform_owner());
CREATE POLICY "Profiles: user view self" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Profiles: store staff view" ON public.profiles FOR SELECT USING (
    id IN (SELECT profile_id FROM public.store_members WHERE store_id IN (SELECT store_id FROM current_user_store_ids()))
);

-- STORES
CREATE POLICY "Stores: view" ON public.stores FOR SELECT USING (id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Stores: admin manage" ON public.stores FOR UPDATE USING (has_store_role(id, ARRAY['admin']) OR is_platform_owner());

-- STORE_MEMBERS
CREATE POLICY "Members: view" ON public.store_members FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Members: admin manage" ON public.store_members FOR ALL USING (has_store_role(store_id, ARRAY['admin']) OR is_platform_owner());

-- DEVICES & APP_SETTINGS
CREATE POLICY "Devices: view" ON public.devices FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Settings: owner manage" ON public.app_settings FOR ALL USING (is_platform_owner());
CREATE POLICY "Settings: admin view" ON public.app_settings FOR SELECT USING (current_user_role() = 'admin' OR is_platform_owner());

-- ############################################################################
-- INVENTORY MODULE
-- ############################################################################

-- CATEGORIES & PRODUCTS & PRICES
CREATE POLICY "Catalog: view" ON public.products FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Catalog: staff manage" ON public.products FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

CREATE POLICY "Categories: view" ON public.categories FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Categories: staff manage" ON public.categories FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

CREATE POLICY "Prices: view" ON public.product_prices FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Prices: staff manage" ON public.product_prices FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

-- STOCK BATCHES & MOVEMENTS
CREATE POLICY "Stock: view" ON public.stock_batches FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Stock: staff manage" ON public.stock_batches FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());

CREATE POLICY "Movements: view" ON public.stock_movements FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Movements: staff insert" ON public.stock_movements FOR INSERT WITH CHECK (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar', 'casier']) OR is_platform_owner());

-- ############################################################################
-- SALES MODULE
-- ############################################################################

-- SALES, SALE_ITEMS, PAYMENTS
CREATE POLICY "Sales: view" ON public.sales FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Sales: cashier create" ON public.sales FOR INSERT WITH CHECK (has_store_role(store_id, ARRAY['admin', 'manager', 'casier']) OR is_platform_owner());

CREATE POLICY "SaleItems: view" ON public.sale_items FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "SaleItems: cashier create" ON public.sale_items FOR INSERT WITH CHECK (has_store_role(store_id, ARRAY['admin', 'casier']) OR is_platform_owner());
CREATE POLICY "SaleItems: admin update" ON public.sale_items FOR UPDATE USING (has_store_role(store_id, ARRAY['admin']) OR is_platform_owner());
CREATE POLICY "SaleItems: admin delete" ON public.sale_items FOR DELETE USING (has_store_role(store_id, ARRAY['admin']) OR is_platform_owner());

CREATE POLICY "Payments: view" ON public.payments FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Payments: cashier create" ON public.payments FOR INSERT WITH CHECK (has_store_role(store_id, ARRAY['admin', 'casier']) OR is_platform_owner());
CREATE POLICY "Payments: admin update" ON public.payments FOR UPDATE USING (has_store_role(store_id, ARRAY['admin']) OR is_platform_owner());
CREATE POLICY "Payments: admin delete" ON public.payments FOR DELETE USING (has_store_role(store_id, ARRAY['admin']) OR is_platform_owner());

-- SHIFTS
CREATE POLICY "Shifts: access" ON public.cashier_shifts FOR ALL USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

-- ############################################################################
-- RECEPTION & WASTE MODULE
-- ############################################################################

CREATE POLICY "Receptions: access" ON public.receptions FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());
CREATE POLICY "ReceptionItems: access" ON public.reception_items FOR ALL USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

CREATE POLICY "Waste: access" ON public.waste_events FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager', 'gestionar']) OR is_platform_owner());
CREATE POLICY "WasteItems: access" ON public.waste_items FOR ALL USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());

-- ############################################################################
-- SYNC & AUDIT MODULE
-- ############################################################################

CREATE POLICY "ClientEvents: cashier create" ON public.client_events FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "SyncConflicts: staff access" ON public.sync_conflicts FOR ALL USING (has_store_role(store_id, ARRAY['admin', 'manager']) OR is_platform_owner());
CREATE POLICY "Audit: view" ON public.audit_logs FOR SELECT USING (store_id IN (SELECT store_id FROM current_user_store_ids()) OR is_platform_owner());
CREATE POLICY "Errors: create" ON public.error_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "SyncStatus: access" ON public.device_sync_status FOR ALL USING (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND d.store_id IN (SELECT store_id FROM current_user_store_ids())) OR is_platform_owner());
