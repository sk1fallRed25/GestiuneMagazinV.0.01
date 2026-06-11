-- ############################################################################
-- ROLLBACK MIGRATION: ADĂUGARE STATUS, LOT, NIR ȘI RECEPTIE_DATE ÎN RECEPTIONS (6REC.1)
-- Proiect: Gestiune Magazin v2
-- ############################################################################

DROP FUNCTION IF EXISTS public.post_reception(UUID, UUID, UUID);
ALTER TABLE public.receptions DROP CONSTRAINT IF EXISTS check_receptions_status;
ALTER TABLE public.receptions DROP COLUMN IF EXISTS status;
ALTER TABLE public.receptions DROP COLUMN IF EXISTS nir_number;
ALTER TABLE public.receptions DROP COLUMN IF EXISTS reception_date;
