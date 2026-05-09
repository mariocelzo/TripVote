// frontend/components/landing/Pricing.tsx
// Piano unico gratuito — porta da web-pages.jsx

import React from "react";
import Link from "next/link";
import Icon from "@/components/shared/Icon";

const INCLUDED = [
  "Board illimitate",
  "Membri illimitati per board",
  "Voto Sì / Forse / No",
  "Aggiornamenti in tempo reale",
  "Aggiunta proposte da link",
  "Mappa integrata",
  "Itinerario automatico",
  "Condivisione WhatsApp",
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: "80px 28px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <span className="tv-overline">// prezzi</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 500,
          letterSpacing: "-0.025em", marginTop: 12, marginBottom: 8 }}>
          Gratis. Per sempre.
        </h2>
        <p style={{ fontSize: 17, color: "var(--ink-600)", marginBottom: 40 }}>
          TripVote è in beta pubblica. Nessuna carta di credito, nessun piano premium nascosto.
        </p>
        <div className="tv-card" style={{ padding: "36px 32px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 24 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 600,
              color: "var(--coral-600)" }}>€0</span>
            <span style={{ color: "var(--fg-muted)", fontSize: 15 }}>/mese, per sempre</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {INCLUDED.map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--teal-600)", flexShrink: 0 }}>
                  <Icon name="check" size={18} stroke={2.5} />
                </span>
                <span style={{ fontSize: 15, color: "var(--ink-800)" }}>{item}</span>
              </div>
            ))}
          </div>
          <Link href="/app" className="tv-btn tv-btn--primary"
            style={{ width: "100%", height: 52, fontSize: 16, justifyContent: "center",
              display: "flex", borderRadius: "var(--radius-full)" }}>
            Inizia gratis <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
