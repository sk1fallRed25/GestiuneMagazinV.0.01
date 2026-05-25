-- ======================================================================================
-- MAGAZINPRO V2 SCHEMA DRAFT
-- DESCRIERE: Arhitectură Cloud Multi-Tenant, Idempotentă și Tranzacțională
-- DATA: 2026-04-30
-- STATUS: DRAFT (NU RULA ACEST SCRIPT PE O BAZĂ DE DATE LIVE FĂRĂ VERIFICARE PREALABILĂ)
-- ======================================================================================

-- 1. EXTENSII
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- 2. ENUM-URI ȘI TIPURI
DO $$ BEGIN
    CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'deleted');
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');
    CREATE TYPE location_type AS ENUM ('store', 'warehouse', 'combined');
    CREATE TYPE device_status AS ENUM ('pending', 'authorized', 'revoked');
    CREATE TYPE member_role AS ENUM ('admin_firma', 'casier', 'gestionar', 'superadmin');
    CREATE TYPE member_status AS ENUM ('active', 'inactive', 'suspended');
    CREATE TYPE product_unit AS ENUM ('BUC', 'KG');
    CREATE TYPE product_status AS ENUM ('active', 'inactive', 'archived');
    CREATE TYPE stock_zone AS ENUM ('magazin', 'depozit');
    CREATE TYPE movement_zone AS ENUM ('magazin', 'depozit', 'external', 'customer');
    CREATE TYPE movement_type AS ENUM ('reception', 'transfer', 'sale', 'return', 'waste', 'inventory_adj');
    CREATE TYPE payment_method_code AS ENUM ('cash', 'card');
    CREATE TYPE sale_status AS ENUM ('finalized', 'returned', 'partially_returned', 'cancelled');
    CREATE TYPE return_status AS ENUM ('pending', 'completed', 'rejected');
    CREATE TYPE inventory_status AS ENUM ('open', 'processing', 'closed', 'cancelled');
    CREATE TYPE inventory_scope_type AS ENUM ('full', 'category', 'selective');
    CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'conflict');
    CREATE TYPE sync_conflict_status AS ENUM ('unresolved', 'resolved_client', 'resolved_server', 'resolved_manual');
    CREATE TYPE waste_reason_type AS ENUM ('expired', 'damaged', 'theft', 'sample', 'internal_use');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- 3. MODULE: PLATFORMĂ / LICENȚIERE

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_vat_payer BOOLEAN DEFAULT true,
    fiscal_code TEXT,
    status organization_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    max_locations INTEGER DEFAULT 1,
    max_devices INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    status subscription_status DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_modules (
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    module_code TEXT REFERENCES modules(code) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (organization_id, module_code)
);
CREATE TABLE IF NOT EXISTS app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_string TEXT UNIQUE NOT NULL,
    release_notes TEXT,
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 4. MODULE: UTILIZATORI / ACCES

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    default_organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_members (
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    role_id member_role NOT NULL,
    status member_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (organization_id, profile_id)
);
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    type location_type DEFAULT 'store',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, id) -- Necesar pentru FK compus în location_members
);
CREATE TABLE IF NOT EXISTS location_members (
    organization_id UUID NOT NULL,
    location_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    role_id member_role NOT NULL,
    PRIMARY KEY (location_id, profile_id),
    FOREIGN KEY (organization_id, location_id) REFERENCES locations(organization_id, id),
    FOREIGN KEY (organization_id, profile_id) REFERENCES organization_members(organization_id, profile_id)
);
CREATE TABLE IF NOT EXISTS employee_access_codes (
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    access_code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (organization_id, access_code)
);
-- 5. MODULE: LOCAȚII / DEVICE-URI

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    hardware_id TEXT NOT NULL,
    name TEXT,
    status device_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, hardware_id)
);
CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS device_sync_status (
    device_id UUID PRIMARY KEY REFERENCES devices(id),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    last_sync_at TIMESTAMPTZ,
    pending_events_count INTEGER DEFAULT 0
);
-- 6. MODULE: CATALOG

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, parent_id, name)
);
-- Index pentru root categories (unde parent_id este NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_root_name ON categories (organization_id, name) WHERE parent_id IS NULL;
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    unit product_unit DEFAULT 'BUC',
    status product_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, barcode)
);
CREATE TABLE IF NOT EXISTS product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    price_brut DECIMAL(10,2) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, location_id, product_id)
);
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    price_id UUID REFERENCES product_prices(id) NOT NULL,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id), -- NULL pentru taxe globale
    code TEXT NOT NULL,
    rate_percent DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rates_global_code ON tax_rates (code) WHERE organization_id IS NULL;
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    code payment_method_code NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE (organization_id, code)
);
-- 7. MODULE: STOC

CREATE TABLE IF NOT EXISTS stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    batch_number TEXT,
    expiry_date DATE,
    purchase_price DECIMAL(10,2), 
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    zone stock_zone DEFAULT 'magazin',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT quantity_non_negative CHECK (quantity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_stock_batches_fefo ON stock_batches (organization_id, location_id, product_id, zone, expiry_date, created_at) WHERE (quantity > 0);
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    batch_id UUID REFERENCES stock_batches(id),
    type movement_type NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    source_zone movement_zone,
    target_zone movement_zone,
    reference_id UUID, 
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 8. MODULE: POS / VÂNZĂRI

CREATE TABLE IF NOT EXISTS cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    initial_cash DECIMAL(10,2) DEFAULT 0,
    final_cash DECIMAL(10,2)
);
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    shift_id UUID REFERENCES cashier_shifts(id),
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    client_event_id UUID NOT NULL, 
    total_brut DECIMAL(12,2) NOT NULL,
    total_tax DECIMAL(12,2) NOT NULL,
    payment_method payment_method_code DEFAULT 'cash',
    status sale_status DEFAULT 'finalized',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, client_event_id)
);
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price_brut DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    total_item_brut DECIMAL(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS sale_item_batches (
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES stock_batches(id) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    PRIMARY KEY (sale_item_id, batch_id)
);
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    sale_id UUID REFERENCES sales(id) NOT NULL,
    client_event_id UUID NOT NULL, 
    payment_method payment_method_code DEFAULT 'cash',
    reason TEXT,
    status return_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, client_event_id)
);
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    return_id UUID REFERENCES returns(id) ON DELETE CASCADE NOT NULL,
    sale_item_id UUID REFERENCES sale_items(id) NOT NULL,
    batch_id UUID REFERENCES stock_batches(id) NOT NULL,
    quantity_returned DECIMAL(12,3) NOT NULL
);
-- 9. MODULE: INVENTAR

CREATE TABLE IF NOT EXISTS inventory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    status inventory_status DEFAULT 'open',
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS inventory_scope (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    session_id UUID REFERENCES inventory_sessions(id) ON DELETE CASCADE NOT NULL,
    type inventory_scope_type DEFAULT 'full',
    category_id UUID REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS inventory_scope_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    scope_id UUID REFERENCES inventory_scope(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    UNIQUE (scope_id, product_id)
);
CREATE TABLE IF NOT EXISTS inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    session_id UUID REFERENCES inventory_sessions(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    batch_id UUID REFERENCES stock_batches(id),
    quantity_faptic DECIMAL(12,3) NOT NULL,
    counted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    session_id UUID REFERENCES inventory_sessions(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    batch_id UUID REFERENCES stock_batches(id),
    diff_quantity DECIMAL(12,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 10. MODULE: CASĂRI

CREATE TABLE IF NOT EXISTS waste_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    reason waste_reason_type NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS waste_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    waste_id UUID REFERENCES waste_events(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    batch_id UUID REFERENCES stock_batches(id) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL
);
-- 11. MODULE: OFFLINE / SUPORT / AUDIT

CREATE TABLE IF NOT EXISTS client_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    client_event_id UUID NOT NULL,
    type TEXT NOT NULL,
    status sync_status DEFAULT 'synced',
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, client_event_id)
);
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    client_event_id UUID NOT NULL,
    status sync_conflict_status DEFAULT 'unresolved',
    server_data JSONB,
    client_data JSONB,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, client_event_id)
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    profile_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    profile_id UUID REFERENCES profiles(id),
    error_message TEXT,
    stack_trace TEXT,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 12. SECURITATE: HELPER FUNCTIONS & RLS

CREATE OR REPLACE FUNCTION is_org_member(org_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id AND profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION has_org_role(org_id UUID, role member_role) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id AND profile_id = auth.uid() AND role_id = role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION has_location_access(org_id UUID, loc_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    IF has_org_role(org_id, 'admin_firma') THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM location_members 
        WHERE organization_id = org_id AND location_id = loc_id AND profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- ACTIVARE RLS EXPLICITĂ DOAR PE TABELELE V2
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_scope_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
-- POLITICI RLS MINIME PENTRU TESTARE AUTH MODERN
CREATE POLICY "Utilizatorii își pot vedea propriul profil" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Membrii pot vedea organizațiile lor" ON organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "Utilizatorii își pot vedea membership-urile proprii" ON organization_members FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Membrii pot vedea locațiile organizației lor" ON locations FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "Utilizatorii văd locațiile unde au acces explicit" ON location_members FOR SELECT USING (profile_id = auth.uid() OR has_org_role(organization_id, 'admin_firma'));
-- 13. RPC SKELETONS (SECURITY DEFINER)
-- RPC TODO: no GRANT to authenticated until implemented

CREATE OR REPLACE FUNCTION check_license(p_org_id UUID) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: check_license not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION register_device(p_org_id UUID, p_hw_id TEXT, p_name TEXT) RETURNS UUID AS $$ BEGIN RAISE EXCEPTION 'TODO: register_device not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION start_cashier_shift(p_org_id UUID, p_loc_id UUID, p_initial_cash DECIMAL) RETURNS UUID AS $$ BEGIN RAISE EXCEPTION 'TODO: start_cashier_shift not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION close_cashier_shift(p_shift_id UUID, p_final_cash DECIMAL) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: close_cashier_shift not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION receive_stock(p_data JSONB) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: receive_stock not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION transfer_stock(p_data JSONB) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: transfer_stock not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION finalize_sale(p_sale_data JSONB) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: finalize_sale not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION process_return(p_return_data JSONB) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: process_return not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION record_waste(p_waste_data JSONB) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: record_waste not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION start_inventory_session(p_org_id UUID, p_loc_id UUID) RETURNS UUID AS $$ BEGIN RAISE EXCEPTION 'TODO: start_inventory_session not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION close_inventory_session(p_session_id UUID) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: close_inventory_session not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION sync_client_event(p_event_data JSONB) RETURNS JSONB AS $$ BEGIN RAISE EXCEPTION 'TODO: sync_client_event not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION create_audit_log(p_data JSONB) RETURNS VOID AS $$ BEGIN RAISE EXCEPTION 'TODO: create_audit_log not implemented'; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- REVOKE EXECUTE FROM PUBLIC PENTRU TOATE RPC-URILE
REVOKE EXECUTE ON FUNCTION check_license(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION register_device(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION start_cashier_shift(UUID, UUID, DECIMAL) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION close_cashier_shift(UUID, DECIMAL) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION receive_stock(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transfer_stock(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_sale(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION process_return(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_waste(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION start_inventory_session(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION close_inventory_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sync_client_event(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_audit_log(JSONB) FROM PUBLIC;
-- 14. SEED MINIM (TAXE ȘI MODULE)

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tax_rates WHERE code = 'TVA_21' AND organization_id IS NULL) THEN
        INSERT INTO tax_rates (code, rate_percent, description) VALUES ('TVA_21', 21.00, 'TVA Standard 21%');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tax_rates WHERE code = 'TVA_11' AND organization_id IS NULL) THEN
        INSERT INTO tax_rates (code, rate_percent, description) VALUES ('TVA_11', 11.00, 'TVA Redus 11%');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tax_rates WHERE code = 'E' AND organization_id IS NULL) THEN
        INSERT INTO tax_rates (code, rate_percent, description) VALUES ('E', 0.00, 'Scutit / Regim E');
    END IF;
END $$;
INSERT INTO modules (name, code) VALUES
('Punct de Vânzare (POS)', 'POS'),
('Catalog Produse', 'PRODUSE'),
('Gestiune Stocuri', 'STOCURI'),
('Recepție Marfă', 'RECEPTIE'),
('Transferuri Interne', 'TRANSFER'),
('Inventariere', 'INVENTAR'),
('Casări și Pierderi', 'CASARI'),
('Monitorizare Expirări', 'EXPIRARI'),
('Rapoarte Avansate', 'RAPOARTE'),
('Suport Multi-Locație', 'MULTI_LOCATIE'),
('Ture Casier', 'TURE_CASIER'),
('Audit și Loguri', 'AUDIT')
ON CONFLICT (code) DO NOTHING;
