// frontend/components/landing/Faq.tsx
// Accordion FAQ — porta da web-extras.jsx

"use client";

import React, { useState } from "react";
import Icon from "@/components/shared/Icon";

const FAQS = [
  { q: "Gli amici devono registrarsi?",
    a: "No. Basta aprire il link della board per vedere e votare le proposte. La registrazione è opzionale." },
  { q: "Quante persone possono essere in una board?",
    a: "Non c'è limite. Le board funzionano bene da 3 a 20 persone." },
  { q: "Posso avere più board attive?",
    a: "Sì, puoi creare board illimitate — una per ogni viaggio." },
  { q: "Come aggiungo un hotel o un volo?",
    a: "Copi il link da Booking, Google Flights, Airbnb o qualsiasi sito e TripVote genera l'anteprima automaticamente." },
  { q: "I dati sono al sicuro?",
    a: "Le board sono accessibili solo a chi ha il link. Non indicizziamo i contenuti e non vendiamo dati." },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" style={{ padding: "80px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="tv-overline">// faq</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 500,
            letterSpacing: "-0.025em", marginTop: 12 }}>Domande frequenti</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FAQS.map((f, i) => (
            <div key={i} className="tv-card" style={{ overflow: "hidden" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "18px 22px",
                fontSize: 15, fontWeight: 600, textAlign: "left", gap: 16,
                background: "none", border: "none", cursor: "pointer",
              }}>
                {f.q}
                <Icon name="chevron-down" size={18} style={{
                  flexShrink: 0,
                  transform: open === i ? "rotate(180deg)" : "none",
                  transition: "transform 200ms var(--ease-out-soft)",
                }} />
              </button>
              {open === i && (
                <div style={{ padding: "0 22px 18px", fontSize: 15,
                  color: "var(--ink-600)", lineHeight: 1.65 }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
