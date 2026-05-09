"""Test del client Redis: init, close, get_redis."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_get_redis_lazy_init():
    """get_redis() crea il client on-the-fly se non ancora inizializzato (lazy init serverless)."""
    import app.core.redis as redis_mod

    mock_client = AsyncMock()
    original = redis_mod._redis_client
    redis_mod._redis_client = None
    try:
        with patch("app.core.redis.aioredis.from_url", return_value=mock_client):
            result = redis_mod.get_redis()
            # Deve restituire un client, non alzare eccezioni
            assert result is mock_client
    finally:
        redis_mod._redis_client = original


@pytest.mark.asyncio
async def test_init_and_close_redis():
    """init_redis setta il client, close_redis lo azzera."""
    mock_client = AsyncMock()
    mock_client.aclose = AsyncMock()

    with patch("app.core.redis.aioredis.from_url", return_value=mock_client):
        import app.core.redis as redis_mod

        await redis_mod.init_redis()
        assert redis_mod._redis_client is mock_client
        # init_redis è lazy: non chiama ping per evitare blocchi al cold start Vercel
        mock_client.ping.assert_not_called()

        returned = redis_mod.get_redis()
        assert returned is mock_client

        await redis_mod.close_redis()
        mock_client.aclose.assert_called_once()
        assert redis_mod._redis_client is None
