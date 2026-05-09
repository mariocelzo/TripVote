// frontend/components/pages/MapPage.tsx
// Mappa Tokyo stilizzata SVG + lista proposte geolocalizzate
// Fase 1: mappa statica SVG con pin interattivi. Fase 2: Mapbox reale.

"use client";

import React, { useState } from "react";
import type { Proposal } from "@/lib/types";
import { TV_CAT } from "@/lib/data";
import { computeVotes } from "@/lib/utils";
import Icon from "@/components/shared/Icon";

interface Props {
  proposals: Proposal[];
  onSelectProposal: (id: string) => void;
}

// Solo le proposte con coordinate geografiche
const GEO_IDS = ["p1", "p3", "p6", "p7"] as const;

// Colori pin per tipo proposta
const PIN_COLORS: Record<string, string> = {
  hotel:      "var(--coral-600)",
  flight:     "var(--indigo-700)",
  restaurant: "var(--amber-600)",
  activity:   "var(--teal-600)",
  pin:        "var(--rose-600)",
};

// Posizioni mock sulla SVG (percentuali 0-100)
const PIN_POS: Record<string, { x: number; y: number }> = {
  p1: { x: 32, y: 54 }, // Park Hyatt — Shinjuku
  p3: { x: 55, y: 45 }, // Hoshinoya — Otemachi
  p6: { x: 65, y: 28 }, // Senso-ji — Asakusa
  p7: { x: 30, y: 62 }, // Mustard — Shibuya
};

export default function MapPage({ proposals, onSelectProposal }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const geoProps = proposals.filter(p => GEO_IDS.includes(p.id as typeof GEO_IDS[number]));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px 12px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600,
          letterSpacing: "-0.025em", margin: 0 }}>Mappa — Capodanno a Tokyo</h1>
        <span className="tv-overline" style={{ marginTop: 4, display: "block" }}>
          // {geoProps.length} proposte con posizione
        </span>
      </div>

      {/* Corpo: mappa + lista */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", minHeight: 0 }}>
        {/* Mappa SVG stilizzata */}
        <div style={{ position: "relative", background: "#D4E8F0", overflow: "hidden" }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}
            preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" fill="#D4E8F0" />
            {/* Sagoma Tokyo semplificata */}
            <path d="M20 30 Q40 20 60 25 Q80 28 85 40 Q88 55 80 65 Q70 75 55 78 Q40 80 28 70 Q18 60 20 45 Z"
              fill="#E8EDE0" stroke="#C8D4C0" strokeWidth="0.5" />
            {/* Strade principali */}
            <line x1="30" y1="50" x2="70" y2="50" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
            <line x1="50" y1="25" x2="50" y2="75" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
            <line x1="25" y1="35" x2="75" y2="65" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
            <text x="50" y="92" textAnchor="middle" fill="#8A7868"
              fontSize="4" fontFamily="monospace" fontWeight="700">TOKYO</text>
          </svg>

          {/* Pin interattivi */}
          {geoProps.map(p => {
            const pos = PIN_POS[p.id];
            if (!pos) return null;
            const color = PIN_COLORS[p.type] ?? "var(--coral-600)";
            const isHov = hovered === p.id;

            return (
              <button key={p.id}
                onClick={() => onSelectProposal(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`, top: `${pos.y}%`,
                  transform: `translate(-50%, -100%) scale(${isHov ? 1.2 : 1})`,
                  transition: "transform 200ms var(--ease-spring)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}>
                {/* Pin a goccia */}
                <div style={{
                  background: color, color: "#fff",
                  borderRadius: "50% 50% 50% 0",
                  width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "var(--shadow-md)",
                  transform: "rotate(-45deg)",
                }}>
                  <span style={{ transform: "rotate(45deg)" }}>
                    <Icon name={TV_CAT[p.type].icon} size={14} stroke={2} />
                  </span>
                </div>
                {/* Tooltip al hover */}
                {isHov && (
                  <div className="tv-card tv-pop" style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                    transform: "translateX(-50%)", whiteSpace: "nowrap",
                    padding: "8px 12px", fontSize: 12, fontWeight: 600,
                    boxShadow: "var(--shadow-lg)", zIndex: 10,
                  }}>
                    {p.title}
                    {p.price && <span style={{ color: "var(--fg-muted)", marginLeft: 6 }}>{p.price}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista proposte geolocalizzate */}
        <div style={{ overflow: "auto", borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ padding: "16px 18px 8px" }}>
            <span className="tv-overline">// proposte sulla mappa</span>
          </div>
          {geoProps.map((p, i) => {
            const v = computeVotes(p);
            return (
              <button key={p.id}
                onClick={() => onSelectProposal(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: "100%", display: "flex", gap: 12, padding: "12px 18px",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  background: hovered === p.id ? "var(--coral-100)" : "transparent",
                  textAlign: "left", cursor: "pointer", border: "none",
                }}>
                <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", flexShrink: 0,
                  backgroundImage: `url(${p.image})`, backgroundSize: "cover" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
                    {p.location?.address}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: "var(--teal-600)", fontWeight: 600 }}>
                    {v.yes}✓ {v.maybe}? {v.no}✗
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
