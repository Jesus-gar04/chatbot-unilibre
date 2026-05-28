from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.chat.router import router as chat_router
from app.admin.router import router as admin_router

app = FastAPI(
    title="RAG Chatbot API",
    description="Chatbot académico con pipeline RAG",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
