// frontend/components/pages/InvitePage.tsx
// Pagina invita gruppo: invio email via BE + link copiabile + CTA WhatsApp + lista membri
// Usa AppContext per boardUsers (lista membri board con avatar/nome reali)
// Usa apiFetch per chiamate autenticate al backend FastAPI

"use client";

import React, { useState } from "react";
import type { Board } from "@/lib/types";
import { useAppContext } from "@/components/app/AppContext";
import Icon from "@/components/shared/Icon";
import { Avatar } from "@/components/shared/Avatar";
import { apiFetch } from "@/lib/api/client";

interface Props { board: Board; }

export default function InvitePage({ board }: Props) {
  const [copied, setCopied] = useState(false);
  // Legge i membri board dal context per mostrare avatar e nomi reali
  const { me, boardUsers } = useAppContext();

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

      {/* Membri — usa boardUsers dal context (dati reali da Supabase) */}
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
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                {/* Indica "Admin" per l'utente corrente, "Membro" per gli altri */}
                {user.id === me?.id ? "Admin" : "Membro"}
              </div>
            </div>
            {user.id !== me?.id && (
              <button style={{ fontSize: 12, color: "var(--fg-muted)",
                background: "none", border: "none", cursor: "pointer" }}>
                Rimuovi
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
