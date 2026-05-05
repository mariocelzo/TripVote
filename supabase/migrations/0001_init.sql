-- =====================================================================
-- TripVote — Initial schema
-- Migration: 0001_init.sql
-- Run with: supabase db reset (locale) | supabase db push (cloud)
-- =====================================================================

-- =====================================================================
-- EXTENSIONS
-- =====================================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid, gen_random_bytes

-- =====================================================================
-- PROFILES — estensione di auth.users di Supabase
-- =====================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Trigger: ogni nuovo auth.users crea automaticamente un profilo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- BOARDS
-- =====================================================================
create table public.boards (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  destination  text,
  start_date   date,
  end_date     date,
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  cover_url    text,
  status       text not null default 'open' check (status in ('open','closed','archived')),
  match_config jsonb,                                  -- override per match (vedi MATCH_LOGIC.md)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint boards_dates_check check (end_date is null or start_date is null or end_date >= start_date)
);

create index idx_boards_owner  on public.boards(owner_id);
create index idx_boards_invite on public.boards(invite_token);
create index idx_boards_status on public.boards(status) where status = 'open';

-- Trigger: aggiorna updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

-- =====================================================================
-- BOARD MEMBERS
-- =====================================================================
create table public.board_members (
  board_id  uuid not null references public.boards(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'voter' check (role in ('owner','editor','voter')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index idx_board_members_user on public.board_members(user_id);

-- Trigger: quando si crea una board, l'owner diventa automaticamente membro 'owner'
create or replace function public.handle_new_board()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger boards_create_owner_membership
  after insert on public.boards
  for each row execute function public.handle_new_board();

-- =====================================================================
-- PROPOSALS
-- =====================================================================
create table public.proposals (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  category    text not null check (category in ('hotel','flight','activity','restaurant','other')),
  title       text not null,
  description text,
  url         text,
  image_url   text,
  price_cents int,
  currency    text default 'EUR',
  rating      numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  lat         numeric(9,6),
  lng         numeric(9,6),
  metadata    jsonb default '{}'::jsonb,           -- output extra dello scraper
  matched_at  timestamptz,                          -- popolato quando diventa "match"
  created_at  timestamptz not null default now()
);

create index idx_proposals_board    on public.proposals(board_id);
create index idx_proposals_category on public.proposals(board_id, category);
create index idx_proposals_match    on public.proposals(board_id) where matched_at is not null;

-- =====================================================================
-- VOTES
-- =====================================================================
create table public.votes (
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  value       smallint not null check (value in (-1, 0, 1)),  -- No, Forse, Sì
  voted_at    timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index idx_votes_user on public.votes(user_id);

-- =====================================================================
-- VIEW: aggregazione voti per proposta
-- =====================================================================
create view public.proposal_results as
select
  p.id        as proposal_id,
  p.board_id,
  p.title,
  p.category,
  p.matched_at,
  count(*) filter (where v.value =  1) as yes_count,
  count(*) filter (where v.value =  0) as maybe_count,
  count(*) filter (where v.value = -1) as no_count,
  count(v.user_id)                      as total_votes
from public.proposals p
left join public.votes v on v.proposal_id = p.id
group by p.id;

-- =====================================================================
-- HELPER FUNCTIONS (usate dalle RLS)
-- =====================================================================

-- Restituisce true se l'utente corrente è membro della board indicata
create or replace function public.is_board_member(b_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.board_members
    where board_id = b_id and user_id = auth.uid()
  );
$$;

-- Restituisce true se l'utente corrente è owner o editor della board
create or replace function public.is_board_editor(b_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.board_members
    where board_id = b_id
      and user_id  = auth.uid()
      and role     in ('owner','editor')
  );
$$;

-- =====================================================================
-- REALTIME
-- =====================================================================
-- Abilita la replica logica per le tabelle che il FE ascolta
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.proposals;
alter publication supabase_realtime add table public.board_members;

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
-- Bucket per le cover delle board (max 2 MB, immagini)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('boards-covers', 'boards-covers', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Bucket per gli screenshot delle proposte
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proposal-images', 'proposal-images', true, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Le policy di storage le mettiamo in 0002_rls_policies.sql
