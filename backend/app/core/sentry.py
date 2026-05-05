import logging

logger = logging.getLogger(__name__)


def init_sentry(dsn: str, environment: str, release: str | None = None) -> None:
    """Inizializza Sentry. Se DSN è vuoto è un no-op (utile in test/dev)."""
    if not dsn:
        logger.info("Sentry DSN non configurato — monitoring disabilitato")
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            release=release,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
        logger.info("Sentry inizializzato (env=%s)", environment)
    except ImportError:
        logger.warning("sentry-sdk non installato, monitoring disabilitato")
