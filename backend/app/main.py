import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.redis import close_redis, init_redis
from app.core.sentry import init_sentry

configure_logging("DEBUG" if settings.ENV == "development" else "INFO")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Avvio e spegnimento controllati delle risorse (Redis, Sentry).
    Il cron notturno è gestito da Vercel Cron Jobs → chiama
    POST /internal/cron/close-expired-boards con Authorization Bearer.
    """
    init_sentry(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=os.getenv("APP_VERSION", "dev"),
    )
    # Redis: degrada gracefully su Vercel serverless se la connessione fallisce —
    # i servizi che usano Redis hanno già il proprio try/except.
    try:
        await init_redis()
    except Exception as exc:
        logger.warning("Redis non disponibile all'avvio (degraded): %s", exc)
    logger.info("TripVote API avviata (env=%s)", settings.ENV)

    yield

    await close_redis()
    logger.info("TripVote API fermata")


app = FastAPI(
    title="TripVote API",
    version="1.0.0",
    # Docs solo in development — non esporre Swagger in produzione
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# CORS — mai allow_origins=["*"] con allow_credentials=True (vedi SECURITY.md)
_ALLOWED_ORIGINS = [
    "https://tripvote.me",
    "https://www.tripvote.me",
    "https://*.vercel.app",
]
if settings.ENV == "development":
    _ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)

# Routers — import in fondo per evitare circular import con il lifespan
from app.api import boards as boards_router  # noqa: E402
from app.api import health as health_router  # noqa: E402
from app.api import internal as internal_router  # noqa: E402
from app.api import notifications as notifications_router  # noqa: E402
from app.api import proposals as proposals_router  # noqa: E402

app.include_router(health_router.router)
app.include_router(proposals_router.router, prefix="/proposals", tags=["proposals"])
app.include_router(boards_router.router, prefix="/boards", tags=["boards"])
app.include_router(notifications_router.router, prefix="/notifications", tags=["notifications"])
app.include_router(internal_router.router, prefix="/internal", tags=["internal"])
