# tests/test_auth.py
# Verifica la logica di autenticazione JWT Supabase (HS256).
# Non si mocka nessun client esterno: HS256 usa un secret locale → zero chiamate HTTP.

import time

import jwt
import pytest
from fastapi import HTTPException

# Secret di test — corrisponde a SUPABASE_JWT_SECRET nel conftest
_TEST_SECRET = "test-supabase-jwt-secret-32chars!!"


def _make_token(
    sub: str = "550e8400-e29b-41d4-a716-446655440000",
    email: str = "test@example.com",
    role: str = "authenticated",
    exp_offset: int = 3600,
) -> str:
    """Genera un JWT HS256 come farebbe Supabase."""
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
        "aud": "authenticated",
    }
    return jwt.encode(payload, _TEST_SECRET, algorithm="HS256")


def test_valid_token():
    """Token valido → restituisce id, email, role."""
    from app.core.auth import _decode_token

    user = _decode_token(_make_token())
    assert user["id"] == "550e8400-e29b-41d4-a716-446655440000"
    assert user["email"] == "test@example.com"
    assert user["role"] == "authenticated"


def test_expired_token():
    """Token scaduto → 401."""
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token(exp_offset=-1))
    assert exc.value.status_code == 401


def test_invalid_token():
    """Stringa non JWT → 401."""
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token("questo.non.e.un.jwt")
    assert exc.value.status_code == 401


def test_missing_auth_header():
    """Nessun header Authorization → 401."""
    from app.core.auth import get_current_user

    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials=None)
    assert exc.value.status_code == 401
