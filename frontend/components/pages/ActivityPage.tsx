// frontend/components/pages/ActivityPage.tsx
// Feed attività board — deriva le attività in tempo reale dalle proposals/votes.
// NON usa una tabella activity_log (non esiste): costruisce il feed direttamente
// dai dati già caricati da WebShell via Supabase.

"use client";

import React, { useMemo } from "react";
import { useAppContext } from "@/components/app/AppContext";
import { Avatar } from "@/components/shared/Avatar";
import type { Proposal } from "@/lib/types";

// Props interface: ActivityPage riceve le proposte già caricate da WebShell
interface Props {
  proposals: Proposal[];
}

// Struttura interna di ogni voce del feed attività
interface ActivityItem {
  id: string;          // chiave univoca per React
  emoji: string;       // emoji rappresentativa dell'azione
  text: string;        // descrizione dell'azione ("ha aggiunto", "ha votato Sì su", ecc.)
  target: string;      // nome della proposta interessata
  addedAt: string;     // timestamp ISO usato per l'ordinamento
  userId?: string;     // ID utente autore dell'azione (per avatar + nome)
  fresh: boolean;      // true se l'item è "recente" (ultime 24 ore)
}

// Mappa tipo proposta → etichetta italiana leggibile
const TYPE_LABEL: Record<string, string> = {
  hotel:      "Hotel",
  flight:     "Volo",
  restaurant: "Ristorante",
  activity:   "Attività",
  pin:        "Pin",
};

// Determina se un timestamp ISO rientra nelle ultime 24 ore
function isFresh(addedAt: string): boolean {
  const diff = Date.now() - new Date(addedAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

// Formatta un timestamp ISO in una stringa relativa leggibile (es. "5 min fa", "ieri")
function formatRelative(addedAt: string): string {
  const diff = Date.now() - new Date(addedAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 1)  return "ora";
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24)   return `${hours} ora${hours > 1 ? " fa" : " fa"}`;
  if (days === 1)   return "ieri";
  return `${days} g fa`;
}

export default function ActivityPage({ proposals }: Props) {
  // Legge i membri board dal context per risolvere userId in nome + avatar
  const { boardUsers } = useAppContext();

  // Costruisce il feed derivato dalle proposals (memoizzato per performance)
  const items = useMemo<ActivityItem[]>(() => {
    const feed: ActivityItem[] = [];

    for (const p of proposals) {
      const typeLabel = TYPE_LABEL[p.type] ?? p.type;

      // 1. Proposta aggiunta → attività "ha aggiunto"
      feed.push({
        id:      `add-${p.id}`,
        emoji:   "✨",
        text:    "ha aggiunto",
        target:  `${p.title} — ${typeLabel}`,
        addedAt: p.addedAt,
        userId:  p.addedBy,
        fresh:   isFresh(p.addedAt),
      });

      // 2. Voti YES → attività "ha votato Sì su"
      for (const uid of p.votes.yes) {
        feed.push({
          id:      `yes-${p.id}-${uid}`,
          emoji:   "👍",
          text:    "ha votato Sì su",
          target:  p.title,
          addedAt: p.addedAt, // usiamo addedAt proposta come approssimazione
          userId:  uid,
          fresh:   isFresh(p.addedAt),
        });
      }

      // 3. Voti MAYBE → attività "ha votato Forse su"
      for (const uid of p.votes.maybe) {
        feed.push({
          id:      `maybe-${p.id}-${uid}`,
          emoji:   "🤔",
          text:    "ha votato Forse su",
          target:  p.title,
          addedAt: p.addedAt,
          userId:  uid,
          fresh:   isFresh(p.addedAt),
        });
      }

      // 4. Proposte in match (consenso raggiunto) → attività "Decisione raggiunta su"
      if (p.isMatch) {
        feed.push({
          id:      `match-${p.id}`,
          emoji:   "🎉",
          text:    "Decisione raggiunta su",
          target:  p.title,
          addedAt: p.addedAt,
          // Nessun userId specifico: è un evento di sistema
          fresh:   false,
        });
      }
    }

    // Ordina dal più recente al più vecchio
    feed.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    // Limita a 20 items per non sovraccaricare la UI
    return feed.slice(0, 20);
  }, [proposals]);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
        letterSpacing: "-0.025em", marginBottom: 4,
      }}>
        Attività
      </h1>
      <span className="tv-overline">// feed attività</span>

      {/* Empty state: nessuna proposta ancora caricata */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--fg-muted)", padding: "40px" }}>
          Nessuna attività ancora. Aggiungi delle proposte!
        </div>
      ) : (
        <div className="tv-card" style={{ padding: 4, marginTop: 24 }}>
          {items.map((it, i) => {
            // Risolve l'userId in un oggetto User (se disponibile nel context)
            const user = it.userId
              ? boardUsers.find((u) => u.id === it.userId) ?? null
              : null;

            return (
              <div
                key={it.id}
                style={{
                  padding: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  // Separatore tra voci, escluso l'ultimo item
                  borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
                  // Sfondo coral per attività recenti (< 24h)
                  background: it.fresh ? "var(--coral-100)" : "transparent",
                }}
              >
                {/* Icona / emoji dell'azione */}
                <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{it.emoji}</span>

                <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
                  <div>
                    {/* Avatar + nome utente se risolto */}
                    {user && (
                      <>
                        <Avatar user={user} size={18} ring={false} />{" "}
                        <b>{user.name}</b>{" "}
                      </>
                    )}
                    <span style={{ color: "var(--fg-muted)" }}>{it.text}</span>{" "}
                    <b>{it.target}</b>
                  </div>
                  {/* Timestamp relativo */}
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 3 }}>
                    {formatRelative(it.addedAt)}
                  </div>
                </div>

                {/* Pallino rosso per attività recenti */}
                {it.fresh && (
                  <span style={{
                    width: 8, height: 8, borderRadius: 99,
                    background: "var(--coral-600)",
                    marginTop: 8, flexShrink: 0,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
