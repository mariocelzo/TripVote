// frontend/components/app/CreateBoardModal.tsx
// Modale per creare una nuova board (viaggio).
// L'insert avviene client-side: la RLS "boards_insert_self_owner" garantisce
// che owner_id == auth.uid(), e il trigger handle_new_board() aggiunge
// automaticamente l'owner come membro 'owner'.

"use client";

import React, { useState, FormEvent, CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { createBoard } from "@/lib/supabase/queries";

interface Props {
  ownerId: string; // me.id — l'utente autenticato che diventa owner
  onClose: () => void;
  onBoardCreated: (boardId: string) => void; // WebShell ricarica le board e seleziona quella nuova
}

export default function CreateBoardModal({ ownerId, onClose, onBoardCreated }: Props) {
  const supabase = createClient();

  // ── Stato del form ──
  const [title,       setTitle]       = useState("");
  const [destination, setDestination] = useState("");
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");

  // ── Stato submit ──
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Il titolo è obbligatorio");
      return;
    }

    // Validazione date: se entrambe presenti, fine non può precedere inizio
    if (startDate && endDate && endDate < startDate) {
      setError("La data di fine non può precedere quella di inizio");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { id } = await createBoard(supabase, ownerId, {
        title:       cleanTitle,
        destination: destination.trim() || null,
        startDate:   startDate || null,
        endDate:     endDate || null,
      });
      onBoardCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la creazione");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Stili inline — coerenti con AddProposalModal e il design system TripVote
  // ---------------------------------------------------------------------------

  const overlayStyle: CSSProperties = {
    position:             "fixed",
    inset:                0,
    background:           "rgba(26,20,16,0.6)",
    backdropFilter:       "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display:              "flex",
    alignItems:           "center",
    justifyContent:       "center",
    zIndex:               1000,
    padding:              "16px",
  };

  const cardStyle: CSSProperties = {
    background:   "var(--bg)",
    border:       "1px solid var(--border)",
    borderRadius: "16px",
    padding:      "32px",
    width:        "100%",
    maxWidth:     "480px",
    position:     "relative",
    boxShadow:    "0 20px 60px rgba(0,0,0,0.3)",
  };

  const labelStyle: CSSProperties = {
    display:       "block",
    fontSize:      13,
    fontWeight:    600,
    color:         "var(--ink-600)",
    marginBottom:  "6px",
    letterSpacing: "0.02em",
  };

  const inputStyle: CSSProperties = {
    width:        "100%",
    padding:      "10px 12px",
    border:       "1px solid var(--border)",
    borderRadius: "8px",
    background:   "var(--surface-2)",
    color:        "var(--ink-900)",
    fontSize:     14,
    outline:      "none",
    boxSizing:    "border-box",
  };

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Crea nuova board"
    >
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink-900)" }}>
            Nuova board
          </h2>
          <button
            onClick={onClose}
            className="tv-btn tv-btn--ghost"
            aria-label="Chiudi modale"
            style={{ height: 32, width: 32, padding: 0, fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--fg-muted)" }}>
          Crea un viaggio e invita gli amici a votare le proposte.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            {/* Titolo (obbligatorio) */}
            <div>
              <label style={labelStyle} htmlFor="board-title">
                Titolo *
              </label>
              <input
                id="board-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="es. Capodanno a Tokyo"
                style={inputStyle}
                autoFocus
                maxLength={120}
                required
              />
            </div>

            {/* Destinazione (opzionale) */}
            <div>
              <label style={labelStyle} htmlFor="board-destination">
                Destinazione
              </label>
              <input
                id="board-destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="es. Tokyo, Giappone"
                style={inputStyle}
                maxLength={120}
              />
            </div>

            {/* Date (opzionali) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="board-start">
                  Dal
                </label>
                <input
                  id="board-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="board-end">
                  Al
                </label>
                <input
                  id="board-end"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Errore inline */}
            {error && (
              <div
                role="alert"
                style={{
                  fontSize: 13,
                  color: "var(--rose-600)",
                  background: "var(--rose-100, rgba(192,54,75,0.08))",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                {error}
              </div>
            )}

            {/* Azioni */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                className="tv-btn tv-btn--ghost"
                style={{ height: 40, padding: "0 16px", fontSize: 14 }}
                disabled={submitting}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="tv-btn tv-btn--primary"
                style={{ height: 40, padding: "0 20px", fontSize: 14 }}
                disabled={submitting || !title.trim()}
              >
                {submitting ? "Creazione…" : "Crea board"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
