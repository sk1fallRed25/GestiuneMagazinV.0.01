-- ======================================================================================
-- FIX ADMIN ACCESS TO LOCATIONS (FAZA 5.11)
-- ======================================================================================

-- 1. Ajustare politică LOCATIONS
DROP POLICY IF EXISTS "Membrii pot vedea locațiile organizației lor" ON locations;
CREATE POLICY "Admins văd toate locațiile, membrii doar pe ale lor" 
ON locations
FOR SELECT 
USING (
    has_org_role(organization_id, 'admin_firma') OR 
    EXISTS (
        SELECT 1 FROM location_members 
        WHERE location_id = locations.id AND profile_id = auth.uid()
    )
);
-- 2. Ajustare politică LOCATION_MEMBERS
DROP POLICY IF EXISTS "Utilizatorii văd locațiile unde au acces explicit" ON location_members;
CREATE POLICY "Admins văd toți membrii, restul doar pe ei înșiși" 
ON location_members
FOR SELECT 
USING (
    has_org_role(organization_id, 'admin_firma') OR 
    profile_id = auth.uid()
);
-- 3. Confirmare funcție has_location_access (deja corectă în v2, dar o reafirmăm pentru siguranță)
CREATE OR REPLACE FUNCTION has_location_access(org_id UUID, loc_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Adminul are acces la orice locație din firma sa
    IF has_org_role(org_id, 'admin_firma') THEN RETURN TRUE; END IF;
    
    -- Restul userilor au acces doar dacă sunt membri expliciți
    RETURN EXISTS (
        SELECT 1 FROM location_members 
        WHERE organization_id = org_id AND location_id = loc_id AND profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
