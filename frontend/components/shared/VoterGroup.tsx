// frontend/components/shared/VoterGroup.tsx
// Gruppo avatar per tipo di voto (emoji + stack) — porta da proposal-card.jsx

import React from "react";
import type { VoteKind } from "@/lib/types";
import { AvatarStack } from "./Avatar";

interface VoterGroupProps {
  ids: string[];   // user IDs che hanno votato
  kind: VoteKind;
}

// Configurazione colori e emoji per tipo di voto
const VOTE_CFG: Record<VoteKind, { color: string; bg: string; emoji: string }> = {
  yes:   { color: "var(--teal-600)",  bg: "var(--teal-100)",  emoji: "👍" },
  maybe: { color: "var(--amber-600)", bg: "var(--amber-100)", emoji: "🤔" },
  no:    { color: "var(--rose-600)",  bg: "var(--rose-100)",  emoji: "👎" },
};

export default function VoterGroup({ ids, kind }: VoterGroupProps) {
  // Non renderizza se nessun voto
  if (ids.length === 0) return null;

  const cfg = VOTE_CFG[kind];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {/* Badge emoji colorato */}
      <span style={{
        width: 22, height: 22,
        borderRadius: "var(--radius-full)",
        background: cfg.bg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11,
      }}>
        {cfg.emoji}
      </span>
      {/* Avatar stack degli utenti che hanno votato */}
      <AvatarStack userIds={ids} max={3} size={22} />
    </div>
  );
}
