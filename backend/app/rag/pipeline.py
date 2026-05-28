import json
from typing import List, AsyncGenerator

from langchain_community.vectorstores import PGVector
from langchain.schema import Document, HumanMessage
from langchain.schema.embeddings import Embeddings

from app.config import settings

_embeddings = None


# ── Custom fastembed wrapper ─────────────────────────────────────────────────
# langchain-community 0.2.x tiene un bug de Pydantic v1 en FastEmbedEmbeddings
# (_model no está declarado con PrivateAttr, lo que levanta ValidationError).
# Solución: usar fastembed.TextEmbedding directamente con un wrapper mínimo.

class _FastEmbedWrapper(Embeddings):
    """Wrapper directo sobre fastembed.TextEmbedding compatible con LangChain."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from fastembed import TextEmbedding
        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [e.tolist() for e in self._model.embed(texts)]

    def embed_query(self, text: str) -> List[float]:
        return next(self._model.embed([text])).tolist()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _db_url() -> str:
    """
    Convierte la DATABASE_URL de Supabase al formato que necesita SQLAlchemy
    con psycopg2 y SSL habilitado.
    """
    url = settings.database_url
    if not url:
        raise RuntimeError("DATABASE_URL no está configurada en .env")
    # Asegurar driver psycopg2
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # Supabase requiere SSL
    if "sslmode" not in url:
        sep = "&" if "?" in url else "?"
        url += f"{sep}sslmode=require"
    return url


# ── Singletons ───────────────────────────────────────────────────────────────

def get_embeddings() -> _FastEmbedWrapper:
    """
    FastEmbed usa ONNX en lugar de PyTorch:
    - Descarga el modelo en ~5 s (vs ~90 s con sentence-transformers)
    - Usa ~80 MB de RAM (vs ~400 MB con torch)
    - Sin dependencia de CUDA ni torch — ideal para Render free tier
    """
    global _embeddings
    if _embeddings is None:
        _embeddings = _FastEmbedWrapper(model_name="BAAI/bge-small-en-v1.5")
    return _embeddings


def get_vector_store() -> PGVector:
    """
    Crea una instancia de PGVector con NullPool para no mantener
    conexiones inactivas en RAM (ideal para Render free tier 512 MB).
    Las tablas ya fueron creadas en el startup inicial.
    """
    from sqlalchemy.pool import NullPool
    return PGVector(
        connection_string=_db_url(),
        embedding_function=get_embeddings(),
        collection_name="rag_unilibre",
        pre_delete_collection=False,
        engine_args={"poolclass": NullPool},
    )


def get_llm():
    """
    DeepSeek expone una API 100 % compatible con OpenAI,
    por lo que se usa ChatOpenAI apuntando a la base URL de DeepSeek.
    """
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=settings.llm_model or "deepseek-chat",
        api_key=settings.deepseek_api_key,
        base_url="https://api.deepseek.com",
        streaming=True,
        temperature=0.1,
        max_tokens=2048,
    )


# ── Vector store operations ──────────────────────────────────────────────────

def add_documents_to_store(chunks: List[Document], doc_id: str):
    """Añade los chunks de un documento al índice vectorial en Supabase."""
    store = get_vector_store()
    store.add_documents(chunks)


def delete_document_from_store(doc_id: str):
    """
    Elimina todos los chunks de un documento filtrando por el campo
    'doc_id' guardado en la columna JSONB 'cmetadata' de PGVector.
    """
    from sqlalchemy import create_engine, text
    engine = create_engine(_db_url())
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = 'rag_unilibre'")
        ).fetchone()
        if row:
            conn.execute(
                text(
                    "DELETE FROM langchain_pg_embedding "
                    "WHERE collection_id = :cid "
                    "AND cmetadata->>'doc_id' = :doc_id"
                ),
                {"cid": str(row[0]), "doc_id": doc_id},
            )
            conn.commit()
    engine.dispose()


def retrieve_context(query: str) -> List[Document]:
    try:
        store = get_vector_store()
        return store.similarity_search(query, k=settings.retrieval_k)
    except Exception:
        return []


# ── Prompt institucional Universidad Libre Seccional Barranquilla ────────────

_PROMPT = """\
Eres el Asistente Virtual oficial de la Universidad Libre Seccional Barranquilla.
Tu misión es apoyar a estudiantes, docentes y comunidad académica respondiendo
consultas sobre procesos académicos, administrativos y reglamentarios de la institución.

REGLAS ESTRICTAS — DEBES CUMPLIRLAS SIN EXCEPCIÓN:
1. Responde ÚNICAMENTE con información que esté presente en el CONTEXTO proporcionado.
2. Si la consulta no puede responderse con el contexto disponible, responde exactamente:
   "No encontré información sobre eso en los documentos institucionales disponibles.
    Te recomiendo comunicarte directamente con la Secretaría de la Universidad Libre
    Seccional Barranquilla."
3. NO inventes datos, fechas, requisitos, artículos, normas ni procedimientos
   que no aparezcan en el contexto.
4. Usa un tono formal, claro y respetuoso, acorde con la imagen institucional.
5. Si la consulta es sobre un trámite o proceso, sigue los pasos exactamente
   como aparecen en los documentos fuente.
6. Responde siempre en español.
7. Al final de tu respuesta, indica brevemente la fuente consultada
   (nombre del documento y página si está disponible).

CONTEXTO INSTITUCIONAL:
{context}

HISTORIAL DE CONVERSACIÓN:
{history}

PREGUNTA:
{question}

RESPUESTA:"""


# ── Streaming ────────────────────────────────────────────────────────────────

async def stream_rag_response(
    query: str, history: list
) -> AsyncGenerator[str, None]:

    context_docs = retrieve_context(query)

    _no_info = (
        "No encontré información sobre eso en los documentos institucionales "
        "disponibles. Te recomiendo comunicarte directamente con la Secretaría "
        "de la Universidad Libre Seccional Barranquilla."
    )

    if not context_docs:
        yield f'data: {json.dumps({"token": _no_info, "done": False})}\n\n'
        yield f'data: {json.dumps({"sources": [], "done": True})}\n\n'
        return

    context_text = "\n\n---\n\n".join(
        f"[Fuente: {d.metadata.get('source', '?')}, Pág. {d.metadata.get('page', '?')}]\n{d.page_content}"
        for d in context_docs
    )

    history_text = (
        "\n".join(
            f"{'Estudiante' if m.get('role') == 'user' else 'Asistente'}: {m.get('content', '')}"
            for m in history[-6:]
        )
        if history
        else "Sin historial previo."
    )

    prompt = _PROMPT.format(
        context=context_text,
        history=history_text,
        question=query,
    )

    # Deduplicar fuentes
    seen, sources = set(), []
    for d in context_docs:
        key = f"{d.metadata.get('source', '')}_{d.metadata.get('page', '')}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "document": d.metadata.get("source", "Desconocido"),
                "page": d.metadata.get("page"),
            })

    llm = get_llm()
    try:
        async for chunk in llm.astream([HumanMessage(content=prompt)]):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                yield f'data: {json.dumps({"token": token, "done": False})}\n\n'
        yield f'data: {json.dumps({"sources": sources, "done": True})}\n\n'
    except Exception as e:
        yield f'data: {json.dumps({"token": f"Error al generar respuesta: {e}", "done": False})}\n\n'
        yield f'data: {json.dumps({"sources": [], "done": True})}\n\n'
