import os
import time

from fastapi import APIRouter

router = APIRouter()

_START_TIME = time.time()
# APP_VERSION viene iniettato dal Dockerfile come variabile d'ambiente
APP_VERSION = os.getenv("APP_VERSION", "dev")


@router.get("/health", tags=["ops"])
async def health() -> dict:
    """Health check usato da Caddy e dal workflow CI. Non richiede autenticazione."""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "uptime_seconds": int(time.time() - _START_TIME),
    }
