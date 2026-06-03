import json
from typing import List, AsyncGenerator

from langchain_community.vectorstores import PGVector
from langchain.schema import Document, HumanMessage
from langchain.schema.embeddings import Embeddings

from app.config import settings

_embeddings = None


# ── Embeddings: dos implementaciones según el entorno ────────────────────────
#
# USE_LOCAL_EMBEDDINGS=true  → _LocalEmbeddings (fastembed/ONNX, para Docker local)
#                               Sin límite de red. Dev machine tiene RAM de sobra.
#
# USE_LOCAL_EMBEDDINGS=false → _HFEmbeddings (HuggingFace Inference API)
#                               Sin modelo local. Cabe en Render free tier 512 MB.

class _LocalEmbeddings(Embeddings):
    """Embeddings locales con fastembed (ONNX). Úsalo en Docker/desarrollo."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from fastembed import TextEmbedding
        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [e.tolist() for e in self._model.embed(texts)]

    def embed_query(self, text: str) -> List[float]:
        return next(self._model.embed([text])).tolist()


class _HFEmbeddings(Embeddings):
    """Embeddings vía HuggingFace Inference API. Sin modelo local (Render/prod)."""

    _URL = (
        "https://api-inference.huggingface.co"
        "/pipeline/feature-extraction"
        "/sentence-transformers/all-MiniLM-L6-v2"
    )

    def __init__(self, api_key: str = ""):
        import httpx
        self._client = httpx.Client(timeout=90.0)
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    def _call(self, texts: List[str]) -> List[List[float]]:
        r = self._client.post(
            self._URL,
            json={"inputs": texts, "options": {"wait_for_model": True}},
            headers=self._headers,
        )
        r.raise_for_status()
        return r.json()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        result = []
        for i in range(0, len(texts), 32):
            result.extend(self._call(texts[i : i + 32]))
        return result

    def embed_query(self, text: str) -> List[float]:
        return self._call([text])[0]


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

def get_embeddings() -> Embeddings:
    """
    Devuelve el proveedor de embeddings según USE_LOCAL_EMBEDDINGS:
      True  → fastembed local (Docker/dev, sin límite de red)
      False → HuggingFace API  (Render/prod, sin modelo local)
    """
    global _embeddings
    if _embeddings is None:
        if settings.use_local_embeddings:
            _embeddings = _LocalEmbeddings()
        else:
            _embeddings = _HFEmbeddings(api_key=settings.hf_api_key)
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


# ── Prompt ───────────────────────────────────────────────────────────────────

_PROMPT = """\
Eres Lara, la asistente virtual de la Universidad Libre Seccional Barranquilla.
Tu propósito es acompañar a estudiantes y comunidad académica con calidez y precisión
en sus consultas sobre procesos académicos, administrativos y reglamentarios.

REGLAS (sin excepción):
1. Responde ÚNICAMENTE con la información que aparezca en el CONTEXTO proporcionado.
   Jamás inventes datos, fechas, artículos, requisitos ni procedimientos.
2. Usa un tono cálido, cercano y humano — como si genuinamente quisieras ayudar.
   Evita sonar frío, robótico o excesivamente formal.
3. Nunca menciones de qué documento o archivo proviene la información.
4. Si el contexto incluye un FORMATO DESCARGABLE relevante para la pregunta,
   explica para qué sirve y cómo diligenciarlo según las instrucciones del contexto,
   e indica que puede descargarlo a través del enlace que aparecerá en el chat.
5. Si la información solicitada NO está en el contexto, responde exactamente:
   "¡Esa información no la tengo disponible por el momento! Te recomiendo acercarte \
a la Secretaría de la universidad o escribirle a Iván Quintero \
(ivan.quintero@unilibre.edu.co) — él con gusto te orientará."
6. Responde siempre en español.

CONTEXTO:
{context}

HISTORIAL:
{history}

PREGUNTA:
{question}

RESPUESTA:"""

_NO_INFO = (
    "¡Esa información no la tengo disponible por el momento! "
    "Te recomiendo acercarte a la Secretaría de la Universidad Libre "
    "Seccional Barranquilla, o escribirle directamente a "
    "Iván Quintero al correo ivan.quintero@unilibre.edu.co — "
    "él con gusto te orientará. 😊"
)


def _build_formato_download_info(context_docs: List[Document]) -> List[dict]:
    """Genera la lista de formatos descargables a partir de los chunks recuperados."""
    from app.rag.document_processor import get_document, get_format_download_url

    seen_ids: set = set()
    formats: List[dict] = []

    for d in context_docs:
        if d.metadata.get("doc_category") != "formato":
            continue
        doc_id = d.metadata.get("doc_id")
        if not doc_id or doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)
        try:
            doc_meta = get_document(doc_id)
            file_type = doc_meta.get("type", "PDF") if doc_meta else "PDF"
            download_url = get_format_download_url(doc_id, file_type)
            formats.append({
                "doc_id": doc_id,
                "name": d.metadata.get("source", "Formato"),
                "download_url": download_url,
            })
        except Exception:
            pass

    return formats


# ── Streaming ────────────────────────────────────────────────────────────────

async def stream_rag_response(
    query: str, history: list
) -> AsyncGenerator[str, None]:

    context_docs = retrieve_context(query)

    if not context_docs:
        yield f'data: {json.dumps({"token": _NO_INFO, "done": False})}\n\n'
        yield f'data: {json.dumps({"formats": [], "done": True})}\n\n'
        return

    # Construir contexto: manuales como texto plano, formatos con marcador
    context_parts = []
    for d in context_docs:
        if d.metadata.get("doc_category") == "formato":
            context_parts.append(
                f"[FORMATO DESCARGABLE: {d.metadata.get('source', 'formato')}]\n{d.page_content}"
            )
        else:
            context_parts.append(d.page_content)
    context_text = "\n\n---\n\n".join(context_parts)

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

    # Generar URLs de descarga para formatos recuperados
    formats = _build_formato_download_info(context_docs)

    llm = get_llm()
    try:
        async for chunk in llm.astream([HumanMessage(content=prompt)]):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                yield f'data: {json.dumps({"token": token, "done": False})}\n\n'
        yield f'data: {json.dumps({"formats": formats, "done": True})}\n\n'
    except Exception as e:
        yield f'data: {json.dumps({"token": f"Error al generar respuesta: {e}", "done": False})}\n\n'
        yield f'data: {json.dumps({"formats": [], "done": True})}\n\n'
