#!/usr/bin/env bash
# =====================================================================
# TripVote — Applica le migration al DB Supabase remoto
#
# Uso:
#   SUPABASE_DB_PASSWORD='<db-password>' ./scripts/apply-migrations.sh
#
# Opzionale (per configurare il webhook secret in un colpo solo):
#   SUPABASE_DB_PASSWORD='...' WEBHOOK_SECRET='<SUPABASE_WEBHOOK_SECRET del BE>' \
#     ./scripts/apply-migrations.sh
#
# La password del DB la trovi in: Dashboard Supabase → Settings → Database
# (NON è la service-role key). Lo script NON salva nessun secret su disco.
# =====================================================================

set -euo pipefail

PROJECT_REF="alvjzbldchaawsqsnihw"
cd "$(dirname "$0")/.."

# ── Pre-check ────────────────────────────────────────────────────────
if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ Supabase CLI non trovata. Installa con: brew install supabase/tap/supabase" >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "✗ Manca SUPABASE_DB_PASSWORD." >&2
  echo "  Recuperala da: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database" >&2
  echo "  Poi: SUPABASE_DB_PASSWORD='...' $0" >&2
  exit 1
fi

# ── Link al progetto (idempotente) ───────────────────────────────────
if [[ ! -f supabase/config.toml ]]; then
  echo "→ Link al progetto ${PROJECT_REF}…"
  supabase link --project-ref "${PROJECT_REF}"
fi

# ── Applica le migration in ordine (0001 → 0006) ─────────────────────
# `db push` confronta supabase/migrations con la tabella di tracking remota
# e applica SOLO quelle mancanti, in ordine. Idempotente.
echo "→ Stato migration remote:"
supabase migration list --linked || true

echo ""
echo "→ Applico le migration mancanti…"
supabase db push --linked

echo ""
echo "✓ Migration applicate."

# ── Setup webhook secret (solo se fornito) ───────────────────────────
if [[ -n "${WEBHOOK_SECRET:-}" ]]; then
  if ! command -v psql >/dev/null 2>&1; then
    echo "⚠ psql non trovato: salto il setup del webhook_secret (vedi istruzioni sotto)." >&2
  else
    echo "→ Configuro private.app_config.webhook_secret…"
    # Il secret passa come VARIABILE psql (-v) e viene espanso con :'secret'
    # (quoting letterale gestito da psql): mai interpolato nell'SQL a mano,
    # quindi niente SQL injection né leak nei log/process list dell'SQL.
    # NB: l'SQL passa da stdin (non -c) perché psql espande le variabili
    # :'secret' solo in input da file/stdin, non nelle stringhe -c.
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
      "host=db.${PROJECT_REF}.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
      -v ON_ERROR_STOP=1 \
      -v secret="${WEBHOOK_SECRET}" \
      -q <<'SQL'
insert into private.app_config (key, value)
values ('webhook_secret', :'secret')
on conflict (key) do update set value = excluded.value;
SQL
    echo "✓ webhook_secret configurato."
  fi
else
  echo ""
  echo "⚠ WEBHOOK_SECRET non fornito: ricordati di eseguire nel SQL editor:"
  echo "   insert into private.app_config (key, value)"
  echo "   values ('webhook_secret', '<SUPABASE_WEBHOOK_SECRET del backend>')"
  echo "   on conflict (key) do update set value = excluded.value;"
fi

echo ""
echo "── Verifiche post-migrazione consigliate ──────────────────────────"
echo "1. Trigger voti:    select tgname from pg_trigger where tgname = 'votes_cache_invalidation';"
echo "2. Policy rimossa:  select policyname from pg_policies where tablename = 'board_members' and policyname = 'members_insert_self';  -- deve essere vuoto"
echo "3. Categoria pin:   insert di una proposta con category='pin' non deve fallire"
