import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import rate_limit, require_board_editor, require_board_member
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_admin
from app.schemas.boards import (
    BoardResultsResponse,
    JoinBoardRequest,
    JoinBoardResponse,
)
from app.services.board_results import get_board_results, invalidate_board_cache

logger = logging.getLogger(__name__)

router = APIRouter()


# NB: dichiarata PRIMA delle route parametriche /{board_id}/... per chiarezza
# di routing — "join" è un segmento statico e non deve mai essere interpretato
# come un board_id.
@router.post("/join", response_model=JoinBoardResponse)
async def join_board(
    body: JoinBoardRequest,
    user: dict = Depends(get_current_user),
) -> JoinBoardResponse:
    """
    Aggiunge l'utente autenticato a una board tramite invite token.

    Sicurezza: il client NON può inserirsi direttamente in board_members
    (RLS lo vieta, vedi migration 0006). Solo questo endpoint, con la
    service-role key, valida il token e crea la membership. Senza un token
    valido non è possibile entrare in una board privata.

    Idempotente: se l'utente è già membro, ritorna already_member=True
    senza errori. Rate limit: 20 tentativi/ora per utente (anti brute-force
    sui token).
    """
    await rate_limit(user["id"], "join", max_per_window=20, window_seconds=3600)

    sb = get_supabase_admin()

    # Lookup della board per invite_token. Usiamo limit(1) invece di single()
    # per non sollevare eccezioni quando il token non esiste.
    board_res = (
        sb.table("boards")
        .select("id, title, status")
        .eq("invite_token", body.token)
        .limit(1)
        .execute()
    )
    rows = board_res.data or []
    if not rows:
        # 404 generico: non distinguiamo "token mai esistito" da altri casi
        # per non dare segnali utili a chi prova a indovinare token.
        raise HTTPException(status_code=404, detail="Invito non valido o scaduto")

    board = rows[0]
    if board["status"] != "open":
        raise HTTPException(status_code=409, detail="Questa board non accetta nuovi membri")

    board_id = board["id"]

    # Verifica se l'utente è già membro (per riportare already_member corretto)
    existing = (
        sb.table("board_members")
        .select("user_id")
        .eq("board_id", board_id)
        .eq("user_id", user["id"])
        .execute()
    )
    already_member = bool(existing.data)

    if not already_member:
        # upsert idempotente: anche in caso di race tra due richieste, il vincolo
        # PK (board_id, user_id) impedisce duplicati e ignore_duplicates evita errori.
        sb.table("board_members").upsert(
            {"board_id": board_id, "user_id": user["id"], "role": "voter"},
            on_conflict="board_id,user_id",
            ignore_duplicates=True,
        ).execute()
        logger.info("Utente %s entrato nella board %s", user["id"], board_id)

    return JoinBoardResponse(
        board_id=board_id,
        title=board["title"],
        already_member=already_member,
    )


@router.get("/{board_id}/results", response_model=BoardResultsResponse)
async def board_results(
    board_id: str,
    user: dict = Depends(require_board_member),
) -> BoardResultsResponse:
    """
    Conteggi voti e stato match per tutte le proposte della board.
    Cache-aside Redis TTL 30s.
    """
    sb = get_supabase_admin()
    board = sb.table("boards").select("id").eq("id", board_id).single().execute()
    if not board.data:
        raise HTTPException(status_code=404, detail="Board non trovata")
    return await get_board_results(board_id)


@router.post("/{board_id}/recompute", status_code=202)
async def recompute_board(
    board_id: str,
    user: dict = Depends(require_board_editor),
) -> dict:
    """
    Invalida e ricalcola la cache aggregata della board.
    Richiede ruolo owner o editor. Rate limit: 5 req/min.
    """
    await rate_limit(user["id"], "recompute", max_per_window=5, window_seconds=60)
    await invalidate_board_cache(board_id)
    return {"accepted": True, "board_id": board_id}
