from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def client():
    """Client ASGI che bypassa Redis e Supabase per test unitari."""
    with (
        patch("app.core.redis.init_redis", new_callable=AsyncMock),
        patch("app.core.redis.close_redis", new_callable=AsyncMock),
        patch("app.core.supabase.get_supabase_admin"),
        # APScheduler non deve girare nei test
        patch("app.main.AsyncIOScheduler"),
    ):
        from app.main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac


@pytest.mark.asyncio
async def test_health_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_health_no_auth_required(client):
    """L'endpoint /health non deve richiedere JWT."""
    response = await client.get("/health")
    assert response.status_code == 200
