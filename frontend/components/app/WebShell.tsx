// frontend/components/app/WebShell.tsx
// Layout 3 colonne (260px | 1fr | 360px) con stato globale:
// - proposals con vote toggle
// - ghost vote simulator (ogni ~11s un utente random vota)
// - routing tra sezioni app

"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Proposal, VoteKind } from "@/lib/types";
import { TV_PROPOSALS, TV_BOARDS, TV_USERS, TV_ME } from "@/lib/data";
import { applyVote, myVote } from "@/lib/utils";
import Sidebar, { type AppSection } from "./Sidebar";
import BoardCenter from "./BoardCenter";
import VotingPanel from "./VotingPanel";
import type { GhostData } from "./GhostBanner";

// Pagine lazy-loaded per ottimizzare il bundle iniziale
const MapPage       = dynamic(() => import("@/components/pages/MapPage"));
const ActivityPage  = dynamic(() => import("@/components/pages/ActivityPage"));
const ProfilePage   = dynamic(() => import("@/components/pages/ProfilePage"));
const SettingsPage  = dynamic(() => import("@/components/pages/SettingsPage"));
const ItineraryPage = dynamic(() => import("@/components/pages/ItineraryPage"));
const InvitePage    = dynamic(() => import("@/components/pages/InvitePage"));
const SearchPage    = dynamic(() => import("@/components/pages/SearchPage"));

// Utenti "fantasma" per simulazione voti (tutti tranne Marco)
const GHOST_USERS = TV_USERS.filter(u => u.id !== TV_ME.id);
// yes appare due volte per avere probabilità più alta
const GHOST_KINDS: VoteKind[] = ["yes", "yes", "maybe", "no"];

export default function WebShell() {
  const [proposals,      setProposals]      = useState<Proposal[]>(TV_PROPOSALS);
  const [activeBoard,    setActiveBoard]     = useState("tokyo");
  const [activeProposal, setActiveProposal]  = useState<string | null>(null);
  const [appSection,     setAppSection]      = useState<AppSection>("board");
  const [ghostBanner,    setGhostBanner]     = useState<GhostData | null>(null);
  const [filter,         setFilter]          = useState("all");

  /* ── Gestione voto dell'utente corrente ── */
  const handleVote = useCallback((proposalId: string, kind: VoteKind) => {
    setProposals(curr =>
      curr.map(p =>
        p.id !== proposalId
          ? p
          : { ...p, votes: applyVote(p, TV_ME.id, kind) }
      )
    );
  }, []);

  /* ── Simulatore ghost votes ogni ~11s ── */
  useEffect(() => {
    const timer = setInterval(() => {
      const p = proposals[Math.floor(Math.random() * proposals.length)];
      const u = GHOST_USERS[Math.floor(Math.random() * GHOST_USERS.length)];
      const k = GHOST_KINDS[Math.floor(Math.random() * GHOST_KINDS.length)];

      // Mostra il banner per 4.5s
      setGhostBanner({ userId: u.id, kind: k, title: p.title });
      setTimeout(() => setGhostBanner(null), 4500);

      // Applica voto solo se l'utente non ha già votato su questa proposta
      setProposals(curr =>
        curr.map(prop => {
          if (prop.id !== p.id) return prop;
          const alreadyVoted = Object.values(prop.votes).flat().includes(u.id);
          if (alreadyVoted) return prop;
          return { ...prop, votes: { ...prop.votes, [k]: [...prop.votes[k], u.id] } };
        })
      );
    }, 11000);

    return () => clearInterval(timer);
  }, [proposals]);

  /* ── Filtra proposte in base al filtro attivo ── */
  const boardProposals = proposals; // Fase 1: tutte le proposte sono di "tokyo"
  const filtered = boardProposals.filter(p => {
    if (filter === "all")  return true;
    if (filter === "todo") return !myVote(p, TV_ME.id);
    return p.type === filter;
  });

  const board    = TV_BOARDS.find(b => b.id === activeBoard) ?? TV_BOARDS[0];
  const selected = activeProposal
    ? proposals.find(p => p.id === activeProposal) ?? proposals[0]
    : proposals[0];

  /* ── Render della sezione centrale in base a appSection ── */
  function renderCenter() {
    switch (appSection) {
      case "board":
        return (
          <BoardCenter
            board={board}
            proposals={filtered}
            allProposals={boardProposals}
            filter={filter}
            setFilter={setFilter}
            onSelect={setActiveProposal}
            selectedId={activeProposal}
            onAdd={() => {}} // Task 11: AddProposalModal
            ghostBanner={ghostBanner}
          />
        );
      case "map":
        return (
          <MapPage
            proposals={proposals}
            onSelectProposal={id => { setActiveProposal(id); setAppSection("board"); }}
          />
        );
      case "activity":
        return <ActivityPage />;
      case "profile":
        return <ProfilePage proposals={proposals} />;
      case "settings":
        return <SettingsPage />;
      case "itinerary":
        return <ItineraryPage proposals={proposals} />;
      case "invite":
        return <InvitePage board={board} />;
      case "search":
        return (
          <SearchPage
            proposals={proposals}
            boards={TV_BOARDS}
            onSelectProposal={id => { setActiveProposal(id); setAppSection("board"); }}
            onSelectBoard={id => { setActiveBoard(id); setAppSection("board"); }}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="tv-web-shell" style={{
      display: "grid",
      gridTemplateColumns: "260px 1fr 360px",
      height: "100vh",
      background: "var(--bg)",
    }}>
      <Sidebar
        activeBoard={activeBoard}
        setActiveBoard={setActiveBoard}
        appSection={appSection}
        setAppSection={setAppSection}
      />

      <main style={{ overflow: "auto", borderRight: "1px solid var(--border)" }}>
        {renderCenter()}
      </main>

      <VotingPanel proposal={selected} onVote={handleVote} />
    </div>
  );
}
