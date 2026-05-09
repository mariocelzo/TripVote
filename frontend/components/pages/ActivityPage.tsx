// frontend/components/pages/ActivityPage.tsx
// Feed eventi attività board — porta da screens-modals.jsx ActivityScreen

import React from "react";
import { TV_USERS } from "@/lib/data";
import { Avatar } from "@/components/shared/Avatar";

const ITEMS = [
  { who: "u4", emoji: "👍", text: "ha votato Sì su",       target: "Park Hyatt Tokyo",       time: "2 min fa",  fresh: true },
  { who: "u7", emoji: "✨", text: "ha aggiunto",            target: "Day trip a Hakone",      time: "12 min fa", fresh: true },
  { who: "u3", emoji: "💬", text: "ha commentato su",       target: "Sukiyabashi Jiro",       time: "1 ora fa",  fresh: false },
  { who: "u5", emoji: "👎", text: "ha votato No su",        target: "Hoshinoya Tokyo",        time: "3 ore fa",  fresh: false },
  { who: "u7", emoji: "🎉", text: "si è unito a",           target: "Capodanno a Tokyo",      time: "ieri",      fresh: false },
  { who: null, emoji: "🏆", text: "Decisione raggiunta su", target: "TeamLab Planets — 7 sì", time: "2 g fa",    fresh: false },
];

export default function ActivityPage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
        letterSpacing: "-0.025em", marginBottom: 4 }}>Attività</h1>
      <span className="tv-overline">// $ tail -f tokyo.log</span>

      <div className="tv-card" style={{ padding: 4, marginTop: 24 }}>
        {ITEMS.map((it, i) => {
          const user = it.who ? TV_USERS.find(u => u.id === it.who) : null;
          return (
            <div key={i} style={{
              padding: "14px", display: "flex", alignItems: "flex-start", gap: 12,
              borderBottom: i < ITEMS.length - 1 ? "1px solid var(--border)" : "none",
              background: it.fresh ? "var(--coral-100)" : "transparent",
            }}>
              <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{it.emoji}</span>
              <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
                <div>
                  {user && <><b>{user.name}</b>{" "}</>}
                  <span style={{ color: "var(--fg-muted)" }}>{it.text}</span>{" "}
                  <b>{it.target}</b>
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 3 }}>{it.time}</div>
              </div>
              {it.fresh && (
                <span style={{
                  width: 8, height: 8, borderRadius: 99, background: "var(--coral-600)",
                  marginTop: 8, flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
