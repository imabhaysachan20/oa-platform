from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.app.core.config import settings


def get_real_client_ip(request: Request) -> str:
    """Extract real client IP behind Nginx reverse-proxy from X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return get_remote_address(request)


try:
    limiter = Limiter(
        key_func=get_real_client_ip,
        storage_uri=settings.REDIS_URL,
        strategy="moving-window"
    )
except Exception:
    limiter = Limiter(key_func=get_real_client_ip)

