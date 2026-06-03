import secrets
from datetime import datetime, timedelta

from jose import jwt, JWTError
from fastapi import HTTPException, status

from app.config import settings
from app.utils.rate_limit import login_limiter


def _clear_login_attempts(ip: str) -> None:
    """Limpiar contador al loguearse correctamente."""
    login_limiter._log.pop(ip, None)


# ── Auth ──────────────────────────────────────────────────────────────────────

def verify_credentials(username: str, password: str, client_ip: str = "unknown") -> bool:
    """
    Comparación en tiempo constante para evitar timing attacks.
    Registra el intento antes de verificar (se limpia si es exitoso).
    """
    login_limiter.check(client_ip)

    username_ok = secrets.compare_digest(
        username.encode("utf-8"),
        settings.admin_username.encode("utf-8"),
    )
    password_ok = secrets.compare_digest(
        password.encode("utf-8"),
        settings.admin_password.encode("utf-8"),
    )
    ok = username_ok and password_ok

    if ok:
        _clear_login_attempts(client_ip)
    return ok


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
