-- ############################################################################
-- ROLLBACK MIGRATION: REMOVE INVOICE QUANTITY COLUMN (6REC.1.2)
-- Proiect: Gestiune Magazin v2
-- ############################################################################

ALTER TABLE public.reception_items DROP COLUMN IF EXISTS invoice_quantity;
