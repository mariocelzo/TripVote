"""
Test della logica di match — copertura dei 5 esempi di MATCH_LOGIC.md + edge cases.
Board di riferimento: 6 membri.
"""
from app.services.match import MatchConfig, ProposalVotes, compute_match

MEMBERS_6 = 6


def pv(yes: int, maybe: int, no: int, proposal_id: str = "p1") -> ProposalVotes:
    return ProposalVotes(proposal_id=proposal_id, title="Test", category="hotel",
                        yes_count=yes, maybe_count=maybe, no_count=no)


DEFAULT = MatchConfig()


# -------- 5 esempi del documento --------

def test_match_case_1():
    """4 Sì, 1 Forse, 0 No su 6 → match (score 0.90, quorum 0.83)."""
    r = compute_match(pv(4, 1, 0), members_count=MEMBERS_6, config=DEFAULT)
    assert r.is_match is True
    assert abs(r.score - 0.9) < 0.001


def test_match_case_2():
    """3 Sì, 0 Forse, 0 No su 6 → match (score 1.0, quorum 0.50)."""
    r = compute_match(pv(3, 0, 0), members_count=MEMBERS_6, config=DEFAULT)
    assert r.is_match is True
    assert r.score == 1.0


def test_no_match_low_score():
    """2 Sì, 1 Forse, 1 No su 6 → no match (score 0.625 < 0.7)."""
    r = compute_match(pv(2, 1, 1), members_count=MEMBERS_6, config=DEFAULT)
    assert r.is_match is False
    assert abs(r.score - 0.625) < 0.001


def test_no_match_no_quorum():
    """2 Sì su 6 → no match (quorum 0.33 < 0.5)."""
    r = compute_match(pv(2, 0, 0), members_count=MEMBERS_6, config=DEFAULT)
    assert r.is_match is False


def test_no_match_all_maybe():
    """6 Forse su 6 → no match (score 0.50 < 0.7)."""
    r = compute_match(pv(0, 6, 0), members_count=MEMBERS_6, config=DEFAULT)
    assert r.is_match is False
    assert r.score == 0.5


# -------- Edge cases --------

def test_zero_votes():
    r = compute_match(pv(0, 0, 0), members_count=MEMBERS_6, config=DEFAULT)
    assert r.is_match is False
    assert r.score == 0.0


def test_zero_members():
    """members_count=0 impossibile in prod, ma non deve sollevare eccezioni."""
    r = compute_match(pv(1, 0, 0), members_count=0, config=DEFAULT)
    assert r.is_match is False


def test_idempotency():
    v = pv(4, 1, 0)
    r1 = compute_match(v, members_count=MEMBERS_6, config=DEFAULT)
    r2 = compute_match(v, members_count=MEMBERS_6, config=DEFAULT)
    assert r1 == r2


# -------- Custom match_config --------

def test_custom_config_stricter():
    """Con quorum 0.66, caso 2 (3 sì su 6 = quorum 0.50) non deve fare match."""
    cfg = MatchConfig(quorum_threshold=0.66, score_threshold=0.8)
    r = compute_match(pv(3, 0, 0), members_count=MEMBERS_6, config=cfg)
    assert r.is_match is False


def test_negative_weight_clamp():
    """Pesi negativi sul No: score raw < 0 → clampato a 0.0."""
    cfg = MatchConfig(yes_weight=1.0, maybe_weight=0.3, no_weight=-0.5)
    # 0 sì, 0 forse, 6 no → raw = -3/6 = -0.5 → clamp → 0.0
    r = compute_match(pv(0, 0, 6), members_count=MEMBERS_6, config=cfg)
    assert r.score == 0.0
    assert r.is_match is False


def test_from_board_config_override():
    """MatchConfig.from_board_config legge correttamente il jsonb di boards."""
    cfg = MatchConfig.from_board_config({
        "quorum_threshold": 0.6,
        "score_threshold": 0.75,
        "weights": {"yes": 1.0, "maybe": 0.2, "no": 0.0},
    })
    assert cfg.quorum_threshold == 0.6
    assert cfg.score_threshold == 0.75
    assert cfg.maybe_weight == 0.2


def test_from_board_config_none():
    """from_board_config(None) deve restituire i default globali."""
    cfg = MatchConfig.from_board_config(None)
    assert cfg.quorum_threshold == DEFAULT.quorum_threshold
