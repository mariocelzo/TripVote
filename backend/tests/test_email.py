"""Test del service email con SendGrid mockato."""
from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_send_invite_no_api_key(monkeypatch):
    """Senza SENDGRID_API_KEY non invia nulla e ritorna (0, all_emails)."""
    monkeypatch.setattr("app.services.email.settings.SENDGRID_API_KEY", "")
    from app.services.email import send_invite

    sent, failed = await send_invite(
        board_id="b1",
        invite_token="tok",
        board_title="Roma",
        sender_name="Mario",
        recipient_emails=["a@x.com", "b@x.com"],
    )
    assert sent == 0
    assert failed == ["a@x.com", "b@x.com"]


@pytest.mark.asyncio
async def test_send_invite_success(monkeypatch):
    """Con API key configurata invia tutte le email."""
    monkeypatch.setattr("app.services.email.settings.SENDGRID_API_KEY", "SG.test")
    monkeypatch.setattr("app.services.email.settings.SENDGRID_FROM_EMAIL", "noreply@tripvote.me")

    sg_client = MagicMock()
    sg_client.send.return_value = MagicMock(status_code=202)

    with patch("app.services.email._get_sendgrid_client", return_value=sg_client):
        from app.services.email import send_invite

        sent, failed = await send_invite(
            board_id="b1",
            invite_token="tok123",
            board_title="Lisbona",
            sender_name="Mario",
            recipient_emails=["alice@x.com", "bob@x.com"],
            personal_message="Andiamo!",
        )

    assert sent == 2
    assert failed == []
    assert sg_client.send.call_count == 2


@pytest.mark.asyncio
async def test_send_invite_partial_failure(monkeypatch):
    """Se una email fallisce, l'altra viene comunque inviata."""
    monkeypatch.setattr("app.services.email.settings.SENDGRID_API_KEY", "SG.test")
    monkeypatch.setattr("app.services.email.settings.SENDGRID_FROM_EMAIL", "noreply@tripvote.me")

    sg_client = MagicMock()
    sg_client.send.side_effect = [Exception("SendGrid error"), MagicMock()]

    with patch("app.services.email._get_sendgrid_client", return_value=sg_client):
        from app.services.email import send_invite

        sent, failed = await send_invite(
            board_id="b1",
            invite_token="tok",
            board_title="Parigi",
            sender_name="Mario",
            recipient_emails=["bad@x.com", "good@x.com"],
        )

    assert sent == 1
    assert "bad@x.com" in failed


@pytest.mark.asyncio
async def test_send_match_notification_no_key(monkeypatch):
    """Senza API key la notifica è silente (no eccezioni)."""
    monkeypatch.setattr("app.services.email.settings.SENDGRID_API_KEY", "")
    from app.services.email import send_match_notification

    # Non deve sollevare eccezioni
    await send_match_notification("Roma", "Hotel X", "hotel", ["u@x.com"])


@pytest.mark.asyncio
async def test_send_match_notification_success(monkeypatch):
    monkeypatch.setattr("app.services.email.settings.SENDGRID_API_KEY", "SG.test")
    monkeypatch.setattr("app.services.email.settings.SENDGRID_FROM_EMAIL", "noreply@tripvote.me")

    sg_client = MagicMock()
    with patch("app.services.email._get_sendgrid_client", return_value=sg_client):
        from app.services.email import send_match_notification

        await send_match_notification("Roma", "Hotel X", "hotel", ["u@x.com"])

    sg_client.send.assert_called_once()
