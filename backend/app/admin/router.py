import uuid
import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
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
    file: UploadFile = File(...), auth=Depends(require_auth)
):
    if file.content_type not in _ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de archivo no soportado. Use PDF, DOCX o TXT.",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo excede el límite de 50 MB.",
        )

    doc_id = str(uuid.uuid4())
    ext = _ALLOWED[file.content_type]

    # Guardamos en archivo temporal para poder procesarlo con PyMuPDF / python-docx
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext)
    try:
        with os.fdopen(tmp_fd, "wb") as tmp:
            tmp.write(content)

        # 1. Extraer texto y generar chunks
        chunks, chunk_count = process_document(tmp_path, doc_id)

        # 2. Indexar embeddings en Supabase (PGVector)
        add_documents_to_store(chunks, doc_id)

        # 3. Subir archivo original a Supabase Storage
        upload_to_storage(doc_id, ext, content)

        # 4. Guardar metadata en tabla 'documents' de Supabase
        add_document_metadata(
            doc_id=doc_id,
            name=file.filename,
            file_type=ext.lstrip(".").upper(),
            size=len(content),
            chunks=chunk_count,
        )

        return {
            "message": "Documento indexado correctamente",
            "document": get_document(doc_id),
        }

    except Exception as e:
        # Si algo falla intentamos revertir lo que se haya guardado
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
        # Siempre eliminar el archivo temporal
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


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
