// frontend/components/app/WebShell.tsx
// Layout 3 colonne (260px | 1fr | 360px) con stato globale:
// - dati reali da Supabase (board, proposte, utente)
// - voto ottimistico con sincronizzazione asincrona
// - routing tra sezioni app

"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Proposal, Board, User, VoteKind } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMyBoards,
  fetchBoardMembers,
  fetchProposals,
  castVote,
} from "@/lib/supabase/queries";
import { applyVote, myVote } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";
import AppContext from "./AppContext";
import Sidebar, { type AppSection } from "./Sidebar";
import BoardCenter from "./BoardCenter";
import VotingPanel from "./VotingPanel";
import type { GhostData } from "./GhostBanner";
import AddProposalModal from "./AddProposalModal";

// Pagine lazy-loaded per ottimizzare il bundle iniziale
const MapPage       = dynamic(() => import("@/components/pages/MapPage"));
const ActivityPage  = dynamic(() => import("@/components/pages/ActivityPage"));
const ProfilePage   = dynamic(() => import("@/components/pages/ProfilePage"));
const SettingsPage  = dynamic(() => import("@/components/pages/SettingsPage"));
const ItineraryPage = dynamic(() => import("@/components/pages/ItineraryPage"));
const InvitePage    = dynamic(() => import("@/components/pages/InvitePage"));
const SearchPage    = dynamic(() => import("@/components/pages/SearchPage"));

// Tipo che descrive la risposta dell'endpoint GET /boards/{board_id}/results del BE FastAPI.
// Contiene i risultati aggregati del voto per ogni proposta del board.
interface BoardResultsResponse {
  board_id: string;
  members_count: number;
  voters_count: number;
  quorum_reached: boolean;
  proposals: Array<{
    proposal_id: string;
    is_match: boolean;
    score: number;
    yes_count: number;
    maybe_count: number;
    no_count: number;
    total_votes: number;
  }>;
  // Lista degli ID delle proposte che hanno vinto (is_match = true e quorum raggiunto)
  winners: string[];
}

export default function WebShell() {
  const [proposals,      setProposals]      = useState<Proposal[]>([]);
  const [boards,         setBoards]         = useState<Board[]>([]);
  const [activeBoard,    setActiveBoard]     = useState<string | null>(null);
  const [activeProposal, setActiveProposal]  = useState<string | null>(null);
  const [appSection,     setAppSection]      = useState<AppSection>("board");
  const [ghostBanner,    setGhostBanner]     = useState<GhostData | null>(null);
  const [filter,         setFilter]          = useState("all");
  const [me,             setMe]              = useState<User | null>(null);
  const [boardUsers,     setBoardUsers]      = useState<User[]>([]);
  // Controlla la visibilità del modale "Aggiungi proposta"
  const [showAddModal,   setShowAddModal]    = useState(false);
  // Risultati aggregati del voto provenienti dal BE (null se non ancora caricati o errore)
  const [boardResults,   setBoardResults]    = useState<BoardResultsResponse | null>(null);

  // Client Supabase — istanza condivisa per tutta la shell
  const supabase = createClient();

  /* ── Carica utente corrente e sue board al mount ── */
  useEffect(() => {
    async function loadUser() {
      try {
        // Recupera l'utente autenticato dalla sessione corrente
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData.user) {
          console.error("Nessun utente autenticato:", authErr);
          return;
        }

        const uid = authData.user.id;

        // Carica il profilo dell'utente dalla tabella profiles
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", uid)
          .single();

        if (profileErr || !profileData) {
          console.error("Profilo non trovato:", profileErr);
          return;
        }

        // Calcola colore avatar e iniziali deterministicamente dal UUID
        const colors = ["#DD5C36","#149478","#2E3A8C","#C68410","#C0364B","#0F6E5C","#7A4FBF"];
        let hash = 0;
        for (const c of uid) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
        const color = colors[Math.abs(hash) % colors.length];
        const name = profileData.display_name as string;
        const inits = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

        const meUser: User = { id: uid, name, initials: inits, color };
        setMe(meUser);

        // Carica le board dell'utente
        const loadedBoards = await fetchMyBoards(supabase, uid);
        setBoards(loadedBoards);

        // Seleziona la prima board come attiva
        if (loadedBoards.length > 0) {
          setActiveBoard(loadedBoards[0].id);
        }
      } catch (err) {
        console.error("Errore caricamento utente:", err);
      }
    }

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Carica membri e proposte quando cambia la board attiva ── */
  useEffect(() => {
    if (!activeBoard) return;

    async function loadBoardData() {
      try {
        // Carica membri, proposte e risultati BE in parallelo per efficienza.
        // Il fetch dei risultati non blocca il caricamento: in caso di errore ritorna null.
        const [members, props, results] = await Promise.all([
          fetchBoardMembers(supabase, activeBoard!),
          fetchProposals(supabase, activeBoard!),
          apiFetch<BoardResultsResponse>(`/boards/${activeBoard}/results`).catch(() => null),
        ]);

        setBoardUsers(members);

        if (results) {
          // Costruisce una mappa proposal_id → is_match per un lookup O(1)
          const matchMap = new Map(results.proposals.map((r) => [r.proposal_id, r.is_match]));
          // Arricchisce ogni proposta con il flag isMatch proveniente dal BE
          setProposals(props.map((p) => ({ ...p, isMatch: matchMap.get(p.id) ?? false })));
          setBoardResults(results);
        } else {
          // Se il BE non risponde, mostra le proposte senza dati di match
          setProposals(props);
          setBoardResults(null);
        }

        // Resetta la proposta selezionata quando si cambia board
        setActiveProposal(null);
      } catch (err) {
        console.error("Errore caricamento dati board:", err);
      }
    }

    loadBoardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoard]);

  /* ── Gestione voto dell'utente corrente (ottimistico) ── */
  const handleVote = useCallback(
    (proposalId: string, kind: VoteKind) => {
      if (!me) return;

      // Aggiorna lo stato locale immediatamente (ottimistico)
      setProposals((curr) =>
        curr.map((p) =>
          p.id !== proposalId ? p : { ...p, votes: applyVote(p, me.id, kind) }
        )
      );

      // Sincronizza con Supabase in background
      castVote(supabase, proposalId, me.id, kind).catch((err) => {
        console.error("Errore salvataggio voto:", err);
        // In caso di errore, si potrebbe ripristinare lo stato precedente.
        // Per semplicità lasciamo lo stato ottimistico (l'utente può riprovare).
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me]
  );

  /* ── Filtra proposte in base al filtro attivo ── */
  const filtered = proposals.filter((p) => {
    if (filter === "all") return true;
    if (filter === "todo") return me ? !myVote(p, me.id) : true;
    return p.type === filter;
  });

  const board    = boards.find((b) => b.id === activeBoard) ?? boards[0] ?? null;
  const selected = activeProposal
    ? proposals.find((p) => p.id === activeProposal) ?? proposals[0] ?? null
    : proposals[0] ?? null;

  /* ── Loading state — attende me e almeno un tentativo di caricamento board ── */
  if (me === null) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg)",
        fontFamily: "var(--font-sans)", color: "var(--fg-muted)", fontSize: 15,
      }}>
        Caricamento…
      </div>
    );
  }

  /* ── Nessuna board disponibile ── */
  if (boards.length === 0) {
    return (
      <AppContext.Provider value={{ me, boardUsers }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 360px",
          height: "100vh",
          background: "var(--bg)",
        }}>
          <Sidebar
            boards={boards}
            activeBoard={activeBoard ?? ""}
            setActiveBoard={setActiveBoard}
            appSection={appSection}
            setAppSection={setAppSection}
          />
          <main style={{ overflow: "auto", borderRight: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--fg-muted)", fontSize: 15 }}>
              Nessuna board trovata.<br />
              <span style={{ fontSize: 13 }}>Crea una nuova board per iniziare.</span>
            </div>
          </main>
          <aside style={{ background: "var(--surface-2)", borderLeft: "1px solid var(--border)" }} />
        </div>
      </AppContext.Provider>
    );
  }

  /* ── Render della sezione centrale in base a appSection ── */
  function renderCenter() {
    if (!board) return null;

    switch (appSection) {
      case "board":
        return (
          <BoardCenter
            board={board}
            proposals={filtered}
            allProposals={proposals}
            filter={filter}
            setFilter={setFilter}
            onSelect={setActiveProposal}
            selectedId={activeProposal}
            onAdd={() => setShowAddModal(true)}
            ghostBanner={ghostBanner}
            // Passa i risultati BE per calcolare stats accurate (winners, quorum, ecc.)
            boardResults={boardResults}
          />
        );
      case "map":
        return (
          <MapPage
            proposals={proposals}
            onSelectProposal={(id) => { setActiveProposal(id); setAppSection("board"); }}
          />
        );
      case "activity":
        return <ActivityPage />;
      case "profile":
        return <ProfilePage proposals={proposals} boards={boards} />;
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
            boards={boards}
            onSelectProposal={(id) => { setActiveProposal(id); setAppSection("board"); }}
            onSelectBoard={(id) => { setActiveBoard(id); setAppSection("board"); }}
          />
        );
      default:
        return null;
    }
  }

  return (
    // Fornisce me e boardUsers a tutti i componenti figli tramite context
    <AppContext.Provider value={{ me, boardUsers }}>
      <div
        className="tv-web-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 360px",
          height: "100vh",
          background: "var(--bg)",
        }}
      >
        <Sidebar
          boards={boards}
          activeBoard={activeBoard ?? ""}
          setActiveBoard={setActiveBoard}
          appSection={appSection}
          setAppSection={setAppSection}
        />

        <main style={{ overflow: "auto", borderRight: "1px solid var(--border)" }}>
          {renderCenter()}
        </main>

        <VotingPanel proposal={selected} onVote={handleVote} />
      </div>

      {/* Modale aggiunta proposta — montato solo quando showAddModal è true */}
      {showAddModal && activeBoard && me && (
        <AddProposalModal
          boardId={activeBoard}
          authorId={me.id}
          onClose={() => setShowAddModal(false)}
          onProposalAdded={async () => {
            setShowAddModal(false);
            // Ricarica le proposte della board corrente dopo l'inserimento
            if (activeBoard) {
              const props = await fetchProposals(supabase, activeBoard);
              setProposals(props);
            }
          }}
        />
      )}
    </AppContext.Provider>
  );
}
