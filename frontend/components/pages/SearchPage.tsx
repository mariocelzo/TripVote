// frontend/components/pages/SearchPage.tsx
// Ricerca full-text proposte + board con filtri rapidi — porta da web-pages.jsx

"use client";

import React, { useState } from "react";
import type { Proposal, Board } from "@/lib/types";
import { TV_CAT } from "@/lib/data";
import Icon from "@/components/shared/Icon";

interface Props {
  proposals: Proposal[];
  boards: Board[];
  onSelectProposal: (id: string) => void;
  onSelectBoard: (id: string) => void;
}

export default function SearchPage({ proposals, boards, onSelectProposal, onSelectBoard }: Props) {
  const [q, setQ] = useState("");
  const ql = q.toLowerCase();

  const matchedProps = q
    ? proposals.filter(p =>
        p.title.toLowerCase().includes(ql) ||
        (p.subtitle?.toLowerCase().includes(ql) ?? false)
      ).slice(0, 8)
    : proposals.slice(0, 5);

  const matchedBoards = q
    ? boards.filter(b => b.title.toLowerCase().includes(ql))
    : boards;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      {/* Campo ricerca */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        padding: "14px 18px", background: "var(--surface)",
        border: "1.5px solid var(--coral-600)",
        borderRadius: "var(--radius-md)",
        boxShadow: "0 0 0 4px var(--coral-100)",
      }}>
        <Icon name="search" size={18} style={{ color: "var(--coral-600)" }} />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Cerca proposte, board…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 16, color: "var(--ink-900)", fontFamily: "inherit" }}
        />
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-muted)",
          padding: "3px 8px", background: "var(--surface-2)",
          borderRadius: 4, border: "1px solid var(--border)",
        }}>⌘K</span>
      </div>

      {/* Filtri rapidi */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {["Tutto", "Hotel", "Voli", "Ristoranti", "Attività", "Posti"].map((f, i) => (
          <button key={f}
            onClick={() => setQ(i === 0 ? "" : f.toLowerCase())}
            style={{ padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--ink-700)", cursor: "pointer" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Risultati board */}
      {matchedBoards.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="tv-overline" style={{ marginBottom: 12 }}>// board</div>
          <div className="tv-card" style={{ padding: 4 }}>
            {matchedBoards.map((b, i) => (
              <button key={b.id} onClick={() => onSelectBoard(b.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", textAlign: "left",
                  borderBottom: i < matchedBoards.length - 1 ? "1px solid var(--border)" : "none",
                  background: "transparent", border: "none", cursor: "pointer" }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", flexShrink: 0,
                  backgroundImage: `url(${b.cover})`, backgroundSize: "cover" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{b.dates}</div>
                </div>
                <Icon name="chevron-right" size={14} style={{ color: "var(--fg-subtle)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Risultati proposte */}
      {matchedProps.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="tv-overline" style={{ marginBottom: 12 }}>// proposte</div>
          <div className="tv-card" style={{ padding: 4 }}>
            {matchedProps.map((p, i) => {
              const cat = TV_CAT[p.type];
              return (
                <button key={p.id} onClick={() => onSelectProposal(p.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", textAlign: "left",
                    borderBottom: i < matchedProps.length - 1 ? "1px solid var(--border)" : "none",
                    background: "transparent", border: "none", cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", flexShrink: 0,
                    backgroundImage: `url(${p.image})`, backgroundSize: "cover" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{p.subtitle}</div>
                  </div>
                  <span className={`tv-pill ${cat.pill}`} style={{ fontSize: 10, padding: "3px 8px", flexShrink: 0 }}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {q && matchedProps.length === 0 && matchedBoards.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-muted)", fontSize: 14 }}>
          Nessun risultato per &ldquo;{q}&rdquo;
        </div>
      )}
    </div>
  );
}
