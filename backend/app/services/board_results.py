# Cache-aside per i risultati aggregati di una board.
# Redis TTL 30s + invalidazione via webhook Supabase.
import json
import logging
from datetime import UTC, datetime

from app.core.redis import get_redis
from app.core.supabase import get_supabase_admin
from app.schemas.boards import BoardResultsResponse, ProposalResult
from app.services.match import MatchConfig, ProposalVotes, compute_match

logger = logging.getLogger(__name__)

_CACHE_TTL = 30  # secondi (vedi ARCHITECTURE_BACKEND.md §5)
_CACHE_KEY_TPL = "board:{board_id}:results"


async def get_board_results(board_id: str) -> BoardResultsResponse:
    """
    Restituisce risultati aggregati e stato di match per tutte le proposte.
    Cache-aside: Redis TTL 30s, miss → query sulla view proposal_results.
    """
    key = _CACHE_KEY_TPL.format(board_id=board_id)

    try:
        redis = get_redis()
        cached = await redis.get(key)
        if cached:
            return BoardResultsResponse(**json.loads(cached))
    except Exception as cache_exc:
        logger.debug("Cache miss board_results (Redis down?): %s", cache_exc)

    sb = get_supabase_admin()

    # Numero di membri della board (denominatore del quorum)
    members_res = (
        sb.table("board_members")
        .select("user_id", count="exact")
        .eq("board_id", board_id)
        .execute()
    )
    members_count: int = members_res.count or 0

    # Override soglie di match per questa board (campo jsonb)
    board_res = sb.table("boards").select("match_config").eq("id", board_id).single().execute()
    match_config = MatchConfig.from_board_config(
        board_res.data.get("match_config") if board_res.data else None
    )

    # Aggregati dalla view proposal_results
    results_res = (
        sb.table("proposal_results")
        .select("*")
        .eq("board_id", board_id)
        .execute()
    )

    proposals: list[ProposalResult] = []
    voters_set: set[str] = set()

    for row in results_res.data or []:
        votes = ProposalVotes(
            proposal_id=row["proposal_id"],
            title=row["title"],
            category=row["category"],
            yes_count=row["yes_count"] or 0,
            maybe_count=row["maybe_count"] or 0,
            no_count=row["no_count"] or 0,
        )
        match_result = compute_match(votes, members_count=members_count, config=match_config)
        proposals.append(
            ProposalResult(
                proposal_id=row["proposal_id"],
                title=row["title"],
                category=row["category"],
                yes_count=match_result.yes_count,
                maybe_count=match_result.maybe_count,
                no_count=match_result.no_count,
                total_votes=match_result.total_votes,
                score=match_result.score,
                is_match=match_result.is_match,
            )
        )

    # Tie-breaking: score desc → yes_count desc (vedi MATCH_LOGIC.md §tie-breaking)
    winners = sorted(
        [p.proposal_id for p in proposals if p.is_match],
        key=lambda pid: next((-p.score, -p.yes_count) for p in proposals if p.proposal_id == pid),
    )

    quorum_reached = members_count > 0 and any(
        (p.yes_count + p.maybe_count + p.no_count) / members_count >= match_config.quorum_threshold
        for p in proposals
    )

    response = BoardResultsResponse(
        board_id=board_id,
        computed_at=datetime.now(UTC),
        members_count=members_count,
        voters_count=len(voters_set),
        quorum_reached=quorum_reached,
        proposals=proposals,
        winners=winners,
    )

    try:
        redis = get_redis()
        await redis.set(key, response.model_dump_json(), ex=_CACHE_TTL)
    except Exception as cache_exc:
        logger.debug("Cache write board_results fallita (Redis down?): %s", cache_exc)

    return response


async def invalidate_board_cache(board_id: str) -> str:
    """Elimina la cache aggregata di una board. Ritorna la key eliminata."""
    key = _CACHE_KEY_TPL.format(board_id=board_id)
    try:
        redis = get_redis()
        await redis.delete(key)
    except Exception as exc:
        logger.warning("Impossibile invalidare cache board %s: %s", board_id, exc)
    return key
