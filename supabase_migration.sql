-- Ejecutar en Supabase → SQL Editor
-- Agrega la columna doc_category a la tabla documents

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS doc_category VARCHAR(20) NOT NULL DEFAULT 'manual';

-- Verifica el resultado
SELECT id, name, doc_category FROM documents LIMIT 10;
