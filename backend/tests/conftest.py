# Fixtures condivise. Imposta le env vars PRIMA di importare l'app
# perché pydantic-settings le legge al momento dell'import.
import os
import time

import jwt
import pytest

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-32bytes-padding!!")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("ENV", "development")
os.environ.setdefault("SUPABASE_WEBHOOK_SECRET", "test-webhook-secret")
os.environ.setdefault("CRON_SECRET", "test-cron-secret")

JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]


def make_jwt(user_id: str = "user-test-123", email: str = "test@tripvote.me") -> str:
    """Genera un JWT valido per i test."""
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        },
        JWT_SECRET,
        algorithm="HS256",
    )


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_jwt()}"}
