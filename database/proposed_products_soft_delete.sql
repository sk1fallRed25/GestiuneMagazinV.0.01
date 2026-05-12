-- PROPUNERE: Soft Delete pentru tabela Produse
-- Obiectiv: Evitarea pierderii accidentale a datelor istorice legate de vânzări și recepții.

ALTER TABLE produse 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id);

-- Index pentru performanță (interogări active)
CREATE INDEX IF NOT EXISTS idx_produse_active ON produse(active) WHERE active = true;

COMMENT ON COLUMN produse.active IS 'Indică dacă produsul este vizibil în POS și Gestiune.';
COMMENT ON COLUMN produse.deleted_at IS 'Data la care produsul a fost dezactivat/șters logic.';
COMMENT ON COLUMN produse.deleted_by IS 'Utilizatorul care a efectuat ștergerea (referință Auth).';

-- NOTĂ: După aplicarea acestui SQL, codul din productService.ts -> deactivateProduct() va deveni funcțional.
-- Toate SELECT-urile din aplicație ar trebui să includă: .eq('active', true)
