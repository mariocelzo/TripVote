# TripVote — Handoff: cosa abbiamo fatto e cosa tocca a te

## Cosa abbiamo costruito

Il **backend FastAPI completo** del progetto TripVote, pushato su Azure DevOps.

### File creati

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan, APScheduler
│   ├── core/
│   │   ├── config.py        # Settings via pydantic-settings (env vars)
│   │   ├── auth.py          # Verifica JWT Supabase (HS256)
│   │   ├── redis.py         # Client Redis async (Upstash)
│   │   ├── supabase.py      # Service-role client Supabase
│   │   ├── logging.py       # Configurazione logging standard
│   │   └── sentry.py        # Init Sentry (no-op se DSN mancante)
│   ├── api/
│   │   ├── deps.py          # Rate limit, require_board_member/editor, secrets
│   │   ├── health.py        # GET /health
│   │   ├── proposals.py     # POST /proposals/preview (scraping)
│   │   ├── boards.py        # GET /boards/{id}/results + POST recompute
│   │   ├── notifications.py # POST /notifications/invite (SendGrid)
│   │   └── internal.py      # webhook invalidate-vote + cron close-expired
│   ├── services/
│   │   ├── match.py         # Formula match (MATCH_LOGIC.md)
│   │   ├── scraper.py       # httpx + BeautifulSoup + OG parser
│   │   ├── board_results.py # Cache-aside Redis per aggregati board
│   │   └── email.py         # Wrapper SendGrid
│   └── schemas/
│       ├── proposals.py     # PreviewRequest, PreviewResponse
│       └── boards.py        # BoardResultsResponse, ProposalResult
└── tests/                   # 39 test, 75% coverage, ruff clean
```

### Cosa funziona già in locale

```bash
cd backend
pytest -q --cov=app     # 39 test, 75.6% coverage ✅
ruff check .            # 0 errori ✅
```

---

## ⚠️ Problema pipeline: repo su Azure DevOps, CI/CD su GitHub Actions

Il workflow `.github/workflows/deploy.yml` è scritto per **GitHub Actions**
(che usa GHCR — GitHub Container Registry). Il repo è su Azure DevOps.
**GitHub Actions non girerà automaticamente lì.**

### Opzione A — Mirror su GitHub (consigliato, 10 minuti)

1. Crea un repo **privato** su github.com (es. `mariocelzo/tripvote`).
2. Aggiorna il remote locale:
   ```bash
   git remote add github https://github.com/mariocelzo/tripvote.git
   git push -u github --all
   ```
3. Il workflow in `.github/workflows/deploy.yml` gira automaticamente ad ogni push su `main`.
4. Tieni Azure DevOps come backup/mirror se vuoi.

> ✅ **Questa è la via più semplice** — GHCR è gratis con GitHub Student Pack,
> Actions ha 2000 minuti/mese gratis.

### Opzione B — Azure Pipelines

Se vuoi restare tutto su Azure DevOps, bisogna riscrivere il workflow
in formato `azure-pipelines.yml` e usare Azure Container Registry (ACR)
invece di GHCR. Richiede più setup — dimmelo e lo facciamo.

---

## Cose che devi recuperare/configurare tu sui siti

### 1. Supabase — `supabase.com`

| Cosa | Dove trovarlo | Usato in |
|---|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL | `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` secret | `.env` |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Secret | `.env` |
| `SUPABASE_WEBHOOK_SECRET` | Lo scegli tu (stringa random) | `.env` + Supabase Studio |

**Da fare su Supabase:**
- Esegui le migration: `supabase db push` (dopo aver fatto `supabase login`)
- Crea il Database Webhook:
  - Studio → Database → Webhooks → Create
  - Tabella: `votes` — eventi: `INSERT, UPDATE, DELETE`
  - URL: `https://api.tripvote.me/internal/cache/invalidate-vote`
  - Header: `X-Webhook-Secret: <SUPABASE_WEBHOOK_SECRET>`
- Abilita Realtime per `votes`, `proposals`, `board_members`
  (Studio → Database → Replication)

### 2. Upstash Redis — `console.upstash.com`

1. Crea un database Redis (piano Free, 10K cmd/day gratis).
2. Copia la **REST URL** in formato `rediss://default:<password>@<host>:6379`.
3. Mettila in `REDIS_URL` nel `.env`.

### 3. SendGrid — `app.sendgrid.com`

1. Crea un API Key (Settings → API Keys → Create).
2. Verifica il dominio mittente (`tripvote.me`) → Sender Authentication.
3. Copia la key in `SENDGRID_API_KEY` nel `.env`.
4. `SENDGRID_FROM_EMAIL=noreply@tripvote.me`

### 4. Sentry — `sentry.io`

1. Crea un progetto Python/FastAPI.
2. Copia il DSN in `SENTRY_DSN` nel `.env`.
3. Il BE lo inizializza automaticamente al boot.

### 5. DigitalOcean Droplet — `cloud.digitalocean.com`

> Con il GitHub Student Pack hai **200$ di credito** → circa 33 mesi sul piano da 6$/mese.

1. Crea un Droplet **Ubuntu 22.04**, piano **s-1vcpu-1gb** (6$/mese).
2. Installa Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Crea la cartella e il file `.env`:
   ```bash
   mkdir -p /opt/tripvote
   cp docker-compose.yml /opt/tripvote/
   cp Caddyfile /opt/tripvote/
   # Crea /opt/tripvote/.env con tutte le variabili (vedi backend/.env.example)
   ```
4. Crea un utente SSH dedicato al deploy (vedi `DEVOPS_RUNBOOK.md` per i dettagli).
5. Punta il record DNS `api.tripvote.me` → IP del Droplet.

### 6. GitHub Secrets (se usi Opzione A)

Vai su **github.com → repo → Settings → Secrets and variables → Actions**:

| Secret | Valore |
|---|---|
| `DO_HOST` | IP del Droplet |
| `DO_USER` | utente SSH sul Droplet (es. `deploy`) |
| `DO_SSH_KEY` | chiave privata SSH (il contenuto di `~/.ssh/id_rsa`) |
| `GHCR_TOKEN` | GitHub PAT con scope `read:packages` |

---

## Variabili d'ambiente complete (`.env` sul Droplet)

```bash
ENV=production

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxxxx
SUPABASE_WEBHOOK_SECRET=<stringa-random-32-char>

REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@tripvote.me

SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_ENVIRONMENT=production

MATCH_QUORUM_THRESHOLD=0.5
MATCH_SCORE_THRESHOLD=0.7
MATCH_YES_WEIGHT=1.0
MATCH_MAYBE_WEIGHT=0.5
MATCH_NO_WEIGHT=0.0

CRON_SECRET=<stringa-random-32-char>
APP_VERSION=latest
```

---

## Ordine consigliato per partire

```
1. Crea repo GitHub privato e pusha (Opzione A)          ~10 min
2. Crea progetto Supabase + esegui le migration           ~20 min
3. Crea database Upstash Redis + copia URL                ~5 min
4. Crea API Key SendGrid + verifica dominio               ~15 min
5. Crea progetto Sentry + copia DSN                       ~5 min
6. Crea Droplet DigitalOcean + installa Docker            ~20 min
7. Configura DNS api.tripvote.me → IP Droplet             ~5 min (propagazione ~1h)
8. Copia docker-compose.yml + Caddyfile + .env sul Droplet ~10 min
9. Configura i GitHub Secrets                             ~5 min
10. Push su main → osserva il primo deploy automatico     ~5 min
```

**Totale stimato: ~1.5 ore** (esclusa la propagazione DNS)

---

## Cosa NON abbiamo fatto (next steps)

- **Frontend Next.js** — è fuori scope per questo repo (vedi `CLAUDE.md`)
- **`supabase/migrations/0002_rls_policies.sql`** — già scritto, da pushare con `supabase db push`
- **Rate limit avanzato** — ora è in-memory Redis; in futuro si può aggiungere sliding window
- **Board membership via invite link** — la logica RLS c'è, manca l'endpoint `POST /boards/join/{token}` (il FE la chiama direttamente su Supabase per ora)
- **Test di integrazione** — i test esistenti mockano Supabase/Redis; i test con Supabase locale (`supabase start`) sono marcati `@pytest.mark.integration`
