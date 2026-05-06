# Configurazione globale dell'applicazione via pydantic-settings.
# Tutte le variabili d'ambiente sono lette da qui — mai os.getenv sparsi nel codice.
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Ambiente
    ENV: str = "production"

    # Supabase (DB + storage + realtime — auth gestita da Clerk)
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_WEBHOOK_SECRET: str = ""

    # Clerk — auth provider. JWKS URL per verificare i JWT del FE.
    # Trovalo su: Clerk Dashboard → API Keys → Advanced → JWKS URL
    # Formato: https://<your-clerk-id>.clerk.accounts.dev/.well-known/jwks.json
    CLERK_JWKS_URL: str

    # Redis
    REDIS_URL: str

    # SendGrid
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@tripvote.me"

    # Sentry
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"

    # Parametri match (overridabili per board via match_config jsonb)
    MATCH_QUORUM_THRESHOLD: float = 0.5
    MATCH_SCORE_THRESHOLD: float = 0.7
    MATCH_YES_WEIGHT: float = 1.0
    MATCH_MAYBE_WEIGHT: float = 0.5
    MATCH_NO_WEIGHT: float = 0.0

    # Cron job
    CRON_SECRET: str = ""

    @field_validator("MATCH_QUORUM_THRESHOLD", "MATCH_SCORE_THRESHOLD")
    @classmethod
    def _check_threshold(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("threshold deve essere in [0, 1]")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Singleton globale — usare get_settings() nei test per override
settings: Settings = get_settings()
