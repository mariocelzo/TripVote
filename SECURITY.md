# Security

> Threat model leggero, secrets management, e cose da NON fare. Da rivedere prima del primo lancio pubblico.

## Threat model (dove guardare per primi)

| Asset | Minaccia | Mitigazione |
|---|---|---|
| JWT utente | leak via XSS sul FE | Supabase usa cookies HttpOnly se configurato bene; CSP stretta sul FE |
| Service role key | leak via repo o log | mai nel FE; mai in log; chiave nel solo `.env` di produzione (file 600) |
| Endpoint webhook (`/internal/*`) | chiamate spoofate | header `X-Webhook-Secret` confrontato con `SUPABASE_WEBHOOK_SECRET` |
| Endpoint scraping `/proposals/preview` | abuso → DOS o IP ban dai siti scrapati | rate limit Redis 20/min/utente + cache 1h sulla URL |
| Rotta `/notifications/invite` | abuso → quota SendGrid bruciata + spam | rate limit 30 inviti/giorno/utente, solo owner della board |
| Database | bypass RLS | RLS attiva su **tutte** le tabelle, test che provano l'accesso da utente non-membro |
| Server SSH | brute force | UFW + fail2ban + solo SSH key, niente password |
| Storage Supabase | upload arbitrari | bucket policy che limita MIME e size |

## Gestione dei secrets

### Dove vivono

| Secret | Storage | Note |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` su Droplet, `Settings/Secrets` GitHub Actions | mai nel FE, mai in repo |
| `SUPABASE_JWT_SECRET` | come sopra | usato solo per verificare JWT |
| `SUPABASE_WEBHOOK_SECRET` | come sopra + Supabase Studio (header webhook) | generato con `openssl rand -hex 32` |
| `SENDGRID_API_KEY` | come sopra | scope minimo: solo "Mail Send" |
| `SENTRY_DSN` | come sopra | è semi-pubblico ma evitare di committare |
| `REDIS_URL` | come sopra | contiene la password Upstash |
| `CRON_SECRET` | come sopra | per i cron interni |
| `DO_SSH_KEY` | solo `Settings/Secrets` GitHub | private key usata dal workflow di deploy |
| `GHCR_TOKEN` | come sopra | PAT con scope `read:packages` |

### Cosa NON deve mai succedere

- ❌ Secret committati nel repo (anche per "test al volo").
- ❌ Secret stampati nei log (Sentry, stdout, GitHub Actions). Configura `redact_*` nel logger.
- ❌ Secret nei messaggi di errore restituiti al client.
- ❌ Service role key inviata al FE per "comodità".
- ❌ `.env` con permessi diversi da `600`.

### Rotazione

- **JWT secret**: rotare da Supabase Studio (Settings → API). Aggiorna l'`.env` del Droplet e ridistribuisci.
- **API key SendGrid**: ne crei una nuova, sostituisci, revochi la vecchia dopo 24h.
- **PAT GitHub**: scadenza 90 giorni; rinnova tramite il calendario.

## Row Level Security: come testarla

Il valore di RLS è zero se non c'è un test che prova ad attaccarla. In `tests/test_rls.py` (o equivalente) deve esistere:

```python
def test_non_member_cannot_read_proposals():
    # crea board, NON aggiungi user_b come membro
    # tenta select da user_b → deve restituire 0 righe (non un errore)
    ...

def test_non_member_cannot_vote():
    # tenta insert in votes da user_b → deve fallire
    ...

def test_owner_can_invite():
    ...
```

Questi test **devono** essere eseguiti su un Supabase locale con le RLS attive, non con la service role.

## Endpoint pubblici, comportamento sotto attacco

### Abuso del rate limit

Risposta: `429` con `Retry-After`. Niente IP-ban automatico (rischio false positive). Se vediamo abuso ripetuto da un user_id, decisione manuale di sospensione.

### Tentativo di scraping di URL "interni" (SSRF)

`/proposals/preview` accetta solo URL `http(s)`. Bloccare:
- Schema diverso da http/https
- Hostname che risolve a IP privati (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1`, `fc00::/7`, ecc.)
- `localhost`, `0.0.0.0`, `metadata.google.internal`, `169.254.169.254`

Implementa `_is_safe_url()` in `app/services/scraper.py` e testalo in `tests/test_scraper.py`.

### URL malformati o redirect a phishing

- Limite di redirect: 3.
- Timeout connect+read: 8 secondi totali.
- Ignora download > 5 MB (header `Content-Length`).

## CORS

Solo i domini esplicitamente in lista (vedi `app/main.py`). **Mai** `allow_origins=["*"]` con `allow_credentials=True`. I preview deploy di Vercel (`*.vercel.app`) sono ammessi via wildcard regex; in produzione solo `tripvote.me` e `www.tripvote.me`.

## Headers di sicurezza

Caddy aggiunge per default ottimi default. In `Caddyfile` aggiungiamo:

```
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
}
```

`Content-Security-Policy` lo lasciamo al FE, non al BE (è un'API, non serve servire HTML).

## Logging — cosa redigere

In `app/core/logging.py`:

- ❌ Mai loggare l'header `Authorization`.
- ❌ Mai loggare il body delle webhook (può contenere PII).
- ❌ Mai loggare email degli utenti, salvo in Sentry dove è acceptable e troncato.
- ✅ OK loggare `user_id`, `board_id`, `proposal_id`, status code, durata, path.

## Rate limiting riepilogo

| Endpoint | Limite | Implementazione |
|---|---|---|
| `POST /proposals/preview` | 20/min/utente | Redis `INCR + EXPIRE 60` |
| `POST /boards/{id}/recompute` | 5/min/utente | Redis |
| `POST /notifications/invite` | 30/giorno/utente, max 10 destinatari per chiamata | Redis daily key |
| `POST /votes` (FE → Supabase) | n/a a livello BE | gestito a livello DB con index unique sul `(proposal_id, user_id)` |
| Endpoint generico | 200/min/IP | aggiungere middleware globale Redis se serve |

## GDPR / privacy (lite)

- L'utente cancella il proprio account: `DELETE FROM auth.users` cascata su tutto via FK `on delete cascade`.
- Export dei dati utente: endpoint `/me/export` da implementare quando avremo utenti veri.
- Cookie banner: lato FE.
- Privacy policy + ToS: documenti statici sul FE, link nel footer.
- Server in Frankfurt → dati in EU.

## Cosa fare se trovi un bug di sicurezza

1. Crea una issue **privata** o manda email a te stesso (se sei solo).
2. Patcha su un branch `fix/sec-<descrizione>`.
3. Deploy + bump versione.
4. Se ci sono utenti veri impattati, comunicalo.

## Penetration tasks da fare prima del lancio pubblico

- [ ] Test SSRF su `/proposals/preview`.
- [ ] Test RLS bypass: utente non membro tenta select su tutte le tabelle.
- [ ] Test `Authorization` con JWT scaduto, malformato, firmato male.
- [ ] Test rate limit su tutti gli endpoint con limite.
- [ ] Test CORS da origin non whitelisted (deve fallire).
- [ ] Test webhook senza `X-Webhook-Secret` (deve fallire 401).
- [ ] Test upload immagine > 5 MB su Supabase Storage (bucket policy).
- [ ] Scan automatico con [trivy](https://github.com/aquasecurity/trivy) sull'immagine Docker.
