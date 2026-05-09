// frontend/components/shared/VoteBar.tsx
// Barra voti segmentata animata (teal/amber/rose) — porta da proposal-card.jsx

import React from "react";
import type { VoteDistribution, VoteKind } from "@/lib/types";

interface VoteBarProps {
  votes: VoteDistribution;
  animKind?: VoteKind | null; // segmento da "gonfiare" al voto
  height?: number;            // altezza barra px (default 6)
}

export default function VoteBar({ votes, animKind, height = 6 }: VoteBarProps) {
  const total = votes.total || 1;

  return (
    <div style={{
      display: "flex",
      height,
      borderRadius: 99,
      overflow: "hidden",
      background: "var(--ink-200)",
      gap: 2,
    }}>
      {votes.yes > 0 && (
        <div style={{
          width: `${(votes.yes / total) * 100}%`,
          background: "var(--teal-600)",
          transition: "width 600ms var(--ease-spring)",
          // Effetto "gonfiamento" verticale al voto
          transform: animKind === "yes" ? "scaleY(1.6)" : "scaleY(1)",
          transformOrigin: "center",
          transitionProperty: "width, transform",
        }} />
      )}
      {votes.maybe > 0 && (
        <div style={{
          width: `${(votes.maybe / total) * 100}%`,
          background: "var(--amber-600)",
          transition: "width 600ms var(--ease-spring), transform 300ms var(--ease-spring)",
          transform: animKind === "maybe" ? "scaleY(1.6)" : "scaleY(1)",
        }} />
      )}
      {votes.no > 0 && (
        <div style={{
          width: `${(votes.no / total) * 100}%`,
          background: "var(--rose-600)",
          transition: "width 600ms var(--ease-spring), transform 300ms var(--ease-spring)",
          transform: animKind === "no" ? "scaleY(1.6)" : "scaleY(1)",
        }} />
      )}
    </div>
  );
}
