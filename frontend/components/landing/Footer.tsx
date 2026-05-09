// frontend/components/landing/Footer.tsx
// Footer 4 colonne — porta da web-landing.jsx

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/app/Sidebar";

const COLS = [
  { title: "Prodotto", links: ["Come funziona", "Funzionalità", "Prezzi", "Changelog"] },
  { title: "Risorse",  links: ["Blog", "Guide", "API", "Status"] },
  { title: "Azienda",  links: ["Chi siamo", "Contatti", "Privacy", "Termini"] },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "60px 28px 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="tv-footer" style={{ display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Logo size={26} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 20, letterSpacing: "-0.02em" }}>TripVote</span>
            </Link>
            <p style={{ fontSize: 14, color: "var(--ink-600)", lineHeight: 1.6,
              maxWidth: 280, margin: 0 }}>
              Pianifica il viaggio di gruppo senza caos. Vota, decidi, parti.
            </p>
          </div>
          {COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14,
                color: "var(--ink-900)" }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ fontSize: 14, color: "var(--ink-600)" }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 13, color: "var(--fg-muted)" }}>
          <span>© 2026 TripVote. Fatto con ❤️ in Italia.</span>
          <span className="tv-overline">// beta pubblica</span>
        </div>
      </div>
    </footer>
  );
}
