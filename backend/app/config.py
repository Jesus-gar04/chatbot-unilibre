from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── DeepSeek LLM ─────────────────────────────────────────────────────────
    deepseek_api_key: str = ""
    llm_model: str = "deepseek-chat"   # deepseek-chat | deepseek-reasoner

    # ── Admin credentials ─────────────────────────────────────────────────────
    admin_username: str = "admin"
    admin_password: str = "admin123"

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "change-this-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480      # 8 horas

    # ── RAG ───────────────────────────────────────────────────────────────────
    chunk_size: int = 512
    chunk_overlap: int = 64
    retrieval_k: int = 5

    # Voyage AI — https://dash.voyageai.com → API Keys (gratis: 50M tokens/mes)
    # Modelo: voyage-multilingual-2 → español + inglés, 1024 dims
    voyage_api_key: str = ""

    # True → usa fastembed local (solo Docker/dev, requiere: pip install fastembed)
    # False → usa Voyage AI (producción en Render)
    use_local_embeddings: bool = False

    # ── Supabase ──────────────────────────────────────────────────────────────
    # URL del proyecto: https://<project-ref>.supabase.co
    supabase_url: str = ""
    # Service role key (Settings > API > service_role)
    supabase_service_role_key: str = ""
    # Cadena de conexión directa a PostgreSQL (Settings > Database > URI)
    # Ejemplo: postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres
    database_url: str = ""
    # Nombre del bucket de Storage (créalo en Supabase como "documents", privado)
    storage_bucket: str = "documents"

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    # ── Producción ────────────────────────────────────────────────────────────
    # True → desactiva /docs y /redoc (recomendado en producción)
    production: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
