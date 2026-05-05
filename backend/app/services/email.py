import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_sendgrid_client() -> Any:
    """Lazy import SendGrid per non bloccare il startup se non configurato."""
    from sendgrid import SendGridAPIClient
    return SendGridAPIClient(settings.SENDGRID_API_KEY)


async def send_invite(
    board_id: str,
    invite_token: str,
    board_title: str,
    sender_name: str,
    recipient_emails: list[str],
    personal_message: str | None = None,
) -> tuple[int, list[str]]:
    """
    Invia email di invito tramite SendGrid.
    Ritorna (n_inviate, email_fallite).
    """
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY non configurata — email non inviate")
        return 0, recipient_emails

    from sendgrid.helpers.mail import Mail

    invite_url = f"https://tripvote.me/join/{invite_token}"
    body = (
        f"{sender_name} ti ha invitato a pianificare: {board_title}\n\n"
        f"{personal_message or ''}\n\n"
        f"Unisciti qui: {invite_url}"
    )

    sent = 0
    failed: list[str] = []
    sg = _get_sendgrid_client()

    for email in recipient_emails:
        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=email,
            subject=f"Invito TripVote: {board_title}",
            plain_text_content=body,
        )
        try:
            sg.send(message)
            sent += 1
        except Exception as exc:
            logger.error("Errore invio email a %s: %s", email, exc)
            failed.append(email)

    return sent, failed


async def send_match_notification(
    board_title: str,
    proposal_title: str,
    category: str,
    member_emails: list[str],
) -> None:
    """Notifica tutti i membri che una proposta ha raggiunto il match."""
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY non configurata — notifica match non inviata")
        return

    from sendgrid.helpers.mail import Mail

    body = (
        f'La proposta "{proposal_title}" ({category}) ha raggiunto il match '
        f'nella board "{board_title}"!\n\n'
        f"Apri TripVote per i dettagli: https://tripvote.me"
    )

    sg = _get_sendgrid_client()
    for email in member_emails:
        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=email,
            subject=f"Match su TripVote: {proposal_title}",
            plain_text_content=body,
        )
        try:
            sg.send(message)
        except Exception as exc:
            logger.error("Errore notifica match a %s: %s", email, exc)
