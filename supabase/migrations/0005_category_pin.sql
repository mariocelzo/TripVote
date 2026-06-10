-- =====================================================================
-- TripVote — Allinea le categorie proposte al frontend
-- Migration: 0005_category_pin.sql
--
-- Il frontend usa la categoria "pin" (posti generici sulla mappa) che
-- mancava dal check constraint originale: un insert dal modale
-- "Aggiungi proposta" con categoria Pin sarebbe fallito.
-- Manteniamo anche "other" per retrocompatibilità (il FE la mappa
-- su "activity" in lettura).
-- =====================================================================

alter table public.proposals
  drop constraint if exists proposals_category_check;

alter table public.proposals
  add constraint proposals_category_check
  check (category in ('hotel', 'flight', 'activity', 'restaurant', 'pin', 'other'));
