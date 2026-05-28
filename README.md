# Chatbot RAG Académico

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
   │  ChromaDB   │           │  HuggingFace      │
   │  (FAISS-    │           │  Embeddings       │
   │   backed)   │           │  all-MiniLM-L6-v2 │
   └─────────────┘           └──────────────────┘
```

## Requisitos previos

- Python 3.11+
- Node.js 20+
- Docker + Docker Compose (para despliegue en contenedor)
- API key de OpenAI **o** Anthropic

## Instalación rápida (desarrollo local)

### 1. Clonar y configurar variables de entorno

```bash
cp .env.example backend/.env
# Editar backend/.env con tu API key y credenciales de admin
```

### 2. Backend

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

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

## Despliegue con Docker Compose

```bash
# Asegúrese de tener backend/.env configurado
docker compose up --build -d

# Ver logs
docker compose logs -f

# Detener
docker compose down
```

## Configuración (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `LLM_PROVIDER` | Proveedor LLM | `openai` \| `anthropic` |
| `LLM_MODEL` | Modelo a usar | `gpt-4o` \| `claude-sonnet-4-6` |
| `OPENAI_API_KEY` | API key OpenAI | `sk-...` |
| `ANTHROPIC_API_KEY` | API key Anthropic | `sk-ant-...` |
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
Escriba su pregunta en lenguaje natural. El bot responde con contexto de los documentos cargados e indica la fuente (nombre del archivo + página).

### Panel de administración
Acceda a `http://localhost:5173/admin`.  
Ingrese con las credenciales configuradas en `.env`.  
Desde el panel puede:
- **Cargar documentos** (PDF, DOCX, TXT — máx. 50 MB) arrastrando al área de carga
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
│   │   │   ├── pipeline.py    # ChromaDB + LLM + stream
│   │   │   └── document_processor.py  # PDF/DOCX/TXT → chunks
│   │   └── models/schemas.py  # Pydantic models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/             # ChatPage, AdminLogin, AdminDashboard
│       ├── components/        # chat/, admin/, layout/
│       ├── api/client.js      # axios + SSE stream helper
│       └── store/authStore.js # Zustand — token en memoria
├── docker-compose.yml
└── README.md
```

## Decisiones de arquitectura

- **ChromaDB** sobre FAISS: soporta borrado por metadatos (`doc_id`) sin reconstruir el índice.
- **SSE sobre WebSocket**: más simple para streaming unidireccional; funciona con `fetch` nativo.
- **JWT en memoria (Zustand)**: el token del secretario nunca toca `localStorage` — se pierde al cerrar la pestaña, comportamiento correcto para un panel administrativo.
- **Embeddings locales** (`all-MiniLM-L6-v2`): sin costo por embedding, funciona offline, suficiente para corpus de tamaño académico.
- **Un solo worker Uvicorn**: evita condiciones de carrera en la escritura del vector store y el JSON de metadatos sin necesidad de un lock externo.
