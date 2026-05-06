# Dipendenze condivise: rate limiting, verifica membership board, header secrets.
import logging

from fastapi import Depends, Header, HTTPException

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.redis import get_redis
from app.core.supabase import get_supabase_admin

logger = logging.getLogger(__name__)


async def rate_limit(
    user_id: str, action: str, max_per_window: int, window_seconds: int = 60
) -> None:
    """
    Rate limit via Redis INCR+EXPIRE.
    Degrada gracefully se Redis è down (non blocca la richiesta).
    """
    key = f"rl:{action}:{user_id}"
    try:
        redis = get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, window_seconds)
        if count > max_per_window:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit: max {max_per_window} richieste ogni {window_seconds}s",
                headers={"Retry-After": str(window_seconds)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Rate limit Redis error (degrading gracefully): %s", exc)


async def require_board_member(
    board_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Verifica che l'utente sia membro della board. Lancia 403 altrimenti."""
    sb = get_supabase_admin()
    res = (
        sb.table("board_members")
        .select("role")
        .eq("board_id", board_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="Non sei membro di questa board")
    return {**user, "board_role": res.data["role"]}


async def require_board_editor(
    board_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Verifica che l'utente sia owner o editor della board. Lancia 403 altrimenti."""
    sb = get_supabase_admin()
    res = (
        sb.table("board_members")
        .select("role")
        .eq("board_id", board_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not res.data or res.data["role"] not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="Permessi insufficienti (serve owner/editor)")
    return {**user, "board_role": res.data["role"]}


def verify_webhook_secret(x_webhook_secret: str = Header(...)) -> None:
    """Valida l'header X-Webhook-Secret dei Database Webhooks di Supabase."""
    if x_webhook_secret != settings.SUPABASE_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Webhook secret non valido")


def verify_cron_secret(authorization: str = Header(...)) -> None:
    """
    Valida l'header Authorization: Bearer <CRON_SECRET>.
    Vercel Cron Jobs iniettano automaticamente questo header quando
    CRON_SECRET è impostato come env var nel progetto Vercel.
    """
    expected = f"Bearer {settings.CRON_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Cron secret non valido")
