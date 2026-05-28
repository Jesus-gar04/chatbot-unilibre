from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.rag.pipeline import stream_rag_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query")
async def chat_query(request: ChatRequest):
    history = [m.model_dump() for m in (request.history or [])]
    return StreamingResponse(
        stream_rag_response(request.query, history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
