/*
  =============================================================================
  PROPOSED RLS POLICIES & SECURITY FUNCTIONS
  Proiect: Gestiune Magazin V.0.01
  Descriere: Funcții helper și politici de securitate inițiale.
  =============================================================================
*/

-- 1. Funcții Helper (Security context)

-- Obține profilul utilizatorului curent
CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.profiles AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obține Tenant ID-ul utilizatorului curent
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obține Rolul utilizatorului curent
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Activare RLS (Row Level Security)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Politici pentru TABELUL TENANTS
-- Doar Platform Owner poate vedea toate tenants
CREATE POLICY "Platform owners see everything" 
ON public.tenants FOR SELECT 
USING ( public.current_user_role() = 'platform_owner' );

-- Utilizatorii văd doar propriul tenant
CREATE POLICY "Users see their own tenant" 
ON public.tenants FOR SELECT 
USING ( id = public.current_tenant_id() );

-- 4. Politici pentru TABELUL PROFILES
-- Utilizatorii își pot vedea și edita propriul profil
CREATE POLICY "Users can manage their own profile"
ON public.profiles FOR ALL
USING ( id = auth.uid() );

-- Tenant Admin poate vedea toate profilele din tenant-ul său
CREATE POLICY "Tenant admins see their staff"
ON public.profiles FOR SELECT
USING ( 
    tenant_id = public.current_tenant_id() 
    AND public.current_user_role() IN ('tenant_admin', 'manager') 
);

-- 5. Politici pentru TABELUL STORES
CREATE POLICY "Users see stores in their tenant"
ON public.stores FOR SELECT
USING ( tenant_id = public.current_tenant_id() );

-- 6. Exemplu politică pentru tabela PRODUSE (Propusă)
-- Aceasta va fi aplicată după ce coloana tenant_id este adăugată.
/*
ALTER TABLE public.produse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products from their tenant"
ON public.produse FOR SELECT
USING ( tenant_id = public.current_tenant_id() );

CREATE POLICY "Only staff can edit products"
ON public.produse FOR ALL
USING ( 
    tenant_id = public.current_tenant_id() 
    AND public.current_user_role() IN ('tenant_admin', 'manager', 'gestionar')
);
*/

COMMENT ON FUNCTION public.current_tenant_id IS 'Helper pentru a extrage tenant_id-ul din profilul utilizatorului logat prin JWT.';
