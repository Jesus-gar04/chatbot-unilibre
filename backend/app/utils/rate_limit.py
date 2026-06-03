"""
Rate limiter de ventana deslizante en memoria.
Sin dependencias externas — suficiente para un servidor de instancia única (Render free).
"""
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import HTTPException, status


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int, label: str = ""):
        self.max_requests  = max_requests
        self.window        = window_seconds
        self.label         = label
        self._log: dict    = defaultdict(list)

    def check(self, key: str) -> None:
        """Lanza 429 si la clave superó el límite. Llama antes de procesar."""
        now    = datetime.utcnow()
        cutoff = now - timedelta(seconds=self.window)
        self._log[key] = [t for t in self._log[key] if t > cutoff]

        if len(self._log[key]) >= self.max_requests:
            mins = self.window // 60
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Has enviado demasiadas consultas seguidas. "
                    f"Espera {mins} minuto{'s' if mins != 1 else ''} e intenta de nuevo."
                ),
                headers={"Retry-After": str(self.window)},
            )
        self._log[key].append(now)


# ── Instancias globales ───────────────────────────────────────────────────────

# Login: 5 intentos / 5 min por IP  (anti brute-force)
login_limiter = RateLimiter(max_requests=5,  window_seconds=300,  label="login")

# Chat: 30 consultas / 10 min por IP (anti abuso de costos LLM)
chat_limiter  = RateLimiter(max_requests=30, window_seconds=600,  label="chat")
