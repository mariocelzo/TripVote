// frontend/components/pages/InvitePage.tsx
// Pagina invita gruppo: invio email via BE + link copiabile + CTA WhatsApp + lista membri
// Usa AppContext per boardUsers (lista membri board con avatar/nome reali)
// Usa apiFetch per chiamate autenticate al backend FastAPI

"use client";

import React, { useState, useEffect } from "react";
import type { Board } from "@/lib/types";
import { useAppContext } from "@/components/app/AppContext";
import Icon from "@/components/shared/Icon";
import { Avatar } from "@/components/shared/Avatar";
import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { removeBoardMember } from "@/lib/supabase/queries";

interface Props { board: Board; }

// Etichette leggibili per i ruoli di board_members
const ROLE_LABEL: Record<string, string> = {
  owner:  "Organizzatore",
  editor: "Editor",
  voter:  "Membro",
};

export default function InvitePage({ board }: Props) {
  const [copied, setCopied] = useState(false);
  // Legge i membri board dal context per mostrare avatar, nomi e ruoli reali
  const { me, boardUsers, refreshBoardUsers } = useAppContext();
  const supabase = createClient();

  // L'utente corrente è owner della board? Determina se può rimuovere membri.
  const meIsOwner = boardUsers.find((u) => u.id === me?.id)?.role === "owner";

  // ── Stato rimozione membro (conferma inline a due step) ──
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removing,      setRemoving]      = useState<string | null>(null);
  const [removeError,   setRemoveError]   = useState<string | null>(null);

  /* ── Rimuove un membro: delete su board_members + refresh del context.
        La RLS consente la delete solo a owner o al membro stesso. ── */
  async function handleRemove(userId: string) {
    setRemoving(userId);
    setRemoveError(null);
    try {
      await removeBoardMember(supabase, board.id, userId);
      await refreshBoardUsers?.();
      setConfirmRemove(null);
    } catch (err) {
      setRemoveError(
        err instanceof Error ? `Rimozione fallita: ${err.message}` : "Rimozione fallita"
      );
    } finally {
      setRemoving(null);
    }
  }

  // --- Stato per la sezione "Invita via email" ---
  // Input email separati da virgola/punto e virgola/spazio
  const [emails, setEmails] = useState("");
  // Messaggio personale opzionale da allegare all'invito
  const [personalMsg, setPersonalMsg] = useState("");
  // Flag per disabilitare il bottone durante la chiamata al BE
  const [sending, setSending] = useState(false);
  // Risultato dell'invio: quante email inviate e quelle non recapitate
  const [inviteResult, setInviteResult] = useState<{ sent: number; failed: string[] } | null>(null);
  // Messaggio di errore generico in caso di fallimento della chiamata
  const [inviteError, setInviteError] = useState<string | null>(null);

  /**
   * Invia gli inviti email al backend FastAPI.
   * Parsea l'input separato da virgola/punto e virgola/spazio,
   * chiama POST /notifications/invite con JWT e aggiorna lo stato con il risultato.
   */
  async function handleInvite() {
    // Splitta l'input per virgola, punto e virgola o spazi e rimuove elementi vuoti
    const emailList = emails.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) return;

    setSending(true);
    setInviteError(null);
    setInviteResult(null);

    try {
      const result = await apiFetch<{ sent: number; failed: string[] }>("/notifications/invite", {
        method: "POST",
        body: JSON.stringify({
          board_id: board.id,
          emails: emailList,
          // Invia null se il messaggio è vuoto (campo opzionale sul BE)
          personal_message: personalMsg.trim() || null,
        }),
      });
      setInviteResult(result);
      // Reset campi dopo successo
      setEmails("");
      setPersonalMsg("");
    } catch (err) {
      // Mostra messaggio leggibile o fallback generico
      setInviteError(err instanceof Error ? err.message : "Errore invio inviti");
    } finally {
      setSending(false);
    }
  }

  // Link di invito reale: usa l'invite_token della board verso la pagina /join.
  // L'origin è calcolato lato client (in SSR window non esiste).
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Se per qualche motivo manca il token, mostriamo un placeholder non cliccabile.
  const link = board.inviteToken
    ? `${origin}/join/${board.inviteToken}`
    : "Link non disponibile";
  const canShare = Boolean(board.inviteToken);

  function handleCopy() {
    if (!canShare) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
        letterSpacing: "-0.025em", marginBottom: 4 }}>Invita il gruppo</h1>
      <span className="tv-overline">// {board.title}</span>

      {/* ================================================================
          Card "Invita via email" — collega al BE per inviti email reali
          Mostrata SOPRA la card del link esistente
          ================================================================ */}
      <div className="tv-card" style={{ padding: 28, marginTop: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--ink-700)" }}>
          Invita via email
        </div>

        {/* Input email: accetta più indirizzi separati da virgola */}
        <textarea
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="mario@esempio.it, lucia@esempio.it — separale con virgola"
          rows={2}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--ink-900)",
            fontSize: 14,
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {/* Textarea messaggio personale opzionale */}
        <textarea
          value={personalMsg}
          onChange={e => setPersonalMsg(e.target.value)}
          placeholder="Aggiungi un messaggio personale..."
          rows={3}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px 12px",
            marginTop: 10,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--ink-900)",
            fontSize: 14,
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {/* Bottone invio — coral, disabilitato durante l'invio o se nessuna email */}
        <div style={{ marginTop: 14 }}>
          <button
            className="tv-btn tv-btn--primary"
            onClick={handleInvite}
            disabled={sending || emails.trim() === ""}
            style={{
              height: 44,
              padding: "0 20px",
              fontSize: 14,
              borderRadius: "var(--radius-full)",
              opacity: sending || emails.trim() === "" ? 0.6 : 1,
              cursor: sending || emails.trim() === "" ? "not-allowed" : "pointer",
            }}
          >
            {/* Testo dinamico durante l'invio */}
            {sending ? "Invio in corso..." : "Invia inviti"}
          </button>
        </div>

        {/* Feedback successo: numero inviti inviati + lista non recapitati */}
        {inviteResult && (
          <div style={{ marginTop: 12, fontSize: 14, color: "var(--green, #16a34a)" }}>
            ✓ {inviteResult.sent} {inviteResult.sent === 1 ? "invito inviato" : "inviti inviati"}
            {inviteResult.failed.length > 0 && (
              <div style={{ marginTop: 4, color: "var(--fg-muted)", fontSize: 13 }}>
                Non recapitati: {inviteResult.failed.join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Feedback errore generico */}
        {inviteError && (
          <div style={{ marginTop: 12, fontSize: 14, color: "var(--red, #dc2626)" }}>
            {inviteError}
          </div>
        )}
      </div>

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
          {/* Condividi su WhatsApp: apre wa.me con messaggio precompilato e link reale */}
          <a
            href={
              canShare
                ? `https://wa.me/?text=${encodeURIComponent(
                    `Unisciti alla nostra board "${board.title}" su TripVote: ${link}`
                  )}`
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            className="tv-btn"
            aria-disabled={!canShare}
            style={{
              background: "#25D366", color: "#fff",
              height: 44, padding: "0 18px", fontSize: 14, borderRadius: "var(--radius-full)",
              display: "inline-flex", alignItems: "center", gap: 8,
              textDecoration: "none",
              pointerEvents: canShare ? "auto" : "none",
              opacity: canShare ? 1 : 0.6,
            }}
          >
            <Icon name="wa" size={18} /> Condividi su WhatsApp
          </a>
          <button
            onClick={handleCopy}
            disabled={!canShare}
            className="tv-btn tv-btn--ghost"
            style={{ height: 44, padding: "0 16px", fontSize: 14,
              opacity: canShare ? 1 : 0.6,
              cursor: canShare ? "pointer" : "not-allowed" }}
          >
            <Icon name="send" size={16} /> {copied ? "Link copiato!" : "Copia link"}
          </button>
        </div>
      </div>

      {/* Membri — usa boardUsers dal context con ruoli reali da board_members */}
      <div className="tv-card" style={{ padding: 28, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--ink-700)" }}>
          Membri · {boardUsers.length}
        </div>
        {boardUsers.map((user, i) => (
          <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: i < boardUsers.length - 1 ? "1px solid var(--border)" : "none" }}>
            <Avatar user={user} size={36} ring={false} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {user.name}
                {user.id === me?.id && (
                  <span style={{ fontSize: 11, color: "var(--fg-muted)", fontWeight: 500 }}> (tu)</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                {/* Ruolo reale dalla tabella board_members */}
                {ROLE_LABEL[user.role ?? "voter"]}
              </div>
            </div>
            {/* Rimuovi: visibile solo all'owner, mai per sé stesso o per altri owner.
                La RLS members_delete_self_or_by_owner fa comunque enforcement lato DB. */}
            {meIsOwner && user.id !== me?.id && user.role !== "owner" && (
              confirmRemove === user.id ? (
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--ink-700)" }}>Rimuovere?</span>
                  <button
                    onClick={() => handleRemove(user.id)}
                    disabled={removing === user.id}
                    style={{ fontSize: 12, fontWeight: 700, color: "var(--rose-600)",
                      background: "none", border: "none", cursor: "pointer" }}
                  >
                    {removing === user.id ? "…" : "Sì"}
                  </button>
                  <button
                    onClick={() => setConfirmRemove(null)}
                    style={{ fontSize: 12, color: "var(--fg-muted)",
                      background: "none", border: "none", cursor: "pointer" }}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmRemove(user.id)}
                  style={{ fontSize: 12, color: "var(--fg-muted)",
                    background: "none", border: "none", cursor: "pointer" }}
                >
                  Rimuovi
                </button>
              )
            )}
          </div>
        ))}
        {removeError && (
          <div role="alert" style={{ marginTop: 10, fontSize: 13, color: "var(--rose-600)" }}>
            {removeError}
          </div>
        )}
      </div>
    </div>
  );
}
