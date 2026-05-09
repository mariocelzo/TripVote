// frontend/components/pages/InvitePage.tsx
// Pagina invita gruppo: link copiabile + CTA WhatsApp + lista membri

"use client";

import React, { useState } from "react";
import type { Board } from "@/lib/types";
import { TV_USERS } from "@/lib/data";
import Icon from "@/components/shared/Icon";
import { Avatar } from "@/components/shared/Avatar";

interface Props { board: Board; }

export default function InvitePage({ board }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `tripvote.app/b/${board.id}-x7k2p9`;

  function handleCopy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
        letterSpacing: "-0.025em", marginBottom: 4 }}>Invita il gruppo</h1>
      <span className="tv-overline">// {board.title}</span>

      {/* Card link */}
      <div className="tv-card" style={{ padding: 28, marginTop: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--ink-700)" }}>
          Link diretto della board
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center",
          padding: "14px 16px", background: "var(--surface-2)",
          borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <Icon name="link" size={16} style={{ color: "var(--fg-muted)" }} />
          <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 14,
            color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis" }}>{link}</span>
          <button onClick={handleCopy} className="tv-btn tv-btn--ghost"
            style={{ height: 34, padding: "0 12px", fontSize: 12, gap: 6, flexShrink: 0 }}>
            <Icon name={copied ? "check" : "copy"} size={13} />
            {copied ? "Copiato!" : "Copia"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="tv-btn" style={{
            background: "#25D366", color: "#fff",
            height: 44, padding: "0 18px", fontSize: 14, borderRadius: "var(--radius-full)",
          }}>
            <Icon name="wa" size={18} /> Condividi su WhatsApp
          </button>
          <button className="tv-btn tv-btn--ghost" style={{ height: 44, padding: "0 16px", fontSize: 14 }}>
            <Icon name="send" size={16} /> Copia link
          </button>
        </div>
      </div>

      {/* Membri */}
      <div className="tv-card" style={{ padding: 28, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--ink-700)" }}>
          Membri · {board.members.length}
        </div>
        {board.members.map((uid, i) => {
          const user = TV_USERS.find(u => u.id === uid);
          if (!user) return null;
          return (
            <div key={uid} style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderBottom: i < board.members.length - 1 ? "1px solid var(--border)" : "none" }}>
              <Avatar user={user} size={36} ring={false} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                  {uid === "u1" ? "Admin" : "Membro"}
                </div>
              </div>
              {uid !== "u1" && (
                <button style={{ fontSize: 12, color: "var(--fg-muted)",
                  background: "none", border: "none", cursor: "pointer" }}>
                  Rimuovi
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
