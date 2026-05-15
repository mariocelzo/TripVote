// frontend/components/app/CompactProposalCard.tsx
// Card compatta nella griglia centrale — porta da web-shell.jsx
// Usa AppContext per boardUsers (lista membri board con avatar/nome)

"use client";

import React from "react";
import Image from "next/image";
import type { Proposal } from "@/lib/types";
import { TV_CAT } from "@/lib/data";
import { computeVotes } from "@/lib/utils";
import { useAppContext } from "./AppContext";
import { Avatar } from "@/components/shared/Avatar";
import VoterGroup from "@/components/shared/VoterGroup";

// Mappa classe pill → colore testo
const PILL_LABEL_COLOR: Record<string, string> = {
  coral:  "var(--coral-700)",
  indigo: "var(--indigo-700)",
  amber:  "var(--amber-600)",
  teal:   "var(--teal-700)",
  rose:   "var(--rose-600)",
};

interface Props {
  proposal: Proposal;
  selected: boolean;
  onClick: () => void;
}

export default function CompactProposalCard({ proposal, selected, onClick }: Props) {
  // Legge la lista membri board dal context per mostrare avatar autore
  const { boardUsers } = useAppContext();

  const cat      = TV_CAT[proposal.type];
  const v        = computeVotes(proposal);
  // Cerca l'autore nella lista board; placeholder se non trovato (es. account eliminato)
  const addedBy  = boardUsers.find((u) => u.id === proposal.addedBy) ?? {
    id: proposal.addedBy,
    name: "Utente",
    initials: "?",
    color: "#999",
  };
  const pillKey  = cat.pill.replace("tv-pill--", "");
  const labelColor = PILL_LABEL_COLOR[pillKey] ?? "var(--ink-700)";

  return (
    <article
      onClick={onClick}
      className="tv-card tv-fade-up"
      style={{
        overflow: "hidden",
        cursor: "pointer",
        border: selected ? "2px solid var(--coral-600)" : "1px solid var(--border)",
        transform: selected ? "translateY(-2px)" : "none",
        boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-xs)",
        transition: "all 200ms var(--ease-out-soft)",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", height: 140 }}>
        <Image src={proposal.image} alt="" fill style={{ objectFit: "cover" }} sizes="300px" />

        {/* Badge NUOVA */}
        {proposal.isNew && (
          <span className="tv-pop" style={{
            position: "absolute", top: 10, left: 10,
            background: "var(--coral-600)", color: "#fff",
            fontSize: 10, fontWeight: 700, padding: "3px 9px",
            borderRadius: 99, letterSpacing: 0.4,
          }}>NUOVA</span>
        )}

        {/* Categoria (in alto a destra) */}
        <span style={{
          position: "absolute", top: 10, right: 10,
          padding: "3px 8px", borderRadius: 99,
          background: "rgba(255,252,247,0.95)", backdropFilter: "blur(8px)",
          fontSize: 10, fontWeight: 700,
          color: labelColor,
          textTransform: "uppercase", letterSpacing: 0.4,
        }}>{cat.label}</span>

        {/* Prezzo (in basso a sinistra) */}
        {proposal.price && (
          <div style={{
            position: "absolute", bottom: 10, left: 10,
            background: "rgba(26,20,16,0.78)", color: "#fff",
            padding: "5px 11px", borderRadius: 99,
            fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600,
          }}>
            {proposal.price}
            <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 500, marginLeft: 2 }}>
              {proposal.priceNote}
            </span>
          </div>
        )}
      </div>

      {/* Testo */}
      <div style={{ padding: 14 }}>
        <h4 style={{
          fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600,
          letterSpacing: "-0.015em", lineHeight: 1.2, margin: 0,
        }}>
          {proposal.title}
        </h4>
        <div style={{
          fontSize: 12, color: "var(--fg-muted)", marginTop: 3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {proposal.subtitle}
        </div>

        {/* Mini barra voti (4px) */}
        <div style={{
          display: "flex", height: 4, marginTop: 12,
          borderRadius: 99, overflow: "hidden", background: "var(--ink-200)", gap: 2,
        }}>
          {v.yes   > 0 && <div style={{ width: `${v.pctYes}%`,   background: "var(--teal-600)" }} />}
          {v.maybe > 0 && <div style={{ width: `${v.pctMaybe}%`, background: "var(--amber-600)" }} />}
          {v.no    > 0 && <div style={{ width: `${v.pctNo}%`,    background: "var(--rose-600)" }} />}
        </div>

        {/* Voter chips + timestamp */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: 10,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {v.yes   > 0 && <VoterGroup ids={proposal.votes.yes}   kind="yes" />}
            {v.maybe > 0 && <VoterGroup ids={proposal.votes.maybe} kind="maybe" />}
            {v.no    > 0 && <VoterGroup ids={proposal.votes.no}    kind="no" />}
          </div>
          <span style={{
            fontSize: 11, color: "var(--fg-muted)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Avatar user={addedBy} size={16} ring={false} />
            {proposal.addedAt}
          </span>
        </div>
      </div>
    </article>
  );
}
