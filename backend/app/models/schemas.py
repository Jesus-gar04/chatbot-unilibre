from pydantic import BaseModel
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class HistoryMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    query: str
    history: Optional[List[HistoryMessage]] = []


class Source(BaseModel):
    document: str
    page: Optional[int] = None


class DocumentInfo(BaseModel):
    id: str
    name: str
    type: str
    size: int
    chunks: int
    upload_date: str
    status: str


class UploadResponse(BaseModel):
    message: str
    document: DocumentInfo


class DeleteResponse(BaseModel):
    message: str
