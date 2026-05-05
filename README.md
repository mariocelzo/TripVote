# TripVote

Web-app collaborativa per pianificare viaggi di gruppo. Crei una board, mandi un link agli amici su WhatsApp, ognuno propone hotel/voli/attività, tutti votano in tempo reale (Sì / Forse / No) e quando una proposta supera la soglia diventa un "match" del viaggio.

## Stack

| Strato | Tecnologia | Hosting |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui | Vercel (Hobby) |
| Backend | FastAPI (Python 3.12) in Docker | DigitalOcean Droplet |
| DB + Auth + Storage + Realtime | Supabase (Postgres + RLS) | Supabase Cloud |
| Cache + Rate limit + Lock | Upstash Redis | Upstash |
| Email transazionali | SendGrid (piano Student) | SendGrid |
| Error tracking | Sentry (piano Student) | Sentry |
| Reverse proxy + TLS | Caddy 2 | sul Droplet |
| CI/CD | GitHub Actions → GHCR → SSH | GitHub |

Costo a regime: **0€/mese per ~3 anni** sfruttando il GitHub Student Developer Pack.

## Repo layout

```
.
├── README.md                       # questo file
├── CLAUDE.md                       # contesto persistente per Claude Code
├── KICKOFF_PROMPT.md               # prompt per il primo messaggio a Claude Code
├── ARCHITECTURE_BACKEND.md         # design dell'architettura BE
├── API_SPEC.md                     # contratto delle rotte BE
├── MATCH_LOGIC.md                  # logica del "match" (quando una proposta vince)
├── DEVELOPMENT.md                  # come girare BE + Supabase in locale
├── DEVOPS_RUNBOOK.md               # bootstrap del Droplet da zero
├── SECURITY.md                     # threat model, secrets, RLS
├── backend/                        # FastAPI app (da scaffoldare)
│   ├── .env.example
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── pyproject.toml
├── infra/
│   ├── docker-compose.yml          # gira sul Droplet
│   └── Caddyfile                   # reverse proxy + TLS automatico
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql           # schema (profiles, boards, ...)
│       └── 0002_rls_policies.sql   # Row Level Security
└── .github/workflows/
    └── deploy.yml                  # CI/CD: test → build → push GHCR → deploy
```

## Quick start (sviluppatore)

1. Leggi [`CLAUDE.md`](./CLAUDE.md) per capire il progetto in 3 minuti.
2. Segui [`DEVELOPMENT.md`](./DEVELOPMENT.md) per girare BE + Supabase in locale.
3. Quando devi deployare la prima volta, segui [`DEVOPS_RUNBOOK.md`](./DEVOPS_RUNBOOK.md).

## Quick start (Claude Code)

Apri Claude Code in questa directory e usa il prompt in [`KICKOFF_PROMPT.md`](./KICKOFF_PROMPT.md) come primo messaggio.

## Frontend

Il frontend (Next.js) viene gestito separatamente tramite Claude design. Questo repo contiene solo il backend e l'infra condivisa (DB schema, CI/CD).
