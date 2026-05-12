-- ############################################################################
-- PLAN ACTIVARE RLS TABELE LEGACY (NEAPLICAT)
-- ATENȚIE: Activarea RLS fără politici (policies) va bloca orice acces!
-- ############################################################################

/*
-- PASUL 1: Activarea RLS pe tabelele prioritare
ALTER TABLE public.produse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vanzari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalii_vanzare ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptii_detalii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pierderi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilizatori ENABLE ROW LEVEL SECURITY;

-- PASUL 2: Definirea politicilor de acces (Policies)

-- 2.1. Politică globală: Administratorii (platform_owner, admin) au acces total (ALL)
-- Notă: Această politică se bazează pe existența coloanei 'role' în tabela 'profiles'
CREATE POLICY "Admins have full access" ON public.produse
    FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'platform_owner', 'tenant_admin')
    );

-- 2.2. Politică vizualizare: Toți utilizatorii autentificați pot vedea produsele
CREATE POLICY "Everyone can view products" ON public.produse
    FOR SELECT
    TO authenticated
    USING (true);

-- 2.3. Politică tranzacții: Doar posesorul (sau adminul) poate vedea propriile vânzări
-- (Presupune că vanzari are coloana user_id de tip UUID)
-- CREATE POLICY "Users can view their own sales" ON public.vanzari
--     FOR SELECT
--     TO authenticated
--     USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'platform_owner'));

-- 2.4. Politică profil: Utilizatorul poate vedea doar propriul profil
CREATE POLICY "Users can see their own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

*/

-- ############################################################################
-- AVERTISMENT CRITIC
-- ############################################################################
-- Înainte de aplicare:
-- 1. Verificați că toți utilizatorii activi au rând în 'public.profiles'.
-- 2. Verificați că toate interogările din Frontend trimit JWT-ul (sunt autentificate).
-- 3. Aplicați mai întâi politicile pe un mediu de TEST.
