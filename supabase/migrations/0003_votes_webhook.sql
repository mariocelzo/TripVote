-- =====================================================================
-- TripVote — Database Webhook per cache invalidation
-- Migration: 0003_votes_webhook.sql
--
-- Ogni volta che un voto viene inserito/aggiornato/cancellato,
-- chiama il nostro endpoint Vercel per invalidare la cache Redis
-- e controllare le transizioni di match.
--
-- Prerequisito: il secret va impostato UNA VOLTA via SQL editor Supabase:
--   ALTER DATABASE postgres SET app.webhook_secret = 'il-tuo-secret';
-- =====================================================================

-- Abilita pg_net per HTTP requests dal database.
-- NB: pg_net non è rilocabile — installa sempre le sue funzioni nello schema "net".
create extension if not exists pg_net;

-- Funzione trigger: chiama l'endpoint Vercel in modo asincrono (fire-and-forget)
create or replace function public.notify_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload  jsonb;
  secret   text;
  endpoint text := 'https://tripvote-api.vercel.app/internal/cache/invalidate-vote';
begin
  -- Legge il secret dal setting PostgreSQL (mai hardcoded)
  secret := current_setting('app.webhook_secret', true);

  -- Costruisce il payload compatibile con SupabaseWebhookPayload
  if TG_OP = 'DELETE' then
    payload := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     null,
      'old_record', row_to_json(OLD)::jsonb
    );
  else
    payload := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW)::jsonb,
      'old_record', null
    );
  end if;

  -- Chiamata HTTP asincrona via pg_net (schema "net", qualificato perché
  -- search_path è fissato e non lo include). Avvolta in un blocco exception:
  -- un problema di cache invalidation NON deve mai far fallire il voto.
  begin
    perform net.http_post(
      url     := endpoint,
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-webhook-secret', coalesce(secret, '')
      ),
      body    := payload
    );
  exception when others then
    raise warning 'notify_vote_change: webhook fallito: %', sqlerrm;
  end;

  return coalesce(NEW, OLD);
end;
$$;

-- Trigger su INSERT / UPDATE / DELETE della tabella votes
drop trigger if exists votes_cache_invalidation on public.votes;
create trigger votes_cache_invalidation
  after insert or update or delete on public.votes
  for each row execute function public.notify_vote_change();
