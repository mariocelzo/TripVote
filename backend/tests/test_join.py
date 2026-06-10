# Test TDD per l'endpoint POST /boards/join.
#
# Sicurezza: il join a una board è gestito SOLO dal backend con service-role.
# Il client non può inserirsi direttamente in board_members (RLS lo vieta dalla
# migration 0006): deve fornire un invite_token valido, che il BE verifica.
#
# Strategia di mock:
#   - app.api.boards.get_supabase_admin: client mock con dispatch per tabella
#     (boards = lookup token, board_members = membership/insert).
#   - app.api.deps.get_redis: counter Redis per rate_limit.

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import make_jwt

_TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
_BOARD_ID = "board-test-uuid-1"
_VALID_TOKEN = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"


@pytest.fixture
async def client():
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
    return {"Authorization": f"Bearer {make_jwt(user_id=user_id)}"}


def _make_sb_join_mock(
    *,
    board_row: dict | None,
    already_member: bool,
) -> MagicMock:
    """
    Costruisce un client Supabase mock con dispatch per tabella.

    - board_row: la riga ritornata dal lookup boards per invite_token
      (None → token non valido → 404).
    - already_member: se True, la query board_members ritorna una riga
      (l'utente è già membro → nessun insert, already_member=True).
    """
    sb = MagicMock()

    def _table(name: str):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.upsert.return_value = chain
        chain.insert.return_value = chain

        if name == "boards":
            res = MagicMock()
            res.data = [board_row] if board_row is not None else []
            chain.execute.return_value = res
        elif name == "board_members":
            # La prima execute() è il check membership; le successive (insert/upsert)
            # restituiscono un risultato neutro. Usiamo side_effect a lista.
            check_res = MagicMock()
            check_res.data = [{"user_id": _TEST_USER_ID}] if already_member else []
            write_res = MagicMock()
            write_res.data = [{"board_id": _BOARD_ID, "user_id": _TEST_USER_ID}]
            chain.execute.side_effect = [check_res, write_res, write_res]
        return chain

    sb.table.side_effect = _table
    return sb


def _redis_ok() -> AsyncMock:
    redis_mock = AsyncMock()
    redis_mock.incr = AsyncMock(return_value=1)
    redis_mock.expire = AsyncMock(return_value=True)
    return redis_mock


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_join_no_auth(client):
    """Nessun header Authorization → 401."""
    response = await client.post("/boards/join", json={"token": _VALID_TOKEN})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_join_empty_token(client):
    """Token vuoto → 422 (validazione Pydantic)."""
    with patch("app.api.deps.get_redis", return_value=_redis_ok()):
        response = await client.post("/boards/join", json={"token": "   "}, headers=_auth_headers())
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_join_invalid_token(client):
    """Token che non corrisponde a nessuna board → 404."""
    sb = _make_sb_join_mock(board_row=None, already_member=False)
    with (
        patch("app.api.boards.get_supabase_admin", return_value=sb),
        patch("app.api.deps.get_redis", return_value=_redis_ok()),
    ):
        response = await client.post(
            "/boards/join", json={"token": "token-inesistente"}, headers=_auth_headers()
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_join_board_closed(client):
    """Board con status diverso da 'open' → 409 Conflict."""
    sb = _make_sb_join_mock(
        board_row={"id": _BOARD_ID, "title": "Viaggio", "status": "closed"},
        already_member=False,
    )
    with (
        patch("app.api.boards.get_supabase_admin", return_value=sb),
        patch("app.api.deps.get_redis", return_value=_redis_ok()),
    ):
        response = await client.post(
            "/boards/join", json={"token": _VALID_TOKEN}, headers=_auth_headers()
        )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_join_success_new_member(client):
    """Token valido, board aperta, utente non ancora membro → 200, already_member False."""
    sb = _make_sb_join_mock(
        board_row={"id": _BOARD_ID, "title": "Capodanno a Tokyo", "status": "open"},
        already_member=False,
    )
    with (
        patch("app.api.boards.get_supabase_admin", return_value=sb),
        patch("app.api.deps.get_redis", return_value=_redis_ok()),
    ):
        response = await client.post(
            "/boards/join", json={"token": _VALID_TOKEN}, headers=_auth_headers()
        )
    assert response.status_code == 200
    body = response.json()
    assert body["board_id"] == _BOARD_ID
    assert body["title"] == "Capodanno a Tokyo"
    assert body["already_member"] is False


@pytest.mark.asyncio
async def test_join_already_member(client):
    """Utente già membro → 200, already_member True, nessun errore."""
    sb = _make_sb_join_mock(
        board_row={"id": _BOARD_ID, "title": "Capodanno a Tokyo", "status": "open"},
        already_member=True,
    )
    with (
        patch("app.api.boards.get_supabase_admin", return_value=sb),
        patch("app.api.deps.get_redis", return_value=_redis_ok()),
    ):
        response = await client.post(
            "/boards/join", json={"token": _VALID_TOKEN}, headers=_auth_headers()
        )
    assert response.status_code == 200
    assert response.json()["already_member"] is True
