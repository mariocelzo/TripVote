// frontend/components/pages/ProfilePage.tsx
// Profilo utente corrente con stats e lista proposte proprie — porta da web-extras.jsx

import React from "react";
import type { Proposal } from "@/lib/types";
import { TV_ME, TV_BOARDS } from "@/lib/data";
import { myVote } from "@/lib/utils";
import Icon from "@/components/shared/Icon";

interface Props { proposals: Proposal[]; }

export default function ProfilePage({ proposals }: Props) {
  const myProps  = proposals.filter(p => p.addedBy === TV_ME.id);
  const voted    = proposals.filter(p => myVote(p, TV_ME.id)).length;
  const yesVotes = proposals.filter(p => p.votes.yes.includes(TV_ME.id)).length;

  const STATS = [
    { label: "Board attive",  value: TV_BOARDS.length,                                        color: "var(--ink-900)" },
    { label: "Proposte",      value: myProps.length,                                           color: "var(--coral-600)" },
    { label: "Voti espressi", value: voted,                                                    color: "var(--indigo-700)" },
    { label: "% Sì",          value: voted ? `${Math.round(yesVotes / voted * 100)}%` : "—",  color: "var(--teal-600)" },
  ];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 920, margin: "0 auto" }}>
      {/* Hero con banner colorato */}
      <div className="tv-card" style={{ padding: "32px 32px 28px", marginBottom: 24,
        position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80,
          background: `linear-gradient(135deg, ${TV_ME.color} 0%, var(--coral-700) 100%)` }} />
        <div style={{ position: "relative", display: "flex", gap: 22, alignItems: "flex-end", marginTop: 20 }}>
          {/* Avatar grande */}
          <div style={{
            width: 96, height: 96, borderRadius: "var(--radius-full)",
            background: TV_ME.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 38, fontWeight: 700,
            border: "4px solid var(--surface)", boxShadow: "var(--shadow-md)",
          }}>{TV_ME.initials}</div>
          <div style={{ flex: 1, marginBottom: 6 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 600,
              letterSpacing: "-0.025em", margin: 0 }}>{TV_ME.name} Bianchi</h1>
            <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4,
              display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>@marcob</span><span>·</span>
              <span>marco.bianchi@gmail.com</span><span>·</span>
              <span>iscritto da gen 2026</span>
            </div>
          </div>
          <button className="tv-btn tv-btn--ghost" style={{ height: 38, padding: "0 14px", fontSize: 13 }}>
            <Icon name="edit" size={14} /> Modifica
          </button>
        </div>
      </div>

      {/* Stats 4 colonne */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {STATS.map(s => (
          <div key={s.label} className="tv-card" style={{ padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
              letterSpacing: "-0.025em", color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div className="tv-overline" style={{ marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Le mie proposte */}
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600,
        letterSpacing: "-0.02em", marginBottom: 16 }}>Le mie proposte</h2>
      <div className="tv-card" style={{ padding: 4 }}>
        {myProps.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)", fontSize: 14 }}>
            Non hai ancora aggiunto proposte.
          </div>
        )}
        {myProps.map((p, i) => (
          <div key={p.id} style={{
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
            borderBottom: i < myProps.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", flexShrink: 0,
              backgroundImage: `url(${p.image})`, backgroundSize: "cover" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{p.subtitle}</div>
            </div>
            <span style={{ fontSize: 12, color: "var(--fg-muted)", flexShrink: 0 }}>{p.addedAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
