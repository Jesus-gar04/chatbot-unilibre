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
    Pre-resuelve hostnames problemáticos en el arranque (cuando el DNS de Render
    es más estable) y aplica dos estrategias distintas según la librería:

    • BD / psycopg2 (usa libpq en C, ignora socket de Python):
      → Guarda la IPv4 en pipeline._resolved_db_ip para inyectarla como
        'hostaddr' en connect_args de SQLAlchemy.  El hostname original se
        mantiene en la URL para que SSL/SNI funcione con el Supabase Pooler.

    • HuggingFace API / httpx (usa socket de Python):
      → Parchea socket.getaddrinfo para devolver la IPv4 pre-resuelta.
        httpx respeta el parche y además envía el hostname original como SNI
        (lo toma de la URL, no del resultado DNS), así que HTTPS funciona.
    """
    import socket
    import app.rag.pipeline as _pipeline
    from app.config import settings as _s

    _original_getaddrinfo = socket.getaddrinfo
    _overrides: dict = {}   # hostname → ipv4 para el parche de socket

    # ── 1. BD: hostaddr para psycopg2/libpq ──────────────────────────────────
    try:
        raw = _s.database_url.strip().strip('"').strip("'")
        db_host = raw.split("@")[1].split(":")[0] if "@" in raw else ""
        if db_host:
            res = _original_getaddrinfo(db_host, 5432, socket.AF_INET)
            if res:
                ipv4 = res[0][4][0]
                _pipeline._resolved_db_ip = ipv4
                print(f"[STARTUP] BD resuelta: {db_host} → {ipv4}")
    except Exception as e:
        print(f"[STARTUP] Pre-resolución BD falló: {e}")

    # ── 2. HuggingFace API: parche socket para httpx ──────────────────────────
    _HF_HOST = "api-inference.huggingface.co"
    try:
        res = _original_getaddrinfo(_HF_HOST, 443, socket.AF_INET)
        if res:
            hf_ipv4 = res[0][4][0]
            _overrides[_HF_HOST] = hf_ipv4
            print(f"[STARTUP] HF API resuelta: {_HF_HOST} → {hf_ipv4}")
    except Exception as e:
        print(f"[STARTUP] Pre-resolución HF API falló: {e}")

    # ── 3. Aplicar parche socket.getaddrinfo (solo para los hosts en _overrides) ─
    if _overrides:
        def _patched_getaddrinfo(h, p, family=0, type=0, proto=0, flags=0):
            if h in _overrides:
                port = p if p else 443
                ip = _overrides[h]
                return [
                    (socket.AF_INET, socket.SOCK_STREAM, 6,  "", (ip, port)),
                    (socket.AF_INET, socket.SOCK_DGRAM,  17, "", (ip, port)),
                ]
            return _original_getaddrinfo(h, p, family, type, proto, flags)

        socket.getaddrinfo = _patched_getaddrinfo
        print(f"[STARTUP] DNS cacheado para: {list(_overrides.keys())}")

    yield

    # Restaurar al apagar
    if _overrides:
        socket.getaddrinfo = _original_getaddrinfo


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
