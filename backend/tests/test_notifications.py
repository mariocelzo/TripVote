# Test TDD per l'endpoint POST /notifications/invite.
# Copre: autenticazione, validazione input Pydantic, permessi owner,
# board non trovata, invio completo/parziale e rate limit.
#
# Strategia di mock:
# - get_supabase_admin → MagicMock con catene sincrone .table().select().eq()...execute()
# - send_invite        → AsyncMock (funzione asincrona nel service email)
# - app.api.deps.rate_limit → AsyncMock (cortocircuita il check Redis)

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

# ── Fixture client (uguale al pattern di test_internal.py) ─────────────────


@pytest.fixture
async def client():
    """
    Client ASGI con Redis e Sentry disabilitati per evitare connessioni reali.
    La fixture è async per supportare @pytest.mark.asyncio.
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


# ── Helper per costruire il mock di Supabase ───────────────────────────────


# Sentinella per distinguere "parametro non passato" da "passato None esplicitamente"
_UNSET = object()


def _make_sb_mock(
    role: str | None = "owner",
    board_data: dict | None = _UNSET,  # type: ignore[assignment]
    profile_data: dict | None = _UNSET,  # type: ignore[assignment]
) -> MagicMock:
    """
    Costruisce un MagicMock che simula le catene sincrone di supabase-py:
        sb.table(...).select(...).eq(...).eq(...).single().execute()

    Parametri:
    - role:         ruolo restituito dalla query board_members
                    (None → member.data sarà None → non-membro)
    - board_data:   dict ritornato dalla query boards
                    (None esplicito → board non trovata → 404;
                     non passato → default con title/invite_token)
    - profile_data: dict ritornato dalla query profiles
    """
    # Valori di default per board e profile quando non passati esplicitamente
    if board_data is _UNSET:
        board_data = {"title": "Viaggio a Parigi", "invite_token": "tok-123"}
    if profile_data is _UNSET:
        profile_data = {"display_name": "Mario"}

    # Costruiamo i tre risultati .execute()
    member_result = MagicMock()
    member_result.data = {"role": role} if role is not None else None

    board_result = MagicMock()
    board_result.data = board_data  # None = board non trovata

    profile_result = MagicMock()
    profile_result.data = profile_data

    # Usiamo side_effect su .table() per distinguere le tre query
    # in base al nome della tabella passato come primo argomento.
    def _table(name: str):
        """Ritorna catena mock specifica per tabella."""
        chain = MagicMock()

        if name == "board_members":
            chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = (
                member_result
            )
        elif name == "boards":
            chain.select.return_value.eq.return_value.single.return_value.execute.return_value = (
                board_result
            )
        elif name == "profiles":
            chain.select.return_value.eq.return_value.single.return_value.execute.return_value = (
                profile_result
            )

        return chain

    sb = MagicMock()
    sb.table.side_effect = _table
    return sb


# ── URL base dell'endpoint ─────────────────────────────────────────────────

_INVITE_URL = "/notifications/invite"

# Payload minimo valido
_VALID_BODY = {
    "board_id": "board-uuid-1",
    "emails": ["alice@example.com", "bob@example.com"],
}


# ── Test cases ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_invite_no_auth(client):
    """Senza header Authorization l'endpoint risponde 401."""
    response = await client.post(_INVITE_URL, json=_VALID_BODY)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invite_empty_emails(client, auth_headers):
    """Lista email vuota → Pydantic validator solleva 422."""
    body = {**_VALID_BODY, "emails": []}
    response = await client.post(_INVITE_URL, json=body, headers=auth_headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invite_too_many_emails(client, auth_headers):
    """Più di 20 email → Pydantic validator solleva 422."""
    body = {**_VALID_BODY, "emails": [f"user{i}@example.com" for i in range(21)]}
    response = await client.post(_INVITE_URL, json=body, headers=auth_headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invite_not_owner(client, auth_headers):
    """Membro con ruolo != owner → 403."""
    sb = _make_sb_mock(role="member")

    with (
        # Patch nel namespace del modulo che usa la funzione (non dove è definita)
        patch("app.api.notifications.get_supabase_admin", return_value=sb),
        patch("app.api.notifications.rate_limit", new_callable=AsyncMock),
    ):
        response = await client.post(_INVITE_URL, json=_VALID_BODY, headers=auth_headers)

    assert response.status_code == 403
    assert "owner" in response.json()["detail"]


@pytest.mark.asyncio
async def test_invite_not_member(client, auth_headers):
    """Nessuna riga board_members (utente non membro) → 403."""
    sb = _make_sb_mock(role=None)  # member.data = None

    with (
        patch("app.api.notifications.get_supabase_admin", return_value=sb),
        patch("app.api.notifications.rate_limit", new_callable=AsyncMock),
    ):
        response = await client.post(_INVITE_URL, json=_VALID_BODY, headers=auth_headers)

    assert response.status_code == 403
    assert "owner" in response.json()["detail"]


@pytest.mark.asyncio
async def test_invite_board_not_found(client, auth_headers):
    """Owner verificato ma board non trovata → 404."""
    sb = _make_sb_mock(role="owner", board_data=None)

    with (
        patch("app.api.notifications.get_supabase_admin", return_value=sb),
        patch("app.api.notifications.rate_limit", new_callable=AsyncMock),
    ):
        response = await client.post(_INVITE_URL, json=_VALID_BODY, headers=auth_headers)

    assert response.status_code == 404
    assert "Board" in response.json()["detail"]


@pytest.mark.asyncio
async def test_invite_ok_all_sent(client, auth_headers):
    """Caso di successo: tutti e 2 gli inviti inviati, nessun fallimento."""
    sb = _make_sb_mock()  # owner, board OK, profile OK

    with (
        patch("app.api.notifications.get_supabase_admin", return_value=sb),
        patch("app.api.notifications.rate_limit", new_callable=AsyncMock),
        # send_invite è importata nel modulo notifications, patch lì
        patch(
            "app.api.notifications.send_invite",
            new_callable=AsyncMock,
            return_value=(2, []),  # (sent, failed)
        ),
    ):
        response = await client.post(_INVITE_URL, json=_VALID_BODY, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 2
    assert data["failed"] == []


@pytest.mark.asyncio
async def test_invite_partial_failure(client, auth_headers):
    """Caso di successo parziale: 1 inviato, 1 fallito."""
    sb = _make_sb_mock()

    with (
        patch("app.api.notifications.get_supabase_admin", return_value=sb),
        patch("app.api.notifications.rate_limit", new_callable=AsyncMock),
        patch(
            "app.api.notifications.send_invite",
            new_callable=AsyncMock,
            return_value=(1, ["fail@x.com"]),
        ),
    ):
        response = await client.post(_INVITE_URL, json=_VALID_BODY, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1
    assert data["failed"] == ["fail@x.com"]


@pytest.mark.asyncio
async def test_invite_rate_limited(client, auth_headers):
    """
    Rate limit superato: il mock di rate_limit nel namespace del modulo
    solleva HTTPException 429. Verifica che l'endpoint la propaghi.
    """
    from fastapi import HTTPException as FastAPIHTTPException

    async def _raise_rate_limit(*args, **kwargs):
        raise FastAPIHTTPException(
            status_code=429,
            detail="Rate limit: max 30 richieste ogni 86400s",
            headers={"Retry-After": "86400"},
        )

    # Patch nel namespace del router che chiama rate_limit direttamente
    with patch("app.api.notifications.rate_limit", side_effect=_raise_rate_limit):
        response = await client.post(_INVITE_URL, json=_VALID_BODY, headers=auth_headers)

    assert response.status_code == 429
