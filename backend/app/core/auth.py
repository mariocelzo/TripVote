# backend/app/core/auth.py
# Verifica i JWT emessi da Supabase Auth (HS256).
# Supabase firma i token con il JWT secret del progetto (HMAC-SHA256).
# Il token arriva dal FE come header Authorization: Bearer <token>.

import logging

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    """
    Verifica e decodifica un JWT emesso da Supabase (HS256).
    Il secret è SUPABASE_JWT_SECRET (Dashboard → Settings → API → JWT Secret).
    Lancia HTTPException 401 se il token non è valido o scaduto.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            # Supabase imposta audience "authenticated" — disabilitiamo verifica strict
            options={"verify_aud": False},
        )
        return {
            "id": payload["sub"],  # UUID utente Supabase
            "email": payload.get("email", ""),
            "role": payload.get("role", "authenticated"),
        }
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token scaduto") from exc
    except jwt.PyJWTError as exc:
        logger.warning("JWT Supabase non valido: %s", exc)
        raise HTTPException(status_code=401, detail="Token non valido") from exc
    except Exception as exc:
        logger.error("Errore verifica JWT: %s", exc)
        raise HTTPException(status_code=401, detail="Token non valido") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> dict:
    """FastAPI dependency — restituisce {'id': supabase_user_uuid, 'email': str, 'role': str}."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header mancante")
    return _decode_token(credentials.credentials)
