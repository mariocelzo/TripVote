import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Client creato nel lifespan, non al module level, per non aprire connessioni nelle importazioni.
_redis_client: aioredis.Redis | None = None


async def init_redis() -> None:
    """Apre la connessione Redis. Chiamare nel lifespan di FastAPI."""
    global _redis_client
    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    await _redis_client.ping()
    logger.info("Redis connesso")


async def close_redis() -> None:
    """Chiude la connessione Redis."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


def get_redis() -> aioredis.Redis:
    """Restituisce il client Redis. Lancia RuntimeError se non inizializzato."""
    if _redis_client is None:
        raise RuntimeError("Redis non inizializzato — chiamare init_redis() nel lifespan")
    return _redis_client
