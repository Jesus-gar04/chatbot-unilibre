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
    import socket
    from app.config import settings as _s

    _original_getaddrinfo = socket.getaddrinfo
    _patched = False

    try:
        raw = _s.database_url.strip().strip('"').strip("'")
        host = raw.split("@")[1].split(":")[0] if "@" in raw else ""
        if host:
            results = socket.getaddrinfo(host, 5432, socket.AF_INET)
            if results:
                ipv4 = results[0][4][0]
                print(f"[STARTUP] BD resuelta: {host} → {ipv4} (IPv4 cacheado)")

                # Cachear la resolución IPv4 en socket.getaddrinfo para que
                # psycopg2 use siempre IPv4, sin perder el hostname (necesario para SSL/SNI).
                def _patched_getaddrinfo(h, p, family=0, type=0, proto=0, flags=0):
                    if h == host:
                        port = p or 5432
                        return [
                            (socket.AF_INET, socket.SOCK_STREAM, 6,  '', (ipv4, port)),
                            (socket.AF_INET, socket.SOCK_DGRAM,  17, '', (ipv4, port)),
                        ]
                    return _original_getaddrinfo(h, p, family, type, proto, flags)

                socket.getaddrinfo = _patched_getaddrinfo
                _patched = True
    except Exception as e:
        print(f"[STARTUP] Pre-resolución de BD falló: {e} — DNS normal")

    yield

    if _patched:
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
