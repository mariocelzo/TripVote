# Test TDD per gli endpoint HTTP dei boards:
#   GET  /boards/{board_id}/results
#   POST /boards/{board_id}/recompute
#
# Strategia di mock:
#   - require_board_member / require_board_editor: mocka get_supabase_admin in app.api.deps
#     in modo che la query su board_members ritorni dati appropriati o vuoti.
#   - get_board_results: AsyncMock che ritorna una BoardResultsResponse valida.
#   - invalidate_board_cache: AsyncMock (nessun side-effect).
#   - rate_limit: mocka get_redis in app.api.deps per simulare counter Redis.

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.schemas.boards import BoardResultsResponse, ProposalResult
from tests.conftest import make_jwt

# UUID stabile usato in tutti i test per l'utente autenticato
_TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
_BOARD_ID = "board-test-uuid-1"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def client():
    """
    Client ASGI isolato: Redis e Supabase admin mockati a livello di lifespan
    in modo da non richiedere servizi reali durante i test.
    """
    with (
        patch("app.core.redis.init_redis", new_callable=AsyncMock),
        patch("app.core.redis.close_redis", new_callable=AsyncMock),
        patch("app.core.supabase.get_supabase_admin"),
        patch("app.main.init_sentry"),
    ):
        from app.main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac


def _auth_headers(user_id: str = _TEST_USER_ID) -> dict[str, str]:
    """Genera header Authorization con JWT HS256 valido per il test user."""
    return {"Authorization": f"Bearer {make_jwt(user_id=user_id)}"}


def _make_sb_deps_mock(role: str | None) -> MagicMock:
    """
    Costruisce un mock di get_supabase_admin usato da require_board_member
    e require_board_editor in app/api/deps.py.

    - role=None → board_members.single().execute() ritorna data=None → 403
    - role="viewer" → member presente ma non editor → 403 su require_board_editor
    - role="owner" | "editor" → membro con permessi editor → tutto OK
    """
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.single.return_value = chain

    # Simula la risposta con o senza dati
    result = MagicMock()
    result.data = {"role": role} if role is not None else None
    chain.execute.return_value = result

    sb.table.return_value = chain
    return sb


def _make_board_ok_mock() -> MagicMock:
    """
    Mock di get_supabase_admin usato nella route board_results per la verifica
    dell'esistenza della board stessa (seconda query dopo require_board_member).
    """
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.single.return_value = chain

    result = MagicMock()
    result.data = {"id": _BOARD_ID}
    chain.execute.return_value = result

    sb.table.return_value = chain
    return sb


def _make_board_missing_mock() -> MagicMock:
    """Mock che simula board non trovata (data=None) per la query boards.single()."""
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.single.return_value = chain

    result = MagicMock()
    result.data = None
    chain.execute.return_value = result

    sb.table.return_value = chain
    return sb


def _valid_board_results_response() -> BoardResultsResponse:
    """Risposta BoardResultsResponse valida usata nei test di successo."""
    return BoardResultsResponse(
        board_id=_BOARD_ID,
        computed_at=datetime(2026, 5, 16, 12, 0, 0, tzinfo=UTC),
        members_count=4,
        voters_count=3,
        quorum_reached=True,
        proposals=[
            ProposalResult(
                proposal_id="prop-uuid-1",
                title="Hotel Roma Centro",
                category="hotel",
                yes_count=3,
                maybe_count=1,
                no_count=0,
                total_votes=4,
                score=0.875,
                is_match=True,
            )
        ],
        winners=["prop-uuid-1"],
    )


# ---------------------------------------------------------------------------
# GET /boards/{board_id}/results
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_board_results_no_auth(client):
    """
    Richiesta senza header Authorization → 401 Unauthorized.
    Il middleware JWT deve rifiutare la richiesta prima ancora di
    controllare la membership della board.
    """
    response = await client.get(f"/boards/{_BOARD_ID}/results")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_board_results_not_member(client):
    """
    Utente autenticato ma NON membro della board → 403 Forbidden.
    require_board_member trova board_members.data=None e lancia HTTPException 403.
    """
    # Mock di get_supabase_admin in deps: board_members non contiene l'utente
    sb_no_member = _make_sb_deps_mock(role=None)

    with patch("app.api.deps.get_supabase_admin", return_value=sb_no_member):
        response = await client.get(
            f"/boards/{_BOARD_ID}/results",
            headers=_auth_headers(),
        )

    assert response.status_code == 403
    assert "membro" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_board_results_board_not_found(client):
    """
    Utente membro valido, ma la board non esiste nel DB → 404 Not Found.
    require_board_member passa (role=viewer), poi boards.single() ritorna data=None.
    """
    # Primo mock: deps usa get_supabase_admin per board_members → OK
    sb_member = _make_sb_deps_mock(role="viewer")
    # Secondo mock: la route usa get_supabase_admin per boards → board non trovata
    sb_no_board = _make_board_missing_mock()

    # Il router boards.py importa get_supabase_admin separatamente da deps.py,
    # quindi usiamo side_effect per ritornare mock diversi per ogni patch target.
    with (
        patch("app.api.deps.get_supabase_admin", return_value=sb_member),
        patch("app.api.boards.get_supabase_admin", return_value=sb_no_board),
    ):
        response = await client.get(
            f"/boards/{_BOARD_ID}/results",
            headers=_auth_headers(),
        )

    assert response.status_code == 404
    assert "board" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_board_results_ok(client):
    """
    Utente membro valido, board esiste, get_board_results ritorna risposta completa → 200 OK.
    Verifica la struttura di BoardResultsResponse nel payload JSON.
    """
    sb_member = _make_sb_deps_mock(role="viewer")
    sb_board_ok = _make_board_ok_mock()
    expected_response = _valid_board_results_response()

    with (
        patch("app.api.deps.get_supabase_admin", return_value=sb_member),
        patch("app.api.boards.get_supabase_admin", return_value=sb_board_ok),
        patch(
            "app.api.boards.get_board_results",
            new_callable=AsyncMock,
            return_value=expected_response,
        ),
    ):
        response = await client.get(
            f"/boards/{_BOARD_ID}/results",
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    body = response.json()
    assert body["board_id"] == _BOARD_ID
    assert body["members_count"] == 4
    assert body["quorum_reached"] is True
    assert len(body["proposals"]) == 1
    assert body["proposals"][0]["is_match"] is True
    assert body["winners"] == ["prop-uuid-1"]


# ---------------------------------------------------------------------------
# POST /boards/{board_id}/recompute
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_recompute_not_editor(client):
    """
    Utente membro con ruolo 'viewer' (non editor/owner) → 403 Forbidden.
    require_board_editor trova il ruolo insufficiente e lancia HTTPException 403.
    """
    sb_viewer = _make_sb_deps_mock(role="viewer")

    with patch("app.api.deps.get_supabase_admin", return_value=sb_viewer):
        response = await client.post(
            f"/boards/{_BOARD_ID}/recompute",
            headers=_auth_headers(),
        )

    assert response.status_code == 403
    assert "permessi" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_recompute_ok(client):
    """
    Utente con ruolo 'owner' → 202 Accepted.
    invalidate_board_cache viene chiamata, rate_limit non supera la soglia.
    """
    sb_owner = _make_sb_deps_mock(role="owner")

    # Redis mock: INCR ritorna 1 (prima chiamata, sotto il limite di 5)
    redis_mock = AsyncMock()
    redis_mock.incr = AsyncMock(return_value=1)
    redis_mock.expire = AsyncMock(return_value=True)

    with (
        patch("app.api.deps.get_supabase_admin", return_value=sb_owner),
        patch("app.api.deps.get_redis", return_value=redis_mock),
        patch(
            "app.api.boards.invalidate_board_cache",
            new_callable=AsyncMock,
            return_value=f"board:{_BOARD_ID}:results",
        ),
    ):
        response = await client.post(
            f"/boards/{_BOARD_ID}/recompute",
            headers=_auth_headers(),
        )

    assert response.status_code == 202
    body = response.json()
    assert body["accepted"] is True
    assert body["board_id"] == _BOARD_ID


@pytest.mark.asyncio
async def test_recompute_rate_limited(client):
    """
    Utente owner che supera il rate limit (6° chiamata in 60s) → 429 Too Many Requests.
    Redis INCR ritorna 6 (> max_per_window=5): rate_limit solleva HTTPException 429.
    """
    sb_owner = _make_sb_deps_mock(role="owner")

    # Redis mock: INCR ritorna 6 → supera il limite massimo di 5 req/min
    redis_mock = AsyncMock()
    redis_mock.incr = AsyncMock(return_value=6)
    redis_mock.expire = AsyncMock(return_value=True)

    with (
        patch("app.api.deps.get_supabase_admin", return_value=sb_owner),
        patch("app.api.deps.get_redis", return_value=redis_mock),
    ):
        response = await client.post(
            f"/boards/{_BOARD_ID}/recompute",
            headers=_auth_headers(),
        )

    assert response.status_code == 429
    # Verifica che l'header Retry-After sia presente come da implementazione rate_limit
    assert "retry-after" in response.headers
    assert "rate limit" in response.json()["detail"].lower()
