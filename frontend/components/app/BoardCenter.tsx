// frontend/components/app/BoardCenter.tsx
// Colonna centrale: cover hero 200px + stats + filtri scrollabili + griglia proposte
// Porta da web-shell.jsx BoardCenter

"use client";

import React from "react";
import Image from "next/image";
import type { Proposal, Board } from "@/lib/types";
import { TV_ME } from "@/lib/data";
import { computeVotes, myVote } from "@/lib/utils";
import Icon from "@/components/shared/Icon";
import { AvatarStack } from "@/components/shared/Avatar";
import CompactProposalCard from "./CompactProposalCard";
import GhostBanner, { type GhostData } from "./GhostBanner";

interface BoardCenterProps {
  board: Board;
  proposals: Proposal[];       // già filtrate per il filtro attivo
  allProposals: Proposal[];    // tutte le proposte (per le stats)
  filter: string;
  setFilter: (f: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onAdd: () => void;
  ghostBanner: GhostData | null;
}

export default function BoardCenter({
  board, proposals, allProposals,
  filter, setFilter, onSelect, selectedId, onAdd, ghostBanner,
}: BoardCenterProps) {

  const stats = {
    total:   allProposals.length,
    todo:    allProposals.filter(p => !myVote(p, TV_ME.id)).length,
    decided: allProposals.filter(p => computeVotes(p).total >= 5).length,
  };

  const FILTERS = [
    { id: "all",        label: "Tutte",       count: allProposals.length },
    { id: "todo",       label: "Da votare",   count: stats.todo },
    { id: "hotel",      label: "Hotel" },
    { id: "flight",     label: "Voli" },
    { id: "restaurant", label: "Ristoranti" },
    { id: "activity",   label: "Attività" },
    { id: "pin",        label: "Posti" },
  ];

  return (
    <div>
      {/* Cover hero 200px */}
      <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
        <Image src={board.cover} alt={board.title} fill
          style={{ objectFit: "cover" }} sizes="100vw" priority />
        {/* Gradiente overlay scuro */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(26,20,16,0.25) 0%, rgba(26,20,16,0.78) 100%)",
        }} />
        {/* Titolo + meta */}
        <div style={{
          position: "absolute", bottom: 22, left: 28, right: 28,
          color: "#fff", display: "flex",
          justifyContent: "space-between", alignItems: "flex-end",
        }}>
          <div>
            <span className="tv-overline" style={{ color: "rgba(255,255,255,0.85)" }}>// trip board</span>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600,
              letterSpacing: "-0.025em", lineHeight: 1.05, marginTop: 4, marginBottom: 0,
            }}>{board.title}</h1>
            <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 13, opacity: 0.95 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="calendar" size={13} /> {board.dates}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="users" size={13} /> {board.members.length} amici
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <AvatarStack userIds={board.members} max={5} size={30} />
            <button className="tv-btn" style={{
              background: "rgba(255,252,247,0.95)", color: "var(--ink-900)",
              height: 38, padding: "0 14px", fontSize: 13, border: "none",
            }}>
              <Icon name="share" size={14} /> Condividi
            </button>
          </div>
        </div>
      </div>

      {/* Stats + filtri */}
      <div style={{ padding: "20px 28px 0" }}>
        {/* Tre stat rapide */}
        <div style={{ display: "flex", gap: 22, marginBottom: 18 }}>
          {[
            { label: "proposte",  value: stats.total,   color: "var(--ink-900)" },
            { label: "da votare", value: stats.todo,    color: "var(--coral-600)" },
            { label: "decise",    value: stats.decided, color: "var(--teal-600)" },
          ].map(s => (
            <div key={s.label}>
              <span style={{
                fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600,
                letterSpacing: "-0.02em", color: s.color,
              }}>{s.value}</span>
              <span className="tv-overline" style={{ marginLeft: 6 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Ghost banner realtime */}
        {ghostBanner && <GhostBanner data={ghostBanner} />}

        {/* Filtri scrollabili */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto",
          paddingBottom: 8, marginBottom: 4 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "7px 14px", borderRadius: 99, whiteSpace: "nowrap",
              fontSize: 13, fontWeight: 600, flexShrink: 0, cursor: "pointer",
              background: filter === f.id ? "var(--ink-900)" : "var(--surface)",
              color:      filter === f.id ? "#fff"           : "var(--ink-700)",
              border:     filter === f.id ? "none"           : "1px solid var(--border)",
            }}>
              {f.label}
              {"count" in f && f.count !== undefined && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>{f.count}</span>
              )}
            </button>
          ))}
          {/* Bottone aggiungi proposta */}
          <button onClick={onAdd} style={{
            marginLeft: "auto", padding: "7px 14px", borderRadius: 99,
            whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, flexShrink: 0,
            background: "var(--coral-600)", color: "#fff", border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <Icon name="plus" size={14} stroke={2.4} /> Aggiungi
          </button>
        </div>
      </div>

      {/* Griglia proposte */}
      <div style={{
        padding: "20px 28px 40px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}>
        {proposals.map(p => (
          <CompactProposalCard
            key={p.id}
            proposal={p}
            selected={selectedId === p.id}
            onClick={() => onSelect(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
