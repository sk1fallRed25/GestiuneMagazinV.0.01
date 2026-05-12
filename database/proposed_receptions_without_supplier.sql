-- IMPORTANT: Acest SQL este PROPUS și NU este aplicat automat.
-- Scopul este simplificarea modulului de recepție prin eliminarea dependenței obligatorii de tabela furnizori.

-- 1. Permite coloana furnizor_id să fie NULL în tabela receptii
ALTER TABLE receptii ALTER COLUMN furnizor_id DROP NOT NULL;

-- 2. Adaugă coloane pentru stocarea informațiilor de furnizor ca text (pentru NIR-uri simple sau e-Factura)
ALTER TABLE receptii ADD COLUMN IF NOT EXISTS furnizor_text text null;
ALTER TABLE receptii ADD COLUMN IF NOT EXISTS furnizor_cui text null;

-- 3. Adaugă coloană de observații generală
ALTER TABLE receptii ADD COLUMN IF NOT EXISTS observatii text null;

-- Comentariu: Această schimbare este necesară pentru Etapa 1E de simplificare a gestiunii.
-- Datele existente nu sunt afectate (DROP TABLE nu este permis).
