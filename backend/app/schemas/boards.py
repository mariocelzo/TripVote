from datetime import datetime

from pydantic import BaseModel


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
