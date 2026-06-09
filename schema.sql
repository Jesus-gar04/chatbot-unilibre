-- ============================================================
-- RAG Chatbot — Unilibre Barranquilla
-- Ejecutar en Supabase → SQL Editor (proyecto nuevo o existente)
-- ============================================================

-- 1. Extensión pgvector (requerida para embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla de metadatos de documentos
CREATE TABLE IF NOT EXISTS documents (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL,      -- 'PDF' | 'DOCX' | 'TXT'
    size         BIGINT,
    chunks       INTEGER,
    upload_date  TIMESTAMPTZ DEFAULT NOW(),
    status       TEXT DEFAULT 'indexed',
    doc_category VARCHAR(20) NOT NULL DEFAULT 'manual'  -- 'manual' | 'formato'
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (doc_category);
CREATE INDEX IF NOT EXISTS idx_documents_upload   ON documents (upload_date DESC);

-- Las tablas langchain_pg_collection y langchain_pg_embedding
-- se crean automáticamente cuando el backend indexa el primer documento.
-- No crearlas manualmente.

-- ============================================================
-- Storage: crear el bucket MANUALMENTE en Supabase Dashboard
-- Storage → New bucket → Name: "documents" → Private (sin marcar Public)
-- ============================================================
