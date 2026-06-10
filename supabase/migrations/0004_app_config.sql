-- =====================================================================
-- TripVote — Schema privato per configurazioni/secrets
-- Migration: 0004_app_config.sql
--
-- Lo schema "private" non è esposto dalle Supabase REST/GraphQL API
-- (PostgREST espone solo lo schema "public").
-- Usiamo questa tabella per leggere i secrets nei trigger senza
-- bisogno di ALTER DATABASE (che richiede superuser su Supabase Cloud).
--
-- Setup post-migrazione (UNA VOLTA, via SQL editor Supabase):
--   insert into private.app_config (key, value)
--   values ('webhook_secret', '<SUPABASE_WEBHOOK_SECRET del backend>')
--   on conflict (key) do update set value = excluded.value;
-- =====================================================================

-- Schema non esposto dall'API Supabase
create schema if not exists private;

-- Tabella chiave-valore per configurazioni interne
create table if not exists private.app_config (
  key   text primary key,
  value text not null
);

-- Solo il ruolo postgres (service role) può leggere/scrivere
revoke all on private.app_config from public, anon, authenticated;

-- Aggiorna la funzione webhook per leggere il secret da questa tabella
create or replace function public.notify_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  payload  jsonb;
  secret   text;
  endpoint text := 'https://tripvote-api.vercel.app/internal/cache/invalidate-vote';
begin
  -- Legge il secret dalla tabella private.app_config
  select value into secret
  from private.app_config
  where key = 'webhook_secret';

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
