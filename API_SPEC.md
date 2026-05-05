# API Specification — TripVote Backend

> Contratto delle rotte HTTP esposte da FastAPI. Base URL: `https://api.tripvote.me`.
> Tutte le rotte (tranne `/health` e i webhook `/internal/*`) richiedono `Authorization: Bearer <supabase_jwt>`.

## Convenzioni generali

- **Autenticazione**: JWT Supabase (HS256, audience `authenticated`). Verifica in `app/core/auth.py`.
- **Encoding**: JSON UTF-8 in entrambi i versi.
- **Date**: ISO 8601 UTC (`2026-05-05T14:23:00Z`).
- **Errori**: forma standard FastAPI `{"detail": "messaggio"}` o `{"detail": [{loc, msg, type}]}` per i validation error.
- **Rate limiting**: tracciato in Redis. Risponde **429** con header `Retry-After`.
- **Versioning**: per ora niente `/v1/`. Quando rompiamo compat introduciamo `/v2/` in parallelo.
- **Pagination** (quando rilevante): query params `?limit=50&cursor=<opaque>`.

---

## Endpoint pubblici

### `GET /health`

Health check, usato dal Caddyfile e dal workflow di deploy.

**Auth**: nessuna.

**Response 200**
```json
{
  "status": "ok",
  "version": "a3f9c12",
  "uptime_seconds": 12345
}
```

---

## Proposte (`/proposals`)

### `POST /proposals/preview`

Estrae metadati Open Graph da un URL (hotel su Booking, volo su Skyscanner, ecc.) per popolare automaticamente la card della proposta nel FE.

**Auth**: JWT richiesto.
**Rate limit**: 20 req/min per utente.

**Request body**
```json
{ "url": "https://www.booking.com/hotel/it/example.html" }
```

**Response 200**
```json
{
  "title": "Hotel Example - Roma",
  "description": "Camera doppia con vista...",
  "image_url": "https://...jpg",
  "price_cents": 12000,
  "currency": "EUR",
  "site_name": "Booking.com",
  "lat": 41.9028,
  "lng": 12.4964
}
```

**Errori**
- `400` URL non valido o non raggiungibile.
- `401` JWT mancante/non valido.
- `422` body malformato.
- `429` rate limit.
- `502` il sito remoto ha risposto male; il client può ritentare.

**Note implementative**
- Usa `httpx.AsyncClient(timeout=8, follow_redirects=True)`.
- Parser primario: `opengraph-py3`. Fallback: `BeautifulSoup` su `<title>`, `<meta name="description">`, `<meta property="og:image">`.
- Per il prezzo: regex su `og:price:amount` o microdata schema.org `Product.offers.price`. Se non trovi nulla, restituisci `null`, non inventare.
- Cache della preview in Redis con key `preview:<sha1(url)>` TTL 1h: la stessa URL è probabilmente incollata da più membri.

---

## Board (`/boards`)

> Le operazioni standard CRUD sulle board si fanno **direttamente da FE → Supabase** sfruttando RLS. Qui stanno solo le operazioni che il FE non può/non deve fare da solo.

### `GET /boards/{board_id}/results`

Restituisce i conteggi voti aggregati e l'eventuale "match" (vedi [`MATCH_LOGIC.md`](./MATCH_LOGIC.md)). Letture cache-aside in Redis.

**Auth**: JWT richiesto. L'utente deve essere membro della board (verificato via Supabase service-role + check `board_members`).

**Response 200**
```json
{
  "board_id": "5d3...",
  "computed_at": "2026-05-05T14:23:00Z",
  "members_count": 6,
  "voters_count": 5,
  "quorum_reached": true,
  "proposals": [
    {
      "proposal_id": "a1b...",
      "title": "Hotel Example",
      "category": "hotel",
      "yes_count": 4,
      "maybe_count": 1,
      "no_count": 0,
      "total_votes": 5,
      "score": 0.9,
      "is_match": true
    }
  ],
  "winners": ["a1b..."]
}
```

**Errori**
- `403` l'utente non è membro della board.
- `404` board non esiste.

### `POST /boards/{board_id}/recompute`

Ricalcola e ripopola la cache `board:{id}:results` (utile dopo bulk import o per debug). Rate-limitato.

**Auth**: JWT richiesto + ruolo `owner` o `editor`.
**Rate limit**: 5 req/min per utente.

**Response 202** — accettato, la cache verrà aggiornata.

---

## Notifiche (`/notifications`)

### `POST /notifications/invite`

Manda un email di invito a uno o più indirizzi. Il link contiene il `boards.invite_token`.

**Auth**: JWT richiesto. L'utente deve essere `owner` della board.
**Rate limit**: 30 inviti/giorno per utente (per non bruciare il piano SendGrid).

**Request body**
```json
{
  "board_id": "5d3...",
  "emails": ["amico@example.com", "altro@example.com"],
  "personal_message": "Dai, andiamo a Lisbona a settembre!"
}
```

**Response 200**
```json
{ "sent": 2, "failed": [] }
```

### `POST /notifications/match`

> **Non chiamato dal FE**. Triggerato internamente quando una proposta diventa match (vedi `internal.py`).

Manda una notifica email a tutti i membri della board.

---

## Webhook interni (`/internal`)

> Chiamati **solo** dai Database Webhooks di Supabase. Protetti da header `X-Webhook-Secret`.

### `POST /internal/cache/invalidate-vote`

Triggerato da `INSERT/UPDATE/DELETE` su `votes`. Invalida la cache aggregata della board.

**Auth**: header `X-Webhook-Secret: <SUPABASE_WEBHOOK_SECRET>`.

**Body** (forma standard Supabase webhook)
```json
{
  "type": "INSERT",
  "table": "votes",
  "record": { "proposal_id": "...", "user_id": "...", "value": 1 },
  "old_record": null,
  "schema": "public"
}
```

**Response 200**: `{"ok": true, "invalidated": "board:<id>:results"}`.

**Effetti collaterali**
1. Risolve `board_id` dal `proposal_id`.
2. `redis.delete("board:<board_id>:results")`.
3. Se il nuovo voto fa scattare un match (chiama `services/match.py`), invia notifica email a tutti i membri (job in background, non blocca la response).

### `POST /internal/cron/close-expired-boards`

> Chiamato da un cron (APScheduler in-process, ogni notte alle 3:00 UTC).

Chiude le board con `end_date < today` e `status = 'open'`. Notifica i membri.

**Auth**: header `X-Cron-Secret`.

---

## Tabella riassuntiva

| Metodo | Path | Auth | Rate limit | Note |
|---|---|---|---|---|
| GET | `/health` | — | — | usato da Caddy + CI |
| POST | `/proposals/preview` | JWT | 20/min | scraping link |
| GET | `/boards/{id}/results` | JWT + member | — | cache-aside |
| POST | `/boards/{id}/recompute` | JWT + owner/editor | 5/min | refresh cache |
| POST | `/notifications/invite` | JWT + owner | 30/giorno | SendGrid |
| POST | `/internal/cache/invalidate-vote` | webhook secret | — | da Supabase |
| POST | `/internal/cron/close-expired-boards` | cron secret | — | nightly |

---

## Cosa NON è qui (e perché)

| Operazione | Dove vive | Perché |
|---|---|---|
| Login / Sign-up / Password reset | FE → Supabase Auth | gestito interamente da `supabase-js`. |
| Crea/modifica/elimina board | FE → Supabase | RLS + insert standard, non serve BE. |
| Aggiungi membro / esce dalla board | FE → Supabase | RLS sull'`invite_token`. |
| Crea/elimina proposta | FE → Supabase | dopo aver chiamato `/proposals/preview` per i metadata. |
| Inserisce/aggiorna voto | FE → Supabase | RLS sulla tabella `votes`. |
| Realtime aggiornamento voti | FE ↔ Supabase Realtime | canale `board:{id}:votes`. |
| Upload immagini cover | FE → Supabase Storage | bucket `boards-covers`. |

Se ti viene voglia di proxare una di queste operazioni attraverso il BE, **fermati** — c'è quasi sicuramente un modo per farla da Supabase con le RLS.
