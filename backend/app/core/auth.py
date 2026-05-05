import logging

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    """Verifica e decodifica un JWT Supabase. Lancia HTTPException 401 se invalido."""
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return {"id": payload["sub"], "email": payload.get("email", "")}
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token scaduto") from exc
    except jwt.InvalidAudienceError as exc:
        raise HTTPException(status_code=401, detail="Audience non valida") from exc
    except jwt.PyJWTError as exc:
        logger.warning("JWT non valido: %s", exc)
        raise HTTPException(status_code=401, detail="Token non valido") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> dict:
    """FastAPI dependency — restituisce {'id': uuid, 'email': str}."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header mancante")
    return _decode_token(credentials.credentials)
