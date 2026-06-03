from pydantic import BaseModel, field_validator
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username", "password")
    @classmethod
    def no_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El campo no puede estar vacío")
        if len(v) > 128:
            raise ValueError("Campo demasiado largo")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class HistoryMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("user", "assistant"):
            raise ValueError("Rol inválido")
        return v

    @field_validator("content")
    @classmethod
    def truncate_content(cls, v: str) -> str:
        # Limitar cada mensaje del historial a 2 000 caracteres
        return v[:2000]


class ChatRequest(BaseModel):
    query: str
    history: Optional[List[HistoryMessage]] = []

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La consulta no puede estar vacía")
        if len(v) > 1500:
            raise ValueError("La consulta supera el límite de 1 500 caracteres")
        return v

    @field_validator("history")
    @classmethod
    def limit_history(cls, v: Optional[List]) -> List:
        # Máximo 10 turnos de contexto — evita abuso de tokens LLM
        if v and len(v) > 10:
            return v[-10:]
        return v or []


class Source(BaseModel):
    document: str
    page: Optional[int] = None


class FormatInfo(BaseModel):
    doc_id: str
    name: str
    download_url: str


class DocumentInfo(BaseModel):
    id: str
    name: str
    type: str
    size: int
    chunks: int
    upload_date: str
    status: str
    doc_category: str = "manual"


class UploadResponse(BaseModel):
    message: str
    document: DocumentInfo


class DeleteResponse(BaseModel):
    message: str
