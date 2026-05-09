// frontend/components/pages/SettingsPage.tsx
// Impostazioni account + notifiche con toggle — porta da web-extras.jsx

"use client";

import React, { useState } from "react";
import Icon from "@/components/shared/Icon";

function ToggleRow({ label, sub, value, onChange }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>
      </div>
      {/* Toggle switch animato */}
      <button onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 99, flexShrink: 0,
        background: value ? "var(--teal-600)" : "var(--ink-300)",
        position: "relative", transition: "background 200ms",
        border: "none", cursor: "pointer",
      }}>
        <span style={{
          position: "absolute", top: 2,
          left: value ? 22 : 2,
          width: 20, height: 20, borderRadius: 99, background: "#fff",
          transition: "left 200ms var(--ease-spring)",
          boxShadow: "var(--shadow-sm)",
          display: "block",
        }} />
      </button>
    </div>
  );
}

const SECTIONS = [
  { title: "Notifiche", rows: [
    { key: "ghost",  label: "Voti in tempo reale", sub: "Banner quando un amico vota" },
    { key: "add",    label: "Nuove proposte",       sub: "Notifica quando qualcuno aggiunge" },
    { key: "decide", label: "Decisioni raggiunte",  sub: "Avviso consenso ≥ 5/7" },
  ]},
  { title: "Aspetto", rows: [
    { key: "compact", label: "Densità compatta", sub: "Card più piccole, più proposte visibili" },
    { key: "dark",    label: "Modalità scura",   sub: "Prossimamente" },
  ]},
];

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    ghost: true, add: true, decide: true, compact: false, dark: false,
  });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
        letterSpacing: "-0.025em", marginBottom: 32 }}>Impostazioni</h1>

      {SECTIONS.map(sec => (
        <div key={sec.title} className="tv-card" style={{ padding: "4px 24px", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
            letterSpacing: "-0.015em", margin: "20px 0 4px" }}>{sec.title}</h2>
          {sec.rows.map(r => (
            <ToggleRow key={r.key} label={r.label} sub={r.sub}
              value={prefs[r.key]}
              onChange={v => setPrefs(p => ({ ...p, [r.key]: v }))} />
          ))}
          <div style={{ height: 8 }} />
        </div>
      ))}

      {/* Zona pericolo */}
      <div className="tv-card" style={{ padding: 24, border: "1px solid var(--rose-100)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
          color: "var(--rose-600)", margin: "0 0 16px" }}>Zona pericolo</h2>
        <button className="tv-btn" style={{
          background: "var(--rose-100)", color: "var(--rose-600)",
          height: 40, padding: "0 16px", fontSize: 13, fontWeight: 700,
          borderRadius: "var(--radius-full)",
        }}>
          <Icon name="logout" size={14} /> Esci dall&apos;account
        </button>
      </div>
    </div>
  );
}
