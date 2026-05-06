import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Connessione lazy: creata al primo utilizzo, non nel lifespan.
# Necessario per Vercel serverless dove il lifespan viene eseguito ad ogni
# cold start e una connessione bloccante causerebbe timeout di startup.
_redis_client: aioredis.Redis | None = None


async def init_redis() -> None:
    """
    Crea il client Redis (senza ping bloccante).
    Su Vercel serverless viene chiamato nel lifespan ma non aspetta
    la connessione effettiva — quella avviene al primo comando.
    """
    global _redis_client
    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
    )
    logger.info("Redis client inizializzato (connessione lazy)")


async def close_redis() -> None:
    """Chiude il client Redis se aperto."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


def get_redis() -> aioredis.Redis:
    """
    Restituisce il client Redis.
    Crea il client on-the-fly se non ancora inizializzato
    (es. primo invocation su Vercel dopo cold start).
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    return _redis_client
