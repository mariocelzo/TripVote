from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

WEBHOOK_SECRET = "test-webhook-secret"
CRON_SECRET = "test-cron-secret"


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


@pytest.mark.asyncio
async def test_invalidate_vote_ok(client):
    """Webhook valido con proposal_id → invalida cache e risponde ok."""
    payload = {
        "type": "INSERT",
        "table": "votes",
        "record": {"proposal_id": "prop-uuid-1", "user_id": "user-uuid-1", "value": 1},
        "old_record": None,
        "schema": "public",
    }
    with (
        patch(
            "app.api.internal._get_board_id_for_proposal",
            new_callable=AsyncMock,
            return_value="board-uuid-1",
        ),
        patch(
            "app.api.internal.invalidate_board_cache",
            new_callable=AsyncMock,
            return_value="board:board-uuid-1:results",
        ),
        patch("app.api.internal.asyncio.create_task"),
    ):
        response = await client.post(
            "/internal/cache/invalidate-vote",
            json=payload,
            headers={"x-webhook-secret": WEBHOOK_SECRET},
        )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert "board-uuid-1" in response.json()["invalidated"]


@pytest.mark.asyncio
async def test_invalidate_vote_wrong_secret(client):
    response = await client.post(
        "/internal/cache/invalidate-vote",
        json={"type": "INSERT", "table": "votes", "record": {}, "old_record": None},
        headers={"x-webhook-secret": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalidate_vote_missing_secret(client):
    """Header mancante → 422 validation error da FastAPI."""
    response = await client.post(
        "/internal/cache/invalidate-vote",
        json={"type": "INSERT", "table": "votes", "record": {}, "old_record": None},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalidate_vote_no_proposal_id(client):
    """record senza proposal_id → ok ma senza invalidazione."""
    payload = {
        "type": "DELETE",
        "table": "votes",
        "record": None,
        "old_record": {"user_id": "user-1"},
    }
    response = await client.post(
        "/internal/cache/invalidate-vote",
        json=payload,
        headers={"x-webhook-secret": WEBHOOK_SECRET},
    )
    assert response.status_code == 200
    assert response.json()["invalidated"] is None
