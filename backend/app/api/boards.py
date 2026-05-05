from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import rate_limit, require_board_editor, require_board_member
from app.core.supabase import get_supabase_admin
from app.schemas.boards import BoardResultsResponse
from app.services.board_results import get_board_results, invalidate_board_cache

router = APIRouter()


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
