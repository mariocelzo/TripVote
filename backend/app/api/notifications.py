from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.api.deps import rate_limit
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_admin
from app.services.email import send_invite

router = APIRouter()


class InviteRequest(BaseModel):
    board_id: str
    emails: list[str]
    personal_message: str | None = None

    @field_validator("emails")
    @classmethod
    def _check_emails(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("Serve almeno un indirizzo email")
        if len(v) > 20:
            raise ValueError("Max 20 email per invito")
        return v


class InviteResponse(BaseModel):
    sent: int
    failed: list[str]


@router.post("/invite", response_model=InviteResponse)
async def send_invite_email(
    body: InviteRequest,
    user: dict = Depends(get_current_user),
) -> InviteResponse:
    """
    Invia email di invito. Richiede ruolo owner sulla board.
    Rate limit: 30 inviti/giorno per utente.
    """
    await rate_limit(user["id"], "invite", max_per_window=30, window_seconds=86400)

    sb = get_supabase_admin()

    member = (
        sb.table("board_members")
        .select("role")
        .eq("board_id", body.board_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not member.data or member.data["role"] != "owner":
        raise HTTPException(status_code=403, detail="Solo l'owner può inviare inviti")

    board = (
        sb.table("boards").select("title, invite_token").eq("id", body.board_id).single().execute()
    )
    if not board.data:
        raise HTTPException(status_code=404, detail="Board non trovata")

    profile = sb.table("profiles").select("display_name").eq("id", user["id"]).single().execute()
    sender_name = profile.data["display_name"] if profile.data else user.get("email", "Un amico")

    sent, failed = await send_invite(
        board_id=body.board_id,
        invite_token=board.data["invite_token"],
        board_title=board.data["title"],
        sender_name=sender_name,
        recipient_emails=body.emails,
        personal_message=body.personal_message,
    )

    return InviteResponse(sent=sent, failed=failed)
