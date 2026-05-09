// frontend/components/landing/HowItWorks.tsx
// Sezione "Come funziona" — 3 step card

import React from "react";
import Icon from "@/components/shared/Icon";

const STEPS = [
  { n: "01", icon: "plus",       title: "Crea la board",     color: "var(--coral-600)", bg: "var(--coral-100)",
    desc: "Dai un nome al viaggio, scegli le date e aggiungi una copertina. Pronto in 30 secondi." },
  { n: "02", icon: "wa",         title: "Invita su WhatsApp", color: "var(--teal-600)",  bg: "var(--teal-100)",
    desc: "Copia il link e mandalo in chat. Gli amici si uniscono senza registrazione." },
  { n: "03", icon: "thumbs-up",  title: "Votate insieme",    color: "var(--amber-600)", bg: "var(--amber-100)",
    desc: "Ognuno aggiunge proposte e vota Sì, Forse o No. La board mostra in tempo reale chi vuole cosa." },
];

export default function HowItWorks() {
  return (
    <section id="come-funziona" style={{
      background: "var(--surface)", borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)", padding: "80px 28px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="tv-overline">// come funziona</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 500,
            letterSpacing: "-0.025em", marginTop: 12 }}>
            Tre passi e sei pronto a partire
          </h2>
        </div>
        <div className="tv-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
          {STEPS.map(s => (
            <div key={s.n} className="tv-card" style={{ padding: "32px 28px" }}>
              <div style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", background: s.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20, color: s.color }}>
                <Icon name={s.icon} size={24} />
              </div>
              <span className="tv-overline" style={{ color: s.color }}>// step {s.n}</span>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600,
                letterSpacing: "-0.02em", marginTop: 8, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 15, color: "var(--ink-600)", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
