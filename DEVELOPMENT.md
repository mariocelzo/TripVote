# Development — Setup locale

Come girare il backend TripVote sulla tua macchina, con Supabase locale o cloud.

## Prerequisiti

- **Python 3.12** (consiglio `pyenv` per gestirlo: `pyenv install 3.12.4 && pyenv local 3.12.4`)
- **Docker Desktop** (per Supabase locale e per provare il container BE)
- **Supabase CLI** (`brew install supabase/tap/supabase`)
- **Node 20+** (solo se cloni anche il FE)
- Un editor con supporto Pyright/Pylance (VSCode + estensione Python).

## Layout consigliato per il dev

```
.
├── backend/          ← lavoriamo principalmente qui
├── infra/
└── supabase/         ← migration + config Supabase locale
```

## Setup iniziale (one-time)

```bash
cd backend

# 1. Virtualenv
python -m venv .venv
source .venv/bin/activate

# 2. Dipendenze
pip install -r requirements.txt -r requirements-dev.txt

# 3. Env
cp .env.example .env
# poi apri .env e riempi i valori (vedi sezione "Variabili d'ambiente")

# 4. Pre-commit (opzionale ma consigliato)
pre-commit install
```

## Supabase locale (consigliato per il dev)

Supabase CLI gira l'intero stack (Postgres, GoTrue auth, Storage, Realtime) in Docker. Ti dà un `SUPABASE_URL=http://localhost:54321` con DB pulito.

```bash
# Dalla root del repo
supabase start

# Output (segna i valori, ti servono nell'.env):
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
# anon key: eyJ...
# service_role key: eyJ...
# JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
```

Le migration in `supabase/migrations/` vengono applicate automaticamente.

Per resettare lo schema (utile durante lo sviluppo):

```bash
supabase db reset
```

Per fermare tutto:

```bash
supabase stop
```

### Variabili d'ambiente per dev locale

Riempi `backend/.env` con i valori che ti ha stampato `supabase start`:

```bash
ENV=development
LOG_LEVEL=DEBUG

SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key dal CLI>
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
SUPABASE_WEBHOOK_SECRET=dev-webhook-secret

# Redis: usa un container locale o Upstash dev
REDIS_URL=redis://localhost:6379

# SendGrid: in dev metti una chiave fake e usa il mock
SENDGRID_API_KEY=SG.fake-dev-key
SENDGRID_FROM_EMAIL=dev@tripvote.local

# Sentry: lascia vuoto in dev per non sporcare le issue
SENTRY_DSN=

# Match
MATCH_QUORUM_THRESHOLD=0.5
MATCH_SCORE_THRESHOLD=0.7

# Cron
CRON_SECRET=dev-cron-secret
```

## Redis locale

```bash
docker run -d --name tripvote-redis -p 6379:6379 redis:7-alpine
```

Per controllarlo: `redis-cli` o `docker exec -it tripvote-redis redis-cli`.

## Avviare il BE in locale

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

API disponibile su `http://localhost:8000`. Docs interattive (Swagger): `http://localhost:8000/docs`.

## Test

```bash
cd backend
pytest -q                          # veloce
pytest -q --cov=app --cov-report=term-missing   # con coverage
pytest tests/test_match.py -v      # un solo file
pytest -k "preview"                # filtro per nome
```

Per i test che chiamano Supabase usiamo un Postgres in-memory tramite il container del CLI. Il `conftest.py` fa il setup.

## Lint & format

```bash
ruff check .          # lint
ruff format .         # format (sostituisce black + isort)
ruff check --fix .    # autofix
```

Configurato in `pyproject.toml`. CI fallisce se `ruff check` non è pulito.

## Build container in locale

```bash
docker build -t tripvote-api ./backend
docker run --rm -p 8000:8000 --env-file backend/.env tripvote-api
```

Utile per riprodurre problemi di dipendenze tra il tuo Python locale e quello del container.

## Workflow tipico

1. `supabase start` (in un terminale, lascialo girare)
2. `docker start tripvote-redis`
3. `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`
4. Apri `http://localhost:8000/docs` per provare gli endpoint.
5. Quando finisci una feature: `pytest && ruff check . && ruff format .`
6. Commit + push → GitHub Actions fa il deploy.

## Generare un JWT di test

Per chiamare endpoint autenticati in locale serve un JWT firmato con il `SUPABASE_JWT_SECRET` di dev. Crea un fixture `tests/conftest.py` che produce token al volo:

```python
import jwt, time
def make_jwt(user_id="00000000-0000-0000-0000-000000000001", secret="super-secret..."):
    return jwt.encode(
        {
          "sub": user_id,
          "aud": "authenticated",
          "exp": int(time.time()) + 3600,
          "email": "dev@tripvote.local",
        },
        secret,
        algorithm="HS256",
    )
```

Usalo come `Authorization: Bearer <token>` su Postman/HTTPie.

## Troubleshooting

| Sintomo | Causa probabile | Fix |
|---|---|---|
| `JWT signature verification failed` | `SUPABASE_JWT_SECRET` errato in `.env` | copia di nuovo da `supabase start` |
| `Connection refused localhost:54321` | Supabase CLI non gira | `supabase start` |
| `Connection refused localhost:6379` | Redis non gira | `docker start tripvote-redis` |
| Test lentissimi | Fai `supabase start` per ogni test | usa il fixture session-scoped in `conftest.py` |
| `ImportError: opengraph_py3` | pip non aggiornato | `pip install -r requirements.txt` |
| CORS error dal FE | dimentichi di aggiungere `localhost:3000` agli allowed | controlla `app/main.py` |

## Comandi utili

```bash
# Vedi le migration applicate
supabase db diff

# Esegui una query custom
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Tail dei log del container
docker logs -f tripvote-api

# Profilo di un endpoint
pytest --profile tests/test_proposals.py
```
