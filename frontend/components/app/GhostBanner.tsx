// frontend/components/app/GhostBanner.tsx
// Banner "X ha votato Y su Z" inline sopra i filtri — porta da web-shell.jsx GhostBannerInline
// Usa AppContext per boardUsers (lista membri board con avatar/nome)

import React from "react";
import type { VoteKind } from "@/lib/types";
import { useAppContext } from "./AppContext";
import { Avatar } from "@/components/shared/Avatar";

export interface GhostData {
  userId: string;
  kind: VoteKind;
  title: string;
}

export default function GhostBanner({ data }: { data: GhostData }) {
  // Legge i membri board dal context per trovare il nome/avatar dell'utente
  const { boardUsers } = useAppContext();
  const user = boardUsers.find((u) => u.id === data.userId);
  if (!user) return null;

  const emoji = data.kind === "yes" ? "👍" : data.kind === "no" ? "👎" : "🤔";

  return (
    <div className="tv-fade-up" style={{
      marginBottom: 14,
      padding: "8px 14px",
      background: "var(--ink-900)",
      color: "#fff",
      borderRadius: "var(--radius-full)",
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontSize: 12,
      boxShadow: "var(--shadow-md)",
    }}>
      <Avatar user={user} size={20} ring={false} />
      <span>
        <b>{user.name}</b> ha votato {emoji} su{" "}
        <span style={{ opacity: 0.85 }}>{data.title}</span>
      </span>
      {/* Punto verde — indica attività in tempo reale */}
      <span style={{
        width: 7, height: 7, borderRadius: 99,
        background: "#27C93F",
        animation: "tv-pulse 1.5s infinite",
        flexShrink: 0,
      }} />
    </div>
  );
}
