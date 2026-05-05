"""Test del service board_results con Supabase e Redis mockati."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.boards import BoardResultsResponse


def _make_sb_mock(
    members_count: int = 6, match_config: dict | None = None, proposals: list | None = None
):
    """Costruisce un mock del client Supabase con dati coerenti."""
    sb = MagicMock()

    # board_members count
    members_res = MagicMock()
    members_res.count = members_count
    members_res.data = []

    # boards match_config
    board_res = MagicMock()
    board_res.data = {"match_config": match_config}

    # proposal_results
    results_res = MagicMock()
    results_res.data = proposals or []

    # Catena di chiamate .table().select()...execute()
    def _table_chain(table_name):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.single.return_value = chain

        if table_name == "board_members":
            chain.execute.return_value = members_res
        elif table_name == "boards":
            chain.execute.return_value = board_res
        elif table_name == "proposal_results":
            chain.execute.return_value = results_res

        return chain

    sb.table.side_effect = _table_chain
    return sb


@pytest.fixture(autouse=True)
def _mock_redis(mocker):
    mocker.patch("app.services.board_results.get_redis", side_effect=RuntimeError("no redis"))


@pytest.mark.asyncio
async def test_get_board_results_empty_board():
    """Board senza proposte → risposta valida con liste vuote."""
    with patch("app.services.board_results.get_supabase_admin", return_value=_make_sb_mock()):
        from app.services.board_results import get_board_results

        result = await get_board_results("board-123")

    assert isinstance(result, BoardResultsResponse)
    assert result.board_id == "board-123"
    assert result.proposals == []
    assert result.winners == []


@pytest.mark.asyncio
async def test_get_board_results_with_match():
    """4 Sì su 6 membri → proposta deve essere match."""
    proposals = [
        {
            "proposal_id": "p1",
            "board_id": "board-1",
            "title": "Hotel Roma",
            "category": "hotel",
            "matched_at": None,
            "yes_count": 4,
            "maybe_count": 1,
            "no_count": 0,
            "total_votes": 5,
        }
    ]
    sb = _make_sb_mock(members_count=6, proposals=proposals)
    with patch("app.services.board_results.get_supabase_admin", return_value=sb):
        from app.services.board_results import get_board_results

        result = await get_board_results("board-1")

    assert len(result.proposals) == 1
    assert result.proposals[0].is_match is True
    assert "p1" in result.winners


@pytest.mark.asyncio
async def test_get_board_results_no_match():
    """2 Sì su 6 (quorum 0.33 < 0.5) → no match."""
    proposals = [
        {
            "proposal_id": "p2",
            "board_id": "board-2",
            "title": "Volo Ryanair",
            "category": "flight",
            "matched_at": None,
            "yes_count": 2,
            "maybe_count": 0,
            "no_count": 0,
            "total_votes": 2,
        }
    ]
    sb = _make_sb_mock(members_count=6, proposals=proposals)
    with patch("app.services.board_results.get_supabase_admin", return_value=sb):
        from app.services.board_results import get_board_results

        result = await get_board_results("board-2")

    assert result.proposals[0].is_match is False
    assert result.winners == []


@pytest.mark.asyncio
async def test_invalidate_board_cache():
    """invalidate_board_cache deve restituire la key eliminata."""
    redis_mock = AsyncMock()
    with patch("app.services.board_results.get_redis", return_value=redis_mock):
        from app.services.board_results import invalidate_board_cache

        key = await invalidate_board_cache("board-xyz")

    assert "board-xyz" in key
    redis_mock.delete.assert_called_once_with(key)
