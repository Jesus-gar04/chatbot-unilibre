import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.chat.router import router as chat_router
from app.admin.router import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Pre-carga el modelo de embeddings al iniciar el servidor.
    Así Render no mata el proceso por inactividad durante la primera
    petición, que era cuando se disparaba la descarga del modelo.
    """
    from app.rag.pipeline import get_embeddings, get_vector_store
    loop = asyncio.get_event_loop()
    # 1. Carga el modelo ONNX de embeddings (~5 s)
    await loop.run_in_executor(None, get_embeddings)
    # 2. Inicializa PGVector: crea las tablas en Supabase si no existen
    await loop.run_in_executor(None, get_vector_store)
    yield


app = FastAPI(
    title="RAG Chatbot API — Universidad Libre Barranquilla",
    description="Chatbot académico con pipeline RAG",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}
