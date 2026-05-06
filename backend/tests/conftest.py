# Fixtures condivise. Imposta le env vars PRIMA di importare l'app
# perché pydantic-settings le legge al momento dell'import.
import os
import time

import jwt
import pytest

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("CLERK_JWKS_URL", "https://test.clerk.accounts.dev/.well-known/jwks.json")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("ENV", "development")
os.environ.setdefault("SUPABASE_WEBHOOK_SECRET", "test-webhook-secret")
os.environ.setdefault("CRON_SECRET", "test-cron-secret")


def make_jwt(user_id: str = "user_test123", email: str = "test@tripvote.me") -> str:
    """
    Genera un JWT RS256 valido per i test usando una chiave effimera.
    Il JWKS client viene mockato nei test che usano auth.
    """
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.asymmetric import rsa

    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        },
        private_key,
        algorithm="RS256",
    )


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_jwt()}"}
