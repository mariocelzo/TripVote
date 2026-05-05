-- =====================================================================
-- TripVote — Row Level Security policies
-- Migration: 0002_rls_policies.sql
-- =====================================================================

-- =====================================================================
-- Abilita RLS su tutte le tabelle pubbliche
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.boards        enable row level security;
alter table public.board_members enable row level security;
alter table public.proposals     enable row level security;
alter table public.votes         enable row level security;

-- =====================================================================
-- PROFILES
-- =====================================================================
-- Tutti possono leggere i profili (display_name, avatar) — serve per mostrare
-- gli avatar dei membri della board. Niente dati sensibili qui.
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- L'utente può modificare solo il proprio profilo
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- L'insert viene fatto dal trigger handle_new_user, non dagli utenti
-- (non serve policy d'insert per gli utenti normali)

-- =====================================================================
-- BOARDS
-- =====================================================================

-- Lettura: solo i membri vedono la board
create policy "boards_select_members"
  on public.boards for select
  using (public.is_board_member(id));

-- Lettura tramite invite_token: chiunque ha il token può leggere
-- (consente al FE di mostrare l'anteprima della board prima del join)
-- Nota: passa il token come query param e SELECT lo restituisce solo se matcha
create policy "boards_select_via_token"
  on public.boards for select
  using (
    invite_token = current_setting('request.jwt.claims', true)::jsonb->>'invite_token'
  );

-- Insert: solo l'utente autenticato che si fa owner
create policy "boards_insert_self_owner"
  on public.boards for insert
  with check (owner_id = auth.uid());

-- Update: solo l'owner
create policy "boards_update_owner"
  on public.boards for update
  using (owner_id = auth.uid());

-- Delete: solo l'owner
create policy "boards_delete_owner"
  on public.boards for delete
  using (owner_id = auth.uid());

-- =====================================================================
-- BOARD MEMBERS
-- =====================================================================

-- I membri di una board vedono gli altri membri
create policy "members_select_visible_to_members"
  on public.board_members for select
  using (public.is_board_member(board_id));

-- Un utente può aggiungersi alla board se conosce il token
-- Il check del token avviene dal FE prima dell'insert: passa l'invite_token
-- via JWT custom claim oppure usa una RPC. Per MVP teniamo questa policy semplice:
-- l'utente può inserire SOLO se è lui stesso, e l'app garantisce di farlo solo
-- dopo aver validato il token.
create policy "members_insert_self"
  on public.board_members for insert
  with check (user_id = auth.uid());

-- L'owner può rimuovere qualsiasi membro; un membro può rimuovere se stesso
create policy "members_delete_self_or_by_owner"
  on public.board_members for delete
  using (
    user_id = auth.uid()
    or exists(
      select 1 from public.boards b
      where b.id = board_id and b.owner_id = auth.uid()
    )
  );

-- L'owner può promuovere/declassare i ruoli
create policy "members_update_by_owner"
  on public.board_members for update
  using (
    exists(
      select 1 from public.boards b
      where b.id = board_id and b.owner_id = auth.uid()
    )
  );

-- =====================================================================
-- PROPOSALS
-- =====================================================================

-- Lettura: solo i membri della board
create policy "proposals_select_members"
  on public.proposals for select
  using (public.is_board_member(board_id));

-- Insert: i membri della board, e solo come autore di sé stessi
create policy "proposals_insert_members"
  on public.proposals for insert
  with check (
    public.is_board_member(board_id)
    and author_id = auth.uid()
  );

-- Update: l'autore della proposta o un editor/owner della board
create policy "proposals_update_author_or_editor"
  on public.proposals for update
  using (
    author_id = auth.uid()
    or public.is_board_editor(board_id)
  );

-- Delete: come update
create policy "proposals_delete_author_or_editor"
  on public.proposals for delete
  using (
    author_id = auth.uid()
    or public.is_board_editor(board_id)
  );

-- =====================================================================
-- VOTES
-- =====================================================================

-- Lettura: i membri della board della proposta
create policy "votes_select_board_members"
  on public.votes for select
  using (
    public.is_board_member((select board_id from public.proposals where id = proposal_id))
  );

-- Insert: solo l'utente stesso, e solo se membro della board
create policy "votes_insert_self_member"
  on public.votes for insert
  with check (
    user_id = auth.uid()
    and public.is_board_member((select board_id from public.proposals where id = proposal_id))
  );

-- Update: solo i propri voti
create policy "votes_update_own"
  on public.votes for update
  using (user_id = auth.uid());

-- Delete: solo i propri voti
create policy "votes_delete_own"
  on public.votes for delete
  using (user_id = auth.uid());

-- =====================================================================
-- STORAGE POLICIES (boards-covers, proposal-images)
-- =====================================================================

-- Tutti possono leggere le immagini (i bucket sono già public=true,
-- ma RLS è strict per upload/delete)
create policy "covers_read_public"
  on storage.objects for select
  using (bucket_id in ('boards-covers','proposal-images'));

-- Upload cover board: solo l'owner della board, file path deve iniziare con board_id
create policy "covers_insert_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'boards-covers'
    and exists(
      select 1 from public.boards b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

-- Upload immagine proposta: i membri della board
create policy "proposal_images_insert_members"
  on storage.objects for insert
  with check (
    bucket_id = 'proposal-images'
    and public.is_board_member(((storage.foldername(name))[1])::uuid)
  );

-- Delete: solo owner per cover, autore o editor per proposal images
create policy "covers_delete_owner"
  on storage.objects for delete
  using (
    bucket_id = 'boards-covers'
    and exists(
      select 1 from public.boards b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "proposal_images_delete_editor"
  on storage.objects for delete
  using (
    bucket_id = 'proposal-images'
    and public.is_board_editor(((storage.foldername(name))[1])::uuid)
  );
