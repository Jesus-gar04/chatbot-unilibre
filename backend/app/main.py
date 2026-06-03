from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.auth.router import router as auth_router
from app.chat.router import router as chat_router
from app.admin.router import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Resuelve el hostname de la BD a IPv4 en el arranque y lo inyecta en
    pipeline._resolved_db_ip para que _db_url() lo use directamente en la
    cadena de conexión de SQLAlchemy/psycopg2.

    Por qué es necesario: psycopg2 usa libpq (C), que llama al resolver del
    OS (getaddrinfo en C) ignorando el módulo socket de Python. En Render el
    DNS puede fallar con EAI_NONAME (-5) para el hostname directo de Supabase.
    Pasar la IPv4 en la URL evita el lookup completo.
    """
    import socket
    import app.rag.pipeline as _pipeline
    from app.config import settings as _s

    try:
        raw = _s.database_url.strip().strip('"').strip("'")
        host = raw.split("@")[1].split(":")[0] if "@" in raw else ""
        if host:
            results = socket.getaddrinfo(host, 5432, socket.AF_INET)
            if results:
                ipv4 = results[0][4][0]
                _pipeline._resolved_db_ip = ipv4
                print(f"[STARTUP] BD resuelta: {host} → {ipv4} (se usará IPv4 directa)")
    except Exception as e:
        print(f"[STARTUP] Pre-resolución de BD falló: {e} — se usará hostname original")

    yield


app = FastAPI(
    title="RAG Chatbot API — Universidad Libre Barranquilla",
    description="Chatbot académico con pipeline RAG",
    version="1.0.0",
    # Desactivar documentación pública en producción
    docs_url="/docs" if not settings.production else None,
    redoc_url="/redoc" if not settings.production else None,
    openapi_url="/openapi.json" if not settings.production else None,
    lifespan=lifespan,
)

# ── Security headers ─────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"]  = "nosniff"
    response.headers["X-Frame-Options"]         = "DENY"
    response.headers["X-XSS-Protection"]        = "1; mode=block"
    response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()"
    # En producción el servidor (Render/Vercel) ya maneja HSTS vía TLS
    return response

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],   # solo los verbos usados
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}
