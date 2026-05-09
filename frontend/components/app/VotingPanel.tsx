// frontend/components/app/VotingPanel.tsx
// Pannello destro 360px — mostra ProposalCard della proposta selezionata

import React from "react";
import type { Proposal, VoteKind } from "@/lib/types";
import ProposalCard from "./ProposalCard";

interface VotingPanelProps {
  proposal: Proposal | null;
  onVote: (proposalId: string, kind: VoteKind) => void;
}

export default function VotingPanel({ proposal, onVote }: VotingPanelProps) {
  if (!proposal) {
    return (
      <aside style={{
        padding: 24, color: "var(--fg-muted)", background: "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderLeft: "1px solid var(--border)",
      }}>
        <span style={{ textAlign: "center", fontSize: 14 }}>
          Seleziona una proposta<br />
          <span style={{ fontSize: 24 }}>👆</span>
        </span>
      </aside>
    );
  }

  return (
    <aside style={{
      background: "var(--surface-2)",
      borderLeft: "1px solid var(--border)",
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
    }}>
      <ProposalCard proposal={proposal} onVote={onVote} />
    </aside>
  );
}
