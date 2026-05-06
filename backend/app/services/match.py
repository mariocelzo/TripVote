# Logica di match per le proposte di una board.
# Formula e soglie documentate in MATCH_LOGIC.md.
from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings


@dataclass
class MatchConfig:
    """Parametri di match — default da env, override per board via match_config jsonb."""

    quorum_threshold: float = field(default_factory=lambda: settings.MATCH_QUORUM_THRESHOLD)
    score_threshold: float = field(default_factory=lambda: settings.MATCH_SCORE_THRESHOLD)
    yes_weight: float = field(default_factory=lambda: settings.MATCH_YES_WEIGHT)
    maybe_weight: float = field(default_factory=lambda: settings.MATCH_MAYBE_WEIGHT)
    no_weight: float = field(default_factory=lambda: settings.MATCH_NO_WEIGHT)

    @classmethod
    def from_board_config(cls, match_config: dict[str, Any] | None) -> "MatchConfig":
        """Costruisce MatchConfig dal campo boards.match_config (jsonb)."""
        if not match_config:
            return cls()
        weights = match_config.get("weights", {})
        return cls(
            quorum_threshold=match_config.get("quorum_threshold", settings.MATCH_QUORUM_THRESHOLD),
            score_threshold=match_config.get("score_threshold", settings.MATCH_SCORE_THRESHOLD),
            yes_weight=weights.get("yes", settings.MATCH_YES_WEIGHT),
            maybe_weight=weights.get("maybe", settings.MATCH_MAYBE_WEIGHT),
            no_weight=weights.get("no", settings.MATCH_NO_WEIGHT),
        )


@dataclass(frozen=True)
class ProposalVotes:
    proposal_id: str
    title: str
    category: str
    yes_count: int
    maybe_count: int
    no_count: int


@dataclass(frozen=True)
class MatchResult:
    proposal_id: str
    title: str
    category: str
    yes_count: int
    maybe_count: int
    no_count: int
    total_votes: int
    score: float
    is_match: bool


def compute_match(votes: ProposalVotes, members_count: int, config: MatchConfig) -> MatchResult:
    """
    Calcola score e stato di match per una singola proposta.

    score = (yes*w_yes + maybe*w_maybe + no*w_no) / total_votes  → clampato [0,1]
    quorum = total_votes / members_count
    is_match = quorum >= quorum_threshold AND score >= score_threshold
    """
    total = votes.yes_count + votes.maybe_count + votes.no_count

    if total == 0 or members_count == 0:
        return MatchResult(
            proposal_id=votes.proposal_id,
            title=votes.title,
            category=votes.category,
            yes_count=votes.yes_count,
            maybe_count=votes.maybe_count,
            no_count=votes.no_count,
            total_votes=total,
            score=0.0,
            is_match=False,
        )

    raw_score = (
        votes.yes_count * config.yes_weight
        + votes.maybe_count * config.maybe_weight
        + votes.no_count * config.no_weight
    ) / total

    # Clamp a [0,1] per supportare pesi negativi (vedi MATCH_LOGIC.md §edge cases)
    score = max(0.0, min(1.0, raw_score))
    quorum_ratio = total / members_count

    is_match = quorum_ratio >= config.quorum_threshold and score >= config.score_threshold

    return MatchResult(
        proposal_id=votes.proposal_id,
        title=votes.title,
        category=votes.category,
        yes_count=votes.yes_count,
        maybe_count=votes.maybe_count,
        no_count=votes.no_count,
        total_votes=total,
        score=round(score, 6),
        is_match=is_match,
    )
