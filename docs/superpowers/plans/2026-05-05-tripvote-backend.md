# TripVote Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffoldare e implementare il backend FastAPI completo di TripVote, con tutti gli endpoint definiti in `API_SPEC.md`, la logica match di `MATCH_LOGIC.md`, cache Redis, scraping link preview, email SendGrid e webhook Supabase.

**Architecture:** Il FE parla direttamente a Supabase per CRUD/auth/realtime; il BE FastAPI viene chiamato solo per link preview/scraping, aggregazioni Redis cache-aside, email transazionali e webhook di invalidazione cache. Auth via JWT condiviso con Supabase (HS256, audience `authenticated`). RLS su Postgres è la difesa principale.

**Tech Stack:** Python 3.12, FastAPI 0.115, Pydantic v2, pydantic-settings, PyJWT, supabase-py, redis-py async, httpx, BeautifulSoup4, opengraph-py3, sendgrid, sentry-sdk, APScheduler, pytest, pytest-asyncio, pytest-httpx, ruff.

---

## File Map

| File | Responsabilità |
|---|---|
| `backend/app/__init__.py` | package marker |
| `backend/app/main.py` | FastAPI app, CORS, middleware Sentry, routers, lifespan |
| `backend/app/core/__init__.py` | package marker |
| `backend/app/core/config.py` | `Settings` via pydantic-settings |
| `backend/app/core/auth.py` | `get_current_user` dependency (JWT verify) |
| `backend/app/core/redis.py` | client Redis async (Upstash) |
| `backend/app/core/supabase.py` | service-role client Supabase |
| `backend/app/core/logging.py` | configurazione logging standard |
| `backend/app/core/sentry.py` | init Sentry (no-op se DSN mancante) |
| `backend/app/schemas/__init__.py` | package marker |
| `backend/app/schemas/proposals.py` | `PreviewRequest`, `PreviewResponse` |
| `backend/app/schemas/boards.py` | `BoardResultsResponse`, `ProposalResult` |
| `backend/app/services/__init__.py` | package marker |
| `backend/app/services/match.py` | `compute_match()`, `MatchConfig` |
| `backend/app/services/scraper.py` | `scrape_link_preview()` |
| `backend/app/services/board_results.py` | `get_board_results()` cache-aside |
| `backend/app/services/email.py` | `send_invite()`, `send_match_notification()` |
| `backend/app/api/__init__.py` | package marker |
| `backend/app/api/deps.py` | `require_board_member()`, `require_board_editor()`, rate-limit helpers |
| `backend/app/api/health.py` | `GET /health` |
| `backend/app/api/proposals.py` | `POST /proposals/preview` |
| `backend/app/api/boards.py` | `GET /boards/{id}/results`, `POST /boards/{id}/recompute` |
| `backend/app/api/notifications.py` | `POST /notifications/invite` |
| `backend/app/api/internal.py` | `POST /internal/cache/invalidate-vote`, `POST /internal/cron/close-expired-boards` |
| `backend/tests/conftest.py` | fixtures condivise (app, client, mock Redis, mock JWT) |
| `backend/tests/test_health.py` | test GET /health |
| `backend/tests/test_auth.py` | test JWT dependency |
| `backend/tests/test_match.py` | test logica match (5 esempi + edge cases) |
| `backend/tests/test_scraper.py` | test scraper con pytest-httpx |
| `backend/tests/test_boards.py` | test GET /boards/{id}/results |
| `backend/tests/test_internal.py` | test webhook invalidate-vote |
| `backend/.env.example` | template variabili d'ambiente |

---

## Task 1: Scaffolding — directory e file vuoti

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/.env.example`

- [ ] **Step 1: Crea la struttura di directory e i package marker**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/backend
mkdir -p app/core app/api app/services app/schemas tests
touch app/__init__.py
touch app/core/__init__.py
touch app/api/__init__.py
touch app/services/__init__.py
touch app/schemas/__init__.py
touch tests/__init__.py
```

- [ ] **Step 2: Crea `.env.example`**

Contenuto di `backend/.env.example`:
```bash
ENV=development

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxxxx
SUPABASE_WEBHOOK_SECRET=xxxxx

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@tripvote.me

# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# Match thresholds
MATCH_QUORUM_THRESHOLD=0.5
MATCH_SCORE_THRESHOLD=0.7
MATCH_YES_WEIGHT=1.0
MATCH_MAYBE_WEIGHT=0.5
MATCH_NO_WEIGHT=0.0

# Internal secrets
CRON_SECRET=change-me-in-production
```

- [ ] **Step 3: Commit**

```bash
git add backend/app backend/tests backend/.env.example
git commit -m "chore: scaffold backend directory structure"
```

---

## Task 2: Core — `config.py`

**Files:**
- Create: `backend/app/core/config.py`

- [ ] **Step 1: Scrivi il test**

```python
# backend/tests/test_config.py
import pytest
from pydantic import ValidationError


def test_settings_require_supabase_url(monkeypatch):
    """Settings deve fallire se mancano le variabili obbligatorie."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    # Re-import per forzare la validazione
    import importlib
    import app.core.config as cfg_mod
    with pytest.raises((ValidationError, Exception)):
        importlib.reload(cfg_mod)
        _ = cfg_mod.Settings()


def test_settings_defaults():
    """I default numerici del match devono essere quelli documentati."""
    import os
    os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
    os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
    from app.core.config import Settings
    s = Settings()
    assert s.MATCH_QUORUM_THRESHOLD == 0.5
    assert s.MATCH_SCORE_THRESHOLD == 0.7
    assert s.MATCH_YES_WEIGHT == 1.0
    assert s.MATCH_MAYBE_WEIGHT == 0.5
    assert s.MATCH_NO_WEIGHT == 0.0
```

- [ ] **Step 2: Implementa `config.py`**

```python
# backend/app/core/config.py
import os
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Ambiente
    ENV: str = "production"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_WEBHOOK_SECRET: str = ""

    # Redis
    REDIS_URL: str

    # SendGrid
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@tripvote.me"

    # Sentry
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"

    # Match thresholds (overridabili per board via match_config jsonb)
    MATCH_QUORUM_THRESHOLD: float = 0.5
    MATCH_SCORE_THRESHOLD: float = 0.7
    MATCH_YES_WEIGHT: float = 1.0
    MATCH_MAYBE_WEIGHT: float = 0.5
    MATCH_NO_WEIGHT: float = 0.0

    # Cron
    CRON_SECRET: str = ""

    @field_validator("MATCH_QUORUM_THRESHOLD", "MATCH_SCORE_THRESHOLD")
    @classmethod
    def _check_threshold(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("threshold deve essere in [0, 1]")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Singleton globale — usare get_settings() nei test per poterlo sovrascrivere
settings: Settings = get_settings()
```

- [ ] **Step 3: Esegui i test**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/backend
pytest tests/test_config.py -v
```

Expected: PASS (almeno `test_settings_defaults`)

- [ ] **Step 4: Commit**

```bash
git add app/core/config.py tests/test_config.py
git commit -m "feat: add pydantic-settings config"
```

---

## Task 3: Core — `logging.py` + `sentry.py`

**Files:**
- Create: `backend/app/core/logging.py`
- Create: `backend/app/core/sentry.py`

- [ ] **Step 1: Implementa `logging.py`**

```python
# backend/app/core/logging.py
import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configura il root logger con formato JSON-like per produzione."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )
    # Silenzia i logger verbosi di librerie terze
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
```

- [ ] **Step 2: Implementa `sentry.py`**

```python
# backend/app/core/sentry.py
import logging

logger = logging.getLogger(__name__)


def init_sentry(dsn: str, environment: str, release: str | None = None) -> None:
    """Inizializza Sentry. Se il DSN è vuoto, non fa nulla (utile in test/dev)."""
    if not dsn:
        logger.info("Sentry DSN non configurato — monitoring disabilitato")
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            release=release,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.1,  # 10% delle transazioni
            send_default_pii=False,   # mai PII di default
        )
        logger.info("Sentry inizializzato (env=%s)", environment)
    except ImportError:
        logger.warning("sentry-sdk non installato, monitoring disabilitato")
```

- [ ] **Step 3: Commit**

```bash
git add app/core/logging.py app/core/sentry.py
git commit -m "feat: add logging and sentry init"
```

---

## Task 4: Core — `redis.py` + `supabase.py`

**Files:**
- Create: `backend/app/core/redis.py`
- Create: `backend/app/core/supabase.py`

- [ ] **Step 1: Implementa `redis.py`**

```python
# backend/app/core/redis.py
import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Client singleton — creato in lifespan, non al module level
# per evitare connessioni nelle importazioni durante i test.
_redis_client: aioredis.Redis | None = None


async def init_redis() -> None:
    """Apre la connessione Redis. Chiamato nel lifespan di FastAPI."""
    global _redis_client
    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    await _redis_client.ping()
    logger.info("Redis connesso")


async def close_redis() -> None:
    """Chiude la connessione Redis."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


def get_redis() -> aioredis.Redis:
    """Restituisce il client Redis. Lancia RuntimeError se non inizializzato."""
    if _redis_client is None:
        raise RuntimeError("Redis non inizializzato — chiamare init_redis() nel lifespan")
    return _redis_client
```

- [ ] **Step 2: Implementa `supabase.py`**

```python
# backend/app/core/supabase.py
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase_admin() -> Client:
    """Client Supabase con service-role key (bypass RLS). Usare solo nel BE."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

- [ ] **Step 3: Commit**

```bash
git add app/core/redis.py app/core/supabase.py
git commit -m "feat: add Redis and Supabase service-role clients"
```

---

## Task 5: Core — `auth.py`

**Files:**
- Create: `backend/app/core/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Scrivi i test**

```python
# backend/tests/test_auth.py
import time
import jwt
import pytest
from fastapi import HTTPException


SECRET = "test-secret-32-bytes-long-padding!!"

def _make_token(sub: str = "user-123", email: str = "test@example.com",
                audience: str = "authenticated", exp_offset: int = 3600) -> str:
    payload = {
        "sub": sub,
        "email": email,
        "aud": audience,
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def test_valid_token(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", SECRET)
    from app.core.auth import _decode_token
    user = _decode_token(_make_token())
    assert user["id"] == "user-123"
    assert user["email"] == "test@example.com"


def test_expired_token(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", SECRET)
    from app.core.auth import _decode_token
    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token(exp_offset=-1))
    assert exc.value.status_code == 401


def test_wrong_audience(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", SECRET)
    from app.core.auth import _decode_token
    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token(audience="anon"))
    assert exc.value.status_code == 401


def test_invalid_secret(monkeypatch):
    monkeypatch.setattr("app.core.auth.settings.SUPABASE_JWT_SECRET", "wrong-secret")
    from app.core.auth import _decode_token
    with pytest.raises(HTTPException) as exc:
        _decode_token(_make_token())
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Esegui i test per verificare il fallimento**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/backend
pytest tests/test_auth.py -v
```

Expected: ImportError o NameError su `_decode_token`

- [ ] **Step 3: Implementa `auth.py`**

```python
# backend/app/core/auth.py
import logging

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    """Verifica e decodifica un JWT Supabase. Lancia HTTPException 401 se invalido."""
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return {"id": payload["sub"], "email": payload.get("email", "")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Audience non valida")
    except jwt.PyJWTError as exc:
        logger.warning("JWT non valido: %s", exc)
        raise HTTPException(status_code=401, detail="Token non valido")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> dict:
    """FastAPI dependency — restituisce {'id': uuid, 'email': str}."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header mancante")
    return _decode_token(credentials.credentials)
```

- [ ] **Step 4: Esegui i test**

```bash
pytest tests/test_auth.py -v
```

Expected: 4 PASS

- [ ] **Step 5: Commit**

```bash
git add app/core/auth.py tests/test_auth.py
git commit -m "feat: add JWT auth dependency"
```

---

## Task 6: Schemas

**Files:**
- Create: `backend/app/schemas/proposals.py`
- Create: `backend/app/schemas/boards.py`

- [ ] **Step 1: Implementa `schemas/proposals.py`**

```python
# backend/app/schemas/proposals.py
from pydantic import BaseModel, HttpUrl, field_validator


class PreviewRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL deve iniziare con http:// o https://")
        return v


class PreviewResponse(BaseModel):
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    price_cents: int | None = None
    currency: str | None = None
    site_name: str | None = None
    lat: float | None = None
    lng: float | None = None
```

- [ ] **Step 2: Implementa `schemas/boards.py`**

```python
# backend/app/schemas/boards.py
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
    winners: list[str]  # proposal_id dei match ordinati per score
```

- [ ] **Step 3: Commit**

```bash
git add app/schemas/proposals.py app/schemas/boards.py
git commit -m "feat: add Pydantic schemas for proposals and boards"
```

---

## Task 7: Service — `match.py`

**Files:**
- Create: `backend/app/services/match.py`
- Create: `backend/tests/test_match.py`

- [ ] **Step 1: Scrivi i test**

```python
# backend/tests/test_match.py
"""
Testa la logica di match secondo MATCH_LOGIC.md.
Board con 6 membri come riferimento.
"""
import pytest
from app.services.match import MatchConfig, ProposalVotes, compute_match


MEMBERS_6 = 6

# Helper per costruire ProposalVotes
def pv(yes: int, maybe: int, no: int, proposal_id: str = "p1") -> ProposalVotes:
    return ProposalVotes(
        proposal_id=proposal_id,
        title="Test",
        category="hotel",
        yes_count=yes,
        maybe_count=maybe,
        no_count=no,
    )


DEFAULT_CFG = MatchConfig()


# -------- I 5 esempi del documento --------

def test_match_case_1():
    """4 Sì, 1 Forse, 0 No su 6 membri → match (score 0.90, quorum 0.83)."""
    result = compute_match(pv(4, 1, 0), members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert result.is_match is True
    assert abs(result.score - 0.9) < 0.001


def test_match_case_2():
    """3 Sì, 0 Forse, 0 No su 6 membri → match (score 1.0, quorum 0.50)."""
    result = compute_match(pv(3, 0, 0), members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert result.is_match is True
    assert result.score == 1.0


def test_no_match_low_score():
    """2 Sì, 1 Forse, 1 No su 6 membri → no match (score 0.625 < 0.7)."""
    result = compute_match(pv(2, 1, 1), members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert result.is_match is False
    assert abs(result.score - 0.625) < 0.001


def test_no_match_no_quorum():
    """2 Sì su 6 membri → no match (quorum 0.33 < 0.5)."""
    result = compute_match(pv(2, 0, 0), members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert result.is_match is False


def test_no_match_all_maybe():
    """6 Forse su 6 → no match (score 0.50 < 0.7)."""
    result = compute_match(pv(0, 6, 0), members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert result.is_match is False
    assert result.score == 0.5


# -------- Edge cases --------

def test_zero_votes():
    result = compute_match(pv(0, 0, 0), members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert result.is_match is False
    assert result.score == 0.0


def test_zero_members():
    """Impossibile in prod, ma sicuro per safety."""
    result = compute_match(pv(1, 0, 0), members_count=0, config=DEFAULT_CFG)
    assert result.is_match is False


def test_idempotency():
    v = pv(4, 1, 0)
    r1 = compute_match(v, members_count=MEMBERS_6, config=DEFAULT_CFG)
    r2 = compute_match(v, members_count=MEMBERS_6, config=DEFAULT_CFG)
    assert r1 == r2


# -------- Custom match_config --------

def test_custom_config_stricter():
    cfg = MatchConfig(quorum_threshold=0.66, score_threshold=0.8)
    # caso 2: 3 sì su 6 = quorum 0.50 < 0.66 → no match
    result = compute_match(pv(3, 0, 0), members_count=MEMBERS_6, config=cfg)
    assert result.is_match is False


def test_negative_weight_clamp():
    """Pesi negativi sul No: lo score deve essere clampato a [0, 1]."""
    cfg = MatchConfig(yes_weight=1.0, maybe_weight=0.3, no_weight=-0.5)
    # 0 sì, 0 forse, 6 no → score raw = (0 - 3) / 6 = -0.5 → clamp → 0.0
    result = compute_match(pv(0, 0, 6), members_count=MEMBERS_6, config=cfg)
    assert result.score == 0.0
    assert result.is_match is False
```

- [ ] **Step 2: Esegui i test per verificare il fallimento**

```bash
pytest tests/test_match.py -v
```

Expected: ImportError su `app.services.match`

- [ ] **Step 3: Implementa `match.py`**

```python
# backend/app/services/match.py
from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings


@dataclass
class MatchConfig:
    """Parametri di match. Valori di default letti da env (MATCH_* vars)."""
    quorum_threshold: float = field(default_factory=lambda: settings.MATCH_QUORUM_THRESHOLD)
    score_threshold: float = field(default_factory=lambda: settings.MATCH_SCORE_THRESHOLD)
    yes_weight: float = field(default_factory=lambda: settings.MATCH_YES_WEIGHT)
    maybe_weight: float = field(default_factory=lambda: settings.MATCH_MAYBE_WEIGHT)
    no_weight: float = field(default_factory=lambda: settings.MATCH_NO_WEIGHT)

    @classmethod
    def from_board_config(cls, match_config: dict[str, Any] | None) -> "MatchConfig":
        """Costruisce un MatchConfig da boards.match_config jsonb (override per board)."""
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

    Score = (yes*w_yes + maybe*w_maybe + no*w_no) / total_votes
    Clampato a [0, 1] per supportare pesi negativi.
    Quorum = total_votes / members_count.
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

    score = max(0.0, min(1.0, raw_score))
    quorum_ratio = total / members_count

    is_match = (
        quorum_ratio >= config.quorum_threshold
        and score >= config.score_threshold
    )

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
```

- [ ] **Step 4: Esegui i test**

```bash
pytest tests/test_match.py -v
```

Expected: tutti PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/match.py tests/test_match.py
git commit -m "feat: implement match logic with full test coverage"
```

---

## Task 8: Service — `scraper.py`

**Files:**
- Create: `backend/app/services/scraper.py`
- Create: `backend/tests/test_scraper.py`

- [ ] **Step 1: Scrivi i test**

```python
# backend/tests/test_scraper.py
import pytest
from pytest_httpx import HTTPXMock
from fastapi import HTTPException


BOOKING_HTML = """
<html>
<head>
  <meta property="og:title" content="Hotel Roma Centro" />
  <meta property="og:description" content="Bellissimo hotel" />
  <meta property="og:image" content="https://example.com/img.jpg" />
  <meta property="og:site_name" content="Booking.com" />
  <meta property="og:price:amount" content="120.50" />
  <meta property="og:price:currency" content="EUR" />
</head>
<body><title>Hotel Roma Centro</title></body>
</html>
"""

MINIMAL_HTML = """
<html><head><title>Solo titolo</title></head><body></body></html>
"""


@pytest.mark.asyncio
async def test_scrape_full_opengraph(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://www.booking.com/hotel/it/example.html",
        text=BOOKING_HTML,
        headers={"content-type": "text/html"},
    )
    from app.services.scraper import scrape_link_preview
    result = await scrape_link_preview("https://www.booking.com/hotel/it/example.html")
    assert result.title == "Hotel Roma Centro"
    assert result.description == "Bellissimo hotel"
    assert result.image_url == "https://example.com/img.jpg"
    assert result.site_name == "Booking.com"
    assert result.price_cents == 12050
    assert result.currency == "EUR"


@pytest.mark.asyncio
async def test_scrape_fallback_title(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://example.com/page",
        text=MINIMAL_HTML,
        headers={"content-type": "text/html"},
    )
    from app.services.scraper import scrape_link_preview
    result = await scrape_link_preview("https://example.com/page")
    assert result.title == "Solo titolo"
    assert result.image_url is None


@pytest.mark.asyncio
async def test_scrape_http_error(httpx_mock: HTTPXMock):
    import httpx
    httpx_mock.add_exception(
        httpx.ConnectError("connection refused"),
        url="https://unreachable.example.com/",
    )
    from app.services.scraper import scrape_link_preview
    with pytest.raises(HTTPException) as exc:
        await scrape_link_preview("https://unreachable.example.com/")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_scrape_bad_status(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://example.com/404",
        status_code=404,
    )
    from app.services.scraper import scrape_link_preview
    with pytest.raises(HTTPException) as exc:
        await scrape_link_preview("https://example.com/404")
    assert exc.value.status_code in (400, 502)
```

- [ ] **Step 2: Verifica che i test falliscano**

```bash
pytest tests/test_scraper.py -v
```

Expected: ImportError

- [ ] **Step 3: Implementa `scraper.py`**

```python
# backend/app/services/scraper.py
import hashlib
import json
import logging
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.core.redis import get_redis
from app.schemas.proposals import PreviewResponse

logger = logging.getLogger(__name__)

_CACHE_TTL = 3600  # 1 ora — stesso URL linkato da più persone

_PRICE_PATTERN = re.compile(r"[\d]+(?:[.,]\d{1,2})?")


def _extract_price_cents(value: str | None, currency_hint: str | None = None) -> tuple[int | None, str | None]:
    """Converte una stringa prezzo in centesimi. Restituisce (price_cents, currency)."""
    if not value:
        return None, currency_hint
    match = _PRICE_PATTERN.search(value.replace(",", "."))
    if not match:
        return None, currency_hint
    try:
        euros = float(match.group())
        return int(round(euros * 100)), currency_hint or "EUR"
    except ValueError:
        return None, currency_hint


def _parse_html(html: str, url: str) -> PreviewResponse:
    """Parsa HTML per estrarre metadati OG con fallback su tag standard."""
    soup = BeautifulSoup(html, "lxml")

    def og(prop: str) -> str | None:
        tag = soup.find("meta", attrs={"property": prop})
        return tag["content"].strip() if tag and tag.get("content") else None  # type: ignore[index]

    def meta(name: str) -> str | None:
        tag = soup.find("meta", attrs={"name": name})
        return tag["content"].strip() if tag and tag.get("content") else None  # type: ignore[index]

    title = og("og:title") or (soup.title.string.strip() if soup.title else None)
    description = og("og:description") or meta("description")
    image_url = og("og:image")
    site_name = og("og:site_name")

    raw_price = og("og:price:amount") or og("product:price:amount")
    raw_currency = og("og:price:currency") or og("product:price:currency")
    price_cents, currency = _extract_price_cents(raw_price, raw_currency)

    return PreviewResponse(
        title=title,
        description=description,
        image_url=image_url,
        site_name=site_name,
        price_cents=price_cents,
        currency=currency,
    )


async def scrape_link_preview(url: str) -> PreviewResponse:
    """
    Scarica e parsa i metadati OG di un URL.
    Usa Redis come cache (TTL 1h) con key preview:<sha1(url)>.
    """
    cache_key = f"preview:{hashlib.sha1(url.encode()).hexdigest()}"  # noqa: S324

    # -- Cache hit --
    try:
        redis = get_redis()
        cached = await redis.get(cache_key)
        if cached:
            return PreviewResponse(**json.loads(cached))
    except Exception:
        pass  # se Redis è down, degrada gracefully

    # -- Fetch --
    try:
        async with httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers={"User-Agent": "TripVote-Bot/1.0 (+https://tripvote.me)"},
        ) as client:
            response = await client.get(url)
    except httpx.HTTPError as exc:
        logger.warning("Scraping fallito per %s: %s", url, exc)
        raise HTTPException(status_code=400, detail=f"URL non raggiungibile: {exc}")

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502 if response.status_code >= 500 else 400,
            detail=f"Il sito ha risposto con status {response.status_code}",
        )

    content_type = response.headers.get("content-type", "")
    if "html" not in content_type:
        raise HTTPException(status_code=400, detail="URL non punta a una pagina HTML")

    result = _parse_html(response.text, url)

    # -- Cache set --
    try:
        redis = get_redis()
        await redis.set(cache_key, result.model_dump_json(), ex=_CACHE_TTL)
    except Exception:
        pass

    return result
```

- [ ] **Step 4: Esegui i test**

```bash
pytest tests/test_scraper.py -v
```

Expected: tutti PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/scraper.py tests/test_scraper.py
git commit -m "feat: add link preview scraper with Redis cache"
```

---

## Task 9: Service — `board_results.py` + `email.py`

**Files:**
- Create: `backend/app/services/board_results.py`
- Create: `backend/app/services/email.py`

- [ ] **Step 1: Implementa `board_results.py`**

```python
# backend/app/services/board_results.py
import json
import logging
from datetime import UTC, datetime

from app.core.redis import get_redis
from app.core.supabase import get_supabase_admin
from app.schemas.boards import BoardResultsResponse, ProposalResult
from app.services.match import MatchConfig, ProposalVotes, compute_match

logger = logging.getLogger(__name__)

_CACHE_TTL = 30  # secondi (vedi ARCHITECTURE_BACKEND.md §5)
_CACHE_KEY = "board:{board_id}:results"


async def get_board_results(board_id: str) -> BoardResultsResponse:
    """
    Restituisce i risultati aggregati della board con stato di match.
    Cache-aside: Redis TTL 30s, miss → query Supabase view proposal_results.
    """
    key = _CACHE_KEY.format(board_id=board_id)

    # -- Cache hit --
    try:
        redis = get_redis()
        cached = await redis.get(key)
        if cached:
            return BoardResultsResponse(**json.loads(cached))
    except Exception:
        pass

    sb = get_supabase_admin()

    # Conta i membri della board
    members_res = (
        sb.table("board_members")
        .select("user_id", count="exact")
        .eq("board_id", board_id)
        .execute()
    )
    members_count: int = members_res.count or 0

    # Carica il match_config della board (per override soglie)
    board_res = sb.table("boards").select("match_config").eq("id", board_id).single().execute()
    match_config = MatchConfig.from_board_config(board_res.data.get("match_config"))

    # Carica i risultati aggregati dalla view
    results_res = (
        sb.table("proposal_results")
        .select("*")
        .eq("board_id", board_id)
        .execute()
    )

    proposals: list[ProposalResult] = []
    voters_set: set[str] = set()

    for row in results_res.data:
        votes = ProposalVotes(
            proposal_id=row["proposal_id"],
            title=row["title"],
            category=row["category"],
            yes_count=row["yes_count"] or 0,
            maybe_count=row["maybe_count"] or 0,
            no_count=row["no_count"] or 0,
        )
        match_result = compute_match(votes, members_count=members_count, config=match_config)
        proposals.append(
            ProposalResult(
                proposal_id=row["proposal_id"],
                title=row["title"],
                category=row["category"],
                yes_count=match_result.yes_count,
                maybe_count=match_result.maybe_count,
                no_count=match_result.no_count,
                total_votes=match_result.total_votes,
                score=match_result.score,
                is_match=match_result.is_match,
            )
        )

    # Ordina i vincitori: score desc → yes_count desc → created_at asc (approssimato)
    winners = sorted(
        [p.proposal_id for p in proposals if p.is_match],
        key=lambda pid: next(
            (-p.score, -p.yes_count) for p in proposals if p.proposal_id == pid
        ),
    )

    quorum_reached = members_count > 0 and any(
        (p.yes_count + p.maybe_count + p.no_count) / members_count
        >= match_config.quorum_threshold
        for p in proposals
    )

    response = BoardResultsResponse(
        board_id=board_id,
        computed_at=datetime.now(UTC),
        members_count=members_count,
        voters_count=len(voters_set),
        quorum_reached=quorum_reached,
        proposals=proposals,
        winners=winners,
    )

    # -- Cache set --
    try:
        redis = get_redis()
        await redis.set(key, response.model_dump_json(), ex=_CACHE_TTL)
    except Exception:
        pass

    return response


async def invalidate_board_cache(board_id: str) -> str:
    """Elimina la cache aggregata di una board. Ritorna la key eliminata."""
    key = _CACHE_KEY.format(board_id=board_id)
    try:
        redis = get_redis()
        await redis.delete(key)
    except Exception as exc:
        logger.warning("Impossibile invalidare cache per board %s: %s", board_id, exc)
    return key
```

- [ ] **Step 2: Implementa `email.py`**

```python
# backend/app/services/email.py
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_sendgrid_client() -> Any:
    """Lazy import SendGrid per evitare import a livello modulo nei test."""
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
    Manda email di invito via SendGrid.
    Ritorna (n_sent, failed_emails).
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
    """Notifica tutti i membri della board che una proposta è diventata match."""
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY non configurata — notifica match non inviata")
        return

    from sendgrid.helpers.mail import Mail

    body = (
        f"La proposta \"{proposal_title}\" ({category}) ha raggiunto il match "
        f"nella board \"{board_title}\"! 🎉\n\n"
        f"Apri TripVote per vedere i dettagli: https://tripvote.me"
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
```

- [ ] **Step 3: Commit**

```bash
git add app/services/board_results.py app/services/email.py
git commit -m "feat: add board_results cache-aside service and email wrapper"
```

---

## Task 10: API — `deps.py` + `health.py`

**Files:**
- Create: `backend/app/api/deps.py`
- Create: `backend/app/api/health.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Scrivi il test health**

```python
# backend/tests/test_health.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch


@pytest.fixture
async def client():
    """Client HTTP per testare l'app FastAPI."""
    # Patcha i client esterni per non avere dipendenze in test
    with (
        patch("app.core.redis.init_redis", new_callable=AsyncMock),
        patch("app.core.redis.close_redis", new_callable=AsyncMock),
        patch("app.core.supabase.get_supabase_admin"),
    ):
        from app.main import app
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
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
    """L'endpoint /health non richiede JWT."""
    response = await client.get("/health")
    assert response.status_code == 200
```

- [ ] **Step 2: Implementa `deps.py`**

```python
# backend/app/api/deps.py
import logging

from fastapi import Depends, Header, HTTPException

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.redis import get_redis
from app.core.supabase import get_supabase_admin

logger = logging.getLogger(__name__)


async def rate_limit(user_id: str, action: str, max_per_window: int, window_seconds: int = 60) -> None:
    """Incrementa un contatore Redis. Lancia 429 se il limite è superato."""
    key = f"rl:{action}:{user_id}"
    try:
        redis = get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, window_seconds)
        if count > max_per_window:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit: max {max_per_window} richieste ogni {window_seconds}s",
                headers={"Retry-After": str(window_seconds)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        # Se Redis è down, lasciamo passare (degrada gracefully)
        logger.warning("Rate limit Redis error: %s", exc)


async def require_board_member(
    board_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Verifica che l'utente corrente sia membro della board."""
    sb = get_supabase_admin()
    res = (
        sb.table("board_members")
        .select("role")
        .eq("board_id", board_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="Non sei membro di questa board")
    return {**user, "board_role": res.data["role"]}


async def require_board_editor(
    board_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Verifica che l'utente sia owner o editor della board."""
    sb = get_supabase_admin()
    res = (
        sb.table("board_members")
        .select("role")
        .eq("board_id", board_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not res.data or res.data["role"] not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="Permessi insufficienti (serve owner/editor)")
    return {**user, "board_role": res.data["role"]}


def verify_webhook_secret(x_webhook_secret: str = Header(...)) -> None:
    """Valida l'header X-Webhook-Secret dei webhook Supabase."""
    if x_webhook_secret != settings.SUPABASE_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Webhook secret non valido")


def verify_cron_secret(x_cron_secret: str = Header(...)) -> None:
    """Valida l'header X-Cron-Secret dei job schedulati."""
    if x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=401, detail="Cron secret non valido")
```

- [ ] **Step 3: Implementa `health.py`**

```python
# backend/app/api/health.py
import time

from fastapi import APIRouter

router = APIRouter()

# Timestamp di avvio del processo
_START_TIME = time.time()

# Viene sovrascritto da main.py con il commit SHA dall'env (vedi Dockerfile)
APP_VERSION = "dev"


@router.get("/health", tags=["ops"])
async def health() -> dict:
    """Endpoint usato da Caddy e dal workflow CI per verificare che l'API sia up."""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "uptime_seconds": int(time.time() - _START_TIME),
    }
```

- [ ] **Step 4: Crea `main.py` minimale per i test health**

```python
# backend/app/main.py
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.redis import close_redis, init_redis
from app.core.sentry import init_sentry

configure_logging("DEBUG" if settings.ENV == "development" else "INFO")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Avvio e spegnimento controllati delle risorse."""
    init_sentry(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=os.getenv("APP_VERSION", "dev"),
    )
    await init_redis()
    logger.info("TripVote API avviata (env=%s)", settings.ENV)
    yield
    await close_redis()
    logger.info("TripVote API fermata")


app = FastAPI(
    title="TripVote API",
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# -- CORS --
_ALLOWED_ORIGINS = [
    "https://tripvote.me",
    "https://www.tripvote.me",
    "https://*.vercel.app",
]
if settings.ENV == "development":
    _ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)

# -- Routers --
from app.api import health as health_router  # noqa: E402
from app.api import proposals as proposals_router  # noqa: E402
from app.api import boards as boards_router  # noqa: E402
from app.api import notifications as notifications_router  # noqa: E402
from app.api import internal as internal_router  # noqa: E402

app.include_router(health_router.router)
app.include_router(proposals_router.router, prefix="/proposals", tags=["proposals"])
app.include_router(boards_router.router, prefix="/boards", tags=["boards"])
app.include_router(notifications_router.router, prefix="/notifications", tags=["notifications"])
app.include_router(internal_router.router, prefix="/internal", tags=["internal"])
```

- [ ] **Step 5: Esegui test health**

```bash
pytest tests/test_health.py -v
```

Expected: PASS (potrebbe richiedere stub dei router mancanti — crearli vuoti al passo successivo se necessario)

- [ ] **Step 6: Commit**

```bash
git add app/api/deps.py app/api/health.py app/main.py tests/test_health.py
git commit -m "feat: add health endpoint, CORS, lifespan, deps"
```

---

## Task 11: API — `proposals.py`

**Files:**
- Create: `backend/app/api/proposals.py`

- [ ] **Step 1: Implementa `proposals.py`**

```python
# backend/app/api/proposals.py
from fastapi import APIRouter, Depends

from app.api.deps import rate_limit
from app.core.auth import get_current_user
from app.schemas.proposals import PreviewRequest, PreviewResponse
from app.services.scraper import scrape_link_preview

router = APIRouter()


@router.post("/preview", response_model=PreviewResponse)
async def preview_url(
    body: PreviewRequest,
    user: dict = Depends(get_current_user),
) -> PreviewResponse:
    """
    Estrae metadati Open Graph da un URL per popolare la card della proposta.
    Rate limit: 20 req/min per utente.
    """
    await rate_limit(user["id"], "preview", max_per_window=20, window_seconds=60)
    return await scrape_link_preview(body.url)
```

- [ ] **Step 2: Commit**

```bash
git add app/api/proposals.py
git commit -m "feat: add POST /proposals/preview endpoint"
```

---

## Task 12: API — `boards.py`

**Files:**
- Create: `backend/app/api/boards.py`

- [ ] **Step 1: Implementa `boards.py`**

```python
# backend/app/api/boards.py
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import rate_limit, require_board_editor, require_board_member
from app.core.supabase import get_supabase_admin
from app.schemas.boards import BoardResultsResponse
from app.services.board_results import get_board_results, invalidate_board_cache

router = APIRouter()


@router.get("/{board_id}/results", response_model=BoardResultsResponse)
async def board_results(
    board_id: str,
    user: dict = Depends(require_board_member),
) -> BoardResultsResponse:
    """
    Restituisce conteggi voti e match per tutte le proposte della board.
    Lettura cache-aside (Redis TTL 30s).
    """
    # Verifica che la board esista
    sb = get_supabase_admin()
    board = sb.table("boards").select("id").eq("id", board_id).single().execute()
    if not board.data:
        raise HTTPException(status_code=404, detail="Board non trovata")

    return await get_board_results(board_id)


@router.post("/{board_id}/recompute", status_code=202)
async def recompute_board(
    board_id: str,
    user: dict = Depends(require_board_editor),
) -> dict:
    """
    Forza il ricalcolo della cache aggregata della board.
    Rate limit: 5 req/min per utente.
    """
    await rate_limit(user["id"], "recompute", max_per_window=5, window_seconds=60)
    await invalidate_board_cache(board_id)
    return {"accepted": True, "board_id": board_id}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/boards.py
git commit -m "feat: add GET /boards/{id}/results and POST /boards/{id}/recompute"
```

---

## Task 13: API — `notifications.py`

**Files:**
- Create: `backend/app/api/notifications.py`

- [ ] **Step 1: Implementa `notifications.py`**

```python
# backend/app/api/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator

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
    Invia email di invito ai destinatari indicati.
    Richiede ruolo owner sulla board.
    Rate limit: 30 inviti/giorno per utente.
    """
    await rate_limit(user["id"], "invite", max_per_window=30, window_seconds=86400)

    sb = get_supabase_admin()

    # Verifica che l'utente sia owner della board
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

    # Recupera dati board
    board = (
        sb.table("boards")
        .select("title, invite_token")
        .eq("id", body.board_id)
        .single()
        .execute()
    )
    if not board.data:
        raise HTTPException(status_code=404, detail="Board non trovata")

    # Recupera il nome del mittente
    profile = (
        sb.table("profiles")
        .select("display_name")
        .eq("id", user["id"])
        .single()
        .execute()
    )
    sender_name = profile.data["display_name"] if profile.data else user["email"]

    sent, failed = await send_invite(
        board_id=body.board_id,
        invite_token=board.data["invite_token"],
        board_title=board.data["title"],
        sender_name=sender_name,
        recipient_emails=body.emails,
        personal_message=body.personal_message,
    )

    return InviteResponse(sent=sent, failed=failed)
```

- [ ] **Step 2: Commit**

```bash
git add app/api/notifications.py
git commit -m "feat: add POST /notifications/invite endpoint"
```

---

## Task 14: API — `internal.py` (webhook + cron)

**Files:**
- Create: `backend/app/api/internal.py`
- Create: `backend/tests/test_internal.py`

- [ ] **Step 1: Scrivi i test**

```python
# backend/tests/test_internal.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch


WEBHOOK_SECRET = "test-webhook-secret"
CRON_SECRET = "test-cron-secret"


@pytest.fixture
def mock_settings(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.SUPABASE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr("app.core.config.settings.CRON_SECRET", CRON_SECRET)


@pytest.fixture
async def client(mock_settings):
    with (
        patch("app.core.redis.init_redis", new_callable=AsyncMock),
        patch("app.core.redis.close_redis", new_callable=AsyncMock),
        patch("app.core.redis.get_redis"),
        patch("app.core.supabase.get_supabase_admin"),
    ):
        from app.main import app
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac


@pytest.mark.asyncio
async def test_invalidate_vote_ok(client):
    """Webhook valido → invalida la cache e ritorna ok."""
    payload = {
        "type": "INSERT",
        "table": "votes",
        "record": {"proposal_id": "prop-uuid-1", "user_id": "user-uuid-1", "value": 1},
        "old_record": None,
        "schema": "public",
    }

    with (
        patch("app.api.internal._get_board_id_for_proposal", new_callable=AsyncMock, return_value="board-uuid-1"),
        patch("app.services.board_results.invalidate_board_cache", new_callable=AsyncMock),
    ):
        response = await client.post(
            "/internal/cache/invalidate-vote",
            json=payload,
            headers={"x-webhook-secret": WEBHOOK_SECRET},
        )
    assert response.status_code == 200
    assert response.json()["ok"] is True


@pytest.mark.asyncio
async def test_invalidate_vote_wrong_secret(client):
    response = await client.post(
        "/internal/cache/invalidate-vote",
        json={"type": "INSERT", "table": "votes", "record": {}, "old_record": None, "schema": "public"},
        headers={"x-webhook-secret": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalidate_vote_missing_secret(client):
    response = await client.post(
        "/internal/cache/invalidate-vote",
        json={"type": "INSERT", "table": "votes", "record": {}, "old_record": None, "schema": "public"},
    )
    assert response.status_code == 422  # header mancante → validation error
```

- [ ] **Step 2: Implementa `internal.py`**

```python
# backend/app/api/internal.py
import asyncio
import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import verify_cron_secret, verify_webhook_secret
from app.core.supabase import get_supabase_admin
from app.services.board_results import invalidate_board_cache
from app.services.match import MatchConfig, ProposalVotes, compute_match

logger = logging.getLogger(__name__)

router = APIRouter()


class SupabaseWebhookPayload(BaseModel):
    type: str          # INSERT | UPDATE | DELETE
    table: str
    schema: str
    record: dict | None
    old_record: dict | None


async def _get_board_id_for_proposal(proposal_id: str) -> str | None:
    """Risolve proposal_id → board_id usando il service-role client."""
    sb = get_supabase_admin()
    res = (
        sb.table("proposals")
        .select("board_id")
        .eq("id", proposal_id)
        .single()
        .execute()
    )
    return res.data["board_id"] if res.data else None


async def _handle_match_transition(board_id: str, proposal_id: str) -> None:
    """
    Controlla se il voto appena scritto ha fatto scattare un nuovo match.
    Se sì, aggiorna matched_at e invia notifica email (in background).
    """
    try:
        from app.services.board_results import get_board_results
        from app.services.email import send_match_notification

        sb = get_supabase_admin()

        # Carica stato corrente della proposta
        results = await get_board_results(board_id)
        proposal = next((p for p in results.proposals if p.proposal_id == proposal_id), None)
        if proposal is None:
            return

        # Leggi matched_at attuale
        prop_res = (
            sb.table("proposals")
            .select("matched_at, title, category")
            .eq("id", proposal_id)
            .single()
            .execute()
        )
        if not prop_res.data:
            return

        was_match = prop_res.data["matched_at"] is not None
        is_match_now = proposal.is_match

        if is_match_now and not was_match:
            # Transizione None → match: aggiorna DB e notifica
            sb.table("proposals").update({"matched_at": "now()"}).eq("id", proposal_id).execute()

            # Recupera email dei membri
            members_res = (
                sb.table("board_members")
                .select("profiles(display_name), user_id")
                .eq("board_id", board_id)
                .execute()
            )
            board_res = sb.table("boards").select("title").eq("id", board_id).single().execute()
            board_title = board_res.data["title"] if board_res.data else "il tuo viaggio"

            # Le email vanno recuperate da auth.users — usiamo i profili come proxy
            profile_ids = [m["user_id"] for m in (members_res.data or [])]
            emails: list[str] = []
            for pid in profile_ids:
                u = sb.auth.admin.get_user_by_id(pid)
                if u and u.user and u.user.email:
                    emails.append(u.user.email)

            await send_match_notification(
                board_title=board_title,
                proposal_title=prop_res.data["title"],
                category=prop_res.data["category"],
                member_emails=emails,
            )
            logger.info("Match notificato per proposta %s nella board %s", proposal_id, board_id)

        elif not is_match_now and was_match:
            # De-match: azzera matched_at senza notifica
            sb.table("proposals").update({"matched_at": None}).eq("id", proposal_id).execute()

    except Exception as exc:
        logger.error("Errore in _handle_match_transition: %s", exc)


@router.post("/cache/invalidate-vote", dependencies=[Depends(verify_webhook_secret)])
async def invalidate_vote_cache(payload: SupabaseWebhookPayload) -> dict:
    """
    Riceve il webhook Supabase su INSERT/UPDATE/DELETE di votes.
    1. Invalida la cache aggregata della board.
    2. Se il voto causa una transizione di match, notifica in background.
    """
    record = payload.record or payload.old_record
    if not record or "proposal_id" not in record:
        return {"ok": True, "invalidated": None}

    proposal_id = record["proposal_id"]
    board_id = await _get_board_id_for_proposal(proposal_id)

    if not board_id:
        logger.warning("Board non trovata per proposal_id=%s", proposal_id)
        return {"ok": True, "invalidated": None}

    key = await invalidate_board_cache(board_id)

    # Gestione match in background (non blocca la risposta al webhook)
    asyncio.create_task(_handle_match_transition(board_id, proposal_id))

    return {"ok": True, "invalidated": key}


@router.post("/cron/close-expired-boards", dependencies=[Depends(verify_cron_secret)])
async def close_expired_boards() -> dict:
    """
    Chiude tutte le board con end_date < oggi e status = 'open'.
    Chiamato dal cron APScheduler ogni notte alle 3:00 UTC.
    """
    from datetime import UTC, date

    sb = get_supabase_admin()
    today = date.today().isoformat()

    res = (
        sb.table("boards")
        .update({"status": "closed"})
        .lt("end_date", today)
        .eq("status", "open")
        .execute()
    )

    closed_count = len(res.data) if res.data else 0
    logger.info("Chiuse %d board scadute", closed_count)

    return {"ok": True, "closed": closed_count}
```

- [ ] **Step 3: Esegui i test**

```bash
pytest tests/test_internal.py -v
```

Expected: 3 PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/internal.py tests/test_internal.py
git commit -m "feat: add internal webhook and cron endpoints"
```

---

## Task 15: APScheduler nel lifespan

**Files:**
- Modify: `backend/app/main.py` (aggiunta cron)

- [ ] **Step 1: Aggiorna `main.py` per aggiungere APScheduler**

Modifica il lifespan in `main.py` aggiungendo:

```python
# In cima, dopo gli import esistenti
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import httpx

# Sostituisci il lifespan con questa versione:
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_sentry(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=os.getenv("APP_VERSION", "dev"),
    )
    await init_redis()

    # APScheduler: chiude le board scadute ogni notte alle 3:00 UTC
    scheduler = AsyncIOScheduler()

    async def _trigger_close_expired():
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8000/internal/cron/close-expired-boards",
                    headers={"x-cron-secret": settings.CRON_SECRET},
                )
        except Exception as exc:
            logger.error("Errore cron close-expired-boards: %s", exc)

    scheduler.add_job(
        _trigger_close_expired,
        trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
        id="close_expired_boards",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("TripVote API avviata (env=%s)", settings.ENV)

    yield

    scheduler.shutdown(wait=False)
    await close_redis()
    logger.info("TripVote API fermata")
```

- [ ] **Step 2: Commit**

```bash
git add app/main.py
git commit -m "feat: add APScheduler for nightly close-expired-boards job"
```

---

## Task 16: `conftest.py` e test finali

**Files:**
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Scrivi `conftest.py`**

```python
# backend/tests/conftest.py
"""Fixtures condivise per tutti i test."""
import os
import time

import jwt
import pytest

# Imposta le variabili d'ambiente minime PRIMA di importare l'app,
# così pydantic-settings non esplode.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-32bytes-padding!!")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("ENV", "development")

JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]


def make_jwt(user_id: str = "user-test-123", email: str = "test@tripvote.me") -> str:
    """Genera un JWT di test valido per le fixture."""
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        },
        JWT_SECRET,
        algorithm="HS256",
    )


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_jwt()}"}
```

- [ ] **Step 2: Esegui tutti i test con coverage**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/backend
pytest -q --cov=app --cov-report=term-missing
```

Expected: ≥70% coverage, 0 errori

- [ ] **Step 3: Esegui ruff**

```bash
ruff check . && ruff format --check .
```

Expected: no errori

- [ ] **Step 4: Commit finale**

```bash
git add tests/conftest.py
git commit -m "chore: add shared test fixtures and verify coverage ≥70%"
```

---

## Self-review

**Spec coverage:**
- ✅ `GET /health` → Task 10
- ✅ `POST /proposals/preview` → Task 11 (scraper Task 8, rate limit Task 10)
- ✅ `GET /boards/{id}/results` → Task 12 (board_results Task 9, match Task 7)
- ✅ `POST /boards/{id}/recompute` → Task 12
- ✅ `POST /notifications/invite` → Task 13 (email Task 9)
- ✅ `POST /internal/cache/invalidate-vote` → Task 14 (match transition inclusa)
- ✅ `POST /internal/cron/close-expired-boards` → Task 14 + APScheduler Task 15
- ✅ Match logic con tutti e 5 gli esempi + edge cases → Task 7
- ✅ JWT auth dependency → Task 5
- ✅ Redis rate limit → Task 10 (deps.py)
- ✅ Cache-aside board results + invalidazione → Task 9 + Task 14
- ✅ CORS + lifespan → Task 10
- ✅ Sentry + logging → Task 3
- ✅ `.env.example` → Task 1
