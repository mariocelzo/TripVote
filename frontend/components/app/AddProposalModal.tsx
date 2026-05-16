// frontend/components/app/AddProposalModal.tsx
// Modale per aggiungere una nuova proposta a una board.
// Flusso in due step:
//   Step 1 — l'utente incolla un URL e richiede una preview dal backend
//   Step 2 — form di completamento pre-compilato coi dati della preview

"use client";

import React, { useState, FormEvent, CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";
import type { ProposalType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

// Risposta del backend per l'endpoint /proposals/preview
interface PreviewResponse {
  title: string | null;
  description: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
  site_name: string | null;
  lat: number | null;
  lng: number | null;
}

// Props del componente — ricevute da WebShell
interface Props {
  boardId: string;
  authorId: string;       // me.id dal context
  onClose: () => void;
  onProposalAdded: () => void; // callback per ricaricare le proposte in WebShell
}

// Categorie disponibili con etichette italiane
const CATEGORIES: { value: ProposalType; label: string }[] = [
  { value: "hotel",      label: "Hotel"      },
  { value: "flight",     label: "Volo"        },
  { value: "restaurant", label: "Ristorante"  },
  { value: "activity",   label: "Attività"    },
  { value: "pin",        label: "Pin"         },
];

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

export default function AddProposalModal({
  boardId,
  authorId,
  onClose,
  onProposalAdded,
}: Props) {
  const supabase = createClient();

  // ── Step attuale: "url" → inserimento link | "form" → form completamento ──
  const [step, setStep] = useState<"url" | "form">("url");

  // ── Stato Step 1 (URL) ──
  const [url, setUrl]               = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ── Stato Step 2 (Form) ──
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState<ProposalType>("activity");
  const [price,       setPrice]       = useState<string>("");    // in cent, come stringa
  const [imageUrl,    setImageUrl]    = useState("");

  // ── Stato submit finale ──
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step 1: richiede preview al backend
  // ---------------------------------------------------------------------------
  async function handlePreview() {
    if (!url.trim()) return;

    setPreviewing(true);
    setPreviewError(null);

    try {
      const preview = await apiFetch<PreviewResponse>("/proposals/preview", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });

      // Pre-compila il form coi dati ricevuti dalla preview
      setTitle(preview.title ?? "");
      setDescription(preview.description ?? "");
      setImageUrl(preview.image_url ?? "");
      setPrice(preview.price_cents != null ? String(preview.price_cents) : "");

      // Passa al form di completamento
      setStep("form");
    } catch (err) {
      // Preview fallita: mostriamo errore ma permettiamo comunque di procedere
      setPreviewError(
        err instanceof Error ? err.message : "Errore durante la preview"
      );
    } finally {
      setPreviewing(false);
    }
  }

  // L'utente salta la preview e va direttamente al form
  function handleSkipPreview() {
    setStep("form");
  }

  // ---------------------------------------------------------------------------
  // Step 2: inserisce la proposta in Supabase
  // ---------------------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await supabase.from("proposals").insert({
        board_id:    boardId,
        author_id:   authorId,
        category,
        title:       title.trim(),
        description: description.trim() || null,
        url:         url.trim() || null,
        image_url:   imageUrl.trim() || null,
        // Converte la stringa in intero; null se vuoto o non numerico
        price_cents: price !== "" && !isNaN(Number(price)) ? parseInt(price, 10) : null,
      });

      if (error) throw error;

      // Notifica WebShell di ricaricare le proposte e chiudi
      onProposalAdded();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Errore durante il salvataggio"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Stili inline — usa CSS variables del design system TripVote
  // ---------------------------------------------------------------------------

  // Overlay scuro con blur sullo sfondo
  const overlayStyle: CSSProperties = {
    position:        "fixed",
    inset:           0,
    background:      "rgba(26,20,16,0.6)",
    backdropFilter:  "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          1000,
    padding:         "16px",
  };

  // Card centrata max 560px
  const cardStyle: CSSProperties = {
    background:   "var(--bg)",
    border:       "1px solid var(--border)",
    borderRadius: "16px",
    padding:      "32px",
    width:        "100%",
    maxWidth:     "560px",
    position:     "relative",
    boxShadow:    "0 20px 60px rgba(0,0,0,0.3)",
  };

  const labelStyle: CSSProperties = {
    display:      "block",
    fontSize:     13,
    fontWeight:   600,
    color:        "var(--ink-600)",
    marginBottom: "6px",
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

  const fieldGroupStyle: CSSProperties = {
    display:       "flex",
    flexDirection: "column",
    gap:           "16px",
    marginTop:     "20px",
  };

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    // Cliccando sull'overlay si chiude il modale
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label="Aggiungi proposta">
      {/* Blocca la propagazione del click per non chiudere cliccando sulla card */}
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>

        {/* ── Header con titolo e pulsante chiusura ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink-900)" }}>
            {step === "url" ? "Aggiungi proposta" : "Completa la proposta"}
          </h2>

          {/* Bottone × per chiudere il modale */}
          <button
            onClick={onClose}
            className="tv-btn tv-btn--ghost"
            aria-label="Chiudi modale"
            style={{ padding: "4px 10px", fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* ── Sottotitolo descrittivo per lo step corrente ── */}
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--fg-muted)" }}>
          {step === "url"
            ? "Incolla il link di un hotel, volo, ristorante o attività."
            : "Verifica i dati e aggiungi la proposta alla board."}
        </p>

        {/* ================================================================
            STEP 1 — Inserimento URL e richiesta preview
            ================================================================ */}
        {step === "url" && (
          <div>
            {/* Campo URL */}
            <label style={labelStyle} htmlFor="proposal-url">
              Link della proposta
            </label>
            <input
              id="proposal-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Incolla il link della proposta..."
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handlePreview()}
              autoFocus
              aria-label="URL della proposta"
            />

            {/* Errore preview inline — non blocca il flusso */}
            {previewError && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--coral-600)" }}>
                {previewError} — puoi comunque procedere manualmente.
              </p>
            )}

            {/* Azioni Step 1 */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px", alignItems: "center" }}>
              {/* Carica preview dal backend */}
              <button
                className="tv-btn tv-btn--primary"
                onClick={handlePreview}
                disabled={previewing || !url.trim()}
                aria-busy={previewing}
              >
                {previewing ? "Analisi in corso..." : "Carica anteprima"}
              </button>

              {/* Salta la preview e vai direttamente al form */}
              <button
                className="tv-btn tv-btn--ghost"
                onClick={handleSkipPreview}
                disabled={previewing}
                type="button"
              >
                Salta
              </button>

              <button
                className="tv-btn tv-btn--ghost"
                onClick={onClose}
                disabled={previewing}
                type="button"
                style={{ marginLeft: "auto" }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2 — Form di completamento pre-compilato dalla preview
            ================================================================ */}
        {step === "form" && (
          <form onSubmit={handleSubmit}>

            {/* Thumbnail immagine (se presente) */}
            {imageUrl && (
              <div style={{ marginBottom: "16px", borderRadius: "10px", overflow: "hidden", maxHeight: "180px" }}>
                <img
                  src={imageUrl}
                  alt="Anteprima immagine proposta"
                  style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
                  onError={(e) => {
                    // Nasconde l'immagine se non caricabile
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div style={fieldGroupStyle}>

              {/* Titolo (required) */}
              <div>
                <label style={labelStyle} htmlFor="proposal-title">
                  Titolo *
                </label>
                <input
                  id="proposal-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo della proposta"
                  style={inputStyle}
                  aria-required="true"
                />
              </div>

              {/* Descrizione (opzionale) */}
              <div>
                <label style={labelStyle} htmlFor="proposal-description">
                  Descrizione
                </label>
                <textarea
                  id="proposal-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrizione opzionale..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              {/* Categoria e Prezzo su una riga */}
              <div style={rowStyle}>
                {/* Categoria (required) */}
                <div>
                  <label style={labelStyle} htmlFor="proposal-category">
                    Categoria *
                  </label>
                  <select
                    id="proposal-category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProposalType)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    aria-required="true"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prezzo in centesimi (opzionale) */}
                <div>
                  <label style={labelStyle} htmlFor="proposal-price">
                    Prezzo (centesimi)
                  </label>
                  <input
                    id="proposal-price"
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="es. 15000 = €150"
                    style={inputStyle}
                    aria-label="Prezzo in centesimi (opzionale)"
                  />
                </div>
              </div>

              {/* URL immagine (opzionale) */}
              <div>
                <label style={labelStyle} htmlFor="proposal-image">
                  URL immagine
                </label>
                <input
                  id="proposal-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>

              {/* URL originale (readonly — solo visualizzazione) */}
              {url && (
                <div>
                  <label style={labelStyle} htmlFor="proposal-source-url">
                    Link originale
                  </label>
                  <input
                    id="proposal-source-url"
                    type="url"
                    value={url}
                    readOnly
                    style={{
                      ...inputStyle,
                      color: "var(--fg-muted)",
                      cursor: "default",
                      background: "var(--surface-3, var(--surface-2))",
                    }}
                    aria-label="Link originale (non modificabile)"
                  />
                </div>
              )}
            </div>

            {/* Errore submit inline */}
            {submitError && (
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--coral-600)" }}>
                {submitError}
              </p>
            )}

            {/* Azioni Step 2 */}
            <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
              {/* Torna allo step 1 per cambiare URL */}
              <button
                type="button"
                className="tv-btn tv-btn--ghost"
                onClick={() => setStep("url")}
                disabled={submitting}
              >
                Indietro
              </button>

              <button
                type="button"
                className="tv-btn tv-btn--ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Annulla
              </button>

              {/* Submit principale */}
              <button
                type="submit"
                className="tv-btn tv-btn--primary"
                disabled={submitting || !title.trim()}
                aria-busy={submitting}
              >
                {submitting ? "Salvataggio..." : "Aggiungi proposta"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
