// frontend/components/app/ProposalCard.tsx
// Card proposta completa per il pannello destro — porta da proposal-card.jsx
// Contiene: immagine hero, titolo, prezzo, rating, nota, barra voti, bottoni voto con bounce

"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { Proposal, VoteKind } from "@/lib/types";
import { TV_USERS, TV_ME, TV_CAT } from "@/lib/data";
import { computeVotes, myVote } from "@/lib/utils";
import Icon from "@/components/shared/Icon";
import { Avatar } from "@/components/shared/Avatar";
import VoteBar from "@/components/shared/VoteBar";
import VoterGroup from "@/components/shared/VoterGroup";

/* ── Source favicon badge ── */
const SOURCE_COLORS: Record<string, { bg: string; fg: string; text: string }> = {
  "booking.com":        { bg: "#003580", fg: "#fff", text: "B." },
  "ita-airways.com":    { bg: "#0E2A47", fg: "#fff", text: "ITA" },
  "hoshinoresorts.com": { bg: "#7B5430", fg: "#fff", text: "H." },
  "tabelog.com":        { bg: "#D7212B", fg: "#fff", text: "Tb" },
  "teamlab.art":        { bg: "#000",    fg: "#fff", text: "tL" },
  "google.com/maps":    { bg: "#1A73E8", fg: "#fff", text: "G" },
  "mustardhotel.com":   { bg: "#E8B937", fg: "#000", text: "M" },
  "japan-guide.com":    { bg: "#C73B3B", fg: "#fff", text: "JG" },
};

function SourceLabel({ source }: { source: string }) {
  const c = SOURCE_COLORS[source] ?? { bg: "#666", fg: "#fff", text: source[0].toUpperCase() };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: c.bg,
        color: c.fg, display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, fontFamily: "var(--font-sans)" }}>{c.text}</span>
      {source}
    </span>
  );
}

/* ── VoteButton ── */
const VOTE_CFG: Record<VoteKind, { color: string; bg: string; label: string; emoji: string }> = {
  yes:   { color: "var(--teal-600)",  bg: "var(--teal-100)",  label: "Sì",    emoji: "👍" },
  maybe: { color: "var(--amber-600)", bg: "var(--amber-100)", label: "Forse", emoji: "🤔" },
  no:    { color: "var(--rose-600)",  bg: "var(--rose-100)",  label: "No",    emoji: "👎" },
};

function VoteButton({ kind, count, active, animate, onClick }: {
  kind: VoteKind; count: number; active: boolean; animate: boolean; onClick: () => void;
}) {
  const cfg = VOTE_CFG[kind];
  return (
    <button onClick={onClick} style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      gap: 4, padding: "10px 8px", borderRadius: "var(--radius-md)",
      background: active ? cfg.bg : "transparent",
      border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
      color: active ? cfg.color : "var(--ink-700)",
      fontWeight: 600, fontSize: 13,
      transition: "all 200ms var(--ease-out-soft)",
      cursor: "pointer",
    }}>
      <span className={animate ? "tv-bounce" : ""}
        style={{ fontSize: 18, lineHeight: 1, display: "inline-block" }}>
        {cfg.emoji}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {cfg.label}
        <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.7 }}>{count}</span>
      </span>
    </button>
  );
}

/* ── ProposalCard principale ── */
interface ProposalCardProps {
  proposal: Proposal;
  onVote?: (proposalId: string, kind: VoteKind) => void;
}

export default function ProposalCard({ proposal, onVote }: ProposalCardProps) {
  const [animKind, setAnimKind] = useState<VoteKind | null>(null);
  const cat    = TV_CAT[proposal.type];
  const votes  = computeVotes(proposal);
  const my     = myVote(proposal, TV_ME.id);
  const addedBy = TV_USERS.find(u => u.id === proposal.addedBy)!;

  function handleVote(kind: VoteKind) {
    setAnimKind(kind);
    setTimeout(() => setAnimKind(null), 500);
    onVote?.(proposal.id, kind);
  }

  return (
    <article className="tv-card tv-fade-up"
      style={{ overflow: "hidden", position: "relative", marginBottom: 18 }}>

      {/* Badge NUOVA */}
      {proposal.isNew && (
        <span className="tv-pop" style={{
          position: "absolute", top: 14, left: 14, zIndex: 2,
          background: "var(--coral-600)", color: "#fff",
          fontSize: 11, fontWeight: 700, padding: "4px 10px",
          borderRadius: "var(--radius-full)", letterSpacing: 0.4,
          boxShadow: "0 4px 12px rgba(221,92,54,0.35)",
        }}>NUOVA</span>
      )}

      {/* Immagine hero */}
      <div style={{ position: "relative", height: 200, background: "var(--ink-200)" }}>
        <Image src={proposal.image} alt="" fill style={{ objectFit: "cover" }} sizes="360px" />

        {/* Pill categoria (in alto a destra) */}
        <div style={{ position: "absolute", top: 14, right: 14 }}>
          <span className={`tv-pill ${cat.pill}`} style={{
            background: "rgba(255,252,247,0.95)", backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid rgba(255,255,255,0.6)", padding: "6px 12px",
          }}>
            <Icon name={cat.icon} size={12} stroke={2.2} />
            {cat.label}
          </span>
        </div>

        {/* Prezzo (in basso a sinistra) */}
        {proposal.price && (
          <div style={{
            position: "absolute", bottom: 14, left: 14,
            background: "rgba(26,20,16,0.78)", backdropFilter: "blur(8px)",
            color: "#fff", padding: "8px 14px", borderRadius: "var(--radius-full)",
            fontSize: 14, fontWeight: 700,
            display: "inline-flex", alignItems: "baseline", gap: 4,
            fontFamily: "var(--font-display)", letterSpacing: "-0.01em",
          }}>
            {proposal.price}
            {proposal.priceNote && (
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 500,
                fontFamily: "var(--font-sans)" }}>{proposal.priceNote}</span>
            )}
          </div>
        )}

        {/* Rating (in basso a destra) */}
        {proposal.rating && (
          <div style={{
            position: "absolute", bottom: 14, right: 14,
            background: "rgba(255,252,247,0.95)", backdropFilter: "blur(8px)",
            padding: "6px 10px", borderRadius: "var(--radius-full)",
            fontSize: 12, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Icon name="star" size={12} style={{ color: "#F2A30F" }} />
            {proposal.rating}
            {proposal.ratingCount && (
              <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>
                ({proposal.ratingCount.toLocaleString("it")})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Corpo card */}
      <div style={{ padding: "20px 22px 18px" }}>
        <h3 style={{
          fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22,
          letterSpacing: "-0.02em", lineHeight: 1.15, margin: 0, color: "var(--ink-900)",
        }}>{proposal.title}</h3>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.4 }}>
          {proposal.subtitle}
        </p>

        {/* Source + aggiunto da */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 12, gap: 10, flexWrap: "wrap" }}>
          <SourceLabel source={proposal.source} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "var(--fg-muted)" }}>
            <Avatar user={addedBy} size={20} ring={false} />
            <span>
              <b style={{ color: "var(--ink-800)", fontWeight: 600 }}>{addedBy.name}</b>
              {" · "}{proposal.addedAt}
            </span>
          </span>
        </div>

        {/* Nota testuale */}
        {proposal.note && (
          <div style={{
            marginTop: 14, padding: "12px 14px",
            background: "var(--ink-100)", borderRadius: "var(--radius)",
            borderLeft: "3px solid var(--coral-200)",
            fontSize: 14, lineHeight: 1.5, color: "var(--ink-800)",
          }}>
            <span style={{ color: "var(--coral-600)", fontWeight: 600 }}>{addedBy.name}: </span>
            {proposal.note}
          </div>
        )}

        {/* Distribuzione voti */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 8 }}>
            <span className="tv-overline">Voti · {votes.total}/7</span>
            {votes.yes > 0 && (
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                {Math.round(votes.pctYes)}% sì
              </span>
            )}
          </div>
          {/* Barra animata */}
          <VoteBar votes={votes} animKind={animKind} />
          {/* Avatar stack per gruppo */}
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            <VoterGroup ids={proposal.votes.yes}   kind="yes" />
            <VoterGroup ids={proposal.votes.maybe} kind="maybe" />
            <VoterGroup ids={proposal.votes.no}    kind="no" />
          </div>
        </div>

        {/* Bottoni voto */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {(["yes", "maybe", "no"] as VoteKind[]).map(k => (
            <VoteButton key={k} kind={k}
              count={votes[k]} active={my === k}
              animate={animKind === k} onClick={() => handleVote(k)} />
          ))}
        </div>
      </div>
    </article>
  );
}
