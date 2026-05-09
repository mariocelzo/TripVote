// frontend/components/app/Sidebar.tsx
// Sidebar sinistra 260px: logo, nav, lista board, profilo pinned — porta da web-shell.jsx

"use client";

import React from "react";
import Link from "next/link";
import { TV_BOARDS, TV_ME } from "@/lib/data";
import Icon from "@/components/shared/Icon";
import { Avatar } from "@/components/shared/Avatar";

export type AppSection =
  | "board" | "map" | "activity" | "search"
  | "itinerary" | "invite" | "profile" | "settings";

interface SidebarProps {
  activeBoard: string;
  setActiveBoard: (id: string) => void;
  appSection: AppSection;
  setAppSection: (s: AppSection) => void;
}

/* Logo SVG TripVote — aereoplanino coral su cerchio */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="var(--coral-600)" />
      <path
        d="M8 18l6-1L8 10l2-1 9 4 3-1a1.5 1.5 0 010 3l-9 3-2-1 5-2z"
        fill="#fff"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavItem({ icon, label, active, badge, onClick }: {
  icon: string; label: string; active: boolean; badge?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: "var(--radius-sm)", marginBottom: 2,
      background: active ? "var(--coral-100)" : "transparent",
      color:      active ? "var(--coral-700)" : "var(--ink-700)",
      fontSize: 13, fontWeight: active ? 700 : 500,
      transition: "background 150ms", textAlign: "left", cursor: "pointer",
      border: "none",
    }}>
      <Icon name={icon} size={16} stroke={active ? 2.2 : 1.8} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          background: "var(--coral-600)", color: "#fff",
          borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "2px 6px",
        }}>{badge}</span>
      )}
    </button>
  );
}

export default function Sidebar({ activeBoard, setActiveBoard, appSection, setAppSection }: SidebarProps) {
  return (
    <aside style={{
      background: "var(--surface)", borderRight: "1px solid var(--border)",
      padding: "18px 14px", display: "flex", flexDirection: "column", overflow: "auto",
    }}>
      {/* Logo → landing */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <Logo size={26} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 19, letterSpacing: "-0.02em" }}>TripVote</span>
      </Link>

      {/* CTA nuova board */}
      <button className="tv-btn tv-btn--primary"
        style={{ height: 38, fontSize: 13, marginBottom: 18,
          justifyContent: "flex-start", padding: "0 12px" }}>
        <Icon name="plus" size={14} stroke={2.4} /> Nuova board
      </button>

      {/* Nav principale */}
      <NavItem icon="home"     label="Le tue board"  active={appSection === "board"}     onClick={() => setAppSection("board")} />
      <NavItem icon="map"      label="Mappa"          active={appSection === "map"}       onClick={() => setAppSection("map")} />
      <NavItem icon="spark"    label="Attività"       active={appSection === "activity"}  onClick={() => setAppSection("activity")} badge="2" />
      <NavItem icon="search"   label="Cerca"          active={appSection === "search"}    onClick={() => setAppSection("search")} />
      <NavItem icon="calendar" label="Itinerario"     active={appSection === "itinerary"} onClick={() => setAppSection("itinerary")} />
      <NavItem icon="share"    label="Invita gruppo"  active={appSection === "invite"}    onClick={() => setAppSection("invite")} />

      {/* Lista board */}
      <div className="tv-overline" style={{ marginTop: 22, marginBottom: 8, padding: "0 8px" }}>
        // boards · {TV_BOARDS.length}
      </div>
      {TV_BOARDS.map(b => (
        <button key={b.id}
          onClick={() => { setActiveBoard(b.id); setAppSection("board"); }}
          style={{
            padding: "8px 8px", borderRadius: "var(--radius-sm)", width: "100%",
            background: activeBoard === b.id && appSection === "board" ? "var(--coral-100)" : "transparent",
            color:      activeBoard === b.id && appSection === "board" ? "var(--coral-700)" : "var(--ink-700)",
            fontSize: 13, fontWeight: activeBoard === b.id ? 700 : 500,
            marginBottom: 2, display: "flex", alignItems: "center",
            gap: 10, textAlign: "left", transition: "background 150ms",
            border: "none", cursor: "pointer",
          }}>
          {/* Thumbnail cover */}
          <span style={{
            width: 26, height: 26, borderRadius: "var(--radius-xs)", flexShrink: 0,
            backgroundImage: `url(${b.cover})`, backgroundSize: "cover",
          }} />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{b.proposalsCount}</span>
        </button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Profilo + settings pinned bottom */}
      <div style={{ display: "flex", alignItems: "center", gap: 10,
        padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button onClick={() => setAppSection("profile")} style={{
          display: "flex", alignItems: "center", gap: 8, flex: 1,
          textAlign: "left", background: "none", border: "none", cursor: "pointer",
        }}>
          <Avatar user={TV_ME} size={30} ring={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{TV_ME.name}</div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Il mio profilo</div>
          </div>
        </button>
        <button onClick={() => setAppSection("settings")} style={{
          width: 32, height: 32, borderRadius: "var(--radius-sm)",
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-muted)",
        }}>
          <Icon name="settings" size={16} />
        </button>
      </div>
    </aside>
  );
}
