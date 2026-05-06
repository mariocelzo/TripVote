import logging
from functools import lru_cache

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)


@lru_cache
def _get_jwks_client() -> PyJWKClient:
    """
    Client JWKS di Clerk — scarica e mette in cache le chiavi pubbliche RS256.
    Cache in-memory per 1h per evitare fetch ripetuti.
    """
    return PyJWKClient(settings.CLERK_JWKS_URL, cache_jwk_set=True, lifespan=3600)


def _decode_token(token: str) -> dict:
    """
    Verifica e decodifica un JWT emesso da Clerk (RS256 via JWKS).
    Lancia HTTPException 401 se il token non è valido.
    """
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            # Clerk non sempre imposta audience — disabilitiamo la verifica strict
            options={"verify_aud": False},
        )
        return {
            "id": payload["sub"],
            "email": payload.get("email", ""),
        }
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token scaduto") from exc
    except jwt.PyJWTError as exc:
        logger.warning("JWT Clerk non valido: %s", exc)
        raise HTTPException(status_code=401, detail="Token non valido") from exc
    except Exception as exc:
        logger.error("Errore verifica JWT: %s", exc)
        raise HTTPException(status_code=401, detail="Token non valido") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> dict:
    """FastAPI dependency — restituisce {'id': clerk_user_id, 'email': str}."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header mancante")
    return _decode_token(credentials.credentials)
