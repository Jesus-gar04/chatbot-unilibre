from fastapi import APIRouter, HTTPException, Request, status
from app.models.schemas import LoginRequest, TokenResponse
from app.auth.service import verify_credentials, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, req: Request):
    # Obtener IP real (funciona detrás de proxies como Render/Vercel)
    client_ip = (
        req.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or req.headers.get("X-Real-IP", "")
        or (req.client.host if req.client else "unknown")
    )

    if not verify_credentials(request.username, request.password, client_ip):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    token = create_access_token({"sub": request.username})
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_expire_minutes * 60,
    )
