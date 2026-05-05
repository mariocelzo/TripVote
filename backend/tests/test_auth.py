import time

import jwt
import pytest
from fastapi import HTTPException

SECRET = "test-jwt-secret-32bytes-padding!!"


def _make_token(
    sub: str = "user-123",
    email: str = "test@example.com",
    audience: str = "authenticated",
    exp_offset: int = 3600,
) -> str:
    payload = {
        "sub": sub,
        "email": email,
        "aud": audience,
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def test_valid_token(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", SECRET)
    from app.core.auth import _decode_token

    user = _decode_token(_make_token())
    assert user["id"] == "user-123"
    assert user["email"] == "test@example.com"


def test_expired_token(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", SECRET)
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token(exp_offset=-1))
    assert exc.value.status_code == 401


def test_wrong_audience(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", SECRET)
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token(audience="anon"))
    assert exc.value.status_code == 401


def test_invalid_secret(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", "wrong-secret")
    from app.core.auth import _decode_token

    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token())
    assert exc.value.status_code == 401
