-- =====================================================================
-- TripVote — Preferenze utente persistenti
-- Migration: 0007_profile_prefs.sql
--
-- SettingsPage salva i toggle (notifiche, aspetto) come jsonb sul profilo.
-- La RLS esistente "profiles_update_own" (0002) consente all'utente di
-- aggiornare SOLO la propria riga, quindi nessuna nuova policy è necessaria.
-- =====================================================================

alter table public.profiles
  add column if not exists prefs jsonb not null default '{}'::jsonb;

comment on column public.profiles.prefs is
  'Preferenze UI/notifiche dell''utente (chiavi: ghost, add, decide, compact, dark)';
