# Contesto progetto per Claude Code

> Questo file viene letto automaticamente da Claude Code all'avvio.
> Tienilo sintetico: per il dettaglio tecnico ci sono i documenti dedicati.

## Cos'è TripVote (in una riga)

Web-app per pianificare viaggi di gruppo: board condivisa via link → proposte (hotel/voli/attività) → voto Sì/Forse/No in tempo reale → quando una proposta supera la soglia diventa un "match".

## Cosa stai costruendo qui

Solo il **backend FastAPI** + lo **schema Supabase** + l'**infra** (Docker, Caddy, GitHub Actions). Il frontend Next.js è in un altro flusso.

## Filosofia architetturale (importante)

1. **Il BE non è il gatekeeper di Supabase.** Il FE parla **direttamente** con Supabase per CRUD/auth/realtime via `supabase-js`. Il BE viene chiamato **solo** per: link preview/scraping, aggregazioni custom, invio email (SendGrid), webhook di invalidazione cache, job in background. Se ti viene voglia di proxare una banale `select` attraverso il BE, fermati e usa Supabase direttamente con RLS.
2. **Auth via JWT condiviso.** Il FE mette `Authorization: Bearer <supabase_jwt>`, il BE lo verifica con `SUPABASE_JWT_SECRET` (HS256, audience `authenticated`). Niente sessioni server-side.
3. **RLS è la difesa principale.** Le policy SQL in `supabase/migrations/0002_rls_policies.sql` sono il muro: il BE usa la `service_role` solo per operazioni che davvero non possono passare dal FE (es. cache invalidation chiamata dai webhook Supabase).
4. **Cache write-through via webhook.** Le letture aggregate stanno in Redis (TTL 30s). Le scritture sui voti triggerano un Database Webhook Supabase che chiama `/internal/cache/invalidate-vote` sul BE.

## Documenti che devi leggere prima di scrivere codice

In ordine:

1. [`ARCHITECTURE_BACKEND.md`](./ARCHITECTURE_BACKEND.md) — il "perché" di tutto.
2. [`API_SPEC.md`](./API_SPEC.md) — le rotte da implementare con payload e auth.
3. [`MATCH_LOGIC.md`](./MATCH_LOGIC.md) — la formula del "match".
4. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) e [`0002_rls_policies.sql`](./supabase/migrations/0002_rls_policies.sql) — schema reale del DB.
5. [`DEVELOPMENT.md`](./DEVELOPMENT.md) — come testare in locale.
6. [`SECURITY.md`](./SECURITY.md) — cosa NON fare.

Per il deploy iniziale: [`DEVOPS_RUNBOOK.md`](./DEVOPS_RUNBOOK.md).

## Convenzioni di codice

- Python 3.12, FastAPI 0.115+, Pydantic v2, async/await ovunque possibile.
- Layout: `app/main.py`, `app/core/`, `app/api/`, `app/services/`, `app/schemas/`, `tests/`.
- Lint: `ruff check` + `ruff format`. Test: `pytest`. Coverage minimo: 70%.
- Type hints obbligatori sulle funzioni pubbliche.
- Niente `print` per il logging — usa `logging` standard configurato in `app/core/logging.py`. Sentry intercetta i WARNING+.
- Errori: solleva `HTTPException` con status code semantico, mai stringhe random.
- Settings: solo via `pydantic-settings`, mai `os.getenv` sparsi nel codice.

## Convenzioni Git

- Branch principale: `main`. Push su `main` → deploy automatico.
- Branch feature: `feat/<short-description>`, `fix/<short-description>`.
- Commit message: imperativo, breve, prefisso opzionale (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- Pull request anche da soli, così resta storia leggibile.

## Cosa NON fare (red flags)

- ❌ Mai esporre la `SUPABASE_SERVICE_ROLE_KEY` al FE.
- ❌ Mai disabilitare RLS senza documentare perché.
- ❌ Mai usare `allow_origins=["*"]` con `allow_credentials=True`.
- ❌ Mai fare `select *` di tabelle grandi senza paginazione.
- ❌ Mai bypassare il rate limit sui job di scraping (vedi `app/services/scraper.py`).
- ❌ Mai loggare JWT, password, payload completi di webhook senza redigere.

## Comandi che useremo spesso

```bash
# Dev locale
cd backend && uvicorn app.main:app --reload

# Test
cd backend && pytest -q --cov=app

# Lint + format
cd backend && ruff check . && ruff format .

# Migration locale (Supabase CLI)
supabase db reset                 # ricrea il DB locale
supabase db push                  # spinge le migration su Supabase Cloud (staging)

# Build container
docker build -t tripvote-api ./backend
```

## Cosa fare al primo prompt

Vedi [`KICKOFF_PROMPT.md`](./KICKOFF_PROMPT.md). In sintesi:

1. Leggi tutti i documenti di design (sopra).
2. Scaffolda `backend/` con la struttura definita.
3. Implementa l'auth dependency, la connessione Supabase service-role, il client Redis, l'init Sentry.
4. Implementa l'endpoint `/health` e `/proposals/preview` come primi due, con test.
5. Fermati e fai il punto prima di toccare il resto.
