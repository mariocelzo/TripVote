# ADR 0003 — Cache aggregati via Redis con invalidazione webhook-driven

- **Status**: Accepted
- **Date**: 2026-05-05

## Contesto

`GET /boards/{id}/results` legge la view aggregata `proposal_results` che fa `count(*) filter (...)` su `votes` joinato a `proposals`. Senza ottimizzazione, ogni utente che apre la board fa girare l'aggregazione su Postgres.

Scenario realistico: 6 amici aprono la board e tengono la pagina aperta. Il FE polla i risultati ogni 5 secondi (anche con realtime, c'è sempre un fallback). Sono ~432 query/min. Il free tier Supabase è generoso ma ha limiti, e ci servono i suoi cicli per le operazioni vere.

## Opzioni considerate

### A — Materialized view con refresh on trigger
- Pro: un solo strato di tecnologia.
- Contro: refresh sincrono blocca le scritture, asincrono richiede complessità extra. Granularità: `refresh materialized view` rifà tutto.

### B — Cache server-side in FastAPI (in-memory)
- Pro: zero dipendenze esterne.
- Contro: muore al restart, non condivisa tra worker. Inutile.

### C — Redis cache-aside con TTL semplice
- Pro: semplice, distribuita.
- Contro: TTL fisso → rischio di servire dati staleche stride con la "live experience" di TripVote.

### D — Redis cache-aside + invalidazione push via Supabase Database Webhook
- Pro: dati freschi al voto, niente stale window.
- Contro: dipendenza extra (webhook), endpoint interno da proteggere.

## Decisione

**Adottiamo l'opzione D**, con TTL come backstop (30s) nel caso il webhook fallisca.

### Flow

```
                                  ┌──────────────┐
              vote insert/update  │  Supabase    │
            ┌─────────────────────│  (Postgres)  │
            │                     └──────┬───────┘
            ▼                            │ replica logica
┌─────────────────────┐                  ▼
│ Database Webhook    │           ┌──────────────┐
│ POST /internal/...  │           │  Realtime    │──▶ FE (push UI update)
└─────────┬───────────┘           └──────────────┘
          │ X-Webhook-Secret
          ▼
┌─────────────────────┐
│  FastAPI            │
│  redis.delete(...)  │
└─────────────────────┘
                                  ┌──────────────┐
                                  │  GET /boards │
                                  │   /:id/      │  ← cache miss qui rilegge
                                  │   results    │    da Postgres e ripopola Redis
                                  └──────────────┘
```

## Dettagli implementativi

- **Key**: `board:{board_id}:results`. Una sola key per board, semplice da invalidare.
- **TTL**: 30 secondi come backstop. Se per qualche motivo il webhook non arriva (Supabase down, BE down), entro 30s la cache muore da sola.
- **Singleflight**: usiamo un lock Redis (`SET NX EX 5`) per evitare cache stampede se 6 client missano insieme. Solo uno ricalcola, gli altri leggono il risultato fresh.
- **Webhook secret**: header `X-Webhook-Secret` confrontato in tempo costante (`hmac.compare_digest`).
- **Logging**: ogni invalidation è loggata con `board_id`, source webhook payload event (`INSERT`/`UPDATE`/`DELETE`).

## Cosa NON cachiamo

- I voti singoli (vivono solo in Postgres + Realtime).
- I dati utente (cambiamento raro, FE può rileggere senza problemi).
- I dati di board (idem).

Solo gli **aggregati** sono cachati, perché sono l'unico hot path leggibile spesso.

## Test

- `test_cache_hit_after_first_call`: prima chiamata miss, seconda hit.
- `test_cache_invalidated_on_webhook`: simulo webhook → key sparisce.
- `test_webhook_rejects_wrong_secret`: 401.
- `test_cache_ttl_backstop`: la key non esiste più dopo TTL.

## Quando rivedere

- Se l'app cresce a 10K+ board attive, i webhook potrebbero diventare rumorosi. Considerare invalidazione **batched** (debounce 1s).
- Se Upstash 10K cmd/giorno diventano stretti, valutare Redis self-hosted sul Droplet.
- Se Supabase introduce cache nativo per le view → riconsiderare se vale la pena la complessità.
