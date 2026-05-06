# Endpoint interni: chiamati solo da Database Webhooks Supabase e da Vercel Cron Jobs.
# Protetti da header secret, mai esposti nel frontend.
import asyncio
import logging
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import verify_cron_secret, verify_webhook_secret
from app.core.supabase import get_supabase_admin
from app.services.board_results import invalidate_board_cache

logger = logging.getLogger(__name__)

router = APIRouter()


class SupabaseWebhookPayload(BaseModel):
    type: str  # INSERT | UPDATE | DELETE
    table: str
    schema_: str | None = None  # "schema" è keyword Python → alias
    record: dict | None = None
    old_record: dict | None = None

    model_config = {"populate_by_name": True}


async def _get_board_id_for_proposal(proposal_id: str) -> str | None:
    """Risolve proposal_id → board_id tramite service-role client."""
    sb = get_supabase_admin()
    res = sb.table("proposals").select("board_id").eq("id", proposal_id).single().execute()
    return res.data["board_id"] if res.data else None


async def _handle_match_transition(board_id: str, proposal_id: str) -> None:
    """
    Controlla se il voto ha causato una transizione non-match → match (o viceversa).
    Se match nuovo: aggiorna matched_at e invia notifica email.
    Se de-match: azzera matched_at senza notifica.
    Eseguito in background dopo aver già restituito la risposta al webhook.
    """
    try:
        from app.services.board_results import get_board_results
        from app.services.email import send_match_notification

        sb = get_supabase_admin()

        results = await get_board_results(board_id)
        proposal = next((p for p in results.proposals if p.proposal_id == proposal_id), None)
        if proposal is None:
            return

        prop_res = (
            sb.table("proposals")
            .select("matched_at, title, category")
            .eq("id", proposal_id)
            .single()
            .execute()
        )
        if not prop_res.data:
            return

        was_match = prop_res.data["matched_at"] is not None
        is_match_now = proposal.is_match

        if is_match_now and not was_match:
            sb.table("proposals").update({"matched_at": "now()"}).eq("id", proposal_id).execute()

            board_res = sb.table("boards").select("title").eq("id", board_id).single().execute()
            board_title = board_res.data["title"] if board_res.data else "il tuo viaggio"

            members_res = (
                sb.table("board_members").select("user_id").eq("board_id", board_id).execute()
            )
            emails: list[str] = []
            for m in members_res.data or []:
                try:
                    u = sb.auth.admin.get_user_by_id(m["user_id"])
                    if u and u.user and u.user.email:
                        emails.append(u.user.email)
                except Exception as user_exc:
                    logger.debug("Email utente %s non recuperabile: %s", m["user_id"], user_exc)

            await send_match_notification(
                board_title=board_title,
                proposal_title=prop_res.data["title"],
                category=prop_res.data["category"],
                member_emails=emails,
            )
            logger.info("Match notificato: proposal=%s board=%s", proposal_id, board_id)

        elif not is_match_now and was_match:
            # De-match silenzioso
            sb.table("proposals").update({"matched_at": None}).eq("id", proposal_id).execute()

    except Exception as exc:
        logger.error("Errore in _handle_match_transition: %s", exc)


@router.post("/cache/invalidate-vote", dependencies=[Depends(verify_webhook_secret)])
async def invalidate_vote_cache(payload: SupabaseWebhookPayload) -> dict:
    """
    Riceve Database Webhook di Supabase su INSERT/UPDATE/DELETE di votes.
    1. Invalida la cache aggregata della board.
    2. Controlla transizioni di match in background.
    """
    record = payload.record or payload.old_record
    if not record or "proposal_id" not in record:
        return {"ok": True, "invalidated": None}

    proposal_id = record["proposal_id"]
    board_id = await _get_board_id_for_proposal(proposal_id)

    if not board_id:
        logger.warning("Board non trovata per proposal_id=%s", proposal_id)
        return {"ok": True, "invalidated": None}

    key = await invalidate_board_cache(board_id)

    # Non blocca la risposta al webhook Supabase — il task gira in background
    _task = asyncio.create_task(_handle_match_transition(board_id, proposal_id))
    _task.add_done_callback(
        lambda t: t.exception() and logger.error("match_transition error: %s", t.exception())
    )

    return {"ok": True, "invalidated": key}


@router.post("/cron/close-expired-boards", dependencies=[Depends(verify_cron_secret)])
async def close_expired_boards() -> dict:
    """
    Chiude tutte le board con end_date < oggi e status = 'open'.
    Chiamato da Vercel Cron ogni notte alle 3:00 UTC (schedule in vercel.json).
    """
    sb = get_supabase_admin()
    today = date.today().isoformat()

    res = (
        sb.table("boards")
        .update({"status": "closed"})
        .lt("end_date", today)
        .eq("status", "open")
        .execute()
    )

    closed_count = len(res.data) if res.data else 0
    logger.info("Chiuse %d board scadute", closed_count)
    return {"ok": True, "closed": closed_count}
