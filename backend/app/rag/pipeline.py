import json
from typing import List, Optional, AsyncGenerator

from langchain_community.vectorstores import PGVector
from langchain.schema import Document, HumanMessage
from langchain.schema.embeddings import Embeddings

from app.config import settings

_embeddings: Optional[Embeddings] = None
_vector_store: Optional[PGVector] = None
_resolved_db_ip: str = ""   # set by main.py lifespan after IPv4 lookup


# ── Embeddings ───────────────────────────────────────────────────────────────
#
# USE_LOCAL_EMBEDDINGS=true  → _LocalEmbeddings (fastembed/ONNX)
#                               Requiere: pip install fastembed  (NO está en requirements.txt)
#                               Solo para desarrollo local con Docker/mucha RAM.
#
# USE_LOCAL_EMBEDDINGS=false → _VoyageEmbeddings (Voyage AI API)
#                               Modelo: voyage-multilingual-2 → español + inglés, 1024 dims
#                               Gratis: 50M tokens/mes — https://dash.voyageai.com


class _LocalEmbeddings(Embeddings):
    """Embeddings locales con fastembed (ONNX). Solo para desarrollo local."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from fastembed import TextEmbedding
        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [e.tolist() for e in self._model.embed(texts)]

    def embed_query(self, text: str) -> List[float]:
        return next(self._model.embed([text])).tolist()


class _VoyageEmbeddings(Embeddings):
    """
    Embeddings vía Voyage AI.
    Modelo voyage-multilingual-2: español nativo, 1024 dims, 50M tokens/mes gratis.
    Registrate en https://dash.voyageai.com para obtener una API key gratuita.
    """

    _URL = "https://api.voyageai.com/v1/embeddings"
    _MODEL = "voyage-multilingual-2"
    _BATCH = 128   # Voyage acepta hasta 128 textos por llamada

    def __init__(self, api_key: str):
        import httpx
        self._client = httpx.Client(timeout=60.0)
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def _call(self, texts: List[str], input_type: str) -> List[List[float]]:
        r = self._client.post(
            self._URL,
            json={"input": texts, "model": self._MODEL, "input_type": input_type},
            headers=self._headers,
        )
        r.raise_for_status()
        data = sorted(r.json()["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in data]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        result = []
        for i in range(0, len(texts), self._BATCH):
            result.extend(self._call(texts[i : i + self._BATCH], "document"))
        return result

    def embed_query(self, text: str) -> List[float]:
        return self._call([text], "query")[0]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _db_url() -> str:
    """
    Convierte la DATABASE_URL de Supabase al formato que necesita SQLAlchemy
    con psycopg2 y SSL habilitado.

    El hostname NO se sustituye aquí — se mantiene para que SSL/SNI funcione
    correctamente con el Supabase Pooler. El bypass de DNS se hace a nivel de
    libpq con el parámetro 'hostaddr' en connect_args (ver get_vector_store).
    """
    url = settings.database_url
    if not url:
        raise RuntimeError("DATABASE_URL no está configurada en .env")

    url = url.strip().strip('"').strip("'")

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if "sslmode" not in url:
        sep = "&" if "?" in url else "?"
        url += f"{sep}sslmode=require"
    return url


# ── Singletons ───────────────────────────────────────────────────────────────

def get_embeddings() -> Embeddings:
    """
    Devuelve el proveedor de embeddings según USE_LOCAL_EMBEDDINGS:
      True  → fastembed local (solo Docker/dev, instalar manualmente)
      False → Voyage AI API (producción, gratis, multilingüe)
    """
    global _embeddings
    if _embeddings is None:
        if settings.use_local_embeddings:
            _embeddings = _LocalEmbeddings()
        else:
            if not settings.voyage_api_key:
                raise RuntimeError(
                    "VOYAGE_API_KEY no está configurada. "
                    "Regístrate gratis en https://dash.voyageai.com y añade la key al .env"
                )
            _embeddings = _VoyageEmbeddings(api_key=settings.voyage_api_key)
    return _embeddings


def get_vector_store() -> PGVector:
    """
    Devuelve la instancia de PGVector, creándola solo en la primera llamada.

    Se usa NullPool para no mantener conexiones inactivas en RAM
    (ideal para Render free tier 512 MB): cada operación de BD abre y cierra
    su propia conexión TCP, pero el objeto PGVector se reutiliza entre requests
    para evitar re-verificar las tablas de la colección en cada consulta.

    Si _resolved_db_ip está cargado, se pasa como 'hostaddr' en connect_args
    para saltarse el DNS lookup de libpq y preservar el hostname en la URL
    para SSL/SNI del Supabase Pooler.
    """
    global _vector_store
    if _vector_store is not None:
        return _vector_store

    from sqlalchemy.pool import NullPool
    engine_args: dict = {"poolclass": NullPool}
    if _resolved_db_ip:
        engine_args["connect_args"] = {"hostaddr": _resolved_db_ip}
        print(f"[DB] Conectando vía hostaddr={_resolved_db_ip} (DNS bypass, SNI preservado)")

    _vector_store = PGVector(
        connection_string=_db_url(),
        embedding_function=get_embeddings(),
        collection_name="rag_unilibre",
        pre_delete_collection=False,
        engine_args=engine_args,
    )
    return _vector_store


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

def add_documents_to_store(chunks: List[Document]):
    """Añade los chunks de un documento al índice vectorial en Supabase."""
    store = get_vector_store()
    store.add_documents(chunks)


def delete_document_from_store(doc_id: str):
    """
    Elimina todos los chunks de un documento filtrando por el campo
    'doc_id' guardado en la columna JSONB 'cmetadata' de PGVector.
    """
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool
    create_kwargs: dict = {"poolclass": NullPool}
    if _resolved_db_ip:
        create_kwargs["connect_args"] = {"hostaddr": _resolved_db_ip}
    engine = create_engine(_db_url(), **create_kwargs)
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
    except Exception as e:
        print(f"[RAG ERROR] retrieve_context falló — {type(e).__name__}: {e}")
        return []


# ── Prompt ───────────────────────────────────────────────────────────────────

_PROMPT = """\
Eres Lara, la asistente virtual de la Universidad Libre Seccional Barranquilla.
Eres cercana, empática y genuinamente quieres ayudar a cada estudiante o miembro
de la comunidad que te escribe. Hablas como una persona real: con naturalidad,
calidez y sin sonar a manual corporativo, pero siempre con el profesionalismo
que representa a la universidad.

CÓMO RESPONDER:
- Empieza reconociendo la pregunta de forma natural antes de responder
  (ej: "¡Claro!", "Qué buena pregunta,", "Con gusto te explico,", "Mira,")
- Usa un lenguaje conversacional: frases cortas, conectores naturales, sin
  tecnicismos innecesarios. Como si le estuvieras explicando a un amigo.
- Si la respuesta tiene varios pasos o puntos, preséntala de forma ordenada
  pero sin abusar de listas frías — intercala frases de conexión entre los puntos.
- Puedes cerrar con una frase de apoyo corta si es natural
  (ej: "¡Éxitos en tu trámite!", "Cualquier otra duda, con gusto te ayudo.")
- Varía tu forma de iniciar: no empieces siempre igual.

LÍMITES ESTRICTOS (sin excepción):
1. Usa ÚNICAMENTE la información del CONTEXTO. Jamás inventes datos, fechas,
   artículos, requisitos ni procedimientos que no estén ahí.
2. Nunca menciones de qué documento o archivo proviene la información.
3. Si el contexto incluye un FORMATO DESCARGABLE relevante, explica para qué
   sirve y cómo diligenciarlo, e indica que el enlace de descarga aparecerá
   justo aquí en el chat.
4. Si la información NO está en el contexto, derívalo amablemente sin inventar
   nada — usa una respuesta como la del ejemplo al final.
5. Responde siempre en español.

CONTEXTO:
{context}

HISTORIAL:
{history}

PREGUNTA:
{question}

RESPUESTA:"""

_NO_INFO = (
    "Mmm, esa información en particular no la tengo disponible en este momento. "
    "Lo mejor es que te acerques directamente a la Secretaría de la universidad, "
    "o le escribas a Iván Quintero a ivan.quintero@unilibre.edu.co — "
    "él te puede orientar con mucho gusto. 😊"
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
