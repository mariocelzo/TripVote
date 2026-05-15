// frontend/components/pages/ActivityPage.tsx
// Feed eventi attività board — porta da screens-modals.jsx ActivityScreen
// Usa AppContext per boardUsers (lista membri board con nomi/avatar reali)
// NOTA: gli ITEMS sono ancora mock — in futuro verranno da una tabella activity_log

"use client";

import React from "react";
import { useAppContext } from "@/components/app/AppContext";
import { Avatar } from "@/components/shared/Avatar";

// Dati mock temporanei — Phase 3 caricherà da activity_log su Supabase
const ITEMS = [
  { who: null as string | null, emoji: "👍", text: "ha votato Sì su",       target: "Park Hyatt Tokyo",       time: "2 min fa",  fresh: true },
  { who: null as string | null, emoji: "✨", text: "ha aggiunto",            target: "Day trip a Hakone",      time: "12 min fa", fresh: true },
  { who: null as string | null, emoji: "💬", text: "ha commentato su",       target: "Sukiyabashi Jiro",       time: "1 ora fa",  fresh: false },
  { who: null as string | null, emoji: "👎", text: "ha votato No su",        target: "Hoshinoya Tokyo",        time: "3 ore fa",  fresh: false },
  { who: null as string | null, emoji: "🎉", text: "si è unito a",           target: "La tua board",           time: "ieri",      fresh: false },
  { who: null as string | null, emoji: "🏆", text: "Decisione raggiunta su", target: "TeamLab Planets — 7 sì", time: "2 g fa",    fresh: false },
];

export default function ActivityPage() {
  // Legge i membri board dal context per risolvere eventuali userId in nomi
  const { boardUsers } = useAppContext();

  return (
    <div style={{ padding: "32px 40px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
        letterSpacing: "-0.025em", marginBottom: 4 }}>Attività</h1>
      <span className="tv-overline">// $ tail -f board.log</span>

      <div className="tv-card" style={{ padding: 4, marginTop: 24 }}>
        {ITEMS.map((it, i) => {
          // Cerca l'utente nella lista board se è presente un userId
          const user = it.who ? boardUsers.find((u) => u.id === it.who) ?? null : null;
          return (
            <div key={i} style={{
              padding: "14px", display: "flex", alignItems: "flex-start", gap: 12,
              borderBottom: i < ITEMS.length - 1 ? "1px solid var(--border)" : "none",
              background: it.fresh ? "var(--coral-100)" : "transparent",
            }}>
              <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{it.emoji}</span>
              <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
                <div>
                  {user && <><Avatar user={user} size={18} ring={false} />{" "}<b>{user.name}</b>{" "}</>}
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
