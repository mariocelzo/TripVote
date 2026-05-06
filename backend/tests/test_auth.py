import time
from unittest.mock import MagicMock

import jwt
import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

# Genera una coppia RSA usa-e-getta per i test (stessa cosa che fa Clerk)
_PRIVATE_KEY = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend(),
)
_PUBLIC_KEY = _PRIVATE_KEY.public_key()


def _make_token(
    sub: str = "user_clerk123",
    email: str = "test@example.com",
    exp_offset: int = 3600,
) -> str:
    """Genera un JWT RS256 firmato con la chiave di test."""
    payload = {
        "sub": sub,
        "email": email,
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, _PRIVATE_KEY, algorithm="RS256")


@pytest.fixture(autouse=True)
def _mock_jwks(monkeypatch):
    """
    Mocka il JWKS client per restituire la chiave pubblica di test
    senza fare chiamate HTTP a Clerk.
    """
    mock_signing_key = MagicMock()
    mock_signing_key.key = _PUBLIC_KEY

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = mock_signing_key

    # Resetta la cache lru_cache e sostituisce con il mock
    import app.core.auth as auth_mod

    auth_mod._get_jwks_client.cache_clear()
    monkeypatch.setattr(auth_mod, "_get_jwks_client", lambda: mock_client)


def test_valid_token():
    from app.core.auth import _decode_token

    user = _decode_token(_make_token())
    assert user["id"] == "user_clerk123"
    assert user["email"] == "test@example.com"


def test_expired_token():
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token(exp_offset=-1))
    assert exc.value.status_code == 401


def test_invalid_token():
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token("questo.non.e.un.jwt")
    assert exc.value.status_code == 401


def test_missing_auth_header():
    """get_current_user senza header → 401."""
    from app.core.auth import get_current_user

    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials=None)
    assert exc.value.status_code == 401
