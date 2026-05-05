"""Test del client Redis: init, close, get_redis."""
from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_get_redis_before_init():
    """get_redis() deve sollevare RuntimeError se non inizializzato."""
    import app.core.redis as redis_mod

    # Salva e azzera il client
    original = redis_mod._redis_client
    redis_mod._redis_client = None
    try:
        with pytest.raises(RuntimeError, match="non inizializzato"):
            redis_mod.get_redis()
    finally:
        redis_mod._redis_client = original


@pytest.mark.asyncio
async def test_init_and_close_redis():
    """init_redis e close_redis gestiscono il ciclo di vita del client."""
    mock_client = AsyncMock()
    mock_client.ping = AsyncMock()
    mock_client.aclose = AsyncMock()

    with patch("app.core.redis.aioredis.from_url", return_value=mock_client):
        import app.core.redis as redis_mod

        await redis_mod.init_redis()
        assert redis_mod._redis_client is mock_client
        mock_client.ping.assert_called_once()

        returned = redis_mod.get_redis()
        assert returned is mock_client

        await redis_mod.close_redis()
        mock_client.aclose.assert_called_once()
        assert redis_mod._redis_client is None
