from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.app.core.config import settings

try:
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=settings.REDIS_URL,
        strategy="moving-window"
    )
except Exception:
    limiter = Limiter(key_func=get_remote_address)
