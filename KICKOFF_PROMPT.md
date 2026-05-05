# Prompt di kickoff per Claude Code

> Copia tutto il blocco qui sotto e incollalo come **primo messaggio** in Claude Code, dopo aver aperto la cartella del progetto.
> Funziona da briefing iniziale: dice a Claude Code cosa leggere, in che ordine costruire, dove fermarsi per fare il punto.

---

```
Sei un Senior Backend Engineer che entra come unico sviluppatore su TripVote,
una webapp di pianificazione viaggi di gruppo. L'architettura è già stata
disegnata da un altro architetto e i documenti di design sono nel repo.

## Step 1 — Allinea il contesto (NON scrivere codice ancora)

Leggi questi file IN ORDINE e poi rispondimi con un riassunto di 10 righe
che dimostri di aver capito:

1. README.md — overview del progetto e dello stack.
2. CLAUDE.md — convenzioni e filosofia architetturale. Leggilo bene,
   contiene i "red flag" da non fare.
3. ARCHITECTURE_BACKEND.md — il "perché" di tutte le scelte tecniche.
4. API_SPEC.md — il contratto delle rotte da implementare.
5. MATCH_LOGIC.md — la formula con cui si decide quando una proposta "vince".
6. supabase/migrations/0001_init.sql + 0002_rls_policies.sql — schema reale
   del database con RLS.
7. DEVELOPMENT.md — come si gira il progetto in locale.
8. SECURITY.md — cosa NON fare mai.

Nel riassunto rispondi a:
- Qual è il principio architetturale chiave del rapporto FE/BE?
- Quando un endpoint del BE deve esistere e quando invece il FE deve
  parlare direttamente a Supabase?
- Cos'è un "match" in TripVote?

## Step 2 — Scaffolding (ferma e mostra il diff)

Crea la struttura `backend/` con questo layout:

  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py                # FastAPI app + middleware + Sentry init
  │   ├── core/
  │   │   ├── __init__.py
  │   │   ├── config.py          # pydantic-settings
  │   │   ├── auth.py            # verify JWT Supabase, get_current_user
  │   │   ├── redis.py           # client Upstash async
  │   │   ├── supabase.py        # service-role client
  │   │   ├── logging.py         # logging config
  │   │   └── sentry.py          # Sentry init
  │   ├── api/
  │   │   ├── __init__.py
  │   │   ├── deps.py            # dependencies condivise
  │   │   ├── health.py          # GET /health
  │   │   ├── proposals.py       # POST /proposals/preview
  │   │   ├── boards.py          # logiche custom su board
  │   │   ├── notifications.py   # invio email SendGrid
  │   │   └── internal.py        # webhook Supabase (cache invalidation)
  │   ├── services/
  │   │   ├── __init__.py
  │   │   ├── scraper.py         # link preview con httpx + BS4 + opengraph
  │   │   ├── board_results.py   # cache-aside per i risultati
  │   │   ├── match.py           # logica del "match" (vedi MATCH_LOGIC.md)
  │   │   └── email.py           # wrapper SendGrid
  │   └── schemas/
  │       ├── __init__.py
  │       ├── proposals.py
  │       └── boards.py
  └── tests/
      ├── conftest.py
      ├── test_health.py
      └── test_auth.py

Il file `requirements.txt`, `requirements-dev.txt`, `Dockerfile`,
`pyproject.toml` e `.env.example` sono GIÀ in `backend/` — usali, non
ricrearli.

Dopo lo scaffolding, FERMATI e mostrami il diff. Non procedere oltre
finché non te lo confermo.

## Step 3 — Prima slice end-to-end

Implementa SOLO questi due endpoint con relativi test:

  GET  /health
       → 200 {"status":"ok","version":"<git-sha>"}

  POST /proposals/preview
       → richiede JWT valido (vedi auth.py)
       → body: { "url": "https://..." }
       → 200: { "title", "description", "image_url", "price_cents",
                "currency", "site_name" }
       → 429 se l'utente supera 20 richieste/min (rate limit Redis)
       → 400 se l'url non è valido o non scrapabile

Usa httpx async + BeautifulSoup + opengraph-py3 per il parsing.
Test: usa pytest-httpx per mockare le risposte HTTP.

Quando hai finito, gira `pytest` e `ruff check .` e mostrami l'output.

## Step 4 — Stop e checkpoint

A questo punto ferma e dimmi:
- Cosa hai già implementato.
- Cosa noti di mancante o dubbio nei documenti di design.
- Quale endpoint vuoi affrontare per primo nel prossimo round.

NON procedere a implementare il resto senza il mio ok.

## Regole generali

- Niente AI-slop: no commenti tipo "// initialize variable", no docstring
  ridondanti che ripetono la signature, no print di debug lasciati nel codice.
- Type hints ovunque, async dove possibile.
- Errori → HTTPException con status code semantico.
- Niente `os.getenv` sparsi: tutto via `app.core.config.settings`.
- Per ogni file nuovo, prima cerca se esiste già qualcosa di simile.

Inizia dallo Step 1.
```

---

## Note operative

- **Quando lanciare questo prompt**: una volta sola, all'apertura del progetto in Claude Code. Negli step successivi ti basterà dirgli "procedi con [endpoint X] da `API_SPEC.md`".
- **Se Claude Code salta lo Step 1**: fermalo subito e digli di leggere i documenti prima di toccare codice. È la cosa più importante.
- **Se Claude Code ti propone di buildare il FE**: ricordagli che il frontend è fuori scope per questo repo (vedi `CLAUDE.md`).
- **Aggiornamenti**: se la `API_SPEC.md` o il `MATCH_LOGIC.md` cambiano, aggiungi al prompt: "Rileggi `API_SPEC.md` perché è cambiato dall'ultima volta".
