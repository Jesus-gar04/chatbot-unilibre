from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.rag.pipeline import stream_rag_response
from app.utils.rate_limit import chat_limiter

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query")
async def chat_query(request: ChatRequest, req: Request):
    # Obtener IP real (funciona detrás de Render/Vercel proxy)
    client_ip = (
        req.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or req.headers.get("X-Real-IP", "")
        or (req.client.host if req.client else "unknown")
    )

    # Límite: 30 consultas por IP cada 10 minutos → previene abuso de costos LLM
    chat_limiter.check(client_ip)

    history = [m.model_dump() for m in (request.history or [])]
    return StreamingResponse(
        stream_rag_response(request.query, history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
