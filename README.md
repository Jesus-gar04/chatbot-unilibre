# Chatbot RAG Académico — Unilibre Barranquilla

Chatbot de Retrieval-Augmented Generation para consultas académicas institucionales.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)  :5173              │
│  /            → Chatbot público (sin auth)              │
│  /admin       → Login secretaría (JWT en memoria)       │
│  /admin/dashboard → Panel de gestión de documentos      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────▼─────────────────────────────────┐
│  Backend (FastAPI + LangChain)  :8000                   │
│  POST /auth/login                                       │
│  POST /chat/query         → streaming SSE               │
│  GET/POST/DELETE /admin/* → JWT protected               │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          │                            │
   ┌──────▼──────┐           ┌─────────▼────────┐
   │  Supabase   │           │  Voyage AI        │
   │  PGVector   │           │  Embeddings       │
   │  (pgvector) │           │  voyage-multi-2   │
   └─────────────┘           └──────────────────┘
```

## Requisitos previos

- Python 3.11+
- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- API key de [Voyage AI](https://dash.voyageai.com) (gratuita, 50M tokens/mes)
- API key de [DeepSeek](https://platform.deepseek.com) (LLM)

## Instalación rápida (desarrollo local)

### 1. Clonar y configurar variables de entorno

```bash
cp .env.example backend/.env
# Editar backend/.env con tus API keys y credenciales
```

### 2. Base de datos (Supabase)

1. Crear un proyecto nuevo en [app.supabase.com](https://app.supabase.com)
2. Ejecutar `schema.sql` en el SQL Editor de Supabase
3. Crear bucket `documents` (privado) en Storage
4. Copiar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` al `.env`

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

El backend estará disponible en `http://localhost:8000`.  
Documentación interactiva: `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

## Configuración (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DEEPSEEK_API_KEY` | API key DeepSeek | `sk-...` |
| `LLM_MODEL` | Modelo a usar | `deepseek-chat` |
| `VOYAGE_API_KEY` | API key Voyage AI (embeddings) | `pa-...` |
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role de Supabase | `eyJ...` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://postgres:...` |
| `STORAGE_BUCKET` | Bucket de Supabase Storage | `documents` |
| `ADMIN_USERNAME` | Usuario del secretario | `secretaria` |
| `ADMIN_PASSWORD` | Contraseña del secretario | `...` |
| `JWT_SECRET_KEY` | Clave para firmar JWT | `openssl rand -hex 32` |
| `JWT_EXPIRE_MINUTES` | Duración de sesión admin | `480` (8 h) |
| `CHUNK_SIZE` | Tamaño de chunk en tokens | `512` |
| `CHUNK_OVERLAP` | Overlap entre chunks | `64` |
| `RETRIEVAL_K` | Chunks a recuperar por query | `5` |

## Uso

### Chatbot público
Acceda a `http://localhost:5173` — sin login, sin registro.  
Escriba su pregunta en lenguaje natural.

### Panel de administración
Acceda a `http://localhost:5173/admin`.  
Ingrese con las credenciales configuradas en `.env`.  
Desde el panel puede:
- **Cargar documentos** (PDF, DOCX, TXT — máx. 50 MB) arrastrando al área de carga
- **Categorizar** como *manual* (contexto) o *formato* (descargable por los estudiantes)
- **Ver** todos los documentos indexados con su estado y número de chunks
- **Eliminar** un documento del vector store (con confirmación)

## Estructura del proyecto

```
CHATBOT/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── auth/              # JWT login
│   │   ├── chat/              # Endpoint de streaming SSE
│   │   ├── admin/             # Upload / list / delete (protegido)
│   │   ├── rag/
│   │   │   ├── pipeline.py    # PGVector + Voyage AI + DeepSeek stream
│   │   │   └── document_processor.py  # PDF/DOCX/TXT → chunks
│   │   └── models/schemas.py  # Pydantic models
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── start.sh
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/             # ChatPage, AdminLogin, AdminDashboard
│       ├── components/        # chat/, admin/, layout/
│       ├── api/client.js      # axios + SSE stream helper
│       └── store/authStore.js # Zustand — token en memoria
├── schema.sql
└── README.md
```

## Decisiones de arquitectura

- **PGVector sobre Supabase**: soporta borrado por metadatos (`doc_id`) y elimina la necesidad de una base de datos separada.
- **Voyage AI `voyage-multilingual-2`**: modelo multilingüe optimizado para español, 50M tokens/mes gratis, 1024 dimensiones.
- **SSE sobre WebSocket**: más simple para streaming unidireccional; funciona con `fetch` nativo.
- **JWT en memoria (Zustand)**: el token del secretario nunca toca `localStorage` — se pierde al cerrar la pestaña, comportamiento correcto para un panel administrativo.
- **Un solo worker Uvicorn**: evita condiciones de carrera en el vector store sin necesidad de un lock externo.
