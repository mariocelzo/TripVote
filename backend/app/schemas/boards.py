from datetime import datetime

from pydantic import BaseModel, field_validator


class JoinBoardRequest(BaseModel):
    """Richiesta di adesione a una board tramite invite token."""

    token: str

    @field_validator("token")
    @classmethod
    def _clean_token(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Token di invito mancante")
        return v


class JoinBoardResponse(BaseModel):
    board_id: str
    title: str
    already_member: bool  # True se l'utente era già membro (operazione idempotente)


class ProposalResult(BaseModel):
    proposal_id: str
    title: str
    category: str
    yes_count: int
    maybe_count: int
    no_count: int
    total_votes: int
    score: float
    is_match: bool


class BoardResultsResponse(BaseModel):
    board_id: str
    computed_at: datetime
    members_count: int
    voters_count: int
    quorum_reached: bool
    proposals: list[ProposalResult]
    winners: list[str]  # proposal_id dei match, ordinati per score desc
