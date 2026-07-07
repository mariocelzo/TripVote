// frontend/components/pages/ProfilePage.tsx
// Profilo utente corrente con stats e lista proposte proprie — porta da web-extras.jsx
// Usa AppContext per me (utente corrente reale da Supabase)
// Riceve boards come prop da WebShell per il conteggio board attive

"use client";

import React, { useState, useEffect } from "react";
import type { Proposal, Board } from "@/lib/types";
import { myVote } from "@/lib/utils";
import { useAppContext } from "@/components/app/AppContext";
import { createClient } from "@/lib/supabase/client";
import { fetchProfileMeta, updateProfile } from "@/lib/supabase/queries";
import Icon from "@/components/shared/Icon";

interface Props {
  proposals: Proposal[];
  boards: Board[];    // lista board reali dell'utente
}

// Formatta la data di iscrizione in italiano (es. "maggio 2026")
function formatJoinDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

export default function ProfilePage({ proposals, boards }: Props) {
  // Legge utente corrente dal context (dati reali da Supabase Auth + profiles)
  const { me, refreshMe } = useAppContext();
  const supabase = createClient();

  // Data di iscrizione reale da profiles.created_at
  const [joinDate, setJoinDate] = useState<string | null>(null);

  // ── Stato modifica nome inline ──
  const [editing,  setEditing]  = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    fetchProfileMeta(supabase, me.id)
      .then(({ createdAt }) => {
        if (!cancelled) setJoinDate(formatJoinDate(createdAt));
      })
      .catch((err) => console.error("Errore caricamento profilo:", err));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  /* ── Salva il nuovo nome: update DB + refresh del context ── */
  async function handleSaveName() {
    if (!me) return;
    const clean = nameDraft.trim();
    if (!clean) {
      setEditError("Il nome non può essere vuoto");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await updateProfile(supabase, me.id, { displayName: clean });
      // Aggiorna il context così nome/iniziali cambiano ovunque nell'app
      await refreshMe?.();
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  // Fallback per rendering prima che me sia disponibile
  const userId  = me?.id ?? "";
  const myProps  = proposals.filter((p) => p.addedBy === userId);
  const voted    = proposals.filter((p) => myVote(p, userId)).length;
  const yesVotes = proposals.filter((p) => p.votes.yes.includes(userId)).length;

  const STATS = [
    { label: "Board attive",  value: boards.length,                                        color: "var(--ink-900)" },
    { label: "Proposte",      value: myProps.length,                                        color: "var(--coral-600)" },
    { label: "Voti espressi", value: voted,                                                 color: "var(--indigo-700)" },
    { label: "% Sì",          value: voted ? `${Math.round(yesVotes / voted * 100)}%` : "—", color: "var(--teal-600)" },
  ];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 920, margin: "0 auto" }}>
      {/* Hero con banner colorato */}
      <div className="tv-card" style={{ padding: "32px 32px 28px", marginBottom: 24,
        position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80,
          background: `linear-gradient(135deg, ${me?.color ?? "var(--coral-600)"} 0%, var(--coral-700) 100%)` }} />
        <div style={{ position: "relative", display: "flex", gap: 22, alignItems: "flex-end", marginTop: 20 }}>
          {/* Avatar grande con le iniziali reali */}
          <div style={{
            width: 96, height: 96, borderRadius: "var(--radius-full)",
            background: me?.color ?? "var(--coral-600)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 38, fontWeight: 700,
            border: "4px solid var(--surface)", boxShadow: "var(--shadow-md)",
          }}>{me?.initials ?? "?"}</div>
          <div style={{ flex: 1, marginBottom: 6 }}>
            {editing ? (
              /* ── Modalità modifica: input + salva/annulla ── */
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditing(false); }}
                  autoFocus
                  maxLength={80}
                  aria-label="Nome visualizzato"
                  style={{
                    fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600,
                    letterSpacing: "-0.025em", padding: "4px 10px",
                    border: "2px solid var(--coral-600)", borderRadius: 8,
                    background: "var(--bg)", color: "var(--ink-900)",
                    outline: "none", minWidth: 220,
                  }}
                />
                <button onClick={handleSaveName} disabled={saving}
                  className="tv-btn tv-btn--primary"
                  style={{ height: 36, padding: "0 14px", fontSize: 13 }}>
                  {saving ? "Salvataggio…" : "Salva"}
                </button>
                <button onClick={() => { setEditing(false); setEditError(null); }}
                  className="tv-btn tv-btn--ghost"
                  style={{ height: 36, padding: "0 12px", fontSize: 13 }}>
                  Annulla
                </button>
                {editError && (
                  <span role="alert" style={{ fontSize: 12, color: "var(--rose-600)" }}>{editError}</span>
                )}
              </div>
            ) : (
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 600,
                letterSpacing: "-0.025em", margin: 0 }}>{me?.name ?? "Utente"}</h1>
            )}
            <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4,
              display: "flex", gap: 14, flexWrap: "wrap" }}>
              {/* Data di iscrizione reale da profiles.created_at */}
              <span>{joinDate ? `iscritto da ${joinDate}` : "iscritto a TripVote"}</span>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => { setNameDraft(me?.name ?? ""); setEditing(true); }}
              className="tv-btn tv-btn--ghost"
              style={{ height: 38, padding: "0 14px", fontSize: 13 }}
            >
              <Icon name="edit" size={14} /> Modifica
            </button>
          )}
        </div>
      </div>

      {/* Stats 4 colonne */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {STATS.map((s) => (
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
