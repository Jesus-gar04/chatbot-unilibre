import uuid
import os
import tempfile
import traceback

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.service import verify_token
from app.models.schemas import DeleteResponse
from app.rag.document_processor import (
    process_document,
    upload_to_storage,
    delete_from_storage,
    add_document_metadata,
    remove_document_metadata,
    get_all_documents,
    get_document,
    get_format_download_url,
)
from app.rag.pipeline import add_documents_to_store, delete_document_from_store

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

_ALLOWED = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}
MAX_SIZE = 50 * 1024 * 1024  # 50 MB


def require_auth(creds: HTTPAuthorizationCredentials = Depends(security)):
    return verify_token(creds.credentials)


@router.get("/documents")
async def list_documents(auth=Depends(require_auth)):
    return get_all_documents()


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_category: str = Form("manual"),
    auth=Depends(require_auth),
):
    if file.content_type not in _ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de archivo no soportado. Use PDF, DOCX o TXT.",
        )

    if doc_category not in ("manual", "formato"):
        doc_category = "manual"

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo excede el límite de 50 MB.",
        )

    doc_id = str(uuid.uuid4())
    ext = _ALLOWED[file.content_type]

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext)
    try:
        with os.fdopen(tmp_fd, "wb") as tmp:
            tmp.write(content)

        chunks, chunk_count = process_document(tmp_path, doc_id, doc_category)
        add_documents_to_store(chunks, doc_id)
        upload_to_storage(doc_id, ext, content)
        add_document_metadata(
            doc_id=doc_id,
            name=file.filename,
            file_type=ext.lstrip(".").upper(),
            size=len(content),
            chunks=chunk_count,
            doc_category=doc_category,
        )

        return {
            "message": "Documento indexado correctamente",
            "document": get_document(doc_id),
        }

    except Exception as e:
        print(f"[UPLOAD ERROR] {type(e).__name__}: {e}")
        print(traceback.format_exc())
        try:
            delete_document_from_store(doc_id)
        except Exception:
            pass
        try:
            delete_from_storage(doc_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Error al procesar documento: {e}")

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.get("/documents/{doc_id}/download")
async def download_format(doc_id: str):
    """Endpoint público — devuelve URL firmada para descargar un formato."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if doc.get("doc_category") != "formato":
        raise HTTPException(status_code=403, detail="Este documento no es un formato descargable")
    try:
        url = get_format_download_url(doc_id, doc.get("type", "PDF"))
        return {"download_url": url, "name": doc["name"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar enlace de descarga: {e}")


@router.get("/documents/{doc_id}/file-url")
async def get_file_url(doc_id: str, auth=Depends(require_auth)):
    """URL firmada (1 h) para preview o descarga de cualquier documento — solo admin."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    try:
        url = get_format_download_url(doc_id, doc.get("type", "PDF"))
        return {"download_url": url, "name": doc["name"], "type": doc.get("type", "PDF")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar enlace: {e}")


@router.delete("/documents/{doc_id}", response_model=DeleteResponse)
async def delete_document(doc_id: str, auth=Depends(require_auth)):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # 1. Eliminar embeddings de PGVector
    try:
        delete_document_from_store(doc_id)
    except Exception:
        pass

    # 2. Eliminar archivo de Supabase Storage
    delete_from_storage(doc_id)

    # 3. Eliminar metadata de la tabla 'documents'
    remove_document_metadata(doc_id)

    return DeleteResponse(message="Documento eliminado correctamente")
