// frontend/components/pages/ItineraryPage.tsx
// Timeline itinerario costruita dalle proposte matched reali (isMatch: true)
// Le proposte vengono raggruppate per categoria nell'ordine: flight, hotel, activity, restaurant, pin

import React from "react";
import type { Proposal, ProposalType } from "@/lib/types";
import { TV_CAT } from "@/lib/data";
import Icon from "@/components/shared/Icon";

interface Props {
  proposals: Proposal[];
}

// Ordine di visualizzazione delle categorie nella timeline
const CATEGORY_ORDER: ProposalType[] = ["flight", "hotel", "activity", "restaurant", "pin"];

// Colore principale per ogni categoria — usato per marker e icone
const CATEGORY_COLOR: Record<ProposalType, string> = {
  hotel:      "var(--coral-600)",
  flight:     "var(--indigo-700)",
  restaurant: "var(--amber-600)",
  activity:   "var(--teal-600)",
  pin:        "var(--rose-600)",
};

// Icona per ogni categoria — allineata con TV_CAT ma con fallback esplicito
const CATEGORY_ICON: Record<ProposalType, string> = {
  hotel:      "bed",
  flight:     "plane",
  restaurant: "fork",
  activity:   "spark",
  pin:        "pin",
};

export default function ItineraryPage({ proposals }: Props) {
  // Filtra solo le proposte che hanno raggiunto il consenso (isMatch: true)
  const matched = proposals.filter((p) => p.isMatch === true);

  // Raggruppa le proposte matched per categoria
  const grouped = CATEGORY_ORDER.reduce<Record<ProposalType, Proposal[]>>(
    (acc, cat) => {
      acc[cat] = matched.filter((p) => p.type === cat);
      return acc;
    },
    {} as Record<ProposalType, Proposal[]>
  );

  // Blocchi categoria da renderizzare (solo quelli con almeno una proposta)
  const categoryBlocks = CATEGORY_ORDER.filter(
    (cat) => grouped[cat].length > 0
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 920, margin: "0 auto" }}>
      <span className="tv-overline">// itinerario · proposte approvate</span>

      {/* Header — titolo statico + contatore proposte approvate */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 20,
          marginTop: 6,
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 42,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Itinerario del viaggio
          </h1>
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 10,
              fontSize: 14,
              color: "var(--ink-600)",
              flexWrap: "wrap",
            }}
          >
            {/* Contatore proposte approvate — cambia colore se ci sono match */}
            <span
              style={{
                display: "inline-flex",
                gap: 5,
                color: matched.length > 0 ? "var(--teal-600)" : "var(--fg-muted)",
                fontWeight: matched.length > 0 ? 600 : 400,
              }}
            >
              <Icon name="check" size={13} stroke={2.5} />
              {matched.length} {matched.length === 1 ? "proposta approvata" : "proposte approvate"}
            </span>
          </div>
        </div>

        {/* Azioni — visibili solo se c'è qualcosa da esportare */}
        {matched.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="tv-btn tv-btn--ghost"
              style={{ height: 38, padding: "0 14px", fontSize: 13 }}
            >
              <Icon name="external" size={14} /> Esporta PDF
            </button>
            <button
              className="tv-btn tv-btn--primary"
              style={{ height: 38, padding: "0 14px", fontSize: 13 }}
            >
              <Icon name="calendar" size={14} /> Aggiungi a Calendar
            </button>
          </div>
        )}
      </div>

      {/* Stato vuoto — nessuna proposta ha raggiunto il consenso */}
      {matched.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 40px",
            color: "var(--fg-muted)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Nessuna proposta approvata
          </h3>
          <p style={{ fontSize: 14, maxWidth: 340, margin: "0 auto" }}>
            L'itinerario si costruisce automaticamente quando le proposte
            raggiungono il consenso del gruppo. Continua a votare!
          </p>
        </div>
      )}

      {/* Timeline verticale — visibile solo se ci sono proposte matched */}
      {matched.length > 0 && (
        <div style={{ position: "relative" }}>
          {/* Linea verticale della timeline */}
          <div
            style={{
              position: "absolute",
              left: 19,
              top: 22,
              bottom: 22,
              width: 2,
              background: "var(--ink-200)",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {categoryBlocks.map((cat) => {
              const color = CATEGORY_COLOR[cat];
              const icon = CATEGORY_ICON[cat];
              // Label categoria da TV_CAT (es. "Hotel", "Volo", "Ristorante"…)
              const label = TV_CAT[cat]?.label ?? cat;
              const items = grouped[cat];

              return (
                <div
                  key={cat}
                  style={{ display: "flex", gap: 22, alignItems: "flex-start" }}
                >
                  {/* Marker categoria — cerchio colorato con icona */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 99,
                      background: color,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      position: "relative",
                      zIndex: 1,
                      border: "3px solid var(--bg)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <Icon name={icon} size={16} stroke={2} />
                  </div>

                  {/* Blocco categoria con lista proposte */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        marginBottom: 10,
                        marginTop: 6,
                        color,
                      }}
                    >
                      {label}
                    </h3>

                    <div className="tv-card" style={{ padding: 4 }}>
                      {items.map((proposal, idx) => (
                        <div
                          key={proposal.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderBottom:
                              idx < items.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                          }}
                        >
                          {/* Icona categoria proposta */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "var(--radius-sm)",
                              flexShrink: 0,
                              background: `${color}20`,
                              color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon name={icon} size={16} stroke={2} />
                          </div>

                          {/* Testo proposta: titolo, sottotitolo/source, prezzo opzionale */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {proposal.title}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--fg-muted)",
                                marginTop: 2,
                              }}
                            >
                              {proposal.subtitle || proposal.source}
                            </div>
                            {/* Prezzo — mostrato solo se presente */}
                            {proposal.price && (
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color,
                                  marginTop: 3,
                                }}
                              >
                                {proposal.price}
                                {proposal.priceNote && (
                                  <span
                                    style={{
                                      fontWeight: 400,
                                      color: "var(--fg-muted)",
                                    }}
                                  >
                                    {" "}
                                    {proposal.priceNote}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
