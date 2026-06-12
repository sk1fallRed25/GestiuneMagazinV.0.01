-- ############################################################################
-- MIGRATION: ADD INVOICE QUANTITY COLUMN FOR ADVANCED NIR DETAILS (6REC.1.2)
-- Proiect: Gestiune Magazin v2
-- ############################################################################

-- 1. Extindere structură public.reception_items
ALTER TABLE public.reception_items ADD COLUMN IF NOT EXISTS invoice_quantity DECIMAL(12,3) NULL;

-- 2. Adăugare comentariu descriptiv
COMMENT ON COLUMN public.reception_items.invoice_quantity IS 'Cantitatea facturata, utila pentru constatarea de diferente fata de cantitatea receptionata.';
