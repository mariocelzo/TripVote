# TripVote — Architettura Backend

> Documento di architettura tecnica del backend di TripVote.
> Stack: **FastAPI (Python) + DigitalOcean + Supabase + Upstash Redis + GitHub Actions + Sentry + SendGrid**.
> Obiettivo: infrastruttura professionale a costo **0€** sfruttando il GitHub Student Developer Pack.

---

## 0. Scelta tecnologica: FastAPI vs Spring Boot

**Raccomandazione: FastAPI.**

| Criterio | FastAPI | Spring Boot |
|---|---|---|
| Memoria container | ~100 MB | ~400-600 MB |
| Cold start | <1s | 5-15s |
| Scraping (BeautifulSoup, Playwright, httpx) | ecosistema dominante | possibile ma scomodo |
| Tipizzazione + validazione | Pydantic v2, ottima | Bean Validation, ottima |
| Async I/O | nativo (uvicorn) | reactive con WebFlux (più complesso) |
| Memoria su Droplet $6/mese | gira comodo | rischio OOM |

Su un droplet base ($6/mese, 1GB RAM), Spring Boot ti mangia metà RAM solo a riposo. Con 200$ di credito del Pack ti durerebbe **~33 mesi** con FastAPI vs **~16 mesi** con Spring Boot (perché serve un droplet più grande). Dato che TripVote vive di richieste leggere + scraping di link preview (caso d'uso perfetto per `httpx` + `BeautifulSoup`), **FastAPI è la scelta ovvia**.

Spring Boot avrebbe senso solo se volessi mostrare competenze enterprise/Java sul CV — ma in quel caso il costo infrastrutturale e la complessità del progetto non valgono il segnale.

---

## 1. Architettura ad alto livello

```
┌─────────────────┐       HTTPS           ┌──────────────────────┐
│  Browser/PWA    │ ────────────────────▶ │  Next.js su Vercel   │
│  (utente)       │ ◀──────────────────── │  (FE + Edge Funcs)   │
└─────────────────┘                       └──────────┬───────────┘
        │                                            │
        │ Supabase JS (auth + realtime)              │ fetch() server-side
        │ WebSocket per i voti live                  │ con JWT in header
        ▼                                            ▼
┌─────────────────────────┐              ┌──────────────────────┐
│  Supabase               │ ◀─────────── │  FastAPI su          │
│  (Postgres + Auth + RLS │   Service    │  DigitalOcean        │
│   + Storage + Realtime) │   Role JWT   │  (Docker container)  │
└─────────────────────────┘              └──────────┬───────────┘
                                                    │
                                  ┌─────────────────┼──────────────────┐
                                  ▼                 ▼                  ▼
                          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                          │ Upstash Redis│  │ SendGrid API │  │  Sentry      │
                          │ (cache+queue)│  │  (email)     │  │ (errori BE)  │
                          └──────────────┘  └──────────────┘  └──────────────┘
```

**Principio chiave**: il FE parla **direttamente con Supabase** per tutte le operazioni CRUD standard (lettura board, scrittura voti, auth, realtime). Il BE FastAPI viene chiamato solo per **logiche pesanti**:
- Link preview / scraping di URL hotel/voli
- Aggregazioni complesse (es. classifica "Top 3 proposte" calcolata a finestra mobile)
- Invio email transazionali via SendGrid
- Job in background (scadenza board, notifica match)

Questo design ti tiene **lontano dal vendor lock-in pesante su Vercel** e ti permette di scalare le operazioni costose orizzontalmente sul Droplet.

---

## 2. Comunicazione FE ↔ BE: gestione CORS

### 2.1 Topologia

- FE: `https://tripvote.me` (Vercel, dominio Namecheap del Pack)
- BE: `https://api.tripvote.me` (DigitalOcean Droplet, dietro Caddy/Traefik con TLS automatico)

**Regola d'oro**: usa un **sottodominio dedicato** (`api.tripvote.me`) puntato al Droplet via record `A`. Questo:
1. Evita la rogna dei "third-party cookies" (sono same-site dello stesso eTLD+1).
2. Ti permette di mettere un reverse proxy con HTTPS gratuito (Let's Encrypt via Caddy).
3. Rende la config CORS pulita e prevedibile.

### 2.2 Configurazione CORS in FastAPI

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title="TripVote API", version="1.0.0")

ALLOWED_ORIGINS = [
    "https://tripvote.me",
    "https://www.tripvote.me",
    "https://*.vercel.app",  # preview deploy di Next.js
]

if settings.ENV == "development":
    ALLOWED_ORIGINS += ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,  # cache preflight per 10 min, riduce le OPTIONS
)
```

> ⚠️ `allow_origins=["*"]` è **incompatibile** con `allow_credentials=True`. Lista sempre i domini esplicitamente.

### 2.3 Autenticazione: il "trucco" del JWT condiviso con Supabase

Il punto bello di Supabase è che **il JWT che emette per l'utente lo puoi verificare anche sul tuo backend** usando lo stesso JWT secret. Quindi:

1. FE fa login via `supabase-js` → ottiene un `access_token` JWT.
2. FE chiama `https://api.tripvote.me/...` mettendo `Authorization: Bearer <jwt>`.
3. FastAPI verifica il JWT con il `SUPABASE_JWT_SECRET` (che trovi nelle settings di Supabase).
4. Ottieni l'`user_id` dal claim `sub` del JWT senza chiamare Supabase.

```python
# app/core/auth.py
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings

bearer = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(bearer)) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return {"id": payload["sub"], "email": payload.get("email")}
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
```

### 2.4 Chiamata da FE a BE

Da Next.js (Server Component o Route Handler) fai:

```typescript
// frontend chiama BE inoltrando il JWT dell'utente
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/proposals/preview`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ url: "https://booking.com/..." }),
});
```

**Consiglio**: per le route che non richiedono lo stato dell'utente, chiamale dal **Server Component** di Next.js (non dal client) → CORS sparisce dal problema (le richieste server→server non hanno preflight).

---

## 3. Schema database (Supabase / Postgres)

### 3.1 Tabelle

```sql
-- =========================
-- USERS (estende auth.users di Supabase)
-- =========================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- =========================
-- BOARDS — un viaggio collaborativo
-- =========================
create table public.boards (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  destination  text,
  start_date   date,
  end_date     date,
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  cover_url    text,
  status       text not null default 'open' check (status in ('open','closed','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_boards_owner on public.boards(owner_id);
create index idx_boards_invite on public.boards(invite_token);

-- =========================
-- BOARD MEMBERS — chi partecipa a una board
-- =========================
create table public.board_members (
  board_id  uuid not null references public.boards(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'voter' check (role in ('owner','editor','voter')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

-- =========================
-- PROPOSALS — hotel, voli, ristoranti, ecc.
-- =========================
create table public.proposals (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  category    text not null check (category in ('hotel','flight','activity','restaurant','other')),
  title       text not null,
  url         text,
  image_url   text,
  price_cents int,
  currency    text default 'EUR',
  rating      numeric(2,1),
  lat         numeric(9,6),
  lng         numeric(9,6),
  metadata    jsonb default '{}'::jsonb,  -- per dati extra dello scraping
  created_at  timestamptz not null default now()
);

create index idx_proposals_board on public.proposals(board_id);

-- =========================
-- VOTES
-- =========================
create table public.votes (
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  value       smallint not null check (value in (-1, 0, 1)),  -- No, Forse, Sì
  voted_at    timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index idx_votes_proposal on public.votes(proposal_id);

-- =========================
-- VISTA AGGREGATA per leggere i risultati velocemente
-- =========================
create view public.proposal_results as
select
  p.id as proposal_id,
  p.board_id,
  count(*) filter (where v.value =  1) as yes_count,
  count(*) filter (where v.value =  0) as maybe_count,
  count(*) filter (where v.value = -1) as no_count,
  count(*) as total_votes
from public.proposals p
left join public.votes v on v.proposal_id = p.id
group by p.id, p.board_id;
```

### 3.2 Row Level Security (RLS)

Questa è la parte che ti fa risparmiare il 70% del codice backend. Le policy le scrivi una volta in Postgres e Supabase le applica a ogni query del FE.

```sql
-- Abilita RLS su tutte le tabelle
alter table public.boards         enable row level security;
alter table public.board_members  enable row level security;
alter table public.proposals      enable row level security;
alter table public.votes          enable row level security;

-- Helper: l'utente è membro della board?
create function public.is_board_member(b_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.board_members
    where board_id = b_id and user_id = auth.uid()
  );
$$;

-- BOARDS: vedo solo le board di cui sono membro
create policy "boards_select" on public.boards
  for select using (public.is_board_member(id) or owner_id = auth.uid());

create policy "boards_insert" on public.boards
  for insert with check (owner_id = auth.uid());

create policy "boards_update" on public.boards
  for update using (owner_id = auth.uid());

-- PROPOSALS: vedo e scrivo solo se sono nella board
create policy "proposals_select" on public.proposals
  for select using (public.is_board_member(board_id));

create policy "proposals_insert" on public.proposals
  for insert with check (public.is_board_member(board_id) and author_id = auth.uid());

-- VOTES: voto solo nelle board di cui sono membro, e modifico solo i miei voti
create policy "votes_select" on public.votes
  for select using (
    public.is_board_member((select board_id from public.proposals where id = proposal_id))
  );

create policy "votes_upsert" on public.votes
  for insert with check (
    user_id = auth.uid()
    and public.is_board_member((select board_id from public.proposals where id = proposal_id))
  );

create policy "votes_update" on public.votes
  for update using (user_id = auth.uid());
```

### 3.3 Realtime per i voti live

In Supabase Studio, vai su **Database → Replication** e abilita la replica logica per la tabella `votes`. Il FE si iscrive così:

```typescript
supabase
  .channel(`board:${boardId}:votes`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'votes' },
      (payload) => updateUI(payload))
  .subscribe();
```

---

## 4. CI/CD con GitHub Actions → DigitalOcean

### 4.1 Strategia

1. **Push su `main`** → build immagine Docker → push su **GHCR** (GitHub Container Registry, gratis e nel Pack).
2. **SSH sul Droplet** → pull dell'immagine → restart del container con `docker compose up -d`.
3. **Health check** sull'endpoint `/health` per verificare che sia up.

### 4.2 Dockerfile (multi-stage, minimo)

```dockerfile
# Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

FROM base AS deps
COPY requirements.txt .
RUN pip install -r requirements.txt

FROM base AS runtime
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY ./app ./app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 4.3 docker-compose.yml sul Droplet

```yaml
# /opt/tripvote/docker-compose.yml
services:
  api:
    image: ghcr.io/<user>/tripvote-api:latest
    container_name: tripvote-api
    restart: unless-stopped
    env_file: /opt/tripvote/.env
    ports: ["127.0.0.1:8000:8000"]   # Caddy fa da reverse proxy
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
```

`Caddyfile`:
```
api.tripvote.me {
  reverse_proxy api:8000
  encode gzip
}
```

Caddy gestisce il TLS automaticamente via Let's Encrypt — zero configurazione, zero costo.

### 4.4 Workflow GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths: ['backend/**', '.github/workflows/deploy.yml']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/tripvote-api

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12', cache: 'pip' }
      - run: pip install -r backend/requirements.txt -r backend/requirements-dev.txt
      - run: cd backend && pytest -q
      - run: cd backend && ruff check .

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,format=short
            type=raw,value=latest
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: SSH deploy
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            cd /opt/tripvote
            echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose pull api
            docker compose up -d api
            docker image prune -f
            # health check
            for i in {1..10}; do
              if curl -sf http://localhost:8000/health; then echo "OK"; exit 0; fi
              sleep 3
            done
            echo "Health check failed"; exit 1
```

**Secrets da impostare in GitHub** (`Settings → Secrets and variables → Actions`):
- `DO_HOST` — IP del droplet
- `DO_USER` — utente SSH (es. `deploy`)
- `DO_SSH_KEY` — chiave privata SSH
- `GHCR_TOKEN` — Personal Access Token con scope `read:packages`

---

## 5. Strategia di caching con Redis (Upstash)

Il problema: durante una sessione di voto, 10 amici aprono la board e ricaricano i conteggi ogni 2 secondi. Senza cache, ogni richiesta colpisce Postgres con una query aggregata su `votes`. **Con Upstash hai 10.000 comandi/giorno gratis** — basta usarli con criterio.

### 5.1 Quando usare Redis vs Supabase Realtime

| Caso d'uso | Strumento |
|---|---|
| Aggiornamento push di un singolo voto | **Supabase Realtime** (già integrato, gratis) |
| Lettura aggregata "risultati board" | **Redis cache** (TTL 30s + invalidazione) |
| Lock per evitare voti duplicati nella stessa millisec | Redis `SET NX EX` |
| Rate limiting (max 1 link preview/secondo per user) | Redis `INCR + EXPIRE` |
| Coda job asincroni (invio email batch) | Redis Streams o RQ |

### 5.2 Pattern: cache-aside per i risultati di board

```python
# app/services/board_results.py
import json
from app.core.redis import redis  # client async di redis-py
from app.core.supabase import sb_admin

CACHE_TTL = 30  # secondi

async def get_board_results(board_id: str) -> dict:
    key = f"board:{board_id}:results"

    # 1. Try cache
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)

    # 2. Miss → leggi dalla view aggregata
    res = sb_admin.table("proposal_results") \
        .select("*") \
        .eq("board_id", board_id) \
        .execute()

    payload = {"results": res.data, "cached_at": time.time()}

    # 3. Set with TTL
    await redis.set(key, json.dumps(payload), ex=CACHE_TTL)
    return payload
```

### 5.3 Invalidazione: il "write-through" via trigger Postgres → Webhook

Il trucco elegante: usa i **Database Webhooks di Supabase** per invalidare la cache quando arriva un voto.

In Supabase Studio: `Database → Webhooks → Create`:
- Tabella: `votes`
- Eventi: `INSERT, UPDATE, DELETE`
- URL: `https://api.tripvote.me/internal/cache/invalidate-vote`
- HTTP Header: `X-Webhook-Secret: <SECRET>`

```python
# app/api/internal.py
@router.post("/internal/cache/invalidate-vote")
async def invalidate_vote(payload: dict, x_webhook_secret: str = Header(...)):
    if x_webhook_secret != settings.SUPABASE_WEBHOOK_SECRET:
        raise HTTPException(401)
    proposal_id = payload["record"]["proposal_id"]
    # ricavo il board_id e invalido la cache
    board_id = await get_board_id_by_proposal(proposal_id)
    await redis.delete(f"board:{board_id}:results")
    return {"ok": True}
```

In questo modo:
- Le **letture** vanno in cache (Postgres rilassato).
- Le **scritture** invalidano automaticamente.
- Il FE riceve l'aggiornamento push via Supabase Realtime (canale separato, non passa da Redis).

### 5.4 Pattern: voto idempotente con lock

Per evitare race condition se un utente clicca due volte velocemente:

```python
async def cast_vote(user_id: str, proposal_id: str, value: int):
    lock_key = f"lock:vote:{user_id}:{proposal_id}"
    # SET NX EX → acquire lock per 2 secondi
    acquired = await redis.set(lock_key, "1", nx=True, ex=2)
    if not acquired:
        raise HTTPException(429, "Slow down")

    sb_admin.table("votes").upsert({
        "user_id": user_id,
        "proposal_id": proposal_id,
        "value": value,
    }).execute()
```

### 5.5 Rate limit per il link-preview scraper

```python
# decoratore semplice
async def rate_limit(user_id: str, action: str, max_per_min: int):
    key = f"rl:{action}:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > max_per_min:
        raise HTTPException(429, f"Max {max_per_min}/min")
```

Usato così sull'endpoint scraping:
```python
@router.post("/proposals/preview")
async def preview(url: str, user = Depends(get_current_user)):
    await rate_limit(user["id"], "preview", max_per_min=20)
    return await scrape_link_preview(url)
```

---

## 6. Struttura del progetto

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + middleware
│   ├── core/
│   │   ├── config.py            # Pydantic Settings da env
│   │   ├── auth.py              # JWT verify Supabase
│   │   ├── redis.py             # client Upstash
│   │   ├── supabase.py          # service-role client
│   │   └── sentry.py            # init Sentry
│   ├── api/
│   │   ├── proposals.py         # link preview, scraping
│   │   ├── boards.py            # operazioni che richiedono BE
│   │   ├── notifications.py     # SendGrid (inviti, match)
│   │   └── internal.py          # webhook Supabase → cache invalidation
│   ├── services/
│   │   ├── scraper.py           # httpx + BeautifulSoup + opengraph
│   │   ├── board_results.py     # cache-aside pattern
│   │   └── email.py             # SendGrid wrapper
│   └── schemas/                 # Pydantic models per request/response
├── tests/
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
└── .env.example
```

---

## 7. Variabili d'ambiente (`.env.example`)

```bash
ENV=production

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
SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_ENVIRONMENT=production
```

---

## 8. Costi reali (mensili)

| Servizio | Free tier | Costo TripVote | Coperto da |
|---|---|---|---|
| Vercel Hobby | 100 GB bandwidth | 0€ | Free |
| DigitalOcean Droplet (s-1vcpu-1gb) | — | 6$ → **0€** per ~33 mesi | GitHub Pack 200$ |
| Supabase Free | 500MB DB, 50K MAU, 5GB storage | 0€ | Free |
| Upstash Free | 10K cmd/day | 0€ | Free |
| SendGrid (Pack) | 25K email/mese | 0€ | GitHub Pack |
| Sentry (Pack) | piano Developer | 0€ | GitHub Pack |
| Dominio `.me` | — | 0€ primo anno | Namecheap (Pack) |
| GHCR | privato illimitato | 0€ | Free |
| **Totale** | | **0€/mese per ~3 anni** | |

---

## 9. Cosa manca / prossimi passi

1. **Definire le rotte API esatte** del BE (link preview, notifiche, aggregazioni custom).
2. **Scrivere le migration Postgres** ordinate (`supabase/migrations/`).
3. **Setup Sentry FE+BE** con `release` linkato al commit SHA per i sourcemap.
4. **Definire il modello dati per "Match"** (quando una proposta supera la soglia di Sì).
5. **Job scheduler**: usare APScheduler in-process o un cron sul Droplet per chiudere board scadute.

---

> Per il frontend (Next.js) faremo un documento separato — quello sarà gestito tramite Claude design.
