# ADR 0002 — Supabase RLS come muro principale, BE non gatekeeper

- **Status**: Accepted
- **Date**: 2026-05-05

## Contesto

Tipicamente in un'architettura "classica", il FE chiama il BE che a sua volta interroga il DB. Il BE fa da gatekeeper: applica autorizzazione, filtri, validation. Questo design:

- Raddoppia il codice (FE → BE → DB) per operazioni CRUD banali.
- Aggiunge latenza.
- Sposta logica business sul BE che potrebbe vivere a livello DB.

Supabase fornisce **Row Level Security** (RLS) Postgres come feature di prima classe. L'autorizzazione è espressa in SQL ed è applicata automaticamente a ogni query in arrivo dal client `supabase-js`, identificato dal JWT di Supabase Auth.

## Decisione

Il **frontend parla direttamente con Supabase** per:

- Auth (login, signup, password reset, OAuth).
- CRUD su tutte le entità (`boards`, `proposals`, `votes`, `board_members`).
- Realtime (canali su `votes`, `proposals`).
- Storage (upload immagini).

Il **backend FastAPI esiste solo per**:

1. Operazioni che richiedono accesso a sistemi esterni con secret (SendGrid).
2. Logica pesante che non vogliamo nel client (scraping link preview).
3. Aggregazioni complesse non esprimibili in una vista RLS-friendly.
4. Webhook in entrata (Database Webhooks Supabase, cron interni).
5. Cache layer (Redis) che non vogliamo esporre al FE.

## Implicazioni

- **Sicurezza**: tutto il modello di accesso è in `0002_rls_policies.sql`. Una policy sbagliata = una breccia. Scriviamo test specifici (`tests/test_rls.py`) che provano accessi negati.
- **Auth condivisa**: il BE valida lo stesso JWT che Supabase emette al FE (HS256, secret condiviso). Niente sessioni server-side, niente cookie management custom.
- **Service role**: usata **solo** dal BE, mai inviata al FE. Le operazioni con service role (cache invalidation, notifiche di sistema) sono limitate e auditabili.
- **DX FE**: il FE può essere generato in larga parte (Claude design) senza dover concordare API spec con il BE per le operazioni standard.

## Conseguenze positive

- Codice BE ~70% più piccolo di un'architettura classica.
- Latenza ridotta sulle operazioni utente.
- Realtime "gratis" via Supabase Channels.
- Less surface da attaccare sul BE.

## Conseguenze negative

- Tutta la sicurezza poggia sulle RLS: errori SQL hanno blast radius alto.
- Debugging più scomodo: errori 401/403 dal client Supabase non hanno stack trace ricche.
- Operazioni transazionali multi-tabella possono richiedere RPC Postgres custom.
- "Vendor lock-in" su Supabase. Mitigato dal fatto che è Postgres standard sotto: in caso di switch, esportiamo lo schema e rimplementiamo l'auth.

## Test obbligatori (gate prima del lancio)

- Utente NON membro tenta `select` su `proposals` di una board → 0 righe.
- Utente NON membro tenta `insert` voto → fail.
- Utente non-owner tenta `delete` board → fail.
- Token scaduto → 401 dal FE.

Questi test girano in CI con un Supabase locale via `supabase` CLI.

## Quando rivedere

- Se le RLS diventano illeggibili (>20 policy per tabella, ramificazioni complesse), considerare di spostare logica nel BE.
- Se Supabase introduce breaking change su RLS → valutare migration cost.
