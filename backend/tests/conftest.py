# Fixtures condivise. Imposta le env vars PRIMA di importare l'app
# perché pydantic-settings le legge al momento dell'import.
import os
import time

import jwt
import pytest

# Secret di test come base64 (stesso formato di Supabase production).
# Il valore decodificato è "test-supabase-jwt-secret-32chars!!"
_TEST_JWT_SECRET_B64 = "dGVzdC1zdXBhYmFzZS1qd3Qtc2VjcmV0LTMyY2hhcnMhIQ=="
_TEST_JWT_SECRET_RAW = b"test-supabase-jwt-secret-32chars!!"

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", _TEST_JWT_SECRET_B64)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("ENV", "development")
os.environ.setdefault("SUPABASE_WEBHOOK_SECRET", "test-webhook-secret")
os.environ.setdefault("CRON_SECRET", "test-cron-secret")


def make_jwt(
    user_id: str = "550e8400-e29b-41d4-a716-446655440000",
    email: str = "test@tripvote.me",
) -> str:
    """
    Genera un JWT HS256 valido per i test, firmato con i bytes raw del secret
    (come fa auth._get_jwt_secret() in produzione via base64.b64decode).
    """
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "role": "authenticated",
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        },
        _TEST_JWT_SECRET_RAW,
        algorithm="HS256",
    )


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_jwt()}"}
